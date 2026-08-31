/**
 * Scheduled Auto-Analysis Service
 *
 * Uses node-cron to run automatic coverage analysis on every project
 * that has `autoSchedule.enabled = true` set in Project Settings.
 *
 * Schedule is controlled by the SCHEDULE_CRON env var.
 * Default: "0 0 * * *"  (daily at midnight UTC)
 *
 * After each run it:
 *   1. Persists the updated analysisResults + healthMetrics to MongoDB
 *   2. Appends a lightweight snapshot to analysisHistory
 *   3. Fires a Slack notification (if slackWebhookUrl is set)
 */

import cron from 'node-cron';
import Project from '../models/Project.js';
import { evaluateEngine } from './engineService.js';
import { sendAnalysisNotification } from './slackService.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Compute the ISO string for the next run based on frequency.
 * @param {'daily'|'weekly'} frequency
 */
function computeNextRunAt(frequency) {
  const next = new Date();
  if (frequency === 'weekly') {
    next.setUTCDate(next.getUTCDate() + 7);
  } else {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  next.setUTCHours(0, 0, 0, 0);
  return next.toISOString();
}

/**
 * Run the full analysis pipeline for a single project and persist results.
 * @param {import('mongoose').Document} project - Mongoose Project document
 * @returns {Promise<void>}
 */
async function runAnalysisForProject(project) {
  const label = `[Scheduler] "${project.name}" (${project._id})`;

  // Guard: must have requirements + GitHub profile
  if (!project.requirements || project.requirements.length === 0) {
    console.log(`${label} — skipped: no requirements`);
    return;
  }
  if (!project.implementationProfile) {
    console.log(`${label} — skipped: no GitHub profile connected`);
    return;
  }

  console.log(`${label} — starting auto-analysis…`);

  try {
    // ── Run engine ──────────────────────────────────────────────────────────
    const engineResult = await evaluateEngine(
      project.requirements,
      project.implementationProfile
    );

    const { results: analysisResults, healthMetrics } = engineResult;

    // ── Build history snapshot ──────────────────────────────────────────────
    const snapshot = {
      runId:        `run-auto-${Date.now()}`,
      timestamp:    new Date().toISOString(),
      overallScore: healthMetrics.overallScore ?? 0,
      healthRating: healthMetrics.healthRating ?? 'Healthy',
      statusSnapshot: analysisResults.map((r) => ({
        reqId:           r.requirementId,
        status:          r.status,
        coveragePercent: r.coveragePercent ?? 0,
      })),
    };

    const prevHistory   = project.analysisHistory || [];
    const newHistory    = [snapshot, ...prevHistory].slice(0, 20);
    const prevSnapshot  = prevHistory.length > 0 ? prevHistory[0] : null;
    const now           = new Date().toISOString();

    // ── Persist to MongoDB ──────────────────────────────────────────────────
    await Project.findByIdAndUpdate(project._id, {
      analysisResults,
      healthMetrics,
      analysisHistory: newHistory,
      updatedAt: now,
      'autoSchedule.lastRunAt':  now,
      'autoSchedule.nextRunAt':  computeNextRunAt(project.autoSchedule?.frequency || 'daily'),
      'autoSchedule.lastStatus': 'ok',
      'autoSchedule.lastError':  null,
    });

    console.log(`${label} — analysis saved. Score: ${healthMetrics.overallScore}%`);

    // ── Slack notification ──────────────────────────────────────────────────
    if (project.slackWebhookUrl) {
      await sendAnalysisNotification(project.slackWebhookUrl, {
        projectName:      project.name,
        healthMetrics,
        analysisResults,
        previousSnapshot: prevSnapshot,
        isScheduled:      true,
      });
    }
  } catch (err) {
    const errorMsg = err?.message || 'Unknown error';
    console.error(`${label} — FAILED: ${errorMsg}`);

    // Record the error in the project document (non-blocking)
    await Project.findByIdAndUpdate(project._id, {
      'autoSchedule.lastRunAt':  new Date().toISOString(),
      'autoSchedule.lastStatus': 'error',
      'autoSchedule.lastError':  errorMsg.slice(0, 500),
    }).catch(() => {});
  }
}

// ─── Main scheduler ───────────────────────────────────────────────────────────

/**
 * Initialise the cron scheduler.
 * Call this once after the database is connected.
 */
export function startScheduler() {
  // SCHEDULE_CRON env var overrides the default (daily at midnight UTC)
  const cronExpr = process.env.SCHEDULE_CRON || '0 0 * * *';

  if (!cron.validate(cronExpr)) {
    console.error(`[Scheduler] Invalid SCHEDULE_CRON expression: "${cronExpr}". Scheduler not started.`);
    return;
  }

  console.log(`[Scheduler] Started — cron: "${cronExpr}" (UTC)`);

  cron.schedule(cronExpr, async () => {
    console.log('[Scheduler] Tick — looking for projects to auto-analyse…');

    let projects;
    try {
      // Find all projects with auto-schedule enabled
      projects = await Project.find({ 'autoSchedule.enabled': true });
    } catch (err) {
      console.error('[Scheduler] Failed to query projects:', err.message);
      return;
    }

    if (!projects.length) {
      console.log('[Scheduler] No projects with auto-schedule enabled — nothing to do.');
      return;
    }

    console.log(`[Scheduler] Running auto-analysis for ${projects.length} project(s)…`);

    // Run sequentially to avoid hammering the Gemini API rate limits
    for (const project of projects) {
      await runAnalysisForProject(project);
    }

    console.log('[Scheduler] All auto-analyses complete.');
  }, {
    timezone: 'UTC',
  });
}
