import { generateContentWithRetry, isGeminiConfigured } from './geminiService.js';
import { extractRequirementsHeuristically, splitDocumentIntoSections, generateAcceptanceCriteria, extractActorActionObject } from './heuristics.js';

export async function parseDocument({ documentName, documentType, content }) {
  const sections = splitDocumentIntoSections(content);

  let extractedRequirements = [];
  if (isGeminiConfigured()) {
    try {
      const prompt = `Analyze the following software document (${documentName}, Type: ${documentType}) and extract 3 to 8 structured software requirements.

For each requirement, perform structured extraction:
1. Identify the ACTOR (who is doing something: user, admin, system, registered user)
2. Identify the ACTION (what they do: login, reset password, upload file, make payment)
3. Identify the OBJECT (what they act on: password, profile, document, order)
4. Generate 4-7 specific ACCEPTANCE CRITERIA that are testable and concrete

Return a JSON array of objects with these exact keys:
- "id": string (e.g. "REQ-001", sequential)
- "title": string (short, clear title max 60 chars)
- "module": string (e.g. "Authentication", "Payment", "Dashboard", "User Management", "Notifications")
- "priority": string ("High", "Medium", or "Low")
- "category": string ("Functional" or "Non-Functional")
- "expectedComponents": array of strings (sub-feature names expected in code: APIs, UI components, middlewares, services)
- "description": string (full requirement description)
- "actor": string (who performs this action)
- "action": string (what action is performed)
- "object": string (what is acted upon)
- "acceptanceCriteria": array of strings (4-7 specific, testable criteria)

Example acceptanceCriteria for "User Password Reset":
[
  "User can request password reset by entering their email address",
  "System generates a secure, unique reset token",
  "Reset email is delivered within 5 minutes",
  "Reset link expires after 24 hours",
  "User can set a new password using the reset link",
  "Old password is immediately invalidated after reset",
  "System rejects reuse of the last 3 passwords"
]

Document text (first 5000 chars):
${content.substring(0, 5000)}`;

      const geminiRes = await generateContentWithRetry({
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      if (geminiRes.text) {
        const text = geminiRes.text.trim()
          .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure every requirement has acceptanceCriteria (fill in if AI missed it)
          extractedRequirements = parsed.map((req) => ({
            ...req,
            actor: req.actor || 'user',
            action: req.action || 'perform action',
            object: req.object || 'resource',
            acceptanceCriteria: Array.isArray(req.acceptanceCriteria) && req.acceptanceCriteria.length > 0
              ? req.acceptanceCriteria
              : generateAcceptanceCriteria(req.title || '', req.description || ''),
          }));
        }
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
