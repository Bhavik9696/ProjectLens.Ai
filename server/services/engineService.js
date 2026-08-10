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
const EXCLUDED_FROM_AI = /(\\.env|credentials|private.?key|\\.pem|\\.key|\\.cert|node_modules|\\.git|dist\/|build\/)/i;

// ─── Status normaliser ─────────────────────────────────────────────────────────
function normaliseStatus(raw) {
  if (!raw) return 'Missing';
  const s = raw.toString().trim().toUpperCase();
  if (s === 'IMPLEMENTED' || s.startsWith('IMPLEMENT')) return 'Implemented';
  if (s === 'PARTIAL' || s.includes('PARTIAL')) return 'Partially Implemented';
  if (s === 'NOT_VERIFIABLE' || s.includes('NOT_VERIF') || s.includes('UNABLE')) return 'Unable to Determine';
  if (s === 'MISSING') return 'Missing';
  return 'Missing';
}

// ─── Validate AI JSON output ──────────────────────────────────────────────────
function validateAiResult(item) {
  return (
    item &&
    typeof item === 'object' &&
    (item.requirementId || item.id) &&
    typeof item.coveragePercent === 'number'
  );
}

// ─── Verify AI file claims against known file tree ─────────────────────────────
/**
 * KEY FIX: Verify every file the AI cites actually exists in the repo.
 * Unknown files are rejected. Confidence is penalised proportionally.
 */
