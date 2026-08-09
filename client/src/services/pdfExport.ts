import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProjectIntelligenceData } from '../types';

const ACCENT: [number, number, number] = [2, 132, 199]; // sky-600, prints legibly on white
const MUTED: [number, number, number] = [100, 116, 139]; // slate-500
const DARK: [number, number, number] = [15, 23, 42]; // slate-900
const AMBER: [number, number, number] = [180, 83, 9]; // amber-700

export function exportProjectReportToPdf(data: ProjectIntelligenceData) {
  const { project, analysisResults, healthMetrics } = data;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = 50;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...ACCENT);
  doc.text('PROJECTLENS AI · INTELLIGENCE REPORT', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.text(new Date().toLocaleDateString(), pageWidth - margin, y, { align: 'right' });

  y += 26;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...DARK);
  doc.text(project.name, margin, y);

  y += 20;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  const descLines = doc.splitTextToSize(project.description || 'No description provided.', pageWidth - margin * 2);
  doc.text(descLines, margin, y);
  y += descLines.length * 13 + 10;

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 24;

  // Health metrics summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text('Executive Summary & Health Score', margin, y);
  y += 18;

  const metrics: [string, string][] = [
    ['Health Rating', `${healthMetrics.healthRating} (${healthMetrics.overallScore}%)`],
    ['Requirement Coverage', `${healthMetrics.requirementCoverage}%`],
    ['Implementation Coverage', `${healthMetrics.implementationCoverage}%`],
    ['Sprint Progress', `${healthMetrics.sprintProgress}%`],
  ];

  const colWidth = (pageWidth - margin * 2) / metrics.length;
  metrics.forEach(([label, value], i) => {
    const x = margin + i * colWidth;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...DARK);
    doc.text(value, x, y + 16);
  });
  y += 40;

  // Requirement Traceability Matrix table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text('Requirement Traceability Matrix', margin, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['REQ ID', 'Title', 'Module', 'Coverage', 'Status']],
    body: analysisResults.map((r) => [
      r.requirementId,
      r.requirementTitle,
      r.module,
      `${r.coveragePercent}%`,
      r.status,
    ]),
    styles: { fontSize: 8, cellPadding: 6, textColor: DARK },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    theme: 'grid',
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 30;

  // Risk / missing requirements
  const risky = analysisResults.filter((r) => r.status !== 'Implemented' && r.status !== 'Completed');
  if (risky.length > 0) {
    if (y > 680) {
      doc.addPage();
      y = 50;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...DARK);
    doc.text('Risk Analysis & Recommendations', margin, y);
    y += 18;

    risky.forEach((r) => {
      if (y > 740) {
        doc.addPage();
        y = 50;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...AMBER);
      doc.text(`${r.requirementId}: ${r.requirementTitle} (${r.coveragePercent}%)`, margin, y);
      y += 13;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      const recLines = doc.splitTextToSize(r.recommendation, pageWidth - margin * 2);
      doc.text(recLines, margin, y);
      y += recLines.length * 12 + 10;
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      'Generated automatically by ProjectLens AI Deterministic Software Analysis Platform.',
      margin,
      doc.internal.pageSize.getHeight() - 25
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 25, {
      align: 'right',
    });
  }

  const safeName = project.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  doc.save(`${safeName || 'project'}-report.pdf`);
}
