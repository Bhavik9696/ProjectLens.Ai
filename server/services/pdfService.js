/**
 * pdfService.js
 *
 * Extracts readable text from PDF buffers using pdf-parse.
 * Never calls buffer.toString('utf8') on raw PDF binary.
 *
 * Returns:
 *   { text, pageCount, charCount, success, error? }
 */

// pdf-parse is a CommonJS package; use createRequire to load it from ESM.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

// Markers that prove the buffer is raw PDF binary, not decoded text
const PDF_BINARY_MARKERS = ['%PDF-', '/FlateDecode', '/Type/Catalog', 'endstream', 'endobj'];

/**
 * Checks if a string looks like raw PDF binary garbage (not real text).
 */
function looksLikeBinaryGarbage(text) {
  if (!text || text.length < 20) return true;
  const sample = text.slice(0, 500);
  const binaryHits = PDF_BINARY_MARKERS.filter(m => sample.includes(m)).length;
  if (binaryHits >= 2) return true;

  // Check ratio of non-printable characters
  let nonPrintable = 0;
  for (let i = 0; i < Math.min(text.length, 1000); i++) {
    const c = text.charCodeAt(i);
    if (c < 9 || (c > 13 && c < 32) || c === 127) nonPrintable++;
  }
  return nonPrintable / Math.min(text.length, 1000) > 0.15;
}

/**
 * Extract readable text from a PDF buffer.
 *
 * @param {Buffer} buffer  - Raw PDF bytes
 * @param {string} filename - For logging
 * @returns {{ text: string, pageCount: number, charCount: number, success: boolean, error?: string }}
 */
export async function extractPdfText(buffer, filename = 'document.pdf') {
  console.log(`[PDF] Processing: ${filename} | size: ${buffer.length} bytes`);

  let parsed;
  try {
    parsed = await pdfParse(buffer, {
      // Prevent pdf-parse from trying to load test fixtures
      max: 0,
    });
  } catch (err) {
    console.error(`[PDF] Parse failed for ${filename}:`, err.message);
    return {
      text: '',
      pageCount: 0,
      charCount: 0,
      success: false,
      error: `PDF parsing failed: ${err.message}`,
    };
  }

  const rawText = parsed.text || '';
  const pageCount = parsed.numpages || 0;

  console.log(`[PDF] ${filename} | pages: ${pageCount} | raw chars: ${rawText.length}`);

  if (!rawText || rawText.trim().length < 50) {
    console.warn(`[PDF] ${filename}: very short text — may be a scanned/image PDF`);
    return {
      text: '',
      pageCount,
      charCount: 0,
      success: false,
      error: 'OCR_REQUIRED',
    };
  }

  if (looksLikeBinaryGarbage(rawText)) {
    console.warn(`[PDF] ${filename}: extracted text looks like binary garbage`);
    return {
      text: '',
      pageCount,
      charCount: 0,
      success: false,
      error: 'Unable to extract readable text from this PDF. It may be scanned or unsupported.',
    };
  }

  // Clean the extracted text
  const cleaned = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove form-feed characters
    .replace(/\f/g, '\n\n')
    // Collapse excessive blank lines (>2 in a row)
    .replace(/\n{3,}/g, '\n\n')
    // Remove null bytes and other control chars (keep \t and \n)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();

  console.log(`[PDF] ${filename} | cleaned chars: ${cleaned.length} | success: true`);

  return {
    text: cleaned,
    pageCount,
    charCount: cleaned.length,
    success: true,
  };
}
