import { generateContentWithRetry, isGeminiConfigured } from './geminiService.js';
import { buildRagIndex, retrieveRelevantChunks } from './ragService.js';

const SYSTEM_PROMPT_HEADER = `You are ProjectLens AI, an expert Project Intelligence Copilot for Software Project Managers.
You assist PMs by analyzing deterministic results comparing planned software specifications (SRS/Docs) with actual GitHub code implementation.

STRICT PRINCIPLES:
1. NEVER hallucinate or invent implementation coverage percentages, file names, or requirement details.
2. ALWAYS cite exact evidence provided in context (Requirement IDs, file names, counts, criteria).
3. Do NOT guess project completion — explain the deterministic calculations provided.
4. Keep answers professional, concise, structured, and immediately actionable for Project Managers.
5. You are only given a filtered subset of the project's data relevant to this question, not the full project. If something isn't in the provided context, say so instead of guessing.
6. Use the EXACT status values from context: IMPLEMENTED, PARTIAL, MISSING, NOT_VERIFIABLE.
7. When asked "which requirements are missing?" — list ONLY requirements with status MISSING.
8. When asked "which requirements are incomplete?" — list ONLY requirements with status PARTIAL.
9. When asked for evidence for a specific REQ-NNN — cite ONLY the evidence files listed for that requirement.
10. Do NOT confuse requirements from different modules or mix up their evidence.`;

/**
 * Build a structured offline answer using the real analysis data.
 * Uses the new canonical status values (IMPLEMENTED / PARTIAL / MISSING / NOT_VERIFIABLE).
 */
function normStatus(s) {
  if (!s) return 'MISSING';
  const u = s.toString().toUpperCase();
  if (u.includes('IMPLEMENT') || u === 'COMPLETED') return 'IMPLEMENTED';
  if (u.includes('PARTIAL')) return 'PARTIAL';
  if (u.includes('NOT_VERIF') || u.includes('UNABLE') || u.includes('DETERMINE')) return 'NOT_VERIFIABLE';
  return 'MISSING';
}

/**
 * Returns suggested follow-up questions that differ from the current question.
 */
function getFollowUpQuestions(currentQ) {
  const all = [
    'Which requirements are missing?',
    'Which requirements are partially implemented?',
    'Which requirements have contradictions?',
    'What needs to be done to reach 100% coverage?',
    'Generate a sprint action plan for missing requirements',
    'What is the highest-risk module?',
    'Which requirements have no test coverage?',
    'Summarize the overall project health',
    'Which requirements are fully implemented?',
    'List all requirements with their coverage percentages',
  ];
  const q = currentQ.toLowerCase();
  return all.filter(s => !s.toLowerCase().split(' ').some(w => w.length > 4 && q.includes(w))).slice(0, 4);
}

/**
 * Build a question-aware deterministic answer from the analysis data.
 * Routes to a specific answer based on keyword detection in `userMessage`.
 */
