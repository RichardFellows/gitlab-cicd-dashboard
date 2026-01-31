/**
 * Utilities for grouping, labelling, and filtering deployment timeline data.
 */
import { DeploymentHistoryEntry, TimelineFilters } from '../types';

/**
 * Group deployment history entries by date (ISO date string).
 * Entries within each group are sorted newest-first.
 * Groups themselves are ordered newest-first.
 *
 * @param entries - Deployment history entries (assumed already sorted newest-first)
 * @returns Map of ISO date string → entries for that day
 */
export function groupByDate(
  entries: DeploymentHistoryEntry[]
): Map<string, DeploymentHistoryEntry[]> {
  const groups = new Map<string, DeploymentHistoryEntry[]>();

  for (const entry of entries) {
    const date = entry.timestamp
      ? new Date(entry.timestamp).toISOString().split('T')[0]
      : 'unknown';

    if (!groups.has(date)) {
      groups.set(date, []);
    }
    groups.get(date)!.push(entry);
  }

  // Sort groups by date descending (newest first)
  const sorted = new Map(
    [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  );

  return sorted;
}

/**
 * Get a human-readable label for a date string.
 *
 * @param dateStr - ISO date string (e.g., "2026-01-28")
 * @returns "Today", "Yesterday", or formatted date (e.g., "28 Jan 2026")
 */
export function getDateLabel(dateStr: string): string {
  if (dateStr === 'unknown') return 'Unknown Date';

  const date = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (targetDate.getTime() === today.getTime()) return 'Today';
  if (targetDate.getTime() === yesterday.getTime()) return 'Yesterday';

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Filter timeline entries based on active filters.
 *
 * @param entries - All deployment history entries
 * @param filters - Active filter state
 * @returns Filtered entries
 */
export function filterTimeline(
  entries: DeploymentHistoryEntry[],
  filters: TimelineFilters
): DeploymentHistoryEntry[] {
  return entries.filter(entry => {
    // Project filter
    if (filters.projectIds.length > 0 && !filters.projectIds.includes(entry.projectId)) {
      return false;
    }

    // Environment filter
    if (filters.environments.length > 0 && !filters.environments.includes(entry.environment)) {
      return false;
    }

    // Status filter (maps rollback flag to 'rollback' status)
    if (filters.statuses.length > 0) {
      const entryStatus = entry.isRollback ? 'rollback' : entry.status;
      if (!filters.statuses.includes(entryStatus as 'success' | 'failed' | 'rollback')) {
        return false;
      }
    }

    // Date range filter
    if (filters.dateFrom) {
      const entryDate = entry.timestamp
        ? new Date(entry.timestamp).toISOString().split('T')[0]
        : '';
      if (entryDate < filters.dateFrom) return false;
    }

    if (filters.dateTo) {
      const entryDate = entry.timestamp
        ? new Date(entry.timestamp).toISOString().split('T')[0]
        : '';
      if (entryDate > filters.dateTo) return false;
    }

    return true;
  });
}

/**
 * Create an empty/default TimelineFilters object.
 */
export function createDefaultFilters(): TimelineFilters {
  return {
    projectIds: [],
    environments: [],
    statuses: [],
    dateFrom: null,
    dateTo: null,
  };
}
