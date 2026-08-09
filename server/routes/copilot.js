import { Router } from 'express';
import Project from '../models/Project.js';
import { askCopilot } from '../services/copilotService.js';

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

    // ragMeta (including the exact chunk text sent externally, if any) is
    // returned to the client so the UI can show the user precisely what
    // left the server for this specific answer — full transparency, not
    // just a "trust us" toggle.
    res.json(answer);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Copilot failed to respond' });
  }
});

export default router;