function buildOfflineAnswer(contextData, userMessage = '') {
  const results = contextData?.analysisResults || [];
  const health  = contextData?.healthMetrics  || {};
  const q = userMessage.toLowerCase();

  const ragMeta = { mode: 'local', chunksSent: [], sentExternally: false };
  const followUp = getFollowUpQuestions(userMessage);

  // ── Helper: format a single requirement as a bullet ──────────────────────
  const fmtReq = (r, { showFiles = true, showUnmet = true, showRec = true } = {}) => {
    const status = normStatus(r.status);
    const conf   = r.confidencePercent ?? Math.round((r.confidence ?? 0) * 100);
    const files  = (r.evidence?.detectedFiles || []).slice(0, 3);
    const unmet  = (r.criteria || []).filter(c => c.status !== 'IMPLEMENTED').map(c => c.description);
    const lines  = [
      `• **${r.requirementId} — ${r.requirementTitle}** (${r.module || 'General'})`,
      `  Status: **${status}** | Coverage: ${r.coveragePercent}% | Confidence: ${conf}%`,
    ];
    if (showFiles) lines.push(files.length ? `  Evidence: ${files.join(', ')}` : '  Evidence: None found');
    if (showUnmet && unmet.length) lines.push(`  Unmet: ${unmet.slice(0, 3).join('; ')}`);
    if (showRec && r.recommendation) lines.push(`  Recommendation: ${r.recommendation}`);
    return lines.join('\n');
  };

  // ── 1. Missing requirements ───────────────────────────────────────────────
  if (q.includes('missing') && !q.includes('test')) {
    const missing = results.filter(r => normStatus(r.status) === 'MISSING');
    if (!missing.length) {
      return {
        content: `✅ **No missing requirements detected!**\n\nAll ${results.length} tracked requirements have at least some implementation evidence. Overall health: **${health.overallScore ?? 0}%**.`,
        citations: [],
        suggestedQuestions: followUp,
        ragMeta,
      };
    }
    const lines = [
      `[ProjectLens Local — no data sent externally]`,
      ``,
      `## ❌ Missing Requirements (${missing.length} of ${results.length})`,
      ``,
      ...missing.map(r => fmtReq(r, { showFiles: true, showUnmet: true, showRec: true })),
      ``,
      `> **${missing.length} requirement(s) have no implementation evidence.** Address these first to improve project health.`,
    ];
    return {
      content: lines.join('\n'),
      citations: missing.slice(0, 5).map(r => ({ type: 'Requirement', ref: r.requirementId, label: r.requirementTitle })),
      suggestedQuestions: followUp,
      ragMeta,
    };
  }

  // ── 2. Partial / incomplete requirements ──────────────────────────────────
  if (q.includes('partial') || q.includes('incomplete') || q.includes('partially')) {
    const partial = results.filter(r => normStatus(r.status) === 'PARTIAL');
    if (!partial.length) {
      return {
        content: `🟡 **No partially implemented requirements** found — requirements are either fully implemented or missing entirely.`,
        citations: [],
        suggestedQuestions: followUp,
        ragMeta,
      };
    }
    const lines = [
      `[ProjectLens Local — no data sent externally]`,
      ``,
      `## 🟡 Partially Implemented Requirements (${partial.length} of ${results.length})`,
      ``,
      ...partial.map(r => fmtReq(r, { showFiles: true, showUnmet: true, showRec: true })),
      ``,
      `> These requirements have some implementation but are **not fully complete**. Focus on the unmet acceptance criteria listed above.`,
    ];
    return {
      content: lines.join('\n'),
      citations: partial.slice(0, 5).map(r => ({ type: 'Requirement', ref: r.requirementId, label: r.requirementTitle })),
      suggestedQuestions: followUp,
      ragMeta,
    };
  }

  // ── 3. Contradictions ─────────────────────────────────────────────────────
  if (q.includes('contradiction') || q.includes('conflict')) {
    const withContra = results.filter(r => r.contradictions?.length > 0);
    if (!withContra.length) {
      return {
        content: `✅ **No contradictions detected** across all ${results.length} requirements. The implementation appears consistent with the specifications.`,
        citations: [],
        suggestedQuestions: followUp,
        ragMeta,
      };
    }
    const lines = [
      `[ProjectLens Local — no data sent externally]`,
      ``,
      `## ⚠️ Requirements with Contradictions (${withContra.length})`,
      ``,
      ...withContra.map(r => {
        const contras = (r.contradictions || []).map((c, i) =>
          `  ${i + 1}. [${c.severity}] **${c.title}** — ${c.recommendation}`
        );
        return [`• **${r.requirementId} — ${r.requirementTitle}**`, ...contras].join('\n');
      }),
      ``,
      `> Resolve these contradictions with your team before they reach production.`,
    ];
    return {
      content: lines.join('\n'),
      citations: withContra.slice(0, 5).map(r => ({ type: 'Requirement', ref: r.requirementId, label: r.requirementTitle })),
      suggestedQuestions: followUp,
      ragMeta,
    };
  }

  // ── 4. Test coverage ──────────────────────────────────────────────────────
  if (q.includes('test') || q.includes('coverage')) {
    const noTests = results.filter(r => !r.testEvidence?.hasTests);
    const hasTests = results.filter(r => r.testEvidence?.hasTests);
    const lines = [
      `[ProjectLens Local — no data sent externally]`,
      ``,
      `## 🧪 Test Coverage Summary`,
      ``,
      `- ✅ Requirements with tests: **${hasTests.length}**`,
      `- ❌ Requirements without tests: **${noTests.length}**`,
      `- Overall coverage: **${health.requirementCoverage ?? 0}%**`,
      ``,
    ];
    if (noTests.length) {
      lines.push(`### Requirements Missing Test Coverage`, ``);
      noTests.forEach(r => lines.push(`• **${r.requirementId} — ${r.requirementTitle}** (${r.module || 'General'})`));
      lines.push(``, `> Add automated tests for the ${noTests.length} requirement(s) above to improve coverage.`);
    } else {
      lines.push(`✅ All requirements have associated test files.`);
    }
    return {
      content: lines.join('\n'),
      citations: noTests.slice(0, 4).map(r => ({ type: 'Requirement', ref: r.requirementId, label: r.requirementTitle })),
      suggestedQuestions: followUp,
      ragMeta,
    };
  }

  // ── 5. Sprint action plan ─────────────────────────────────────────────────
  if (q.includes('sprint') || q.includes('action plan') || q.includes('what to do') || q.includes('roadmap')) {
    const missing = results.filter(r => normStatus(r.status) === 'MISSING');
    const partial = results.filter(r => normStatus(r.status) === 'PARTIAL');
    const noTests = results.filter(r => !r.testEvidence?.hasTests && normStatus(r.status) !== 'MISSING');
    const lines = [
      `[ProjectLens Local — no data sent externally]`,
      ``,
      `## 🏃 Sprint Action Plan`,
      ``,
      `**Current Health: ${health.overallScore ?? 0}% — ${health.healthRating || 'Unknown'}**`,
      ``,
      `### 🔴 Sprint 1 — Implement Missing Requirements (${missing.length} items)`,
    ];
    if (missing.length) {
      missing.forEach((r, i) => {
        lines.push(`${i + 1}. **${r.requirementId}** — ${r.requirementTitle}`);
        if (r.recommendation) lines.push(`   → ${r.recommendation}`);
      });
    } else {
      lines.push(`_No missing requirements — great!_`);
    }
    lines.push(``, `### 🟡 Sprint 2 — Complete Partial Implementations (${partial.length} items)`);
    if (partial.length) {
      partial.forEach((r, i) => {
        const unmet = (r.criteria || []).filter(c => c.status !== 'IMPLEMENTED');
        lines.push(`${i + 1}. **${r.requirementId}** — ${r.requirementTitle}`);
        unmet.slice(0, 2).forEach(c => lines.push(`   → Implement: ${c.description}`));
      });
    } else {
      lines.push(`_No partial requirements — great!_`);
    }
    lines.push(``, `### 🧪 Sprint 3 — Add Test Coverage (${noTests.length} items)`);
    if (noTests.length) {
      noTests.slice(0, 5).forEach((r, i) =>
        lines.push(`${i + 1}. Write tests for **${r.requirementId}** — ${r.requirementTitle}`)
      );
    } else {
      lines.push(`_Test coverage is good!_`);
    }
    if (health.keyRiskFactors?.length) {
      lines.push(``, `### ⚠️ Key Risks to Address`, ...health.keyRiskFactors.map(f => `- ${f}`));
    }
    return {
      content: lines.join('\n'),
      citations: [...missing, ...partial].slice(0, 5).map(r => ({ type: 'Requirement', ref: r.requirementId, label: r.requirementTitle })),
      suggestedQuestions: followUp,
      ragMeta,
    };
  }

  // ── 6. Fully implemented ──────────────────────────────────────────────────
  if (q.includes('implement') && (q.includes('fully') || q.includes('complete') || q.includes('done') || q.includes('which'))) {
    const done = results.filter(r => normStatus(r.status) === 'IMPLEMENTED');
    const lines = [
      `[ProjectLens Local — no data sent externally]`,
      ``,
      `## ✅ Fully Implemented Requirements (${done.length} of ${results.length})`,
      ``,
      ...done.map(r => fmtReq(r, { showFiles: false, showUnmet: false, showRec: false })),
    ];
    if (!done.length) lines.push(`_No requirements are fully implemented yet._`);
    return {
      content: lines.join('\n'),
      citations: done.slice(0, 5).map(r => ({ type: 'Requirement', ref: r.requirementId, label: r.requirementTitle })),
      suggestedQuestions: followUp,
      ragMeta,
    };
  }

  // ── 7. 100% coverage / what to do ────────────────────────────────────────
  if (q.includes('100') || q.includes('reach') || q.includes('improve') || q.includes('increase')) {
    const notDone = results.filter(r => normStatus(r.status) !== 'IMPLEMENTED');
    const gap = 100 - (health.overallScore ?? 0);
    const lines = [
      `[ProjectLens Local — no data sent externally]`,
      ``,
      `## 🎯 What's Needed to Reach 100% Coverage`,
      ``,
      `**Current Score: ${health.overallScore ?? 0}% | Gap: ${gap}%**`,
      ``,
      `${notDone.length} requirement(s) need attention:`,
      ``,
      ...notDone.map(r => fmtReq(r, { showFiles: true, showUnmet: true, showRec: true })),
    ];
    if (!notDone.length) {
      lines.push(`🎉 You're already at 100%! All requirements are fully implemented.`);
    }
    return {
      content: lines.join('\n'),
      citations: notDone.slice(0, 5).map(r => ({ type: 'Requirement', ref: r.requirementId, label: r.requirementTitle })),
      suggestedQuestions: followUp,
      ragMeta,
    };
  }

  // ── 8. Highest-risk module ────────────────────────────────────────────────
  if (q.includes('risk') || q.includes('module') || q.includes('highest')) {
    const moduleScores = {};
    results.forEach(r => {
      const mod = r.module || 'General';
      if (!moduleScores[mod]) moduleScores[mod] = { total: 0, count: 0, missing: 0 };
      moduleScores[mod].total += r.coveragePercent || 0;
      moduleScores[mod].count += 1;
      if (normStatus(r.status) === 'MISSING') moduleScores[mod].missing += 1;
    });
    const ranked = Object.entries(moduleScores)
      .map(([mod, s]) => ({ mod, avg: Math.round(s.total / s.count), missing: s.missing, count: s.count }))
      .sort((a, b) => a.avg - b.avg);
    const lines = [
      `[ProjectLens Local — no data sent externally]`,
      ``,
      `## ⚠️ Module Risk Assessment (ranked lowest to highest coverage)`,
      ``,
      ...ranked.map((m, i) =>
        `${i + 1}. **${m.mod}** — Avg Coverage: ${m.avg}% | ${m.missing} missing of ${m.count} requirements`
      ),
    ];
    if (health.keyRiskFactors?.length) {
      lines.push(``, `### Key Risk Factors`, ...health.keyRiskFactors.map(f => `- ${f}`));
    }
    return {
      content: lines.join('\n'),
      citations: ranked.slice(0, 3).flatMap(m =>
        results.filter(r => r.module === m.mod).slice(0, 2).map(r => ({ type: 'Requirement', ref: r.requirementId, label: r.requirementTitle }))
      ).slice(0, 5),
      suggestedQuestions: followUp,
      ragMeta,
    };
  }

  // ── 9. SRS / specification compliance ────────────────────────────────────
  if (q.includes('srs') || q.includes('spec') || q.includes('following') || q.includes('complian')) {
    const implemented = results.filter(r => normStatus(r.status) === 'IMPLEMENTED').length;
    const partial     = results.filter(r => normStatus(r.status) === 'PARTIAL').length;
    const missing     = results.filter(r => normStatus(r.status) === 'MISSING').length;
    const notVerif    = results.filter(r => normStatus(r.status) === 'NOT_VERIFIABLE').length;
    const lines = [
      `[ProjectLens Local — no data sent externally]`,
      ``,
      `## 📋 SRS Specification Compliance Report`,
      ``,
      `**Overall Health Score: ${health.overallScore ?? 0}% — ${health.healthRating || 'Unknown'}**`,
      ``,
      `| Status | Count | % of Total |`,
      `|--------|-------|------------|`,
      `| ✅ Implemented | ${implemented} | ${results.length ? Math.round(implemented / results.length * 100) : 0}% |`,
      `| 🟡 Partial | ${partial} | ${results.length ? Math.round(partial / results.length * 100) : 0}% |`,
      `| ❌ Missing | ${missing} | ${results.length ? Math.round(missing / results.length * 100) : 0}% |`,
      `| ❓ Not Verifiable | ${notVerif} | ${results.length ? Math.round(notVerif / results.length * 100) : 0}% |`,
      ``,
      `**Requirement Coverage: ${health.requirementCoverage ?? 0}%**`,
      `**Implementation Coverage: ${health.implementationCoverage ?? 0}%**`,
    ];
    if (health.keyRiskFactors?.length) {
      lines.push(``, `### ⚠️ Risk Factors`, ...health.keyRiskFactors.map(f => `- ${f}`));
    }
    return {
      content: lines.join('\n'),
      citations: results.filter(r => normStatus(r.status) !== 'IMPLEMENTED').slice(0, 5).map(r => ({
        type: 'Requirement', ref: r.requirementId, label: r.requirementTitle,
      })),
      suggestedQuestions: followUp,
      ragMeta,
    };
  }

  // ── 10. List all requirements ─────────────────────────────────────────────
  if (q.includes('list') || q.includes('all requirements') || q.includes('show all')) {
    const lines = [
      `[ProjectLens Local — no data sent externally]`,
      ``,
      `## 📄 All Requirements (${results.length} total)`,
      ``,
      ...results.map(r => fmtReq(r, { showFiles: false, showUnmet: false, showRec: false })),
    ];
    return {
      content: lines.join('\n'),
      citations: results.slice(0, 5).map(r => ({ type: 'Requirement', ref: r.requirementId, label: r.requirementTitle })),
      suggestedQuestions: followUp,
      ragMeta,
    };
  }

  // ── 11. Default: full project health summary ──────────────────────────────
  const implemented = results.filter(r => normStatus(r.status) === 'IMPLEMENTED');
  const partial     = results.filter(r => normStatus(r.status) === 'PARTIAL');
  const missing     = results.filter(r => normStatus(r.status) === 'MISSING');
  const notVerif    = results.filter(r => normStatus(r.status) === 'NOT_VERIFIABLE');

  const summaryLines = [
    `[ProjectLens Local — no data sent externally]`,
    ``,
    `## Project Health: ${health.overallScore ?? 0}% — ${health.healthRating || 'Unknown'}`,
    `- Requirement Coverage: ${health.requirementCoverage ?? 0}%`,
    `- Implementation Coverage: ${health.implementationCoverage ?? 0}%`,
    ``,
    `## Requirement Analysis (${results.length} requirements)`,
    `- ✅ Implemented: ${implemented.length}`,
    `- 🟡 Partial: ${partial.length}`,
    `- ❌ Missing: ${missing.length}`,
    `- ❓ Not Verifiable: ${notVerif.length}`,
  ];

  if (health.keyRiskFactors?.length) {
    summaryLines.push('', '## Key Risk Factors', ...health.keyRiskFactors.map(f => `- ${f}`));
  }

  // Top 3 items needing attention
  const needsWork = [...missing, ...partial].slice(0, 5);
  if (needsWork.length) {
    summaryLines.push('', '## Items Needing Attention', '', ...needsWork.map(r => fmtReq(r)));
  }

  return {
    content: summaryLines.join('\n'),
    citations: needsWork.slice(0, 3).map(r => ({ type: 'Requirement', ref: r.requirementId, label: r.requirementTitle })),
    suggestedQuestions: followUp,
    ragMeta,
  };
}