function verifyAiClaims(aiEval, fileTree) {
  if (!aiEval) return aiEval;

  const fileSet = new Set(fileTree.map(f => f.toLowerCase()));
  const claimed = aiEval.detectedFiles || [];

  const verifiedFiles = claimed.filter(f => {
    const fLower = f.toLowerCase().replace(/^\//, '');
    return (
      fileSet.has(fLower) ||
      fileTree.some(tf => tf.toLowerCase().endsWith(fLower) || fLower.endsWith(tf.toLowerCase()))
    );
  });

  const verificationRate = claimed.length > 0 ? verifiedFiles.length / claimed.length : 1;
  let adjustedCoverage = aiEval.coveragePercent || 0;

  // Penalise heavily for hallucinated files
  if (verificationRate < 0.5 && claimed.length > 0) {
    adjustedCoverage = Math.round(adjustedCoverage * verificationRate);
  } else if (verificationRate < 0.7 && claimed.length > 0) {
    adjustedCoverage = Math.round(adjustedCoverage * (verificationRate + 0.1));
  }

  // Clamp confidence if hallucination rate is high
  let confidence = typeof aiEval.confidence === 'number' ? aiEval.confidence : 0.7;
  if (verificationRate < 0.6) confidence = Math.min(confidence, 0.5);

  return {
    ...aiEval,
    requirementId: aiEval.requirementId || aiEval.id,
    detectedFiles: verifiedFiles,
    coveragePercent: Math.min(100, Math.max(0, adjustedCoverage)),
    confidence,
    _verificationRate: verificationRate,
    _hallucinations: claimed.length - verifiedFiles.length,
  };
}

// ─── Deterministic criterion check ───────────────────────────────────────────
function checkCriterionDeterministically(criterion, relevantFiles, codeGraph, fileTree) {
  const cLower = criterion.toLowerCase();
  const allFilesLower = fileTree.map(f => f.toLowerCase());

  // Tokenise criterion into meaningful keywords (4+ chars)
  const cKws = cLower
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !['that', 'this', 'with', 'from', 'user', 'system', 'must', 'shall', 'should', 'when', 'then', 'can'].includes(w));

  const matchingFiles = relevantFiles.filter(f =>
    cKws.some(kw => f.filePath.toLowerCase().includes(kw))
  );

  // Domain-specific deterministic checks
  if (/email|deliver|notif/.test(cLower)) {
    const ef = allFilesLower.filter(f => f.includes('email') || f.includes('mail') || f.includes('notification') || f.includes('smtp'));
    return { found: ef.length > 0, evidence: ef.slice(0, 2) };
  }
  if (/token|expire|expir/.test(cLower)) {
    const tf = allFilesLower.filter(f => f.includes('token') || f.includes('jwt') || f.includes('expir') || f.includes('refresh'));
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
  if (/test|spec/.test(cLower)) {
    const testF = (codeGraph?.tests || []).filter(f => cKws.some(kw => f.toLowerCase().includes(kw)));
    return { found: testF.length > 0, evidence: testF.slice(0, 2) };
  }
  if (/middlewar|guard|protect|authoriz|role|admin/.test(cLower)) {
    const mf = allFilesLower.filter(f => f.includes('middleware') || f.includes('guard') || f.includes('role') || f.includes('auth'));
    return { found: mf.length > 0, evidence: mf.slice(0, 2) };
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
    const hasAuthMiddleware = allFilesLower.some(f =>
      f.includes('middleware') || f.includes('guard') || f.includes('protect') || f.includes('authorize') || f.includes('permission')
    );
    if (hasDeleteOrCritical && !hasAuthMiddleware) {
      contradictions.push({
        type: 'AUTHORIZATION_MISSING',
        severity: 'HIGH',
        confidence: 0.85,
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
        type: 'PAYMENT_VERIFICATION_MISSING',
        severity: 'CRITICAL',
        confidence: 0.80,
        title: 'Payment processing found without server-side verification',
        evidence: allFilesLower.filter(f => f.includes('payment') || f.includes('checkout')).slice(0, 3),
        recommendation: 'Implement server-side payment verification to prevent fraud.',
      });
    }
  }

  if (/(auth|login|signin)/.test(combined)) {
    const hasAuth = allFilesLower.some(f => f.includes('auth') || f.includes('login'));
    const hasToken = allFilesLower.some(f => f.includes('jwt') || f.includes('token') || f.includes('session'));
    if (hasAuth && !hasToken) {
      contradictions.push({
        type: 'AUTH_TOKEN_MISSING',
        severity: 'HIGH',
        confidence: 0.75,
        title: 'Authentication exists but no token/session management found',
        evidence: [],
        recommendation: 'Implement JWT token or session management for authenticated users.',
      });
    }
  }

  return contradictions;
}

// ─── Per-criterion analysis ────────────────────────────────────────────────────
function analyzeCriteria(criteria, relevantFiles, codeGraph, fileTree, aiCriteriaResults) {
  return criteria.map((criterion, idx) => {
    const aiC = aiCriteriaResults && aiCriteriaResults[idx];
    if (aiC && aiC.status) {
      return {
        description: criterion,
        status: aiC.status,
        confidence: typeof aiC.confidence === 'number' ? Math.min(0.98, aiC.confidence) : 0.7,
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

// ─── Evidence-based confidence calculator ─────────────────────────────────────
/**
 * Compute a confidence score entirely from evidence quality — not hard-coded.
 *
 * Components:
 *  - File evidence quality (0–0.40): how many and how relevant files were found
 *  - Route evidence (0–0.20): API routes matching the requirement
 *  - Test evidence (0–0.15): whether test files exist
 *  - Criteria satisfaction (0–0.20): fraction of acceptance criteria met
 *  - Negative evidence penalty (-0.10 each, up to -0.30): missing expected pieces
 */
function calculateConfidence({ relevantFiles, detectedRoutes, testFiles, criteriaResults, negativeEvidence }) {
  // File quality: normalise to 0–0.40
  const fileScore = Math.min(relevantFiles.length / 8, 1) * 0.40;

  // Route score: 0.20 if routes exist, 0 if not
  const routeScore = detectedRoutes.length > 0 ? 0.20 : 0;

  // Test score: 0.15 if tests found, else 0
  const testScore = testFiles.length > 0 ? 0.15 : 0;

  // Criteria score: fraction implemented * 0.20
  const criteriaScore = criteriaResults.length > 0
    ? (criteriaResults.filter(c => c.status === 'IMPLEMENTED').length / criteriaResults.length) * 0.20
    : 0.10; // neutral if no criteria

  // Negative evidence penalty (cap at -0.30)
  const negPenalty = Math.min((negativeEvidence || []).length * 0.10, 0.30);

  const raw = fileScore + routeScore + testScore + criteriaScore - negPenalty;
  return Math.max(0.05, Math.min(0.98, Math.round(raw * 100) / 100));
}

// ─── Scope creep detection ────────────────────────────────────────────────────
/**
 * Compare required modules vs detected high-level product features.
 * Only flag meaningful product functionality — not framework/utility code.
 */
export function detectScopeCreep(requirements, codeGraph, fileTree) {
  const PRODUCT_FEATURE_PATTERNS = [
    { keyword: 'payment', label: 'Payment / Billing' },
    { keyword: 'chat', label: 'Real-time Chat' },
    { keyword: 'notification', label: 'Notifications' },
    { keyword: 'analytics', label: 'Analytics' },
    { keyword: 'report', label: 'Reporting' },
    { keyword: 'admin', label: 'Admin Panel' },
    { keyword: 'social', label: 'Social Features' },
    { keyword: 'subscription', label: 'Subscription Management' },
    { keyword: 'recommendation', label: 'Recommendation Engine' },
    { keyword: 'inventory', label: 'Inventory Management' },
    { keyword: 'shipping', label: 'Shipping / Logistics' },
    { keyword: 'review', label: 'Reviews & Ratings' },
    { keyword: 'search', label: 'Search Functionality' },
    { keyword: 'export', label: 'Data Export' },
    { keyword: 'import', label: 'Data Import' },
    { keyword: 'workflow', label: 'Workflow Automation' },
    { keyword: 'calendar', label: 'Calendar / Scheduling' },
    { keyword: 'map', label: 'Maps / Geolocation' },
    { keyword: 'video', label: 'Video Processing' },
    { keyword: 'audio', label: 'Audio Processing' },
  ];

  const reqText = requirements.map(r => (r.title + ' ' + r.module + ' ' + r.description).toLowerCase()).join(' ');
  const codeFiles = fileTree.map(f => f.toLowerCase()).join(' ');

  const scopeCreep = [];
  for (const { keyword, label } of PRODUCT_FEATURE_PATTERNS) {
    const inCode = codeFiles.includes(keyword);
    const inReqs = reqText.includes(keyword);
    if (inCode && !inReqs) {
      scopeCreep.push({ feature: label, keyword, severity: 'MEDIUM' });
    }
  }

  return scopeCreep;
}

// ─── Build AI prompt for ONE requirement ──────────────────────────────────────
/**
 * KEY FIX: Each requirement is now analysed with its OWN isolated prompt
 * rather than bundling all requirements into one giant prompt. This prevents
 * Gemini from reusing evidence across requirements.
 */
function buildRequirementPrompt(bundle, repoMeta, codeGraphSummary) {
  return `You are an expert code auditor performing evidence-based requirement compliance analysis.

Repository: ${repoMeta.owner}/${repoMeta.repoName}
Code Graph Summary:
- Total files: ${codeGraphSummary.totalFiles}
- Route files: ${codeGraphSummary.routeFiles}, Controllers: ${codeGraphSummary.controllerFiles}
- Services: ${codeGraphSummary.serviceFiles}, Models: ${codeGraphSummary.modelFiles}
- Test files: ${codeGraphSummary.testFiles}, Components: ${codeGraphSummary.componentFiles}

REQUIREMENT UNDER ANALYSIS:
${JSON.stringify(bundle, null, 2)}

STRICT RULES:
1. ONLY use files listed in relevantFiles above. Do NOT cite any other files.
2. Do NOT invent file names, function names, or routes.
3. Evaluate EACH acceptance criterion independently.
4. If no relevant files are found for a criterion, mark it MISSING.
5. If evidence is insufficient to determine status, use NOT_VERIFIABLE (not IMPLEMENTED).
6. Confidence must reflect actual evidence quality, not be a fixed number.
7. Do NOT use generic layout components (Header, Aside, Footer, Navbar, Sidebar) as evidence for business logic requirements.

Return ONLY valid JSON matching this schema exactly:
{
  "requirementId": "${bundle.id}",
  "status": "IMPLEMENTED | PARTIAL | MISSING | NOT_VERIFIABLE",
  "coveragePercent": 0,
  "confidence": 0.0,
  "foundComponents": [],
  "missingComponents": [],
  "detectedFiles": [],
  "detectedRoutes": [],
  "criteria": [
    {
      "description": "...",
      "status": "IMPLEMENTED | PARTIAL | MISSING | NOT_VERIFIABLE",
      "confidence": 0.0,
      "evidence": [],
      "missing": [],
      "reason": "..."
    }
  ],
  "contradictions": [],
  "recommendation": "..."
}`;
}

// ─── GENERIC/LAYOUT FILE FILTER ───────────────────────────────────────────────
const GENERIC_LAYOUT_PATTERNS = [
  /\/(aside|sidebar|navbar|header|footer|layout|shell|skeleton)\.(jsx?|tsx?)$/i,
  /\/index\.(jsx?|tsx?)$/i,
  /\/app\.(jsx?|tsx?)$/i,
];

function isGenericLayoutFile(filePath) {
  return GENERIC_LAYOUT_PATTERNS.some(re => re.test(filePath));
}

// ─── MAIN EVALUATION ENGINE ───────────────────────────────────────────────────
export async function evaluateEngine(requirements, implementationProfile) {
  const fileTree = implementationProfile.fileTree || [];
  const codeGraph = implementationProfile.codeGraph || buildCodeGraph(fileTree);
  const codeGraphSummary = codeGraph.summary || {};
  const repoMeta = { owner: implementationProfile.owner || 'unknown', repoName: implementationProfile.repoName || 'unknown' };

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

    // Filter generic layout files from evidence
    const evidenceFiles = relevantFiles.filter(x =>
      !EXCLUDED_FROM_AI.test(x.filePath) && !isGenericLayoutFile(x.filePath)
    );

    let found = [], missing = [], detectedFiles = [], detectedRoutes = [];
    let coveragePercent = 0, status = 'Missing', recommendation = '';
    let confidence = 0.3, criteriaResults = [], contradictions = [];
    let aiEval = null;

    // ── STAGE 4: Per-requirement Gemini AI analysis ───────────────────────────
    if (isGeminiConfigured() && fileTree.length > 0 && (evidenceFiles.length > 0 || codeGraph.inferredApiRoutes.length > 0)) {
      try {
        const safeFiles = evidenceFiles
          .map(x => ({ path: redactSecrets(x.filePath), type: x.type, score: Math.round(x.score * 10) / 10 }));

        const safeRoutes = (codeGraph.inferredApiRoutes || [])
          .filter(r => keywords.some(kw => kw.length >= 4 && r.toLowerCase().includes(kw)))
          .slice(0, 6);

        const bundle = {
          id: reqItem.id,
          title: reqItem.title,
          module: reqItem.module,
          priority: reqItem.priority,
          actor: reqItem.actor || 'user',
          action: reqItem.action || '',
          object: reqItem.object || '',
          description: reqItem.description || '',
          acceptanceCriteria: criteria,
          relevantFiles: safeFiles.slice(0, 20),
          relevantRoutes: safeRoutes,
          testFiles: testFiles.slice(0, 5).map(f => redactSecrets(f)),
          negativeEvidence: negativeEvidence.slice(0, 5),
          deterministicCriteriaCheck: criteria.map(c => {
            const det = checkCriterionDeterministically(c, relevantFiles, codeGraph, fileTree);
            return { criterion: c, deterministicStatus: det.found ? 'FOUND' : 'NOT_FOUND', deterministicEvidence: det.evidence };
          }),
        };

        const prompt = buildRequirementPrompt(bundle, repoMeta, codeGraphSummary);

        const geminiRes = await generateContentWithRetry({
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });

        if (geminiRes?.text) {
          const text = geminiRes.text.trim()
            .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
          const parsed = JSON.parse(text);
          // Support both single object and single-element array
          const rawItem = Array.isArray(parsed) ? parsed[0] : parsed;
          if (validateAiResult(rawItem)) {
            aiEval = verifyAiClaims(rawItem, fileTree);
            console.log(`[Engine] AI evaluated ${reqItem.id} — coverage: ${aiEval.coveragePercent}%, files: ${aiEval.detectedFiles?.length}`);
          }
        }
      } catch (aiErr) {
        console.warn(`[Engine] AI fallback for ${reqItem.id}:`, aiErr.message);
      }
    }

    // ── STAGE 5 & 6: Merge AI + Deterministic results ────────────────────────
    if (aiEval) {
      found = Array.isArray(aiEval.foundComponents) ? aiEval.foundComponents : [];
      missing = Array.isArray(aiEval.missingComponents) ? aiEval.missingComponents : [];

      // Only keep non-layout, verified files
      detectedFiles = (Array.isArray(aiEval.detectedFiles) ? aiEval.detectedFiles : [])
        .filter(f => !isGenericLayoutFile(f));

      detectedRoutes = Array.isArray(aiEval.detectedRoutes) ? aiEval.detectedRoutes : [];
      coveragePercent = Math.min(100, Math.max(0, aiEval.coveragePercent || 0));
      status = normaliseStatus(aiEval.status);
      recommendation = aiEval.recommendation || '';

      criteriaResults = analyzeCriteria(criteria, relevantFiles, codeGraph, fileTree,
        Array.isArray(aiEval.criteria) ? aiEval.criteria : null);

      // Recalculate coverage from actual criteria if AI returned it
      if (criteriaResults.length > 0) {
        const metCount = criteriaResults.filter(c => c.status === 'IMPLEMENTED').length;
        coveragePercent = Math.round((metCount / criteriaResults.length) * 100);
      }

      contradictions = Array.isArray(aiEval.contradictions) ? aiEval.contradictions : [];
      const detContr = detectContradictions(reqItem, relevantFiles, codeGraph, fileTree);
      for (const dc of detContr) {
        if (!contradictions.some(c => c.type === dc.type)) contradictions.push(dc);
      }

      // Recalculate confidence from evidence quality (not AI's self-reported number)
      confidence = calculateConfidence({
        relevantFiles: evidenceFiles,
        detectedRoutes,
        testFiles,
        criteriaResults,
        negativeEvidence,
      });
    } else {
      // ── Deterministic-only fallback ──────────────────────────────────────────
      detectedFiles = evidenceFiles.map(x => x.filePath);
      detectedRoutes = (codeGraph.inferredApiRoutes || [])
        .filter(r => keywords.some(kw => kw.length >= 4 && r.toLowerCase().includes(kw)))
        .slice(0, 8);

      if (expected.length > 0) {
        for (const comp of expected) {
          const cKws = comp.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length >= 3);
          const matchFile = fileTree.find(f => cKws.some(kw => f.toLowerCase().includes(kw)));
          if (matchFile) {
            found.push(comp);
            if (!detectedFiles.includes(matchFile)) detectedFiles.push(matchFile);
          } else {
            missing.push(comp);
          }
        }
        coveragePercent = calculateCoverage(found, expected);
      }

      if (criteria.length > 0) {
        criteriaResults = analyzeCriteria(criteria, relevantFiles, codeGraph, fileTree, null);
        const metCount = criteriaResults.filter(c => c.status === 'IMPLEMENTED').length;
        coveragePercent = Math.round((metCount / criteria.length) * 100);
      }

      if (criteriaResults.length === 0 && criteria.length === 0 && expected.length === 0) {
        // Use file-based coverage as last resort
        coveragePercent = evidenceFiles.length > 0 ? Math.min(55, evidenceFiles.length * 9) : 0;
      }

      contradictions = detectContradictions(reqItem, relevantFiles, codeGraph, fileTree);

      confidence = calculateConfidence({
        relevantFiles: evidenceFiles,
        detectedRoutes,
        testFiles,
        criteriaResults,
        negativeEvidence,
      });

      // Status from criteria/coverage
      if (evidenceFiles.length === 0 && criteria.length > 0 && criteriaResults.every(c => c.status === 'MISSING')) {
        status = 'Unable to Determine'; // Cannot verify without evidence
      } else {
        status = coveragePercent >= 80 ? 'Implemented'
               : coveragePercent > 0   ? 'Partially Implemented'
               : evidenceFiles.length === 0 ? 'Unable to Determine'
               : 'Missing';
      }
    }

    // ── Re-derive status from criteria if available ──────────────────────────
    if (criteriaResults.length > 0) {
      const metCount = criteriaResults.filter(c => c.status === 'IMPLEMENTED').length;
      const total = criteriaResults.length;
      coveragePercent = Math.round((metCount / total) * 100);
      if (coveragePercent === 100) status = 'Implemented';
      else if (coveragePercent === 0 && evidenceFiles.length === 0) status = 'Unable to Determine';
      else if (coveragePercent === 0) status = 'Missing';
      else status = 'Partially Implemented';
    }

    // Track overall criteria
    if (criteriaResults.length > 0) {
      totalCriteriaCount += criteriaResults.length;
      totalCriteriaMet += criteriaResults.filter(c => c.status === 'IMPLEMENTED').length;
    } else {
      totalCriteriaCount += 1;
      totalCriteriaMet += coveragePercent >= 80 ? 1 : coveragePercent > 0 ? 0.5 : 0;
    }

    // ── Auto-generate recommendation if missing ──────────────────────────────
    if (!recommendation) {
      if (status === 'Implemented') {
        recommendation = `"${reqItem.title}" has strong implementation evidence in the repository.`;
      } else if (status === 'Partially Implemented') {
        const unmet = criteriaResults.filter(c => c.status !== 'IMPLEMENTED').map(c => c.description).slice(0, 3);
        recommendation = unmet.length > 0
          ? `Partially implemented (${coveragePercent}%). Unmet criteria: ${unmet.join('; ')}.`
          : `Partially implemented (${coveragePercent}%). Complete the missing criteria and add test coverage.`;
      } else if (status === 'Unable to Determine') {
        recommendation = `Insufficient evidence in the repository to verify "${reqItem.title}". Ensure the feature exists and re-analyse.`;
      } else {
        recommendation = `No implementation evidence found for "${reqItem.title}". Create a sprint task to implement this requirement.`;
      }
    }

    // ── Link related commits / PRs / issues ──────────────────────────────────
    const modLower = (reqItem.module || '').toLowerCase();
    const relatedCommits = (implementationProfile.commits || [])
      .filter(c =>
        c.moduleRef === reqItem.module ||
        (c.message || '').toLowerCase().includes(modLower) ||
        keywords.some(kw => kw.length >= 4 && (c.message || '').toLowerCase().includes(kw))
      )
      .map(c => ({ hash: c.hash, message: c.message, author: c.author, date: c.date }))
      .slice(0, 5);

    const relatedPRs = (implementationProfile.pullRequests || [])
      .filter(p =>
        p.relatedModule === reqItem.module ||
        (p.title || '').toLowerCase().includes(modLower) ||
        keywords.some(kw => kw.length >= 4 && (p.title || '').toLowerCase().includes(kw))
      )
      .map(p => ({ id: p.id, title: p.title, state: p.state }))
      .slice(0, 5);

    const relatedIssues = (implementationProfile.issues || [])
      .filter(i =>
        i.relatedModule === reqItem.module ||
        (i.title || '').toLowerCase().includes(modLower) ||
        keywords.some(kw => kw.length >= 4 && (i.title || '').toLowerCase().includes(kw))
      )
      .map(i => ({ id: i.id, title: i.title, state: i.state }))
      .slice(0, 5);

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
      testEvidence: {
        hasTests: testFiles.length > 0,
        testFiles: testFiles.slice(0, 5),
      },
      evidence: {
        detectedFiles: detectedFiles.slice(0, 15),
        detectedRoutes: detectedRoutes.slice(0, 8),
        relatedCommits,
        relatedPRs,
        relatedIssues,
      },
      recommendation,
    });
  }

  // ── Health metrics ───────────────────────────────────────────────────────────
  const criteriaCoverage = totalCriteriaCount > 0
    ? Math.round((totalCriteriaMet / totalCriteriaCount) * 100)
    : 0;
  const implCoverage = Math.round(
    analysisResults.reduce((acc, r) => acc + r.coveragePercent, 0) / (analysisResults.length || 1)
  );
  const reqCoverage = criteriaCoverage > 0 ? criteriaCoverage : implCoverage;
  const sprintProgress = Math.min(100, Math.round(implCoverage * 1.05));
  const commitCount = implementationProfile.commits?.length || 0;
  const githubActivity = Math.min(100,
    commitCount >= 10 ? 80 + Math.min(20, commitCount - 10) : commitCount * 8 + 20
  );
  const overallScore = Math.round(
    reqCoverage * 0.4 + implCoverage * 0.3 + sprintProgress * 0.2 + githubActivity * 0.1
  );

  let healthRating = 'Healthy';
  if (overallScore < 60) healthRating = 'High Risk';
  else if (overallScore < 80) healthRating = 'Medium Risk';

  const highRiskModules = analysisResults
    .filter(a => a.status === 'Missing' || a.status === 'Partially Implemented')
    .map(a => `${a.module} (${a.coveragePercent}% coverage)`);

  const keyRiskFactors = [];
  if (reqCoverage < 70) keyRiskFactors.push(`Requirement coverage is only ${reqCoverage}%`);
  if (analysisResults.some(a => a.status === 'Missing')) keyRiskFactors.push('One or more requirements have no implementation evidence');
  if (analysisResults.some(a => a.status === 'Unable to Determine')) keyRiskFactors.push('Some requirements could not be verified — consider adding more descriptive file names');
  if (analysisResults.some(a => a.contradictions && a.contradictions.length > 0)) keyRiskFactors.push('Potential contradictions detected in implementation');
  if (analysisResults.some(a => a.testEvidence && !a.testEvidence.hasTests)) keyRiskFactors.push('Some requirements lack automated test coverage');
  if ((implementationProfile.issues || []).filter(i => i.state === 'open').length > 0) keyRiskFactors.push('Unresolved GitHub issues exist');

  // Scope creep detection
  const scopeCreep = detectScopeCreep(requirements, codeGraph, fileTree);

  return {
    analysisResults,
    healthMetrics: {
      requirementCoverage: reqCoverage,
      implementationCoverage: implCoverage,
      sprintProgress,
      githubActivity,
      overallScore,
      healthRating,
      highRiskModules,
      keyRiskFactors,
      scopeCreep,
    },
  };
}
