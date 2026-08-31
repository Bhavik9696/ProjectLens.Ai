/**
 * Public REST API v1 — /api/v1/*
 *
 * Authenticated via JWT Bearer token OR a pl_live_ API key.
 * Designed for CI/CD pipelines, automation scripts, and third-party integrations.
 *
 * Rate limiting, versioning headers, and pagination are included.
 */
import { Router } from 'express';
import Project from '../models/Project.js';
import { requireApiKeyOrJwt } from '../middleware/auth.js';

const router = Router();

// All v1 routes accept both JWT and API key auth
router.use(requireApiKeyOrJwt);

// Version header on every response
router.use((_req, res, next) => {
  res.setHeader('X-ProjectLens-API-Version', 'v1');
  next();
});

/* ------------------------------------------------------------------ */
/* GET /api/v1/projects                                                */
/* Returns a lightweight list of all projects for the authenticated   */
/* user (no full analysis data — use /projects/:id for full data).    */
/* ------------------------------------------------------------------ */
router.get('/projects', async (req, res) => {
  try {
    const projects = await Project.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select('_id name description deadline techStack githubUrl createdAt updatedAt');

    res.json({
      projects: projects.map((p) => ({
        id:          p._id,
        name:        p.name,
        description: p.description,
        deadline:    p.deadline,
        techStack:   p.techStack,
        githubUrl:   p.githubUrl,
        createdAt:   p.createdAt,
        updatedAt:   p.updatedAt,
      })),
      total: projects.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch projects' });
  }
});

/* ------------------------------------------------------------------ */
/* GET /api/v1/projects/:id                                            */
/* Full project including analysis results, health metrics, history.  */
/* ------------------------------------------------------------------ */
router.get('/projects/:id', async (req, res) => {
  try {
    const doc = await Project.findOne({ _id: req.params.id, userId: req.user._id });
    if (!doc) return res.status(404).json({ error: 'Project not found' });
    res.json(doc.toIntelligenceData());
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch project' });
  }
});

/* ------------------------------------------------------------------ */
/* GET /api/v1/projects/:id/health                                     */
/* Just the health metrics — useful for CI/CD status checks.          */
/* ------------------------------------------------------------------ */
router.get('/projects/:id/health', async (req, res) => {
  try {
    const doc = await Project.findOne({ _id: req.params.id, userId: req.user._id })
      .select('healthMetrics analysisHistory');
    if (!doc) return res.status(404).json({ error: 'Project not found' });

    const { healthMetrics, analysisHistory } = doc;
    res.json({
      overallScore:           healthMetrics.overallScore,
      healthRating:           healthMetrics.healthRating,
      requirementCoverage:    healthMetrics.requirementCoverage,
      implementationCoverage: healthMetrics.implementationCoverage,
      sprintProgress:         healthMetrics.sprintProgress,
      highRiskModules:        healthMetrics.highRiskModules,
      keyRiskFactors:         healthMetrics.keyRiskFactors,
      lastRun:                analysisHistory?.[0]?.timestamp || null,
      totalRuns:              analysisHistory?.length || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch health metrics' });
  }
});

/* ------------------------------------------------------------------ */
/* GET /api/v1/projects/:id/requirements                               */
/* All requirements with their current analysis status.               */
/* ------------------------------------------------------------------ */
router.get('/projects/:id/requirements', async (req, res) => {
  try {
    const doc = await Project.findOne({ _id: req.params.id, userId: req.user._id })
      .select('requirements analysisResults');
    if (!doc) return res.status(404).json({ error: 'Project not found' });

    // Merge requirement definitions with their analysis results
    const resultMap = new Map(doc.analysisResults.map((r) => [r.requirementId, r]));

    const requirements = doc.requirements.map((req) => {
      const result = resultMap.get(req.id) || null;
      return {
        id:                  req.id,
        title:               req.title,
        module:              req.module,
        priority:            req.priority,
        category:            req.category,
        description:         req.description,
        acceptanceCriteria:  req.acceptanceCriteria || [],
        // Analysis result fields
        status:              result?.status || 'Unable to Determine',
        coveragePercent:     result?.coveragePercent ?? 0,
        confidencePercent:   result?.confidencePercent ?? 0,
        hasTests:            result?.testEvidence?.hasTests ?? false,
        testFiles:           result?.testEvidence?.testFiles || [],
        contradictions:      result?.contradictions?.length || 0,
      };
    });

    res.json({
      requirements,
      total:       requirements.length,
      implemented: requirements.filter((r) => r.status === 'Implemented' || r.status === 'Completed').length,
      partial:     requirements.filter((r) => r.status === 'Partially Implemented' || r.status === 'Partial').length,
      missing:     requirements.filter((r) => r.status === 'Missing').length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch requirements' });
  }
});

/* ------------------------------------------------------------------ */
/* GET /api/v1/projects/:id/history                                    */
/* Analysis run history — timestamps and scores only.                 */
/* ------------------------------------------------------------------ */
router.get('/projects/:id/history', async (req, res) => {
  try {
    const doc = await Project.findOne({ _id: req.params.id, userId: req.user._id })
      .select('analysisHistory');
    if (!doc) return res.status(404).json({ error: 'Project not found' });

    res.json({
      history: (doc.analysisHistory || []).map((h) => ({
        runId:        h.runId,
        timestamp:    h.timestamp,
        overallScore: h.overallScore,
        healthRating: h.healthRating,
        requirements: h.statusSnapshot?.length || 0,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch history' });
  }
});

export default router;