/**
 * Answers a Copilot question using retrieval-augmented generation.
 *
 * `allowExternalAI` is an explicit, per-project opt-in flag. When it is
 * false — the default for every new project — this function NEVER calls
 * an external AI provider, regardless of whether GEMINI_API_KEY is
 * configured. It only uses the deterministic local summary.
 *
 * When external AI is allowed, only the top-K query-relevant, redacted
 * chunks built by ragService are sent — never the full project bundle.
 * The function returns `ragMeta` describing exactly what was retrieved
 * and sent, so the caller can persist an audit trail and the UI can show
 * the user precisely what left the server for this answer.
 */
export async function askCopilot(userMessage, contextData, { allowExternalAI = false } = {}) {
  if (!allowExternalAI || !isGeminiConfigured()) {
    return buildOfflineAnswer(contextData, userMessage);
  }

  const index = buildRagIndex(contextData);
  const relevantChunks = retrieveRelevantChunks(index, userMessage, { topK: 8, charBudget: 7000 });

  const contextBlock = relevantChunks.map((c) => `[${c.id}] ${c.text}`).join('\n\n');
  const systemPrompt = `${SYSTEM_PROMPT_HEADER}\n\nRETRIEVED CONTEXT (${relevantChunks.length} of ${index.length} total data chunks — only the chunks relevant to this question):\n${contextBlock}`;

  const ragMeta = {
    mode: 'external',
    sentExternally: true,
    chunksSent: relevantChunks.map((c) => ({ id: c.id, text: c.text })),
    totalChunksAvailable: index.length,
  };

  try {
    const geminiRes = await generateContentWithRetry({
      contents: userMessage,
      config: { systemInstruction: systemPrompt },
    });

    const answerText = geminiRes.text || 'Unable to analyze query.';

    // Extract citations from which requirement chunks were retrieved and referenced
    const citations = [];
    for (const c of relevantChunks) {
      if (c.id.startsWith('requirement:')) {
        const reqId = c.id.split(':')[1];
        // Only cite if the answer mentions this requirement ID
        if (answerText.toUpperCase().includes(reqId.toUpperCase())) {
          const match = contextData?.analysisResults?.find((r) => r.requirementId === reqId);
          if (match) citations.push({ type: 'Requirement', ref: match.requirementId, label: match.requirementTitle });
        }
      }
    }

    return {
      content: answerText,
      citations,
      suggestedQuestions: [
        'Which requirements are missing?',
        'Which requirements have contradictions?',
        'What needs to be done to reach 100% coverage?',
        'What is the highest-risk module?',
        'Generate sprint action plan for missing items',
      ],
      ragMeta,
    };
  } catch (apiError) {
    console.warn('Gemini Copilot API error, switching to local fallback:', apiError.message);
    const offline = buildOfflineAnswer(contextData, userMessage);
    return {
      ...offline,
      content: `*AI provider unavailable — showing local deterministic summary instead. Nothing was sent externally for this answer.*\n\n${offline.content}`,
    };
  }
}
