import { Router } from 'express';
import { runPrivacyAnalysis } from '../services/localEngineService.js';

const router = Router();

router.post('/', async (req, res) => {
  const { requirements, implementationProfile, ollamaModel } = req.body;

  if (!requirements || !Array.isArray(requirements) || requirements.length === 0) {
    return res.status(400).json({ error: 'requirements array is required' });
  }
  if (!implementationProfile) {
    return res.status(400).json({ error: 'implementationProfile is required' });
  }

  try {
    const result = await runPrivacyAnalysis(requirements, implementationProfile, ollamaModel);
    res.json(result);
  } catch (err) {
    console.error('[analyze] Error:', err.message);
    res.status(500).json({ error: err.message || 'Analysis failed' });
  }
});

export default router;
