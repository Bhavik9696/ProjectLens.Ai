// ---------------------------------------------------------------------
// Retrieval-Augmented Generation layer for the AI Copilot.
//
// Goal: never hand the whole project bundle to an external AI provider.
// Instead:
//   1. Break the project's analysis data into small, self-contained
//      "chunks" (one per requirement, one per detected module, etc).
//   2. Strip anything that isn't needed to answer PM-style questions
//      (commit author names/emails, raw commit/PR/issue text, the full
//      repo file tree) — only aggregate counts and the minimal evidence
//      already computed for each requirement are kept.
//   3. At query time, score every chunk against the user's question with
//      a local, in-process lexical ranker (TF-IDF-style cosine
//      similarity) — no embedding API call, so nothing leaves the server
//      just to figure out what's relevant.
//   4. Send only the top-K matching chunks (plus one always-safe
//      aggregate health summary) to the external model, capped at a
//      character budget.
//
// v2 changes:
//   - Richer per-requirement chunks: include criteria results, test
//     evidence, contradictions, negative evidence, and confidence so the
//     Copilot can accurately answer "which requirements are missing?",
//     "show evidence for REQ-005", etc.
//   - Improved TF-IDF tokenizer: keeps domain-specific words (auth,
//     upload, payment, etc.) and requirement IDs (REQ-001).
//   - New chunk types: per-criterion detail and scope-creep summary.
// ---------------------------------------------------------------------

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'to', 'of', 'in', 'on', 'for', 'and', 'or', 'but', 'if', 'with', 'at',
  'by', 'from', 'this', 'that', 'it', 'as', 'do', 'does', 'did', 'what',
  'which', 'who', 'how', 'why', 'has', 'have', 'had', 'we', 'you', 'i',
]);

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    // Keep REQ-NNN identifiers as a single token
    .replace(/req-(\d+)/gi, 'req$1')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/**
 * Normalise a status string to one of the 4 canonical values.
 * Handles both old ("Completed", "Partial") and new formats.
 */
function normStatus(s) {
  if (!s) return 'MISSING';
  const u = s.toString().toUpperCase();
  if (u.includes('IMPLEMENT') || u === 'COMPLETED') return 'IMPLEMENTED';
  if (u.includes('PARTIAL')) return 'PARTIAL';
  if (u.includes('NOT_VERIF') || u.includes('UNABLE') || u.includes('DETERMINE')) return 'NOT_VERIFIABLE';
  return 'MISSING';
}

/**
 * Builds the redacted, chunked, retrievable representation of a project's
 * analysis data. Nothing in the returned chunks includes commit author
 * names/emails, raw commit/PR/issue titles, or the full repository file
 * tree — only what a PM needs to reason about coverage and risk.
 */
