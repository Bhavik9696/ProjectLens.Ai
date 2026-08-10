import { Router } from 'express';
import Project from '../models/Project.js';
import { askCopilot } from '../services/copilotService.js';
import { generateContentWithRetry } from '../services/geminiService.js';

const router = Router();

// Cap how many audit entries we keep per project so the document doesn't
// grow unbounded — this is a rolling log of the most recent queries.
const MAX_AUDIT_ENTRIES = 50;

router.post('/chat', async (req, res) => {
  try {
    const { userMessage, contextData, projectId, userChatMessage } = req.body;

    if (!userMessage) {
      return res.status(400).json({ error: 'User message is required' });
    }

    // The consent flag lives on the persisted project, not on whatever
    // the client happens to send — so a tampered/stale client payload
    // can never flip a project into "external AI allowed" on its own.
    let allowExternalAI = false;
    let projectDoc = null;
    if (projectId) {
      projectDoc = await Project.findById(projectId);
      allowExternalAI = Boolean(projectDoc?.allowExternalAI);
    }

    const answer = await askCopilot(userMessage, contextData, { allowExternalAI });

    if (projectDoc) {
      const assistantChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: answer.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: answer.citations || [],
        suggestedQuestions: answer.suggestedQuestions || [],
      };

      const toPush = userChatMessage ? [userChatMessage, assistantChatMessage] : [assistantChatMessage];

      const auditEntry = {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        query: userMessage.slice(0, 300),
        mode: answer.ragMeta?.mode || 'local',
        chunkIds: (answer.ragMeta?.chunksSent || []).map((c) => c.id),
      };

      projectDoc.chatMessages.push(...toPush);
      projectDoc.ragAuditLog.push(auditEntry);
      if (projectDoc.ragAuditLog.length > MAX_AUDIT_ENTRIES) {
        projectDoc.ragAuditLog = projectDoc.ragAuditLog.slice(-MAX_AUDIT_ENTRIES);
      }
      await projectDoc.save();
    }

    res.json(answer);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Copilot failed to respond' });
  }
});

