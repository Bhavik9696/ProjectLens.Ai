import { Router } from 'express';
import Project from '../models/Project.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { sendAnalysisNotification } from '../services/slackService.js';

const router = Router();

// GET /api/projects - list every project belonging to the authenticated user, newest first
router.get('/', requireAuth, async (req, res) => {
  try {
    const docs = await Project.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(docs.map((d) => d.toIntelligenceData()));
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to load projects' });
  }
});

// GET /api/projects/:id - single project
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await Project.findOne({ _id: req.params.id, userId: req.user._id });
    if (!doc) return res.status(404).json({ error: 'Project not found' });
    res.json(doc.toIntelligenceData());
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to load project' });
  }
});

// POST /api/projects - Step 1: create a new project
// Credit gate: free credits are consumed first, then paid credits.
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, description, deadline, techStack, githubUrl } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    // ── Credit check ────────────────────────────────────────────────────
    const user = await User.findById(req.user._id);

    if (user.freeProjectsRemaining <= 0 && user.paidCredits <= 0) {
      return res.status(402).json({
        error: 'No credits remaining. Please purchase project credits to continue.',
        freeProjectsRemaining: 0,
        paidCredits: 0,
      });
    }

    // Deduct: free slots first, then paid credits
    if (user.freeProjectsRemaining > 0) {
      await User.findByIdAndUpdate(req.user._id, { $inc: { freeProjectsRemaining: -1 } });
    } else {
      await User.findByIdAndUpdate(req.user._id, { $inc: { paidCredits: -1 } });
    }
    // ────────────────────────────────────────────────────────────────────

    const now = new Date().toISOString();
    const doc = await Project.create({
      _id:         `proj-${Date.now()}`,
      userId:      req.user._id,
      name,
      description: description || '',
      deadline:    deadline    || '',
      techStack:   Array.isArray(techStack) ? techStack : [],
      githubUrl:   githubUrl   || '',
      createdAt:   now,
      updatedAt:   now,
      documents:   [],
      requirements: [],
      implementationProfile: null,
      analysisResults:       [],
      healthMetrics: {
        requirementCoverage:    0,
        implementationCoverage: 0,
        sprintProgress:         0,
        githubActivity:         0,
        overallScore:           0,
        healthRating:           'Healthy',
        highRiskModules:        [],
        keyRiskFactors:         ['Upload SRS documents or connect a GitHub repository to begin analysis.'],
      },
      chatMessages: [],
    });

    // Return updated credit state alongside the new project
    const updatedUser = await User.findById(req.user._id);
    res.status(201).json({
      ...doc.toIntelligenceData(),
      credits: {
        freeProjectsRemaining: updatedUser.freeProjectsRemaining,
        paidCredits:           updatedUser.paidCredits,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to create project' });
  }
});

// PUT /api/projects/:id - persist the full ProjectIntelligenceData snapshot
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { documents, requirements, implementationProfile, analysisResults, healthMetrics, chatMessages, project } = req.body;

    const update = { updatedAt: new Date().toISOString() };
    if (documents             !== undefined) update.documents             = documents;
    if (requirements          !== undefined) update.requirements          = requirements;
    if (implementationProfile !== undefined) update.implementationProfile = implementationProfile;
    if (analysisResults       !== undefined) update.analysisResults       = analysisResults;
    if (healthMetrics         !== undefined) update.healthMetrics         = healthMetrics;
    if (chatMessages          !== undefined) update.chatMessages          = chatMessages;
    if (project) {
      if (project.name            !== undefined) update.name            = project.name;
      if (project.description     !== undefined) update.description     = project.description;
      if (project.deadline        !== undefined) update.deadline        = project.deadline;
      if (project.techStack       !== undefined) update.techStack       = project.techStack;
      if (project.githubUrl       !== undefined) update.githubUrl       = project.githubUrl;
      if (project.allowExternalAI !== undefined) update.allowExternalAI = Boolean(project.allowExternalAI);
      if (project.slackWebhookUrl !== undefined) update.slackWebhookUrl = project.slackWebhookUrl;
      // Auto-schedule config — merge individual fields so partial updates work
      if (project.autoSchedule !== undefined) {
        const sched = project.autoSchedule;
        if (sched.enabled   !== undefined) update['autoSchedule.enabled']   = Boolean(sched.enabled);
        if (sched.frequency !== undefined) update['autoSchedule.frequency'] = sched.frequency;
        // Compute nextRunAt when enabling or changing frequency
        if (sched.enabled) {
          const freq = sched.frequency || 'daily';
          const next = new Date();
          if (freq === 'weekly') next.setUTCDate(next.getUTCDate() + 7);
          else next.setUTCDate(next.getUTCDate() + 1);
          next.setUTCHours(0, 0, 0, 0);
          update['autoSchedule.nextRunAt'] = next.toISOString();
        }
      }
    }

    // ── Auto-append analysis history snapshot ──────────────────────────────
    // Only append when an analysis actually ran (both analysisResults and
    // healthMetrics are present and the result list is non-empty).
    if (analysisResults && analysisResults.length > 0 && healthMetrics) {
      const snapshot = {
        runId: `run-${Date.now()}`,
        timestamp: new Date().toISOString(),
        overallScore: healthMetrics.overallScore ?? 0,
        healthRating: healthMetrics.healthRating ?? 'Healthy',
        statusSnapshot: analysisResults.map((r) => ({
          reqId: r.requirementId,
          status: r.status,
          coveragePercent: r.coveragePercent ?? 0,
        })),
      };
      // Fetch existing history, prepend new snapshot, keep latest 20
      const existing = await Project.findOne({ _id: req.params.id, userId: req.user._id }, { analysisHistory: 1 });
      const prevHistory = existing?.analysisHistory || [];
      update.analysisHistory = [snapshot, ...prevHistory].slice(0, 20);
    }
    // ──────────────────────────────────────────────────────────────────

    const doc = await Project.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      update,
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'Project not found' });

    res.json(doc.toIntelligenceData());

    // ── Fire Slack notification (async, non-blocking) ──────────────────
    if (analysisResults && analysisResults.length > 0 && healthMetrics && doc.slackWebhookUrl) {
      const prevHistory = (doc.analysisHistory || []);
      const previousSnapshot = prevHistory.length > 1 ? prevHistory[1] : null; // [0] is the run we just added
      sendAnalysisNotification(doc.slackWebhookUrl, {
        projectName:      doc.name,
        healthMetrics,
        analysisResults,
        previousSnapshot,
      }).catch(() => {}); // already handled inside slackService
    }
    // ──────────────────────────────────────────────────────────────────
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to save project' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await Project.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!doc) return res.status(404).json({ error: 'Project not found' });
    res.json({ success: true, id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to delete project' });
  }
});

export default router;
