import { AGING_DATA_THRESHOLD, STALE_DATA_THRESHOLD } from './constants';

export type DataAgeStatus = 'fresh' | 'aging' | 'stale';

export interface DataAge {
  /** Age in whole minutes */
  minutes: number;
  /** Classification based on thresholds */
  status: DataAgeStatus;
}

/**
 * Calculate the age and staleness status of data based on its timestamp.
 */
export function getDataAge(lastUpdated: Date, now: Date = new Date()): DataAge {
  const diffMs = now.getTime() - lastUpdated.getTime();
  const minutes = Math.floor(diffMs / 60000);

  let status: DataAgeStatus;
  if (diffMs >= STALE_DATA_THRESHOLD) {
    status = 'stale';
  } else if (diffMs >= AGING_DATA_THRESHOLD) {
    status = 'aging';
  } else {
    status = 'fresh';
  }

  return { minutes, status };
}

/**
 * Format a date as a human-readable relative time string.
 * E.g. "just now", "3 minutes ago", "1 hour ago", "2 hours ago".
 */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins === 1) return '1 minute ago';
  if (diffMins < 60) return `${diffMins} minutes ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return '1 hour ago';
  return `${diffHours} hours ago`;
}

/**
 * Format a date as an absolute time string (HH:MM:SS, 24-hour).
 */
export function formatAbsoluteTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  const s = date.getSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}