// ── Per-Requirement contextual AI ────────────────────────────────────────────
// Answers a question scoped to a single requirement's verified evidence only.
// The entire requirement context is passed from the client; no full RAG lookup.
router.post('/ask-requirement', async (req, res) => {
  try {
    const { question, requirementContext, projectId } = req.body;

    if (!question || !requirementContext) {
      return res.status(400).json({ error: 'question and requirementContext are required' });
    }

    // Read allowExternalAI from the project document — never trust the client.
    // Wrap in try-catch: an invalid ObjectId format throws CastError and we
    // still want to serve a local answer rather than returning 500.
    let allowExternalAI = false;
    if (projectId) {
      try {
        const projectDoc = await Project.findById(projectId).select('allowExternalAI').lean();
        allowExternalAI = Boolean(projectDoc?.allowExternalAI);
      } catch (idErr) {
        // Invalid ObjectId or DB hiccup — continue with local-only mode
        console.warn('[ask-requirement] Could not read project doc:', idErr.message);
      }
    }

    const ctx = requirementContext;

    // Build a structured evidence block scoped only to this requirement.
    const evidenceBlock = [
      `Requirement ID: ${ctx.requirementId}`,
      `Title: ${ctx.requirementTitle}`,
      `Module: ${ctx.module || 'N/A'}`,
      `Status: ${ctx.status}`,
      `Coverage: ${ctx.coveragePercent}%`,
      `Confidence: ${ctx.confidencePercent || Math.round((ctx.confidence || 0) * 100)}%`,
      ctx.description ? `Description: ${ctx.description}` : '',
      ctx.actor ? `Actor: ${ctx.actor} → ${ctx.action || ''}` : '',
      '',
      '── Acceptance Criteria ──',
      ...(ctx.criteria || []).map((c, i) =>
        `  [${c.status}] ${i + 1}. ${c.description}${c.reason ? ' — ' + c.reason : ''}`
      ),
      '',
      '── Evidence Files ──',
      ...(ctx.evidenceFiles || []).map(f => `  • ${f}`),
      '',
      '── Test Evidence ──',
      ctx.testEvidence
        ? (ctx.testEvidence.hasTests
          ? `  Tests found: ${(ctx.testEvidence.testFiles || []).join(', ')}`
          : '  No test files found for this requirement.')
        : '  Test evidence not available.',
      '',
      '── Missing Implementation Signals ──',
      ...(ctx.negativeEvidence || []).map(n => `  ⚠ ${n}`),
      '',
      '── Contradictions ──',
      ...(ctx.contradictions || []).map(c => `  ✗ [${c.severity}] ${c.title}: ${c.recommendation}`),
      '',
      '── Recommendation ──',
      ctx.recommendation || 'No recommendation available.',
    ].filter(l => l !== undefined).join('\n');

    const systemPrompt = `You are ProjectLens AI, an evidence-based software requirement analyst.
You ONLY answer questions about the single requirement shown below.
You ONLY cite files listed in the Evidence Files section.
If evidence is insufficient, say: "Insufficient evidence to verify this."
Do NOT guess, hallucinate, or reference files not in the evidence list.
Be concise, factual, and developer-friendly.
Format your response clearly with bullet points where appropriate.`;

    let answer;

    if (allowExternalAI) {
      const prompt = `${systemPrompt}

=== REQUIREMENT EVIDENCE CONTEXT ===
${evidenceBlock}
=== END CONTEXT ===

QUESTION: ${question}

Answer based only on the evidence context above.`;

      const res = await generateContentWithRetry({ contents: prompt });
      const rawAnswer = res?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
      answer = {
        content: rawAnswer || 'No response generated.',
        citations: (ctx.evidenceFiles || []).slice(0, 5).map(f => ({ type: 'File', ref: f, label: f })),
        ragMeta: {
          mode: 'requirement-scoped',
          sentExternally: true,
          chunksSent: [{ id: ctx.requirementId, text: `${ctx.requirementTitle} evidence context (scoped)` }],
        },
      };
    } else {
      // Local deterministic answer — no external AI call.
      const missingCriteria = (ctx.criteria || []).filter(c => c.status !== 'IMPLEMENTED');
      const satisfiedCriteria = (ctx.criteria || []).filter(c => c.status === 'IMPLEMENTED');
      const q = question.toLowerCase();
      let localAnswer = '';

      if (q.includes('why') && (q.includes('partial') || q.includes('incomplete'))) {
        localAnswer = missingCriteria.length > 0
          ? `**${ctx.requirementTitle}** is ${ctx.status} because ${missingCriteria.length} of ${(ctx.criteria || []).length} acceptance criteria are not fully satisfied:\n\n${missingCriteria.map((c, i) => `${i + 1}. [${c.status}] ${c.description}${c.reason ? '\n   → ' + c.reason : ''}`).join('\n\n')}`
          : `Status is **${ctx.status}** with ${ctx.coveragePercent}% coverage. ${ctx.recommendation || ''}`;
      } else if (q.includes('missing') || q.includes('not implemented')) {
        localAnswer = missingCriteria.length > 0
          ? `The following acceptance criteria are **not satisfied**:\n\n${missingCriteria.map((c, i) => `${i + 1}. ${c.description}${c.reason ? '\n   Reason: ' + c.reason : ''}`).join('\n\n')}`
          + (ctx.negativeEvidence?.length ? `\n\n**Missing implementation signals:**\n${ctx.negativeEvidence.map(n => `• ${n}`).join('\n')}` : '')
          : 'All tracked acceptance criteria appear to be satisfied.';
      } else if (q.includes('evidence') || q.includes('which files') || q.includes('implement')) {
        localAnswer = ctx.evidenceFiles?.length
          ? `**Evidence files found for ${ctx.requirementTitle}:**\n\n${ctx.evidenceFiles.map(f => `• \`${f}\``).join('\n')}`
          + (satisfiedCriteria.length > 0 ? `\n\nSatisfied criteria: ${satisfiedCriteria.length}/${(ctx.criteria || []).length}` : '')
          : 'No specific evidence files were found for this requirement.';
      } else if (q.includes('test')) {
        localAnswer = ctx.testEvidence?.hasTests
          ? `**Tests found** for ${ctx.requirementTitle}:\n${(ctx.testEvidence.testFiles || []).map(f => `• \`${f}\``).join('\n')}`
          : `**No test files** were found for ${ctx.requirementTitle}. Consider adding automated tests to verify the acceptance criteria.`;
      } else if (q.includes('contradiction')) {
        localAnswer = ctx.contradictions?.length
          ? `**Contradictions detected:**\n\n${ctx.contradictions.map((c, i) => `${i + 1}. [${c.severity}] **${c.title}**\n   → ${c.recommendation}`).join('\n\n')}`
          : 'No contradictions detected for this requirement.';
      } else if (q.includes('fix') || q.includes('how to') || q.includes('fully implement') || q.includes('complete')) {
        const steps = missingCriteria.map((c, i) => `${i + 1}. Implement: ${c.description}`);
        if (!ctx.testEvidence?.hasTests) steps.push(`${steps.length + 1}. Add automated tests for ${ctx.requirementTitle}`);
        localAnswer = steps.length > 0
          ? `**How to fully implement ${ctx.requirementTitle}:**\n\n${steps.join('\n')}`
          + `\n\n> **Note:** These steps are guidance based on missing acceptance criteria. Review with your team before implementation.`
          : `${ctx.requirementTitle} appears to be fully implemented with ${ctx.coveragePercent}% coverage.`;
      } else {
        localAnswer = `**${ctx.requirementId} — ${ctx.requirementTitle}**\n\nStatus: **${ctx.status}** | Coverage: **${ctx.coveragePercent}%** | Confidence: **${ctx.confidencePercent || Math.round((ctx.confidence || 0) * 100)}%**`
          + (satisfiedCriteria.length > 0 ? `\n\nSatisfied criteria: ${satisfiedCriteria.length}/${(ctx.criteria || []).length}` : '')
          + (missingCriteria.length > 0 ? `\nUnsatisfied criteria: ${missingCriteria.length}` : '')
          + (ctx.evidenceFiles?.length ? `\n\nEvidence files: ${ctx.evidenceFiles.slice(0, 4).map(f => `\`${f}\``).join(', ')}` : '\n\nNo evidence files found.')
          + (ctx.recommendation ? `\n\n**Recommendation:** ${ctx.recommendation}` : '');
      }

      answer = {
        content: localAnswer,
        citations: (ctx.evidenceFiles || []).slice(0, 5).map(f => ({ type: 'File', ref: f, label: f })),
        ragMeta: { mode: 'requirement-scoped-local', sentExternally: false, chunksSent: [] },
      };
    }

    res.json(answer);
  } catch (error) {
    console.error('[ask-requirement] Unhandled error:', error.message, error.stack);
    res.status(500).json({ error: error.message || 'Requirement AI failed to respond' });
  }
});

export default router;
