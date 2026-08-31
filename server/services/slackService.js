/**
 * Slack Notification Service
 *
 * Sends rich Block Kit messages to a Slack Incoming Webhook URL.
 * Completely fire-and-forget — errors are logged but never thrown
 * so a Slack failure never blocks analysis from being saved.
 *
 * Slack docs: https://api.slack.com/messaging/webhooks
 */

const HEALTH_EMOJI = {
  Healthy: '✅',
  'Medium Risk': '⚠️',
  'High Risk': '🔴',
};

/**
 * Send an analysis-complete notification to a Slack channel.
 *
 * @param {string} webhookUrl  - Slack Incoming Webhook URL
 * @param {object} data
 * @param {string} data.projectName
 * @param {object} data.healthMetrics
 * @param {Array}  data.analysisResults
 * @param {object|null} data.previousSnapshot  - previous run snapshot (for delta)
 */
export async function sendAnalysisNotification(webhookUrl, { projectName, healthMetrics, analysisResults, previousSnapshot }) {
  if (!webhookUrl || !webhookUrl.startsWith('https://hooks.slack.com/')) return;

  try {
    const { overallScore, healthRating, requirementCoverage, scopeCreep } = healthMetrics;
    const emoji = HEALTH_EMOJI[healthRating] || '📊';

    const implemented  = analysisResults.filter((r) => r.status === 'Implemented' || r.status === 'Completed').length;
    const partial      = analysisResults.filter((r) => r.status === 'Partially Implemented' || r.status === 'Partial').length;
    const missing      = analysisResults.filter((r) => r.status === 'Missing').length;
    const total        = analysisResults.length;

    // Delta vs previous run
    let deltaText = '';
    if (previousSnapshot) {
      const delta = overallScore - previousSnapshot.overallScore;
      deltaText = delta > 0
        ? ` *(+${delta}% since last run)*`
        : delta < 0
        ? ` *(${delta}% since last run)*`
        : ' *(no change since last run)*';
    }

    // Scope creep warning
    const highCreep = (scopeCreep || []).filter((s) => s.severity === 'HIGH').length;
    const creepLine = highCreep > 0
      ? `\n🚨 *${highCreep} HIGH severity scope creep* item${highCreep !== 1 ? 's' : ''} detected`
      : '';

    // Missing high-priority reqs
    const criticalMissing = analysisResults
      .filter((r) => (r.status === 'Missing' || r.status === 'Partially Implemented' || r.status === 'Partial') && r.priority === 'High')
      .slice(0, 3)
      .map((r) => `• \`${r.requirementId}\` ${r.requirementTitle}`)
      .join('\n');

    const payload = {
      text: `${emoji} ProjectLens AI — Analysis Complete: *${projectName}*`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} Analysis Complete: ${projectName}`,
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Overall Health*\n${overallScore}%${deltaText}`,
            },
            {
              type: 'mrkdwn',
              text: `*Status*\n${healthRating}`,
            },
            {
              type: 'mrkdwn',
              text: `*Requirement Coverage*\n${requirementCoverage}%`,
            },
            {
              type: 'mrkdwn',
              text: `*Requirements*\n✅ ${implemented} done · ⚡ ${partial} partial · ❌ ${missing} missing`,
            },
          ],
        },
        ...(criticalMissing || creepLine
          ? [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: [
                    criticalMissing ? `*🔴 High-Priority Gaps:*\n${criticalMissing}` : '',
                    creepLine,
                  ]
                    .filter(Boolean)
                    .join('\n'),
                },
              },
            ]
          : []),
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Analyzed ${total} requirements · Sent by ProjectLens AI at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`,
            },
          ],
        },
        { type: 'divider' },
      ],
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn(`[Slack] Webhook returned ${res.status}: ${text}`);
    } else {
      console.log(`[Slack] Notification sent to channel for project "${projectName}"`);
    }
  } catch (err) {
    // Never block the main request
    console.warn('[Slack] Failed to send notification:', err.message);
  }
}

/**
 * Send a test ping to validate the webhook URL.
 * Used by the "Test Webhook" button in Project Settings.
 */
export async function sendTestNotification(webhookUrl) {
  if (!webhookUrl || !webhookUrl.startsWith('https://hooks.slack.com/')) {
    throw new Error('Invalid Slack webhook URL. It must start with https://hooks.slack.com/');
  }

  const payload = {
    text: '🔬 *ProjectLens AI* — Test notification successful! Your Slack integration is configured correctly.',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '🔬 *ProjectLens AI* — Test notification successful!\nYour Slack integration is configured correctly. You will receive analysis notifications here.',
        },
      },
    ],
  };

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Slack returned ${res.status}: ${text}`);
  }
}
