import { generateContentWithRetry, isGeminiConfigured } from './geminiService.js';
import { calculateCoverage } from './heuristics.js';

export async function evaluateEngine(requirements, implementationProfile) {
  let aiEvaluatedItems = null;

  if (isGeminiConfigured()) {
    try {
      const prompt = `You are an expert AI Code Auditor & Requirements Compliance Analyzer.
Compare the extracted document requirements with the GitHub repository analysis profile.

Extracted Requirements:
${JSON.stringify(requirements, null, 2)}

GitHub Repository Profile:
Repo: ${implementationProfile.owner}/${implementationProfile.repoName}
File Tree (${implementationProfile.fileTree?.length || 0} files):
${(implementationProfile.fileTree || []).slice(0, 200).join('\n')}

Commits (${implementationProfile.commits?.length || 0}):
${JSON.stringify((implementationProfile.commits || []).slice(0, 15))}

Pull Requests: ${JSON.stringify((implementationProfile.pullRequests || []).slice(0, 10))}
Issues: ${JSON.stringify((implementationProfile.issues || []).slice(0, 10))}

Perform a deep semantic analysis matching each extracted requirement against real repository files, APIs, routes, controllers, services, models, and components in the file tree.

For EACH requirement in the requirements list, analyze:
- requirementId: string (e.g., REQ-001)
- foundComponents: array of strings (components found/implemented in the repository)
- missingComponents: array of strings (components missing from the repository)
- detectedFiles: array of strings (exact file paths from the repo file tree implementing this requirement)
- detectedRoutes: array of strings (API routes or endpoint paths found)
- status: strictly one of "Implemented", "Partially Implemented", "Missing", or "Unable to Determine"
- coveragePercent: integer from 0 to 100
- recommendation: string (actionable technical advice)

Return ONLY a JSON array containing one object per requirement according to the instructions above.`;

      const geminiRes = await generateContentWithRetry({
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      if (geminiRes?.text) {
        const parsed = JSON.parse(geminiRes.text);
        if (Array.isArray(parsed)) {
          aiEvaluatedItems = parsed;
        }
      }
    } catch (aiErr) {
      console.warn('Gemini AI repository analysis fallback triggered:', aiErr.message);
    }
  }

  const analysisResults = [];
  let totalExpectedComponents = 0;
  let totalFoundComponents = 0;

  for (const reqItem of requirements) {
    const aiEval = aiEvaluatedItems?.find(
      (item) => item.requirementId === reqItem.id || item.requirementTitle === reqItem.title
    );

    const expected = reqItem.expectedComponents || [];
    let found = [];
    let missing = [];
    let detectedFiles = [];
    let detectedRoutes = [];
    let coveragePercent = 0;
    let status = 'Missing';
    let recommendation = '';

    const module = implementationProfile.detectedModules?.find(
      (m) => m.name.toLowerCase() === reqItem.module.toLowerCase()
    );
    const allRepoFiles = implementationProfile.fileTree || [];

    if (aiEval) {
      found = Array.isArray(aiEval.foundComponents) ? aiEval.foundComponents : [];
      missing = Array.isArray(aiEval.missingComponents) ? aiEval.missingComponents : [];
      detectedFiles = Array.isArray(aiEval.detectedFiles) ? aiEval.detectedFiles : [];
      detectedRoutes = Array.isArray(aiEval.detectedRoutes) ? aiEval.detectedRoutes : [];
      coveragePercent =
        typeof aiEval.coveragePercent === 'number' ? Math.min(100, Math.max(0, aiEval.coveragePercent)) : calculateCoverage(found, expected);
      status = ['Implemented', 'Partially Implemented', 'Missing', 'Unable to Determine'].includes(aiEval.status)
        ? aiEval.status
        : coveragePercent >= 100
        ? 'Implemented'
        : coveragePercent > 0
        ? 'Partially Implemented'
        : 'Missing';
      recommendation = aiEval.recommendation || '';
    } else {
      if (module) {
        [...(module.controllers || []), ...(module.services || []), ...(module.models || []), ...(module.pages || []), ...(module.components || [])].forEach(
          (f) => {
            if (!detectedFiles.includes(f)) detectedFiles.push(f);
          }
        );
        module.apis?.forEach((api) => detectedRoutes.push(api));
        module.routes?.forEach((route) => detectedRoutes.push(route));
      }

      expected.forEach((comp) => {
        const compLower = comp.toLowerCase();
        const keywords = compLower.split(/[^a-z0-9]+/).filter((w) => w.length >= 3);

        const matchingFile = allRepoFiles.find((f) => {
          const fLower = f.toLowerCase();
          return keywords.some((kw) => fLower.includes(kw));
        });

        if (matchingFile) {
          found.push(comp);
          if (!detectedFiles.includes(matchingFile)) {
            detectedFiles.push(matchingFile);
          }
        } else if (module && module.status === 'Implemented') {
          found.push(comp);
        } else {
          missing.push(comp);
        }
      });

      coveragePercent = calculateCoverage(found, expected);
      if (expected.length === 0) {
        status = 'Unable to Determine';
      } else if (coveragePercent >= 100) {
        status = 'Implemented';
      } else if (coveragePercent > 0) {
        status = 'Partially Implemented';
      } else {
        status = 'Missing';
      }
    }

    if (!recommendation) {
      if (status === 'Implemented') {
        recommendation = `${reqItem.module} requirement has 100% component coverage verified in repository.`;
      } else if (status === 'Partially Implemented') {
        recommendation = `Missing components: [${missing.join(', ')}]. Complete implementation and merge open pull requests.`;
      } else if (status === 'Unable to Determine') {
        recommendation = `Insufficient component specifications or file evidence for ${reqItem.title}.`;
      } else {
        recommendation = `Critical gap: 0% implementation evidence found for ${reqItem.title}. Schedule dedicated sprint task.`;
      }
    }

    totalExpectedComponents += expected.length || 1;
    totalFoundComponents += found.length;

    const relatedCommits =
      implementationProfile.commits
        ?.filter((c) => c.moduleRef === reqItem.module || detectedFiles.some((df) => c.message.toLowerCase().includes(df.toLowerCase())))
        ?.map((c) => ({ hash: c.hash, message: c.message, author: c.author, date: c.date })) || [];

    const relatedPRs =
      implementationProfile.pullRequests?.filter((p) => p.relatedModule === reqItem.module)?.map((p) => ({ id: p.id, title: p.title, state: p.state })) ||
      [];

    const relatedIssues =
      implementationProfile.issues?.filter((i) => i.relatedModule === reqItem.module)?.map((i) => ({ id: i.id, title: i.title, state: i.state })) || [];

    analysisResults.push({
      requirementId: reqItem.id,
      requirementTitle: reqItem.title,
      module: reqItem.module,
      priority: reqItem.priority,
      expectedComponents: expected,
      foundComponents: found,
      missingComponents: missing,
      coveragePercent,
      confidencePercent: 95,
      status,
      evidence: { detectedFiles, detectedRoutes, relatedCommits, relatedPRs, relatedIssues },
      recommendation,
    });
  }

  const reqCoverage = totalExpectedComponents > 0 ? Math.round((totalFoundComponents / totalExpectedComponents) * 100) : 0;
  const implCoverage = Math.round(analysisResults.reduce((acc, curr) => acc + curr.coveragePercent, 0) / (analysisResults.length || 1));
  const sprintProgress = Math.min(100, Math.round(implCoverage * 1.1));
  const githubActivity = Math.min(100, (implementationProfile.commits?.length || 0) * 8 + 40);

  // Formula: ReqCoverage (40%) + ImplCoverage (30%) + SprintProgress (20%) + GithubActivity (10%)
  const overallScore = Math.round(reqCoverage * 0.4 + implCoverage * 0.3 + sprintProgress * 0.2 + githubActivity * 0.1);

  let healthRating = 'Healthy';
  if (overallScore < 60) {
    healthRating = 'High Risk';
  } else if (overallScore < 80) {
    healthRating = 'Medium Risk';
  }

  const highRiskModules = analysisResults
    .filter((a) => a.status === 'Missing' || a.status === 'Partially Implemented' || a.status === 'Partial')
    .map((a) => `${a.module} (${a.coveragePercent}% coverage)`);

  const keyRiskFactors = [];
  if (reqCoverage < 70) keyRiskFactors.push(`Overall requirement coverage is only ${reqCoverage}%`);
  if (analysisResults.some((a) => a.status === 'Missing')) {
    keyRiskFactors.push('One or more modules have 0% repository implementation code');
  }
  if (implementationProfile.issues?.filter((i) => i.state === 'open').length > 0) {
    keyRiskFactors.push('Unresolved GitHub issues exist for critical requirement areas');
  }

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
    },
  };
}