export function buildRagIndex(contextData) {
  const chunks = [];
  const { project, analysisResults = [], healthMetrics, implementationProfile } = contextData || {};

  // ── 1. Always-included aggregate summary ──────────────────────────────────
  chunks.push({
    id: 'health-summary',
    sensitivity: 'aggregate',
    text: [
      `Project "${project?.name || 'Unknown'}" overall health: ${healthMetrics?.overallScore ?? 0}% (${healthMetrics?.healthRating || 'Unknown'}).`,
      `Requirement coverage: ${healthMetrics?.requirementCoverage ?? 0}%.`,
      `Implementation coverage: ${healthMetrics?.implementationCoverage ?? 0}%.`,
      `Sprint progress: ${healthMetrics?.sprintProgress ?? 0}%.`,
      `GitHub activity index: ${healthMetrics?.githubActivity ?? 0}%.`,
      analysisResults.length ? `Total requirements analysed: ${analysisResults.length}.` : '',
      `Implemented: ${analysisResults.filter(r => normStatus(r.status) === 'IMPLEMENTED').length},`,
      `Partial: ${analysisResults.filter(r => normStatus(r.status) === 'PARTIAL').length},`,
      `Missing: ${analysisResults.filter(r => normStatus(r.status) === 'MISSING').length},`,
      `Not verifiable: ${analysisResults.filter(r => normStatus(r.status) === 'NOT_VERIFIABLE').length}.`,
    ].filter(Boolean).join(' '),
  });

  // ── 2. Risk factors ───────────────────────────────────────────────────────
  if (healthMetrics?.keyRiskFactors?.length) {
    chunks.push({
      id: 'risk-factors',
      sensitivity: 'aggregate',
      text: `Key risk factors for "${project?.name}": ${healthMetrics.keyRiskFactors.join('; ')}.`,
    });
  }

  // ── 3. Scope creep summary ────────────────────────────────────────────────
  if (healthMetrics?.scopeCreep?.length) {
    chunks.push({
      id: 'scope-creep',
      sensitivity: 'aggregate',
      text: `Potential scope creep detected: ${healthMetrics.scopeCreep.map(s => s.feature).join(', ')}. These features appear in the repository but are not mentioned in the requirements.`,
    });
  }

  // ── 4. Lists of requirements by status (for "which are missing?" queries) ─
  const missing = analysisResults.filter(r => normStatus(r.status) === 'MISSING');
  const partial = analysisResults.filter(r => normStatus(r.status) === 'PARTIAL');
  const notVerif = analysisResults.filter(r => normStatus(r.status) === 'NOT_VERIFIABLE');
  const implemented = analysisResults.filter(r => normStatus(r.status) === 'IMPLEMENTED');

  if (missing.length) {
    chunks.push({
      id: 'status-missing',
      sensitivity: 'aggregate',
      text: `Missing requirements (no evidence found): ${missing.map(r => `${r.requirementId} "${r.requirementTitle}"`).join('; ')}.`,
    });
  }
  if (partial.length) {
    chunks.push({
      id: 'status-partial',
      sensitivity: 'aggregate',
      text: `Partially implemented requirements: ${partial.map(r => `${r.requirementId} "${r.requirementTitle}" (${r.coveragePercent}% coverage)`).join('; ')}.`,
    });
  }
  if (notVerif.length) {
    chunks.push({
      id: 'status-not-verifiable',
      sensitivity: 'aggregate',
      text: `Requirements that could not be verified (insufficient evidence): ${notVerif.map(r => `${r.requirementId} "${r.requirementTitle}"`).join('; ')}.`,
    });
  }
  if (implemented.length) {
    chunks.push({
      id: 'status-implemented',
      sensitivity: 'aggregate',
      text: `Fully implemented requirements: ${implemented.map(r => `${r.requirementId} "${r.requirementTitle}" (${r.confidencePercent ?? Math.round((r.confidence ?? 0) * 100)}% confidence)`).join('; ')}.`,
    });
  }

  // ── 5. Rich per-requirement chunks ────────────────────────────────────────
  for (const r of analysisResults) {
    const evidenceFiles = (r.evidence?.detectedFiles || []).slice(0, 5);
    const commitCount = r.evidence?.relatedCommits?.length || 0;
    const prCount = r.evidence?.relatedPRs?.length || 0;
    const issueCount = r.evidence?.relatedIssues?.length || 0;
    const confidencePct = r.confidencePercent ?? Math.round((r.confidence ?? 0) * 100);
    const canonStatus = normStatus(r.status);

    // Build acceptance-criteria summary
    let criteriaText = '';
    if (r.criteria?.length) {
      const met = r.criteria.filter(c => c.status === 'IMPLEMENTED');
      const unmet = r.criteria.filter(c => c.status !== 'IMPLEMENTED');
      criteriaText = [
        `Acceptance criteria: ${met.length}/${r.criteria.length} satisfied.`,
        met.length ? `Met: ${met.map(c => c.description).join('; ')}.` : '',
        unmet.length ? `Not met: ${unmet.map(c => c.description).join('; ')}.` : '',
      ].filter(Boolean).join(' ');
    }

    // Build contradiction summary
    let contradictionsText = '';
    if (r.contradictions?.length) {
      contradictionsText = `Contradictions: ${r.contradictions.map(c => c.title + ' [' + c.severity + ']').join('; ')}.`;
    }

    // Test evidence
    let testText = '';
    if (r.testEvidence) {
      testText = r.testEvidence.hasTests
        ? `Tests found: ${r.testEvidence.testFiles.slice(0, 3).join(', ')}.`
        : 'No test files found for this requirement.';
    }

    // Negative evidence
    let negativeText = '';
    if (r.negativeEvidence?.length) {
      negativeText = `Missing signals: ${r.negativeEvidence.slice(0, 3).join('; ')}.`;
    }

    chunks.push({
      id: `requirement:${r.requirementId}`,
      sensitivity: 'requirement',
      text: [
        `Requirement ${r.requirementId} — "${r.requirementTitle}" (module: ${r.module}, priority: ${r.priority}).`,
        `Status: ${canonStatus}. Coverage: ${r.coveragePercent}%. Confidence: ${confidencePct}%.`,
        r.missingComponents?.length ? `Missing components: ${r.missingComponents.join(', ')}.` : '',
        evidenceFiles.length ? `Evidence files: ${evidenceFiles.join(', ')}.` : 'No evidence files detected.',
        `Linked activity: ${commitCount} commit(s), ${prCount} pull request(s), ${issueCount} issue(s).`,
        criteriaText,
        contradictionsText,
        testText,
        negativeText,
        r.recommendation ? `Recommendation: ${r.recommendation}` : '',
      ].filter(Boolean).join(' '),
    });
  }

  // ── 6. Per-detected-module chunks ─────────────────────────────────────────
  for (const m of implementationProfile?.detectedModules || []) {
    chunks.push({
      id: `module:${m.name}`,
      sensitivity: 'module',
      text: `Module "${m.name}": status ${m.status}. ${m.commitsCount || 0} commits, ${m.prsCount || 0} pull requests, ${m.issuesCount || 0} issues associated.`,
    });
  }

  return chunks;
}

