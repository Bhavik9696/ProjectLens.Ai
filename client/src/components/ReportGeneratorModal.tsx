import React, { useState } from 'react';
import { ProjectIntelligenceData } from '../types';
import { exportProjectReportToPdf } from '../services/pdfExport';
import { useToast } from '../contexts/ToastContext';
import {
  FileText,
  X,
  Download,
  Printer,
  Copy,
  Check,
  ShieldCheck,
  Layers,
  Sparkles,
} from 'lucide-react';

interface ReportGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ProjectIntelligenceData | null;
}

export const ReportGeneratorModal: React.FC<ReportGeneratorModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const { showToast } = useToast();

  if (!isOpen || !data) return null;

  const { project, requirements, analysisResults, healthMetrics, implementationProfile } = data;

  const generateMarkdownReport = () => {
    return `# ProjectLens AI – Project Intelligence Audit Report

**Project Name:** ${project.name}
**Deadline:** ${project.deadline}
**GitHub Repository:** ${project.githubUrl}
**Report Date:** ${new Date().toLocaleDateString()}

---

## 1. Executive Summary & Health Score

- **Overall Health Score:** ${healthMetrics.overallScore}% (${healthMetrics.healthRating})
- **Requirement Coverage:** ${healthMetrics.requirementCoverage}%
- **Implementation Coverage:** ${healthMetrics.implementationCoverage}%
- **Sprint Velocity:** ${healthMetrics.sprintProgress}%
- **GitHub Activity Index:** ${healthMetrics.githubActivity}%

---

## 2. Requirement Traceability Matrix (RTM)

| REQ ID | Title | Module | Coverage % | Status | Key Evidence Files |
|---|---|---|---|---|---|
${analysisResults
  .map(
    (r) =>
      `| ${r.requirementId} | ${r.requirementTitle} | ${r.module} | ${r.coveragePercent}% | ${r.status} | ${
        r.evidence?.detectedFiles?.slice(0, 2).join(', ') || 'None'
      } |`
  )
  .join('\n')}

---

## 3. Missing Requirements & Risk Gaps

${analysisResults
  .filter((r) => r.status !== 'Implemented' && r.status !== 'Completed')
  .map(
    (r) => `### ${r.requirementId}: ${r.requirementTitle} (${r.module})
- **Status:** ${r.status} (${r.coveragePercent}% Coverage)
- **Missing Components:** ${r.missingComponents.join(', ')}
- **Recommendation:** ${r.recommendation}
`
  )
  .join('\n')}

---

## 4. Key Risk Factors & Next Steps

${healthMetrics.keyRiskFactors.map((f) => `- ${f}`).join('\n')}

*Generated automatically by ProjectLens AI Deterministic Software Analysis Platform.*
`;
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(generateMarkdownReport());
    setCopied(true);
    showToast('Markdown report copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    setIsExportingPdf(true);
    try {
      exportProjectReportToPdf(data);
      showToast('PDF report downloaded', 'success');
    } catch (err) {
      console.error('PDF export failed', err);
      showToast('Could not generate the PDF. Try again.', 'error');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg)]/90 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden text-[var(--text-1)] my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--bg)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center border border-[var(--accent)]/30 shadow-[0_0_12px_rgba(214,255,63,0.1)]">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[var(--text-1)]">Project Intelligence Audit Report</h3>
              <p className="text-xs font-mono text-[var(--text-4)]">Step 14: Downloadable PDF & Markdown Summary Report</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className="px-3 py-1.5 rounded-lg bg-[var(--surface-3)] hover:bg-[var(--accent)]/10 text-xs font-mono font-semibold text-[var(--text-2)] hover:text-[var(--accent)] border border-[var(--border-2)] hover:border-[var(--accent)]/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Markdown' : 'Copy Markdown'}</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed text-xs font-mono font-bold text-black shadow-[0_0_12px_-3px_var(--accent)] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Generating…' : 'Download PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-[var(--surface-3)] hover:bg-[var(--surface-5)] text-xs font-mono font-semibold text-[var(--text-2)] border border-[var(--border-2)] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              onClick={onClose}
              className="text-[var(--text-4)] hover:text-[var(--text-1)] p-1 rounded-lg hover:bg-[var(--surface-3)] transition-colors ml-2 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document View */}
        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto bg-[var(--bg)] font-sans text-xs text-[var(--text-2)] print:bg-white print:text-black print:p-0">
          {/* Report Cover Header */}
          <div className="border-b border-[var(--border)] pb-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-[var(--accent)] font-mono tracking-wide">
                PROJECTLENS AI • INTELLIGENCE REPORT
              </span>
              <span className="text-[var(--text-4)] text-[11px] font-mono">{new Date().toLocaleDateString()}</span>
            </div>
            <h1 className="text-2xl font-black text-[var(--text-1)]">{project.name}</h1>
            <p className="text-[var(--text-3)]">{project.description}</p>
          </div>

          {/* Health Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[var(--panel)] p-4 rounded-xl border border-[var(--border)]">
            <div>
              <span className="text-[10px] uppercase font-mono font-bold text-[var(--text-4)] block">Health Rating</span>
              <span className="text-sm font-extrabold text-emerald-400 font-mono">
                {healthMetrics.healthRating} ({healthMetrics.overallScore}%)
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono font-bold text-[var(--text-4)] block">Req Coverage</span>
              <span className="text-sm font-bold text-[var(--accent)] font-mono">{healthMetrics.requirementCoverage}%</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono font-bold text-[var(--text-4)] block">Implementation</span>
              <span className="text-sm font-bold text-[var(--text-1)] font-mono">{healthMetrics.implementationCoverage}%</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono font-bold text-[var(--text-4)] block">Sprint Progress</span>
              <span className="text-sm font-bold text-[var(--text-1)] font-mono">{healthMetrics.sprintProgress}%</span>
            </div>
          </div>

          {/* Traceability Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[var(--text-1)] uppercase font-mono tracking-wider">Requirement Traceability Matrix</h3>
            <div className="border border-[var(--border)] rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--panel)] border-b border-[var(--border)] text-[var(--text-4)] uppercase font-mono text-[10px]">
                  <tr>
                    <th className="p-2.5">REQ ID</th>
                    <th className="p-2.5">Title</th>
                    <th className="p-2.5">Module</th>
                    <th className="p-2.5">Coverage</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {analysisResults.map((r) => (
                    <tr key={r.requirementId} className="hover:bg-[var(--panel)] transition-colors">
                      <td className="p-2.5 font-mono text-[var(--accent)] font-bold">{r.requirementId}</td>
                      <td className="p-2.5 font-medium text-[var(--text-1)]">{r.requirementTitle}</td>
                      <td className="p-2.5 text-[var(--text-3)]">{r.module}</td>
                      <td className="p-2.5 font-mono font-bold text-emerald-400">{r.coveragePercent}%</td>
                      <td className="p-2.5 font-semibold text-[var(--text-2)]">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Missing Features & Recommendations */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[var(--text-1)] uppercase font-mono tracking-wider">Risk Analysis & Recommendations</h3>
            <div className="space-y-2">
              {analysisResults
                .filter((r) => r.status !== 'Implemented' && r.status !== 'Completed')
                .map((r) => (
                  <div key={r.requirementId} className="p-3 bg-[var(--panel)] rounded-xl border border-[var(--border)] space-y-1 hover:border-[var(--accent)]/20 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-bold font-mono text-amber-300">
                        {r.requirementId}: {r.requirementTitle}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        {r.coveragePercent}%
                      </span>
                    </div>
                    <p className="text-[var(--text-3)]">{r.recommendation}</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
