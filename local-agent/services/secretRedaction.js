/**
 * Secret Redaction Service
 *
 * Prevents accidental leakage of environment variables, API keys, tokens,
 * database credentials, and private keys from file paths and content
 * before anything reaches Ollama.
 *
 * Only file-path metadata (not source content) is sent to Ollama,
 * so redaction here is a last safety net.
 */

const REDACT_PATTERNS = [
  // Connection strings
  /mongodb(\+srv)?:\/\/[^\s"']+/gi,
  /postgres:\/\/[^\s"']+/gi,
  /mysql:\/\/[^\s"']+/gi,
  /redis:\/\/[^\s"']+/gi,
  // API Keys / Tokens
  /(?:api[_-]?key|apikey|access[_-]?token|secret[_-]?key|auth[_-]?token)\s*[:=]\s*["']?[\w\-./+]{16,}["']?/gi,
  // Generic high-entropy strings (> 20 chars, all hex/base64)
  /["'](?:[A-Za-z0-9+/]{40,}={0,2})["']/g,
  // AWS
  /AKIA[A-Z0-9]{16}/g,
  // JWT
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
  // Bearer tokens
  /Bearer\s+[A-Za-z0-9\-._~+/]{20,}/gi,
  // .env-style VALUE=...
  /^[A-Z][A-Z0-9_]{3,40}\s*=\s*.{10,}$/gm,
];

/**
 * Redact secrets from a string.
 * @param {string} text
 * @returns {string}
 */
export function redact(text) {
  if (!text || typeof text !== 'string') return text;
  let result = text;
  for (const pattern of REDACT_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}

/**
 * Redact secrets from a file path string (usually just path segments — very safe).
 * @param {string} filePath
 * @returns {string}
 */
export function redactPath(filePath) {
  if (!filePath) return filePath;
  // .env files: never expose the name either
  return filePath.replace(/\.env(?:\.\w+)?/gi, '.env[REDACTED]');
}

/**
 * Returns true if the file path should be completely excluded from analysis.
 * @param {string} filePath
 * @returns {boolean}
 */
export function shouldExclude(filePath) {
  const excluded = /(\\.env|credentials|private[._-]?key|\\.pem|\\.key|\\.cert|secrets?\\.json|node_modules|\\.git|dist\/|build\/|\\.next\/|coverage\/)/i;
  return excluded.test(filePath);
}
