import { generateContentWithRetry, isGeminiConfigured } from './geminiService.js';
import { extractRequirementsHeuristically, splitDocumentIntoSections } from './heuristics.js';

export async function parseDocument({ documentName, documentType, content }) {
  const sections = splitDocumentIntoSections(content);

  let extractedRequirements = [];
  if (isGeminiConfigured()) {
    try {
      const prompt = `Analyze the following software document (${documentName}, Type: ${documentType}) and extract 3 to 6 structured software requirements.
Return JSON array of objects with keys:
"id" (e.g. REQ-001), "title", "module" (e.g. Authentication, Payment, Shopping Cart, Analytics, Admin), "priority" ("High", "Medium", or "Low"), "category" ("Functional", "Non-Functional", "Deliverable", "Milestone"), "expectedComponents" (array of sub-feature names expected in code like APIs, UI components, middlewares), "description".

Document text:
${content.substring(0, 4000)}`;

      const geminiRes = await generateContentWithRetry({
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      if (geminiRes.text) {
        extractedRequirements = JSON.parse(geminiRes.text.trim());
      }
    } catch (err) {
      console.warn('Gemini extraction fallback:', err.message);
    }
  }

  if (!extractedRequirements || extractedRequirements.length === 0) {
    extractedRequirements = extractRequirementsHeuristically(documentName, content);
  }

  return { sections, extractedRequirements };
}
