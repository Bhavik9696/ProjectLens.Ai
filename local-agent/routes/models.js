// GET /models — lists installed Ollama models
import { Router } from 'express';
import { listOllamaModels } from '../services/ollamaService.js';

const router = Router();

router.get('/', async (_req, res) => {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  try {
    const models = await listOllamaModels(ollamaUrl);
    res.json({ models, ollamaUrl });
  } catch (err) {
    res.status(503).json({
      error: 'Cannot reach Ollama. Make sure Ollama is running.',
      detail: err.message,
      models: [],
    });
  }
});

export default router;
