import { DashboardMetrics, PdfExportOptions, Project, DeploymentsByEnv, EnvironmentName, ENVIRONMENT_ORDER, DashboardConfig } from '../types';

// Lazy-loaded PDF libraries — cached after first load
let jsPDFConstructor: typeof import('jspdf').jsPDF | null = null;

async function loadPdfLibs() {
  if (jsPDFConstructor) return;
  const jspdfModule = await import('jspdf');
  // jspdf-autotable attaches itself to jsPDF prototype as side-effect
  await import('jspdf-autotable');
  jsPDFConstructor = jspdfModule.jsPDF;
}

/** Chart images as base64 data URLs keyed by chart name */
export type ChartImageMap = Record<string, string>;

// Constants for PDF layout
const MARGIN_LEFT = 14;
const MARGIN_RIGHT = 14;
const PAGE_WIDTH = 210; // A4 mm
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

function formatDateForFilename(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDateFull(date: Date): string {
  return date.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

/**
 * Check if we need a new page; if so, add one and return the reset Y position.
 */
function checkPageBreak(doc: InstanceType<typeof import('jspdf').jsPDF>, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 20) {
    doc.addPage();
    return 20;
  }
  return y;
}

function addHeader(doc: InstanceType<typeof import('jspdf').jsPDF>, config: DashboardConfig): number {
  let y = 20;

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('GitLab CI/CD Dashboard Report', MARGIN_LEFT, y);
  y += 8;

  // Subtitle line
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const subtitle = `${config.gitlabUrl} | Timeframe: ${config.timeframe} days | Generated: ${formatDateFull(new Date())}`;
  doc.text(subtitle, MARGIN_LEFT, y);
  y += 4;

  // Horizontal rule
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
  y += 8;

  // Reset text color
  doc.setTextColor(0, 0, 0);

  return y;
}

function addSummarySection(
  doc: InstanceType<typeof import('jspdf').jsPDF>,
  metrics: DashboardMetrics,
  startY: number
): number {
  let y = checkPageBreak(doc, startY, 50);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', MARGIN_LEFT, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const summaryItems = [
    ['Total Projects', String(metrics.totalProjects)],
    ['Total Pipelines', String(metrics.aggregateMetrics.totalPipelines)],
    ['Successful', String(metrics.aggregateMetrics.successfulPipelines)],
    ['Failed', String(metrics.aggregateMetrics.failedPipelines)],
    ['Average Success Rate', `${metrics.aggregateMetrics.avgSuccessRate.toFixed(1)}%`],
    ['Average Duration', formatDuration(metrics.aggregateMetrics.avgDuration)],
  ];

  summaryItems.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, MARGIN_LEFT + 2, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, MARGIN_LEFT + 60, y);
    y += 6;
  });

  y += 4;
  return y;
}

function addProjectTable(
  doc: InstanceType<typeof import('jspdf').jsPDF>,
  projects: Project[],
  startY: number
): number {
  let y = checkPageBreak(doc, startY, 30);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Project Metrics', MARGIN_LEFT, y);
  y += 6;

  const head = [['Project', 'Pipelines', 'Success %', 'Duration', 'Coverage', 'MRs', 'Status']];
  const body = projects.map(p => [
    p.name,
    String(p.metrics.totalPipelines),
    `${p.metrics.successRate.toFixed(1)}%`,
    formatDuration(p.metrics.avgDuration),
    p.metrics.codeCoverage.coverage !== null
      ? `${p.metrics.codeCoverage.coverage.toFixed(1)}%`
      : 'N/A',
    String(p.metrics.mergeRequestCounts.totalOpen),
    p.metrics.mainBranchPipeline.status,
  ]);

  // Use autoTable (attached to doc via jspdf-autotable import)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (doc as any).autoTable({
    startY: y,
    head,
    body,
    margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [52, 73, 94],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { cellWidth: 50 },
    },
    didParseCell: (data: { section: string; column: { index: number }; cell: { styles: { textColor: number[] } }; row: { raw: string[] } }) => {
      // Color-code status column
      if (data.section === 'body' && data.column.index === 6) {
        const status = data.row.raw[6];
        if (status === 'success') {
          data.cell.styles.textColor = [39, 174, 96];
        } else if (status === 'failed') {
          data.cell.styles.textColor = [231, 76, 60];
        } else if (status === 'running') {
          data.cell.styles.textColor = [52, 152, 219];
        }
      }
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (doc as any).lastAutoTable.finalY + 10;
}

