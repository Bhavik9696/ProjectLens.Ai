// ─────────────────────────────────────────────────────────────────────────────
// Privacy Mode Routes
//
// Proxy routes that let the authenticated ProjectLens frontend communicate
// with the ProjectLens Local Agent (http://127.0.0.1:3847).
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { LocalOllamaProvider } from '../services/aiProviderService.js';

const router = Router();
router.use(requireAuth);

// GET /api/privacy/status
router.get('/status', async (req, res) => {
  try {
    const agentUrl = req.query.agentUrl || undefined;
    const status = await LocalOllamaProvider.checkStatus(agentUrl);
    res.json(status);
  } catch (err) {
    res.status(503).json({ agent: false, ollama: false, status: 'error', detail: err.message });
  }
});

// GET /api/privacy/models
router.get('/models', async (req, res) => {
  try {
    const agentUrl = req.query.agentUrl || undefined;
    const models = await LocalOllamaProvider.listModels(agentUrl);
    res.json({ models });
  } catch (err) {
    res.status(503).json({ models: [], error: err.message });
  }
});

// POST /api/privacy/analyze
router.post('/analyze', async (req, res) => {
  const { githubUrl, githubToken, requirements, ollamaModel, ollamaUrl, localAgentUrl } = req.body;
  if (!githubUrl || !requirements) {
    return res.status(400).json({ error: 'githubUrl and requirements are required' });
  }
  try {
    const result = await LocalOllamaProvider.analyze({
      githubUrl,
      githubToken: githubToken || undefined,
      requirements,
      ollamaModel: ollamaModel || 'llama3.1:8b',
      ollamaUrl:   ollamaUrl   || 'http://localhost:11434',
      agentUrl:    localAgentUrl || undefined,
    });
    res.json(result);
  } catch (err) {
    const isAgentOffline = err.message?.includes('fetch failed') || err.message?.includes('ECONNREFUSED');
    if (isAgentOffline) {
      return res.status(503).json({
        error: 'ProjectLens Local Agent is not running.',
        detail: 'Start the local agent: cd local-agent && npm start',
      });
    }
    res.status(500).json({ error: err.message || 'Privacy analysis failed' });
  }
});

export default router;
