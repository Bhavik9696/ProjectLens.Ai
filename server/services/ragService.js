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
// This does not attempt to be a state-of-the-art retriever. It is
// intentionally simple and dependency-free so it's auditable: anyone can
// read this file and see exactly what can and cannot leave the server.
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
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
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

  // Always-included aggregate summary. Contains only rolled-up numbers —
  // no per-file, per-commit, or per-person detail — so it's safe to
  // include on every query regardless of retrieval score.
  chunks.push({
    id: 'health-summary',
    sensitivity: 'aggregate',
    text: `Project "${project?.name || 'Unknown'}" overall health: ${healthMetrics?.overallScore ?? 0}% (${healthMetrics?.healthRating || 'Unknown'}). Requirement coverage: ${healthMetrics?.requirementCoverage ?? 0}%. Implementation coverage: ${healthMetrics?.implementationCoverage ?? 0}%. Sprint progress: ${healthMetrics?.sprintProgress ?? 0}%. GitHub activity index: ${healthMetrics?.githubActivity ?? 0}%.`,
  });

  if (healthMetrics?.keyRiskFactors?.length) {
    chunks.push({
      id: 'risk-factors',
      sensitivity: 'aggregate',
      text: `Key risk factors: ${healthMetrics.keyRiskFactors.join('; ')}.`,
    });
  }

  // One chunk per requirement/analysis result. Evidence is limited to the
  // small set of filenames already computed to justify the status (not
  // the full repo tree), and commit/PR/issue evidence is reduced to a
  // bare count — no messages, titles, or author identities.
  for (const r of analysisResults) {
    const evidenceFiles = (r.evidence?.detectedFiles || []).slice(0, 3);
    const commitCount = r.evidence?.relatedCommits?.length || 0;
    const prCount = r.evidence?.relatedPRs?.length || 0;
    const issueCount = r.evidence?.relatedIssues?.length || 0;

    chunks.push({
      id: `requirement:${r.requirementId}`,
      sensitivity: 'requirement',
      text: [
        `Requirement ${r.requirementId} - "${r.requirementTitle}" (module: ${r.module}, priority: ${r.priority}).`,
        `Status: ${r.status}. Coverage: ${r.coveragePercent}%.`,
        r.missingComponents?.length ? `Missing components: ${r.missingComponents.join(', ')}.` : '',
        evidenceFiles.length ? `Evidence files: ${evidenceFiles.join(', ')}.` : 'No evidence files detected.',
        `Linked activity: ${commitCount} commit(s), ${prCount} pull request(s), ${issueCount} issue(s).`,
        r.recommendation ? `Recommendation: ${r.recommendation}` : '',
      ]
        .filter(Boolean)
        .join(' '),
    });
  }

  // One chunk per detected module — counts only, never raw file paths
  // beyond what's already surfaced in a requirement chunk above.
  for (const m of implementationProfile?.detectedModules || []) {
    chunks.push({
      id: `module:${m.name}`,
      sensitivity: 'module',
      text: `Module "${m.name}": status ${m.status}. ${m.commitsCount || 0} commits, ${m.prsCount || 0} pull requests, ${m.issuesCount || 0} issues associated with it.`,
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
export function retrieveRelevantChunks(chunks, query, { topK = 8, charBudget = 6000 } = {}) {
  const queryTokens = tokenize(query);
  const queryFreq = termFreq(queryTokens);

  const scored = chunks.map((chunk) => {
    if (chunk.id === 'health-summary') return { chunk, score: Infinity }; // always kept
    const chunkTokens = tokenize(chunk.text);
    const chunkFreq = termFreq(chunkTokens);
    return { chunk, score: cosineSim(queryFreq, chunkFreq) };
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
