/**
 * Local Engine Service
 *
 * Runs privacy-safe requirement analysis using Ollama.
 * Key privacy guarantee: ONLY file paths (metadata) are sent to Ollama.
 * Source file content is NEVER transmitted.
 */

import { generate } from './ollamaService.js';
import { redactPath, shouldExclude } from './secretRedaction.js';

const DEFAULT_MODEL = process.env.OLLAMA_DEFAULT_MODEL || process.env.OLLAMA_MODEL || 'llama3.1:8b';

// ── Keyword extraction ────────────────────────────────────────────────────────
function extractKeywords(text) {
  if (!text) return [];
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'be', 'are', 'were',
    'that', 'this', 'it', 'its', 'all', 'any', 'has', 'have', 'had',
    'can', 'shall', 'should', 'must', 'will', 'would', 'may', 'might',
  ]);
  return text
    .toLowerCase()
    .split(/[\s\-_.,;:!?()[\]{}"'/\\]+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));
}

// ── File scoring ──────────────────────────────────────────────────────────────
function scoreFile(filePath, keywords) {
  const lower = filePath.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (lower.includes(kw)) score += kw.length >= 6 ? 2 : 1;
  }
  if (/\.(controller|service|route|handler|model|store|slice|action)\.(js|ts|jsx|tsx)$/i.test(filePath)) score += 1;
  if (/\.(test|spec|stories)\.(js|ts|jsx|tsx)$/i.test(filePath)) score -= 1;
  if (/(package-lock|yarn\.lock|\.lock|\.json)$/.test(filePath)) score -= 2;
  return score;
}

// ── Status normaliser ─────────────────────────────────────────────────────────
function normaliseStatus(raw) {
  if (!raw) return 'Missing';
  const s = String(raw).trim().toUpperCase();
  if (s.startsWith('IMPLEMENT')) return 'Implemented';
  if (s.includes('PARTIAL')) return 'Partially Implemented';
  if (s.includes('NOT_VERIF') || s.includes('UNABLE')) return 'Unable to Determine';
  return 'Missing';
}

// ── Deterministic file matching ───────────────────────────────────────────────
function deterministicCoverage(requirement, fileTree) {
  const keywords = extractKeywords(
    `${requirement.title} ${requirement.module} ${(requirement.expectedComponents || []).join(' ')}`
  );
  const matched = fileTree
    .filter((f) => !shouldExclude(f))
    .map((f) => ({ path: f, score: scoreFile(f, keywords) }))
    .filter((f) => f.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);
  return { matched, keywords };
}

// ── Ollama prompt builder ─────────────────────────────────────────────────────
function buildPrompt(requirement, matchedFiles, repoMeta) {
  const fileList = matchedFiles
    .map((f) => `  - ${redactPath(f.path)} (relevance: ${f.score})`)
    .join('\n') || '  (no directly matched files)';

  const expectedComponents = (requirement.expectedComponents || []).join(', ') || 'N/A';
  const acceptanceCriteria = (requirement.acceptanceCriteria || []).map((c, i) => `  ${i + 1}. ${c}`).join('\n') || '  (none specified)';

  return `You are a senior software architect performing a code coverage analysis.
Analyze whether the requirement below is implemented in the repository based ONLY on file path metadata.
Do NOT hallucinate — if uncertain, mark it as "Partially Implemented" or "Unable to Determine".

## Repository
- Repo: ${repoMeta.repoName || 'Unknown'}
- Total files: ${repoMeta.totalFiles || '?'}
- Tech stack hint: ${repoMeta.techStack || 'Unknown'}

## Requirement
- ID: ${requirement.id}
- Title: ${requirement.title}
- Module: ${requirement.module}
- Priority: ${requirement.priority}
- Description: ${requirement.description || 'N/A'}
- Expected Components: ${expectedComponents}
- Acceptance Criteria:
${acceptanceCriteria}

## Most Relevant Files Found (paths only)
${fileList}

## Instructions
Return a JSON object with EXACTLY these fields (no extra text):
{
  "status": "Implemented" | "Partially Implemented" | "Missing" | "Unable to Determine",
  "coveragePercent": <integer 0-100>,
  "confidence": <float 0.0-1.0>,
  "foundComponents": [<component names found>],
  "missingComponents": [<component names missing>],
  "recommendation": "<one sentence action item>",
  "reasoning": "<2-3 sentences explaining why>"
}

JSON only, no markdown, no extra text:`;
}

