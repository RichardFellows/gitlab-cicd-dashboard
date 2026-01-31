import { PipelineTrend } from '../types';

/**
 * Compute the union of all date labels across multiple project trend datasets.
 * Returns sorted array of date strings (YYYY-MM-DD).
 */
export function getUnionDateLabels(
  trendData: Map<number, PipelineTrend[]>
): string[] {
  const dateSet = new Set<string>();
  for (const trends of trendData.values()) {
    for (const trend of trends) {
      dateSet.add(trend.date);
    }
  }
  return Array.from(dateSet).sort();
}

/**
 * Align a single project's trend data to the union of date labels.
 * Missing dates are filled with null values.
 *
 * @param trends - The project's trend data
 * @param labels - The union date labels (sorted)
 * @param accessor - Function to extract the numeric value from a PipelineTrend
 * @returns Array of (number | null) aligned to labels
 */
export function alignTrendData(
  trends: PipelineTrend[],
  labels: string[],
  accessor: (t: PipelineTrend) => number
): (number | null)[] {
  const dateMap = new Map<string, PipelineTrend>();
  for (const trend of trends) {
    dateMap.set(trend.date, trend);
  }

  return labels.map(date => {
    const trend = dateMap.get(date);
    return trend !== undefined ? accessor(trend) : null;
  });
}

/**
 * Format date labels for chart display (e.g. "Jan 15" instead of "2026-01-15").
 */
export function formatDateLabels(labels: string[]): string[] {
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  return labels.map(dateStr => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return `${monthNames[month]} ${day}`;
    }
    return dateStr;
  });
}
