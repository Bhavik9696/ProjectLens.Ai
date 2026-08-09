import { Router } from 'express';
import { evaluateEngine } from '../services/engineService.js';

const router = Router();

router.post('/evaluate', async (req, res) => {
  try {
    const { requirements, implementationProfile } = req.body;

    if (!requirements || !implementationProfile) {
      return res.status(400).json({ error: 'Requirements and implementation profile are required' });
    }

    const result = await evaluateEngine(requirements, implementationProfile);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to evaluate engine' });
  }
});

export default router;
