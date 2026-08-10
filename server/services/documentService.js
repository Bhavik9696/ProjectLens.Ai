import { generateContentWithRetry, isGeminiConfigured } from './geminiService.js';
import { extractRequirementsHeuristically, splitDocumentIntoSections, generateAcceptanceCriteria } from './heuristics.js';

/**
 * parseDocument
 *
 * Takes cleaned document text and extracts structured software requirements.
 * Never receives raw PDF binary — PDF extraction is handled upstream in
 * pdfService.js before this function is called.
 *
 * @param {object} opts
 * @param {string} opts.documentName
 * @param {string} opts.documentType
 * @param {string} opts.content       - Cleaned plain text
 * @param {string} [opts.fileType]    - 'PDF' | 'TXT' | 'MD' | 'DOCX'
 * @param {number} [opts.pageCount]   - For logging; populated by pdfService
 */
export async function parseDocument({ documentName, documentType, content, fileType, pageCount }) {
  const fileInfo = fileType ? `[${fileType}${pageCount ? `, ${pageCount} pages` : ''}]` : '';
  console.log(`[DocumentService] Parsing: ${documentName} ${fileInfo} | chars: ${content?.length}`);

  const sections = splitDocumentIntoSections(content);

  let extractedRequirements = [];

  if (isGeminiConfigured()) {
    try {
      // Use up to 8000 characters of the document body — enough for most SRS docs.
      // The prompt explicitly tells Gemini to ignore non-requirement content.
      const documentSample = content.substring(0, 8000);

      const prompt = `You are a software requirements analyst. Analyze the following software specification document and extract ONLY actual software requirements.

DOCUMENT: "${documentName}" (Type: ${documentType})

EXTRACT ONLY:
- Functional requirements (features users/system must do)
- Non-functional requirements (performance, security, scalability)
- Business rules
- Integration requirements
- User/Admin features
- Explicit acceptance criteria

DO NOT EXTRACT:
- Cover page content
- Introduction or background sections
- Project objectives / goals
- General explanations or rationale
- Team information / acknowledgements
- References / bibliography
- Diagrams or table captions (unless they define a requirement)
- Repeated/duplicate requirements (deduplicate them)

RULES:
1. Extract between 3 and 12 requirements. If the document has fewer real requirements, extract only those.
2. Do NOT hallucinate. Only extract requirements explicitly stated in the document.
3. If a requirement appears multiple times, deduplicate it and keep the most complete version.
4. Assign sequential IDs: REQ-001, REQ-002, etc.
5. For each requirement, identify the actor (who), action (what they do), and object (what is acted on).
6. Generate 4-6 specific, testable acceptance criteria per requirement.

Return a JSON array. Each object MUST have these exact keys:
- "id": string ("REQ-001", "REQ-002", ...)
- "title": string (clear title, max 60 chars)
- "module": string (e.g. "Authentication", "Payment", "Dashboard", "User Management")
- "priority": string ("High", "Medium", or "Low")
- "category": string ("Functional" or "Non-Functional")
- "expectedComponents": string[] (code components expected: APIs, UI components, services, middleware)
- "description": string (complete requirement description from the document)
- "actor": string (who: "user", "admin", "system", "registered user", etc.)
- "action": string (what action: "login", "upload", "process payment", etc.)
- "object": string (what is acted on: "account", "document", "order", etc.)
- "acceptanceCriteria": string[] (4-6 specific, testable criteria)
- "source": object with "section": string (section name from the document if identifiable)

Return ONLY the JSON array, no markdown, no extra text.

DOCUMENT TEXT:
${documentSample}`;

      const geminiRes = await generateContentWithRetry({
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      const rawText = geminiRes?.candidates?.[0]?.content?.parts?.[0]?.text
        || geminiRes?.text
        || '';

      if (rawText) {
        const cleaned = rawText.trim()
          .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

        const parsed = JSON.parse(cleaned);

        if (Array.isArray(parsed) && parsed.length > 0) {
          extractedRequirements = parsed.map((req, idx) => ({
            ...req,
            id:     req.id     || `REQ-${String(idx + 1).padStart(3, '0')}`,
            actor:  req.actor  || 'user',
            action: req.action || 'perform action',
            object: req.object || 'resource',
            acceptanceCriteria:
              Array.isArray(req.acceptanceCriteria) && req.acceptanceCriteria.length > 0
                ? req.acceptanceCriteria
                : generateAcceptanceCriteria(req.title || '', req.description || ''),
            source: req.source || {},
          }));

          console.log(`[DocumentService] Gemini extracted ${extractedRequirements.length} requirements from ${documentName}`);
        }
      }
    } catch (err) {
      console.warn(`[DocumentService] Gemini extraction fallback for ${documentName}:`, err.message);
    }
  }

  if (!extractedRequirements || extractedRequirements.length === 0) {
    console.log(`[DocumentService] Using heuristic extraction for ${documentName}`);
    extractedRequirements = extractRequirementsHeuristically(documentName, content);
  }

  return { sections, extractedRequirements };
}
