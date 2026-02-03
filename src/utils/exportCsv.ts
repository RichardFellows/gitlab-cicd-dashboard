import { Project, DeploymentsByEnv, EnvironmentName, ENVIRONMENT_ORDER } from '../types';

/**
 * Escape a CSV field value.
 * Wraps in double-quotes if it contains commas, quotes, or newlines.
 */
export function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generate CSV content for project metrics.
 * Includes UTF-8 BOM for Excel compatibility.
 */
export function generateProjectsCsv(projects: Project[]): string {
  const headers = [
    'Project Name',
    'Project Path',
    'Pipeline Count',
    'Success Rate (%)',
    'Failed Pipelines',
    'Avg Duration (s)',
    'Coverage (%)',
    'Open MRs',
    'Draft MRs',
    'Main Branch Status',
  ];

  const rows = projects.map(project => [
    escapeCsv(project.name),
    escapeCsv(project.path_with_namespace || ''),
    String(project.metrics.totalPipelines),
    project.metrics.successRate.toFixed(2),
    String(project.metrics.failedPipelines),
    project.metrics.avgDuration.toFixed(0),
    project.metrics.codeCoverage.coverage !== null
      ? project.metrics.codeCoverage.coverage.toFixed(2)
      : 'N/A',
    String(project.metrics.mergeRequestCounts.totalOpen),
    String(project.metrics.mergeRequestCounts.drafts),
    project.metrics.mainBranchPipeline.status,
  ]);

  // UTF-8 BOM + headers + data rows
  return '\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

/**
 * Generate CSV content for environment deployments.
 */
export function generateEnvironmentCsv(
  deploymentCache: Map<number, DeploymentsByEnv>,
  projects: Project[]
): string {
  const envHeaders = ENVIRONMENT_ORDER.flatMap((env: EnvironmentName) => {
    const label = env.charAt(0).toUpperCase() + env.slice(1);
    return [`${label} Version`, `${label} Status`];
  });

  const headers = ['Project Name', ...envHeaders];

  const rows = projects.map(project => {
    const deployments = deploymentCache.get(project.id);
    const envCols = ENVIRONMENT_ORDER.flatMap((env: EnvironmentName) => {
      const dep = deployments?.deployments[env];
      return [
        escapeCsv(dep?.version || '-'),
        dep?.status || '-',
      ];
    });
    return [escapeCsv(project.name), ...envCols];
  });

  return '\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

/**
 * Trigger browser download of CSV content.
 * Creates a Blob and temporary anchor element.
 */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