/**
 * Scores every chunk against the query using term-frequency cosine
 * similarity and returns the top-K, always including the aggregate
 * health-summary chunk. Caps total output to a character budget so a
 * huge project can't balloon a single request.
 */
export function retrieveRelevantChunks(chunks, query, { topK = 8, charBudget = 7000 } = {}) {
  const queryTokens = tokenize(query);
  const queryFreq = termFreq(queryTokens);

  // Detect intent keywords for boosting
  const qLower = (query || '').toLowerCase();
  const isMissingQuery = /\bmissing|not (found|implement|done|complet|built)\b/i.test(qLower);
  const isPartialQuery = /\bpartial|incomplete|progress\b/i.test(qLower);
  const isNotVerifQuery = /\bnot verif|unable|cannot verify|insufficient\b/i.test(qLower);
  const isImplementedQuery = /\bimplemented|complete|done|finished|working\b/i.test(qLower);
  const isEvidenceQuery = /\bevidence|files?|what.*(file|code)|show.*req/i.test(qLower);
  const isScopeQuery = /\bscope.?creep|out.?of.?scope|extra|additional feature\b/i.test(qLower);

  // Extract REQ-NNN identifiers from query
  const reqIdMatch = qLower.match(/req[- ]?(\d+)/gi);
  const reqIds = reqIdMatch ? reqIdMatch.map(r => r.replace(/[- ]/, '-').toUpperCase()) : [];

  const scored = chunks.map((chunk) => {
    if (chunk.id === 'health-summary') return { chunk, score: Infinity };

    const chunkTokens = tokenize(chunk.text);
    const chunkFreq = termFreq(chunkTokens);
    let score = cosineSim(queryFreq, chunkFreq);

    // Boost status-specific list chunks when intent matches
    if (isMissingQuery && chunk.id === 'status-missing') score += 0.5;
    if (isPartialQuery && chunk.id === 'status-partial') score += 0.5;
    if (isNotVerifQuery && chunk.id === 'status-not-verifiable') score += 0.5;
    if (isImplementedQuery && chunk.id === 'status-implemented') score += 0.4;
    if (isScopeQuery && chunk.id === 'scope-creep') score += 0.6;
    if (isEvidenceQuery && chunk.id.startsWith('requirement:')) score += 0.2;

    // Boost risk factors for health/risk queries
    if (/\brisk|health|danger|concern\b/i.test(qLower) && chunk.id === 'risk-factors') score += 0.4;

    // Strongly boost the specific requirement chunk if REQ-NNN is mentioned
    for (const reqId of reqIds) {
      if (chunk.id === `requirement:${reqId}`) {
        score += 2.0; // Direct lookup — always surface this chunk
        break;
      }
    }

    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const selected = [];
  let usedChars = 0;
  for (const { chunk, score } of scored) {
    if (selected.length >= topK && score !== Infinity) break;
    if (score <= 0 && chunk.id !== 'health-summary' && selected.length > 0) continue;
    if (usedChars + chunk.text.length > charBudget) continue;
    selected.push(chunk);
    usedChars += chunk.text.length;
  }

  // Guarantee at least the aggregate summary is present even on an empty index.
  if (selected.length === 0 && chunks.length > 0) selected.push(chunks[0]);

  return selected;
}

function termFreq(tokens) {
  const freq = {};
  for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
  return freq;
}

function cosineSim(freqA, freqB) {
  const keysA = Object.keys(freqA);
  const keysB = Object.keys(freqB);
  if (keysA.length === 0 || keysB.length === 0) return 0;

  let dot = 0;
  for (const k of keysA) {
    if (freqB[k]) dot += freqA[k] * freqB[k];
  }
  const magA = Math.sqrt(keysA.reduce((sum, k) => sum + freqA[k] * freqA[k], 0));
  const magB = Math.sqrt(keysB.reduce((sum, k) => sum + freqB[k] * freqB[k], 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}