function addChartImages(
  doc: InstanceType<typeof import('jspdf').jsPDF>,
  chartImages: ChartImageMap,
  startY: number
): number {
  let y = checkPageBreak(doc, startY, 30);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Trend Charts', MARGIN_LEFT, y);
  y += 8;

  const chartEntries = Object.entries(chartImages).filter(([, img]) => img);
  const chartWidth = CONTENT_WIDTH;
  const chartHeight = 50; // mm per chart

  for (const [name, imageData] of chartEntries) {
    y = checkPageBreak(doc, y, chartHeight + 12);

    // Chart caption
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    const caption = name.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
    doc.text(caption, MARGIN_LEFT, y);
    y += 4;

    try {
      doc.addImage(imageData, 'PNG', MARGIN_LEFT, y, chartWidth, chartHeight);
      y += chartHeight + 8;
    } catch {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('(Chart image unavailable)', MARGIN_LEFT, y + 5);
      y += 12;
    }
  }

  return y;
}

function addEnvironmentMatrix(
  doc: InstanceType<typeof import('jspdf').jsPDF>,
  deploymentCache: Map<number, DeploymentsByEnv>,
  projects: Project[],
  startY: number
): number {
  let y = checkPageBreak(doc, startY, 30);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Environment Matrix', MARGIN_LEFT, y);
  y += 6;

  const envHeaders = ENVIRONMENT_ORDER.flatMap((env: EnvironmentName) => {
    const label = env.toUpperCase();
    return [`${label} Ver`, `${label} Status`];
  });

  const head = [['Project', ...envHeaders]];
  const body = projects.map(p => {
    const deps = deploymentCache.get(p.id);
    const envCols = ENVIRONMENT_ORDER.flatMap((env: EnvironmentName) => {
      const dep = deps?.deployments[env];
      return [dep?.version || '-', dep?.status || '-'];
    });
    return [p.name, ...envCols];
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (doc as any).autoTable({
    startY: y,
    head,
    body,
    margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT },
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
    },
    headStyles: {
      fillColor: [52, 73, 94],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (doc as any).lastAutoTable.finalY + 10;
}

function addFooter(doc: InstanceType<typeof import('jspdf').jsPDF>): void {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(
      'Generated by GitLab CI/CD Dashboard',
      MARGIN_LEFT,
      pageHeight - 10
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      PAGE_WIDTH - MARGIN_RIGHT,
      pageHeight - 10,
      { align: 'right' }
    );
  }
}

/**
 * Generate a complete dashboard PDF report.
 * Lazy-loads jspdf and jspdf-autotable on first call.
 */
export async function generateDashboardPdf(
  metrics: DashboardMetrics,
  options: PdfExportOptions,
  config: DashboardConfig,
  chartImages: ChartImageMap,
  deploymentCache?: Map<number, DeploymentsByEnv>
): Promise<void> {
  await loadPdfLibs();

  if (!jsPDFConstructor) {
    throw new Error('PDF library failed to load');
  }

  const doc = new jsPDFConstructor('p', 'mm', 'a4');

  let y = addHeader(doc, config);

  if (options.includeSummary) {
    y = addSummarySection(doc, metrics, y);
  }

  if (options.includeProjectTable) {
    y = addProjectTable(doc, metrics.projects, y);
  }

  if (options.includeTrendCharts && Object.keys(chartImages).length > 0) {
    y = addChartImages(doc, chartImages, y);
  }

  if (options.includeEnvironmentMatrix && deploymentCache && deploymentCache.size > 0) {
    addEnvironmentMatrix(doc, deploymentCache, metrics.projects, y);
  }

  addFooter(doc);

  doc.save(`gitlab-dashboard-report-${formatDateForFilename(new Date())}.pdf`);
}
