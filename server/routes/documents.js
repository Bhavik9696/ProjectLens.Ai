import { Router } from 'express';
import { parseDocument } from '../services/documentService.js';

const router = Router();

router.post('/parse', async (req, res) => {
  try {
    const { documentName, documentType, content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Document content is required' });
    }

    const result = await parseDocument({ documentName, documentType, content });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to process document' });
  }
});

export default router;
