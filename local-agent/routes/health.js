// GET /health — returns agent + Ollama connectivity status
import { Router } from 'express';
import { isOllamaReachable } from '../services/ollamaService.js';

const router = Router();

router.get('/', async (_req, res) => {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  const ollama = await isOllamaReachable(ollamaUrl);
  res.json({
    agent:  true,
    ollama,
    status: ollama ? 'ready' : 'ollama_offline',
    ollamaUrl,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

export default router;
