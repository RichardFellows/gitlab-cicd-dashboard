import { Project } from "../types";
import { logger } from "./logger";

/**
 * Categorize a project based on its pipeline status
 * @param {Object} project - The project object with metrics
 * @returns {string} - Category ('failed', 'warning', 'no-pipeline', 'success')
 */
export function categorizeProject(project: Project): string {
  // Check if pipeline exists
  if (!project.metrics.mainBranchPipeline.available) {
    return 'no-pipeline';
  }
  
  // Check pipeline status
  const status = project.metrics.mainBranchPipeline.status;
  if (status === 'failed' || status === 'canceled') {
    return 'failed';
  }
  
  if (status === 'running' || status === 'pending') {
    return 'warning';
  }
  
  if (status === 'success') {
    // Even if pipeline is successful, we may want to warn about low success rates
    if (project.metrics.successRate < 75) {
      return 'warning';
    }
    return 'success';
  }
  
  // Default case for unknown statuses
  return 'warning';
}

/**
 * Get CSS class for success rate
 * @param rate - Success rate percentage
 * @returns Class name
 */
export function getSuccessRateClass(rate: number): string {
  if (rate >= 90) return 'success';
  if (rate >= 75) return 'warning';
  return 'danger';
}

/**
 * Format duration in seconds to human-readable string
 * @param seconds - Duration in seconds
 * @returns Formatted duration
 */
export function formatDuration(seconds?: number): string {
  if (!seconds) return '0s';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Get CSS class for pipeline status
 * @param status - Pipeline status
 * @returns Class name
 */
export function getPipelineStatusClass(status: string): string {
  switch (status) {
    case 'success':
      return 'success';
    case 'failed':
      return 'danger';
    case 'running':
      return 'warning';
    case 'canceled':
      return 'danger';
    case 'pending':
      return 'warning';
    default:
      return '';
  }
}

/**
 * Format pipeline status for display
 * @param status - Pipeline status
 * @param available - Is pipeline available
 * @returns Formatted status
 */
export function formatPipelineStatus(status?: string, available?: boolean): string {
  if (!status || status === 'unknown' || available === false) return 'No Pipeline Data';
  
  // Capitalize first letter
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Format code coverage for display
 * @param coverage - Coverage percentage
 * @param available - Is coverage available
 * @returns Formatted coverage
 */
export function formatCoverage(coverage: number | null, available?: boolean): string {
  if (available === false) return 'Not Available';
  if (coverage === null || coverage === undefined) return 'No Coverage Data';
  
  // Make sure coverage is a number
  const coverageNum = typeof coverage === 'number' ? coverage : parseFloat(String(coverage));
  if (isNaN(coverageNum)) {
    logger.warn('Invalid coverage value:', coverage);
    return 'Invalid Data';
  }
  
  return `${coverageNum.toFixed(2)}%`;
}

/**
 * Format date for display
 * @param dateString - ISO date string
 * @returns Formatted date
 */
export function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  return date.toLocaleString();
}

/**
 * Escape HTML special characters
 * @param unsafe - String to escape
 * @returns Escaped string
 */
export function escapeHtml(unsafe?: string): string {
  if (!unsafe) return '';
  
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}