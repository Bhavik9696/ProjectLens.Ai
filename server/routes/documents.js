import { Router } from 'express';
import { parseDocument } from '../services/documentService.js';
import { extractPdfText } from '../services/pdfService.js';

const router = Router();

/**
 * POST /api/documents/parse
 *
 * Body (JSON):
 *   documentName  - string
 *   documentType  - 'SRS' | 'PRD' | ...
 *   fileType      - 'PDF' | 'TXT' | 'MD' | 'DOCX'
 *   content       - string  (plain text for TXT/MD/DOCX)
 *   pdfBase64     - string  (base64 for PDF uploads, mutually exclusive with content)
 */
router.post('/parse', async (req, res) => {
  try {
    const { documentName, documentType, fileType, content, pdfBase64 } = req.body;

    const isPdf = fileType === 'PDF' || (documentName && documentName.toLowerCase().endsWith('.pdf'));

    // ── PDF path ─────────────────────────────────────────────────────────────
    if (isPdf && pdfBase64) {
      console.log(`[Documents] PDF upload received: ${documentName}`);

      let buffer;
      try {
        buffer = Buffer.from(pdfBase64, 'base64');
      } catch (e) {
        return res.status(400).json({ error: 'Invalid base64 PDF data.' });
      }

      const extracted = await extractPdfText(buffer, documentName);

      if (!extracted.success) {
        if (extracted.error === 'OCR_REQUIRED') {
          return res.status(422).json({
            error: 'OCR_REQUIRED',
            message:
              'This PDF appears to be a scanned image. Text cannot be extracted without OCR. ' +
              'Please use a text-based PDF or copy-paste the content as plain text.',
          });
        }
        return res.status(422).json({
          error: 'PDF_UNREADABLE',
          message: extracted.error || 'Unable to extract readable text from this PDF.',
        });
      }

      console.log(
        `[Documents] PDF text extracted | file: ${documentName} | ` +
        `pages: ${extracted.pageCount} | chars: ${extracted.charCount}`
      );

      const result = await parseDocument({
        documentName,
        documentType,
        content: extracted.text,
        fileType: 'PDF',
        pageCount: extracted.pageCount,
      });

      return res.json({ ...result, pageCount: extracted.pageCount, charCount: extracted.charCount });
    }

    // ── Text / DOCX / MD path ────────────────────────────────────────────────
    if (!content) {
      return res.status(400).json({ error: 'Document content is required.' });
    }

    // Guard: reject if caller accidentally sent raw PDF binary as text
    if (
      content.startsWith('%PDF-') ||
      (content.includes('/FlateDecode') && content.includes('/Type/Catalog'))
    ) {
      return res.status(400).json({
        error: 'PDF_BINARY_AS_TEXT',
        message:
          'Received raw PDF binary as text. Please use the pdfBase64 field for PDF uploads.',
      });
    }

    console.log(`[Documents] Text document received: ${documentName} | fileType: ${fileType} | chars: ${content.length}`);

    const result = await parseDocument({ documentName, documentType, content, fileType });
    return res.json(result);

  } catch (error) {
    console.error('[Documents] parse error:', error.message, error.stack);
    res.status(500).json({ error: error.message || 'Failed to process document' });
  }
});

export default router;