// ── Parse Ollama JSON response ────────────────────────────────────────────────
function parseOllamaResponse(text) {
  const clean = text.trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

// ── Health metrics ────────────────────────────────────────────────────────────
function calculateHealthMetrics(analysisResults) {
  if (!analysisResults.length) {
    return {
      requirementCoverage: 0, implementationCoverage: 0,
      sprintProgress: 0, githubActivity: 0,
      overallScore: 0, healthRating: 'High Risk',
      highRiskModules: [], keyRiskFactors: ['No requirements analyzed'], scopeCreep: [],
    };
  }
  const total = analysisResults.length;
  const implemented = analysisResults.filter((r) => r.status === 'Implemented').length;
  const partial = analysisResults.filter((r) => r.status === 'Partially Implemented').length;
  const requirementCoverage = Math.round(((implemented + partial * 0.5) / total) * 100);
  const implementationCoverage = Math.round(analysisResults.reduce((s, r) => s + (r.coveragePercent || 0), 0) / total);
  const overallScore = Math.round(requirementCoverage * 0.4 + implementationCoverage * 0.3 + 50 * 0.3);
  const highRiskModules = [...new Set(analysisResults.filter((r) => r.status === 'Missing').map((r) => r.module))].slice(0, 5);
  const keyRiskFactors = [];
  if (requirementCoverage < 50) keyRiskFactors.push('More than half of requirements are unimplemented');
  if (highRiskModules.length > 0) keyRiskFactors.push(`High-risk modules: ${highRiskModules.join(', ')}`);
  if (keyRiskFactors.length === 0) keyRiskFactors.push('Coverage looks good — keep monitoring');
  return {
    requirementCoverage, implementationCoverage,
    sprintProgress: 50, githubActivity: 50,
    overallScore, healthRating: overallScore >= 70 ? 'Healthy' : overallScore >= 45 ? 'Medium Risk' : 'High Risk',
    highRiskModules, keyRiskFactors, scopeCreep: [],
  };
}

// ── Main entry point ──────────────────────────────────────────────────────────
export async function runPrivacyAnalysis(requirements, implementationProfile, ollamaModel) {
  const model = ollamaModel || DEFAULT_MODEL;
  const fileTree = (implementationProfile.fileTree || []).filter((f) => !shouldExclude(f));

  const repoMeta = {
    repoName: implementationProfile.repoName || 'Unknown',
    totalFiles: fileTree.length,
    techStack: (implementationProfile.detectedModules || []).map((m) => m.name).slice(0, 5).join(', '),
  };

  const analysisResults = [];

  for (const req of requirements) {
    const { matched } = deterministicCoverage(req, fileTree);
    let aiResult = null;

    if (matched.length > 0) {
      try {
        const prompt = buildPrompt(req, matched, repoMeta);
        const rawText = await generate(prompt, model, 90_000);
        aiResult = parseOllamaResponse(rawText);
      } catch (err) {
        console.warn(`[localEngine] Ollama failed for ${req.id}:`, err.message);
      }
    }

    const hasMeaningfulMatch = matched.some((f) => f.score >= 2);
    const deterministicStatus = hasMeaningfulMatch
      ? matched.length >= 3 ? 'Implemented' : 'Partially Implemented'
      : 'Missing';

    analysisResults.push({
      requirementId: req.id,
      requirementTitle: req.title,
      module: req.module || 'General',
      priority: req.priority || 'Medium',
      expectedComponents: req.expectedComponents || [],
      foundComponents: aiResult?.foundComponents || matched.slice(0, 5).map((f) => f.path.split('/').pop()),
      missingComponents: aiResult?.missingComponents || req.expectedComponents?.slice(0, 3) || [],
      coveragePercent: aiResult?.coveragePercent ?? (hasMeaningfulMatch ? Math.min(matched.length * 15, 80) : 0),
      confidencePercent: Math.round((aiResult?.confidence ?? (hasMeaningfulMatch ? 0.6 : 0.3)) * 100),
      confidence: aiResult?.confidence ?? (hasMeaningfulMatch ? 0.6 : 0.3),
      status: normaliseStatus(aiResult?.status) || deterministicStatus,
      evidence: {
        detectedFiles: matched.slice(0, 10).map((f) => redactPath(f.path)),
        detectedRoutes: [], relatedCommits: [], relatedPRs: [], relatedIssues: [],
      },
      recommendation: aiResult?.recommendation || (hasMeaningfulMatch
        ? `Verify ${req.title} implementation covers all acceptance criteria.`
        : `No implementation found for ${req.title}. Add required components.`),
      privacyMode: true,
    });
  }

  return { analysisResults, healthMetrics: calculateHealthMetrics(analysisResults) };
}
