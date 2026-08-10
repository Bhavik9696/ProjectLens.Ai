import { generateContentWithRetry, isGeminiConfigured } from './geminiService.js';
import { calculateCoverage } from './heuristics.js';
import {
  buildCodeGraph,
  extractSearchKeywords,
  retrieveRelevantFiles,
  detectNegativeEvidence,
  findTestsForRequirement,
  redactSecrets,
} from './codeGraphService.js';

// ─── Excluded from AI context ────────────────────────────────────────────────
const EXCLUDED_FROM_AI = /(\.env|credentials|private.?key|\.pem|\.key|\.cert|node_modules|\.git|dist\/|build\/)/i;

// ─── Status normaliser ────────────────────────────────────────────────────────
function normaliseStatus(raw) {
  if (!raw) return 'Missing';
  const s = raw.toString().trim();
  if (/^implement/i.test(s)) return 'Implemented';
  if (/partial/i.test(s)) return 'Partially Implemented';
  if (/not.?verif|unable/i.test(s)) return 'Unable to Determine';
  return 'Missing';
}

// ─── Validate AI JSON output ──────────────────────────────────────────────────
function validateAiResult(item) {
  return item && typeof item === 'object' && item.requirementId && typeof item.coveragePercent === 'number';
}

// ─── Verify AI file claims against known file tree ────────────────────────────
function verifyAiClaims(aiEval, fileTree) {
  if (!aiEval) return aiEval;
  const fileSet = new Set(fileTree.map(f => f.toLowerCase()));
  const verifiedFiles = (aiEval.detectedFiles || []).filter(f => {
    const fLower = f.toLowerCase().replace(/^\//, '');
    return fileSet.has(fLower) || fileTree.some(tf => tf.toLowerCase().endsWith(fLower) || fLower.endsWith(tf.toLowerCase()));
  });
  const verificationRate = (aiEval.detectedFiles || []).length > 0
    ? verifiedFiles.length / (aiEval.detectedFiles || []).length : 1;
  let adjustedCoverage = aiEval.coveragePercent || 0;
  if (verificationRate < 0.7 && (aiEval.detectedFiles || []).length > 0) {
    adjustedCoverage = Math.round(adjustedCoverage * verificationRate);
  }
  return { ...aiEval, detectedFiles: verifiedFiles, coveragePercent: adjustedCoverage, _verificationRate: verificationRate };
}

// ─── Deterministic criterion check ────────────────────────────────────────────
function checkCriterionDeterministically(criterion, relevantFiles, codeGraph, fileTree) {
  const cLower = criterion.toLowerCase();
  const allFilesLower = fileTree.map(f => f.toLowerCase());
  const cKws = cLower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter(w => w.length >= 3 && !['can', 'the', 'and', 'for', 'are', 'that', 'this', 'with', 'from', 'user', 'system'].includes(w));

  const matchingFiles = relevantFiles.filter(f => cKws.some(kw => f.filePath.toLowerCase().includes(kw)));

  if (/email|deliver|notif/.test(cLower)) {
    const ef = allFilesLower.filter(f => f.includes('email') || f.includes('mail') || f.includes('notification'));
    return { found: ef.length > 0, evidence: ef.slice(0, 2) };
  }
  if (/token|expire|expir/.test(cLower)) {
    const tf = allFilesLower.filter(f => f.includes('token') || f.includes('jwt') || f.includes('expir'));
    return { found: tf.length > 0, evidence: tf.slice(0, 2) };
  }
  if (/valid/.test(cLower)) {
    const vf = allFilesLower.filter(f => f.includes('valid') || f.includes('schema') || f.includes('joi') || f.includes('zod') || f.includes('yup'));
    return { found: vf.length > 0 || matchingFiles.length > 0, evidence: [...vf.slice(0, 2), ...matchingFiles.slice(0, 1).map(x => x.filePath)] };
  }
  if (/route|api|endpoint/.test(cLower)) {
    const rf = allFilesLower.filter(f => f.includes('route') || f.includes('router') || f.includes('/api/'));
    return { found: rf.length > 0 || matchingFiles.length > 0, evidence: rf.slice(0, 2) };
  }
  return { found: matchingFiles.length > 0, evidence: matchingFiles.slice(0, 3).map(x => x.filePath) };
}

// ─── Contradiction detection ──────────────────────────────────────────────────
function detectContradictions(reqItem, relevantFiles, codeGraph, fileTree) {
  const contradictions = [];
  const allFilesLower = fileTree.map(f => f.toLowerCase());
  const combined = ((reqItem.title || '') + ' ' + (reqItem.description || '')).toLowerCase();

  if (/(admin|administrator|only.?admin|admin.?only|authorized)/.test(combined)) {
    const hasDeleteOrCritical = relevantFiles.some(f => /delete|remove|destroy/.test(f.filePath.toLowerCase()));
    const hasAuthMiddleware = allFilesLower.some(f => f.includes('middleware') || f.includes('guard') || f.includes('protect') || f.includes('authorize') || f.includes('permission'));
    if (hasDeleteOrCritical && !hasAuthMiddleware) {
      contradictions.push({
        type: 'AUTHORIZATION_MISSING', severity: 'HIGH', confidence: 0.85,
        title: 'Critical operation found without authorization middleware',
        evidence: relevantFiles.filter(f => /delete|remove/.test(f.filePath.toLowerCase())).map(x => x.filePath).slice(0, 3),
        recommendation: 'Add role-based authorization middleware to protect this operation.',
      });
    }
  }
  if (/(payment|checkout|billing|purchase)/.test(combined)) {
    const hasPayment = allFilesLower.some(f => f.includes('payment') || f.includes('checkout') || f.includes('order'));
    const hasVerify = allFilesLower.some(f => f.includes('verify') || f.includes('webhook') || f.includes('confirm'));
    if (hasPayment && !hasVerify) {
      contradictions.push({
        type: 'PAYMENT_VERIFICATION_MISSING', severity: 'CRITICAL', confidence: 0.80,
        title: 'Payment processing found without server-side verification',
        evidence: allFilesLower.filter(f => f.includes('payment') || f.includes('checkout')).slice(0, 3),
        recommendation: 'Implement server-side payment verification to prevent payment fraud.',
      });
    }
  }
  if (/(auth|login|signin)/.test(combined)) {
    const hasAuth = allFilesLower.some(f => f.includes('auth') || f.includes('login'));
    const hasToken = allFilesLower.some(f => f.includes('jwt') || f.includes('token') || f.includes('session'));
    if (hasAuth && !hasToken) {
      contradictions.push({
        type: 'AUTH_TOKEN_MISSING', severity: 'HIGH', confidence: 0.75,
        title: 'Authentication exists but no token/session management found',
        evidence: [],
        recommendation: 'Implement JWT token or session management.',
      });
    }
  }
  return contradictions;
}

// ─── Per-criterion analysis ───────────────────────────────────────────────────
function analyzeCriteria(criteria, relevantFiles, codeGraph, fileTree, aiCriteriaResults) {
  return criteria.map((criterion, idx) => {
    const aiC = aiCriteriaResults && aiCriteriaResults[idx];
    if (aiC && aiC.status) {
      return {
        description: criterion,
        status: aiC.status,
        confidence: typeof aiC.confidence === 'number' ? aiC.confidence : 0.7,
        evidence: Array.isArray(aiC.evidence) ? aiC.evidence : [],
        missing: Array.isArray(aiC.missing) ? aiC.missing : [],
        reason: aiC.reason || '',
      };
    }
    const check = checkCriterionDeterministically(criterion, relevantFiles, codeGraph, fileTree);
    return {
      description: criterion,
      status: check.found ? 'IMPLEMENTED' : 'MISSING',
      confidence: check.found ? 0.65 : 0.70,
      evidence: check.evidence || [],
      missing: check.found ? [] : [criterion],
      reason: check.found
        ? 'Deterministic file evidence found: ' + check.evidence.slice(0, 2).join(', ')
        : 'No matching file evidence found in repository for this criterion',
    };
  });
}

// ─── MAIN EVALUATION ENGINE ───────────────────────────────────────────────────
export async function evaluateEngine(requirements, implementationProfile) {
  const fileTree = implementationProfile.fileTree || [];
  const codeGraph = implementationProfile.codeGraph || buildCodeGraph(fileTree);
  let aiEvaluatedItems = null;

  // STAGE 4: Focused Gemini AI analysis
  if (isGeminiConfigured() && fileTree.length > 0) {
    try {
      const focusedBundles = requirements.map(req => {
        const relevantFiles = retrieveRelevantFiles(req, fileTree, codeGraph, 20);
        const testFiles = findTestsForRequirement(req, codeGraph);
        const negEvidence = detectNegativeEvidence(req, fileTree, codeGraph);
        const keywords = extractSearchKeywords(req);
        const safeFiles = relevantFiles
          .filter(x => !EXCLUDED_FROM_AI.test(x.filePath))
          .map(x => ({ path: redactSecrets(x.filePath), type: x.type, score: x.score }));
        const safeRoutes = (codeGraph.inferredApiRoutes || [])
          .filter(r => keywords.some(kw => r.toLowerCase().includes(kw))).slice(0, 5);
        return {
          id: req.id, title: req.title, module: req.module, priority: req.priority,
          actor: req.actor || 'user', action: req.action || '', object: req.object || '',
          description: req.description || '',
          acceptanceCriteria: req.acceptanceCriteria || [],
          relevantFiles: safeFiles.slice(0, 20),
          relevantRoutes: safeRoutes,
          testFiles: testFiles.slice(0, 5).map(f => redactSecrets(f)),
          negativeEvidence: negEvidence,
        };
      });

      const prompt = 'You are an expert AI code auditor performing evidence-based requirement compliance analysis.\n\nRepository: ' + implementationProfile.owner + '/' + implementationProfile.repoName + '\nCode Graph:\n- Total files: ' + fileTree.length + '\n- Route files: ' + (codeGraph.summary?.routeFiles || 0) + ', Test files: ' + (codeGraph.summary?.testFiles || 0) + ', Controllers: ' + (codeGraph.summary?.controllerFiles || 0) + ', Services: ' + (codeGraph.summary?.serviceFiles || 0) + '\n\nFor EACH requirement, analyze ONLY the provided relevant evidence.\nDO NOT cite files that are not in the relevantFiles list.\nDO NOT hallucinate file names or function names.\nAnalyze EACH acceptance criterion independently.\nIf no relevant files are found, status must be Missing with coveragePercent=0.\nIf a file name matches but is only partial evidence, coveragePercent should be 40-70%.\n\nRequirements:\n' + JSON.stringify(focusedBundles, null, 2) + '\n\nReturn a JSON array, one object per requirement:\n[{"requirementId":"REQ-001","status":"Implemented","coveragePercent":80,"confidence":0.85,"foundComponents":[],"missingComponents":[],"detectedFiles":[],"detectedRoutes":[],"criteria":[{"description":"...","status":"IMPLEMENTED","confidence":0.8,"evidence":[],"missing":[],"reason":"..."}],"contradictions":[{"type":"...","severity":"HIGH","confidence":0.8,"title":"...","evidence":[],"recommendation":"..."}],"recommendation":"..."}]';

      const geminiRes = await generateContentWithRetry({
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      if (geminiRes?.text) {
        const text = geminiRes.text.trim()
          .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          aiEvaluatedItems = parsed.filter(validateAiResult).map(item => verifyAiClaims(item, fileTree));
          console.log('[Engine] AI evaluated', aiEvaluatedItems.length, 'requirements (claims verified)');
        }
      }
    } catch (aiErr) {
      console.warn('[Engine] AI fallback triggered:', aiErr.message);
    }
  }

  // STAGE 6: Build final analysis results
  const analysisResults = [];
  let totalCriteriaCount = 0;
  let totalCriteriaMet = 0;

  for (const reqItem of requirements) {
    const criteria = reqItem.acceptanceCriteria || [];
    const expected = reqItem.expectedComponents || [];
    const keywords = extractSearchKeywords(reqItem);
    const relevantFiles = retrieveRelevantFiles(reqItem, fileTree, codeGraph, 20);
    const testFiles = findTestsForRequirement(reqItem, codeGraph);
    const negativeEvidence = detectNegativeEvidence(reqItem, fileTree, codeGraph);

    const aiEval = aiEvaluatedItems?.find(item =>
      item && (item.requirementId === reqItem.id || item.requirementTitle === reqItem.title)
    );

    let found = [], missing = [], detectedFiles = [], detectedRoutes = [];
    let coveragePercent = 0, status = 'Missing', recommendation = '';
    let confidence = 0.5, criteriaResults = [], contradictions = [];

    if (aiEval) {
      found = Array.isArray(aiEval.foundComponents) ? aiEval.foundComponents : [];
      missing = Array.isArray(aiEval.missingComponents) ? aiEval.missingComponents : [];
      detectedFiles = Array.isArray(aiEval.detectedFiles) ? aiEval.detectedFiles : [];
      detectedRoutes = Array.isArray(aiEval.detectedRoutes) ? aiEval.detectedRoutes : [];
      coveragePercent = Math.min(100, Math.max(0, aiEval.coveragePercent || 0));
      status = normaliseStatus(aiEval.status);
      recommendation = aiEval.recommendation || '';
      confidence = typeof aiEval.confidence === 'number' ? Math.min(1, Math.max(0, aiEval.confidence)) : 0.85;
      criteriaResults = analyzeCriteria(criteria, relevantFiles, codeGraph, fileTree, Array.isArray(aiEval.criteria) ? aiEval.criteria : null);
      contradictions = Array.isArray(aiEval.contradictions) ? aiEval.contradictions : [];
      const detContr = detectContradictions(reqItem, relevantFiles, codeGraph, fileTree);
      for (const dc of detContr) {
        if (!contradictions.some(c => c.type === dc.type)) contradictions.push(dc);
      }
    } else {
      // Deterministic fallback
      detectedFiles = relevantFiles.filter(x => !EXCLUDED_FROM_AI.test(x.filePath)).map(x => x.filePath);
      detectedRoutes = (codeGraph.inferredApiRoutes || []).filter(r => keywords.some(kw => r.toLowerCase().includes(kw))).slice(0, 8);

      if (expected.length > 0) {
        for (const comp of expected) {
          const cKws = comp.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length >= 3);
          const matchFile = fileTree.find(f => cKws.some(kw => f.toLowerCase().includes(kw)));
          if (matchFile) { found.push(comp); if (!detectedFiles.includes(matchFile)) detectedFiles.push(matchFile); }
          else missing.push(comp);
        }
        if (found.length === 0 && relevantFiles.length > 0) {
          const creditCount = Math.ceil(expected.length * Math.min(relevantFiles.length / Math.max(expected.length, 2), 1) * 0.5);
          if (creditCount > 0) { found = expected.slice(0, creditCount); missing = expected.slice(creditCount); }
        }
        coveragePercent = calculateCoverage(found, expected);
      }

      if (criteria.length > 0) {
        criteriaResults = analyzeCriteria(criteria, relevantFiles, codeGraph, fileTree, null);
        const metCount = criteriaResults.filter(c => c.status === 'IMPLEMENTED').length;
        if (expected.length === 0) coveragePercent = Math.round((metCount / criteria.length) * 100);
      }

      if (criteriaResults.length === 0 && criteria.length === 0 && expected.length === 0) {
        coveragePercent = relevantFiles.length > 0 ? Math.min(60, relevantFiles.length * 8) : 0;
      }

      const evidenceScore = Math.min(relevantFiles.length / 5, 1);
      const criteriaScore = criteriaResults.length > 0 ? criteriaResults.filter(c => c.status === 'IMPLEMENTED').length / criteriaResults.length : 0.5;
      confidence = Math.max(0.1, Math.min(0.95, Math.round((evidenceScore * 0.4 + criteriaScore * 0.4 + (detectedRoutes.length > 0 ? 0.2 : 0)) * 100) / 100));

      status = expected.length === 0 && relevantFiles.length === 0 && criteria.length === 0
        ? 'Unable to Determine'
        : coveragePercent >= 80 ? 'Implemented'
        : coveragePercent > 0 ? 'Partially Implemented'
        : 'Missing';

      contradictions = detectContradictions(reqItem, relevantFiles, codeGraph, fileTree);
    }

    if (criteriaResults.length > 0) {
      totalCriteriaCount += criteriaResults.length;
      totalCriteriaMet += criteriaResults.filter(c => c.status === 'IMPLEMENTED').length;
    } else {
      totalCriteriaCount += 1;
      totalCriteriaMet += coveragePercent >= 80 ? 1 : (coveragePercent > 0 ? 0.5 : 0);
    }

    if (!recommendation) {
      if (status === 'Implemented') recommendation = reqItem.title + ' has comprehensive implementation evidence in the repository.';
      else if (status === 'Partially Implemented') {
        const unmet = criteriaResults.filter(c => c.status !== 'IMPLEMENTED').map(c => c.description).slice(0, 3);
        recommendation = unmet.length > 0
          ? 'Partially implemented (' + coveragePercent + '%). Unmet criteria: ' + unmet.join('; ') + '.'
          : 'Partially implemented (' + coveragePercent + '%). Complete implementation and add test coverage.';
      } else if (status === 'Unable to Determine') {
        recommendation = 'Insufficient evidence to determine implementation status for "' + reqItem.title + '".';
      } else {
        recommendation = 'No implementation evidence found for "' + reqItem.title + '". Create a sprint task.';
      }
    }

    const modLower = (reqItem.module || '').toLowerCase();
    const relatedCommits = (implementationProfile.commits || [])
      .filter(c => c.moduleRef === reqItem.module || (c.message || '').toLowerCase().includes(modLower) || keywords.some(kw => (c.message || '').toLowerCase().includes(kw)))
      .map(c => ({ hash: c.hash, message: c.message, author: c.author, date: c.date }));
    const relatedPRs = (implementationProfile.pullRequests || [])
      .filter(p => p.relatedModule === reqItem.module || (p.title || '').toLowerCase().includes(modLower) || keywords.some(kw => (p.title || '').toLowerCase().includes(kw)))
      .map(p => ({ id: p.id, title: p.title, state: p.state }));
    const relatedIssues = (implementationProfile.issues || [])
      .filter(i => i.relatedModule === reqItem.module || (i.title || '').toLowerCase().includes(modLower) || keywords.some(kw => (i.title || '').toLowerCase().includes(kw)))
      .map(i => ({ id: i.id, title: i.title, state: i.state }));

    analysisResults.push({
      requirementId: reqItem.id,
      requirementTitle: reqItem.title,
      module: reqItem.module,
      priority: reqItem.priority,
      expectedComponents: expected,
      foundComponents: found,
      missingComponents: missing,
      coveragePercent,
      confidencePercent: Math.round(confidence * 100),
      confidence,
      status,
      criteria: criteriaResults,
      contradictions,
      negativeEvidence,
      testEvidence: { hasTests: testFiles.length > 0, testFiles: testFiles.slice(0, 5) },
      evidence: {
        detectedFiles: detectedFiles.slice(0, 15),
        detectedRoutes: detectedRoutes.slice(0, 8),
        relatedCommits: relatedCommits.slice(0, 5),
        relatedPRs: relatedPRs.slice(0, 5),
        relatedIssues: relatedIssues.slice(0, 5),
      },
      recommendation,
    });
  }

  const criteriaCoverage = totalCriteriaCount > 0 ? Math.round((totalCriteriaMet / totalCriteriaCount) * 100) : 0;
  const implCoverage = Math.round(analysisResults.reduce((acc, r) => acc + r.coveragePercent, 0) / (analysisResults.length || 1));
  const reqCoverage = criteriaCoverage > 0 ? criteriaCoverage : implCoverage;
  const sprintProgress = Math.min(100, Math.round(implCoverage * 1.05));
  const commitCount = implementationProfile.commits?.length || 0;
  const githubActivity = Math.min(100, commitCount >= 10 ? 80 + Math.min(20, commitCount - 10) : commitCount * 8 + 20);
  const overallScore = Math.round(reqCoverage * 0.4 + implCoverage * 0.3 + sprintProgress * 0.2 + githubActivity * 0.1);

  let healthRating = 'Healthy';
  if (overallScore < 60) healthRating = 'High Risk';
  else if (overallScore < 80) healthRating = 'Medium Risk';

  const highRiskModules = analysisResults
    .filter(a => a.status === 'Missing' || a.status === 'Partially Implemented')
    .map(a => a.module + ' (' + a.coveragePercent + '% coverage)');

  const keyRiskFactors = [];
  if (reqCoverage < 70) keyRiskFactors.push('Requirement coverage is only ' + reqCoverage + '%');
  if (analysisResults.some(a => a.status === 'Missing')) keyRiskFactors.push('One or more requirements have no implementation evidence');
  if (analysisResults.some(a => a.contradictions && a.contradictions.length > 0)) keyRiskFactors.push('Potential contradictions detected');
  if (analysisResults.some(a => a.testEvidence && !a.testEvidence.hasTests)) keyRiskFactors.push('Some requirements lack test coverage');
  if ((implementationProfile.issues || []).filter(i => i.state === 'open').length > 0) keyRiskFactors.push('Unresolved GitHub issues exist');

  return {
    analysisResults,
    healthMetrics: { requirementCoverage: reqCoverage, implementationCoverage: implCoverage, sprintProgress, githubActivity, overallScore, healthRating, highRiskModules, keyRiskFactors },
  };
}
