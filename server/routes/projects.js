import { Router } from 'express';
import Project from '../models/Project.js';

const router = Router();

// GET /api/projects - list every project, newest first
router.get('/', async (_req, res) => {
  try {
    const docs = await Project.find().sort({ createdAt: -1 });
    res.json(docs.map((d) => d.toIntelligenceData()));
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to load projects' });
  }
});

// GET /api/projects/:id - single project
router.get('/:id', async (req, res) => {
  try {
    const doc = await Project.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Project not found' });
    res.json(doc.toIntelligenceData());
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to load project' });
  }
});

// POST /api/projects - Step 1: create a new project (empty analysis state)
router.post('/', async (req, res) => {
  try {
    const { name, description, deadline, techStack, githubUrl } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const now = new Date().toISOString();
    const doc = await Project.create({
      _id: `proj-${Date.now()}`,
      name,
      description: description || '',
      deadline: deadline || '',
      techStack: Array.isArray(techStack) ? techStack : [],
      githubUrl: githubUrl || '',
      createdAt: now,
      updatedAt: now,
      documents: [],
      requirements: [],
      implementationProfile: null,
      analysisResults: [],
      healthMetrics: {
        requirementCoverage: 0,
        implementationCoverage: 0,
        sprintProgress: 0,
        githubActivity: 0,
        overallScore: 0,
        healthRating: 'Healthy',
        highRiskModules: [],
        keyRiskFactors: ['Upload SRS documents or connect a GitHub repository to begin analysis.'],
      },
      chatMessages: [],
    });

    res.status(201).json(doc.toIntelligenceData());
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to create project' });
  }
});

// PUT /api/projects/:id - persist the full ProjectIntelligenceData snapshot
// the frontend already holds (documents, requirements, implementationProfile,
// analysisResults, healthMetrics, chatMessages) after any Step 2-13 action.
router.put('/:id', async (req, res) => {
  try {
    const { documents, requirements, implementationProfile, analysisResults, healthMetrics, chatMessages, project } = req.body;

    const update = { updatedAt: new Date().toISOString() };
    if (documents !== undefined) update.documents = documents;
    if (requirements !== undefined) update.requirements = requirements;
    if (implementationProfile !== undefined) update.implementationProfile = implementationProfile;
    if (analysisResults !== undefined) update.analysisResults = analysisResults;
    if (healthMetrics !== undefined) update.healthMetrics = healthMetrics;
    if (chatMessages !== undefined) update.chatMessages = chatMessages;
    if (project) {
      if (project.name !== undefined) update.name = project.name;
      if (project.description !== undefined) update.description = project.description;
      if (project.deadline !== undefined) update.deadline = project.deadline;
      if (project.techStack !== undefined) update.techStack = project.techStack;
      if (project.githubUrl !== undefined) update.githubUrl = project.githubUrl;
      if (project.allowExternalAI !== undefined) update.allowExternalAI = Boolean(project.allowExternalAI);
    }

    const doc = await Project.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!doc) return res.status(404).json({ error: 'Project not found' });

    res.json(doc.toIntelligenceData());
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to save project' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', async (req, res) => {
  try {
    const doc = await Project.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Project not found' });
    res.json({ success: true, id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to delete project' });
  }
});

export default router;
