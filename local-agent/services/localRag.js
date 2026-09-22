// ─────────────────────────────────────────────────────────────────────────────
// Local RAG Service
//
// TF-IDF cosine similarity retrieval — the same algorithm used in the
// ProjectLens cloud ragService.js, adapted for local file chunks.
// No network calls, no cloud embeddings. 100% local.
// ─────────────────────────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'to', 'of', 'in', 'on', 'for', 'and', 'or', 'but', 'if', 'with', 'at',
  'by', 'from', 'this', 'that', 'it', 'as', 'do', 'does', 'did', 'what',
  'which', 'who', 'how', 'why', 'has', 'have', 'had', 'we', 'you', 'i',
  'const', 'let', 'var', 'function', 'return', 'import', 'export', 'default',
  'class', 'extends', 'new', 'null', 'undefined', 'true', 'false',
]);

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    // Keep REQ-NNN identifiers as a single token
    .replace(/req-(\\d+)/gi, 'req$1')
    .replace(/[^a-z0-9\\s]/g, ' ')
    .split(/\\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function termFreq(tokens) {
  const freq = {};
  for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
  return freq;
}

function cosineSim(freqA, freqB) {
  const keysA = Object.keys(freqA);
  if (keysA.length === 0 || Object.keys(freqB).length === 0) return 0;
  let dot = 0;
  for (const k of keysA) {
    if (freqB[k]) dot += freqA[k] * freqB[k];
  }
  const magA = Math.sqrt(keysA.reduce((s, k) => s + freqA[k] ** 2, 0));
  const magB = Math.sqrt(Object.values(freqB).reduce((s, v) => s + v ** 2, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

/**
 * Builds a list of searchable "chunks" from local file content.
 * Each chunk covers one file (or a window of lines for large files).
 *
 * @param {Array<{ path: string, content: string }>} files
 * @param {number} [windowLines=80]  Lines per chunk for large files
 * @returns {Array<{ id: string, filePath: string, text: string, startLine: number }>}
 */
export function buildLocalIndex(files, windowLines = 80) {
  const chunks = [];

  for (const { path: filePath, content } of files) {
    if (!content) continue;

    const lines = content.split('\\n');
    if (lines.length <= windowLines) {
      chunks.push({ id: filePath, filePath, text: content, startLine: 0 });
    } else {
      // Slide a window for large files
      for (let i = 0; i < lines.length; i += Math.floor(windowLines / 2)) {
        const slice = lines.slice(i, i + windowLines).join('\\n');
        chunks.push({
          id: `${filePath}#L${i + 1}`,
          filePath,
          text: slice,
          startLine: i + 1,
        });
        if (i + windowLines >= lines.length) break;
      }
    }
  }

  return chunks;
}

/**
 * Retrieves top-K chunks most relevant to the given query text.
 * The query is typically the requirement title + description + criteria.
 *
 * @param {Array<{ id, filePath, text, startLine }>} chunks
 * @param {string}  query
 * @param {{ topK?: number, charBudget?: number }} opts
 * @returns {Array<{ id, filePath, text, startLine, score }>}
 */
export function retrieveRelevantChunks(chunks, query, { topK = 12, charBudget = 12_000 } = {}) {
  const queryFreq = termFreq(tokenize(query));

  const scored = chunks.map((chunk) => ({
    ...chunk,
    score: cosineSim(queryFreq, termFreq(tokenize(chunk.text))),
  }));

  scored.sort((a, b) => b.score - a.score);

  const selected = [];
  let usedChars = 0;

  for (const chunk of scored) {
    if (chunk.score <= 0) break;
    if (selected.length >= topK) break;
    if (usedChars + chunk.text.length > charBudget) continue;
    selected.push(chunk);
    usedChars += chunk.text.length;
  }

  return selected;
}

/**
 * Builds a query string from a requirement for retrieval.
 * @param {{ title, module, description, acceptanceCriteria }} req
 * @returns {string}
 */
export function buildRequirementQuery(req) {
  const parts = [
    req.title || '',
    req.module || '',
    req.description || '',
    ...(req.acceptanceCriteria || []),
    req.actor || '',
    req.action || '',
    req.object || '',
  ];
  return parts.filter(Boolean).join(' ');
}
