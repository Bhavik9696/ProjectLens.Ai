import { Router } from 'express';
import { analyzeGithubRepo } from '../services/githubService.js';

const router = Router();

router.post('/analyze', async (req, res) => {
  try {
    const { githubUrl, expectedRequirements } = req.body;
    const profile = await analyzeGithubRepo(githubUrl, expectedRequirements);
    res.json(profile);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to analyze repository' });
  }
});

export default router;
