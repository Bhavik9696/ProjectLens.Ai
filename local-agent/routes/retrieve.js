// POST /retrieve — Retrieves relevant file chunks for a specific requirement
// Used for debugging / traceability; returns chunk previews (redacted), not raw source.
import { Router } from 'express';
import { cloneOrUpdateRepo, buildFileTree, readLocalFiles } from '../services/repoService.js';
import { redactSecrets, shouldExcludeFile } from '../services/secretRedaction.js';
import { buildLocalIndex, retrieveRelevantChunks, buildRequirementQuery } from '../services/localRag.js';

const router = Router();

router.post('/', async (req, res) => {
  const { githubUrl, githubToken, requirement } = req.body;

  if (!githubUrl || !requirement) {
    return res.status(400).json({ error: 'githubUrl and requirement are required' });
  }
  if (githubToken && !/^[A-Za-z0-9_\-]+$/.test(githubToken)) {
    return res.status(400).json({ error: 'Invalid githubToken format' });
  }

  try {
    const { localPath } = await cloneOrUpdateRepo(githubUrl, githubToken);
    const fileTree = await buildFileTree(localPath);
    const filesToRead = fileTree.filter((f) => !shouldExcludeFile(f));
    const files = await readLocalFiles(localPath, filesToRead, redactSecrets);
    const index = buildLocalIndex(files);

    const query = buildRequirementQuery(requirement);
    const chunks = retrieveRelevantChunks(index, query, { topK: 10, charBudget: 8000 });

    res.json({
      requirementId: requirement.id,
      query,
      chunks: chunks.map((c) => ({
        filePath:  c.filePath,
        startLine: c.startLine,
        score:     Math.round(c.score * 1000) / 1000,
        // Return only a snippet preview — not the full content
        preview: c.text.slice(0, 400) + (c.text.length > 400 ? '…' : ''),
      })),
      totalChunks: index.length,
    });
  } catch (err) {
    const safeMessage = err.message?.replace(/\/[^\s]+/g, '[path]') || 'Retrieval failed';
    res.status(500).json({ error: safeMessage });
  }
});

export default router;
