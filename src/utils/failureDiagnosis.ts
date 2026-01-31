import { FailureCategoryType, FailureCategory, FailureFrequency, HighlightedLine, Job } from '../types';

/**
 * Pattern definitions for failure categorisation.
 * Ordered by priority — first match wins.
 */
export const FAILURE_PATTERNS: Array<{
  category: FailureCategoryType;
  patterns: RegExp[];
  confidence: 'high' | 'medium' | 'low';
}> = [
  {
    category: 'dependency',
    patterns: [
      /npm ERR!/i,
      /ENOENT/,
      /Cannot find module/i,
      /EACCES/,
      /Module not found/i,
      /Could not resolve dependency/i,
      /ERESOLVE/,
      /No matching version/i,
      /nuget.*not found/i,
      /package.*restore.*failed/i,
    ],
    confidence: 'high',
  },
  {
    category: 'infrastructure',
    patterns: [
      /FATAL:/,
      /Connection refused/i,
      /ECONNRESET/,
      /ECONNREFUSED/,
      /OOMKilled/i,
      /out of memory/i,
      /disk space/i,
      /No space left on device/i,
      /cannot allocate memory/i,
      /service unavailable/i,
    ],
    confidence: 'high',
  },
  {
    category: 'test-failure',
    patterns: [
      /AssertionError/,
      /Expected .* to equal/i,
      /FAIL\s/,
      /[✗×]\s/,
      /\d+ failing/,
      /Test.*failed/i,
      /assert\..*Error/,
      /expect\(.*\)\./,
    ],
    confidence: 'high',
  },
  {
    category: 'timeout',
    patterns: [
      /Job exceeded timeout/i,
      /script exceeded/i,
      /execution expired/i,
      /timed? ?out/i,
      /deadline exceeded/i,
    ],
    confidence: 'high',
  },
];

/** Map category type to display metadata */
const CATEGORY_META: Record<FailureCategoryType, { icon: string; label: string }> = {
  dependency: { icon: '🔧', label: 'Dependency Issue' },
  infrastructure: { icon: '🏗️', label: 'Infrastructure' },
  'test-failure': { icon: '🧪', label: 'Test Failure' },
  timeout: { icon: '⏱️', label: 'Timeout' },
  unknown: { icon: '❓', label: 'Unknown' },
};

/**
 * Categorise a failure based on log content.
 * Scans log text against known patterns, returns first match.
 * Never throws — returns 'unknown' category on any error.
 */
export function categoriseFailure(logText: string): FailureCategory {
  try {
    for (const { category, patterns, confidence } of FAILURE_PATTERNS) {
      for (const pattern of patterns) {
        if (pattern.test(logText)) {
          const meta = CATEGORY_META[category];
          return {
            type: category,
            icon: meta.icon,
            label: meta.label,
            matchedPattern: pattern.source,
            confidence,
          };
        }
      }
    }
  } catch {
    // Fall through to unknown
  }

  return {
    type: 'unknown',
    icon: CATEGORY_META.unknown.icon,
    label: CATEGORY_META.unknown.label,
    matchedPattern: '',
    confidence: 'low',
  };
}

/** Regex patterns for classifying individual log lines */
const ERROR_LINE_PATTERN = /error|fatal|fail|exception/i;
const WARNING_LINE_PATTERN = /warn|deprecat/i;
const INFO_LINE_PATTERN = /info|debug|notice/i;

/**
 * Highlight log lines with severity levels.
 * Applies line-by-line classification for syntax highlighting.
 * @param logText - Raw log text
 * @param maxLines - Maximum lines to return (from end of log). Default 100.
 */
export function highlightLog(logText: string, maxLines: number = 100): HighlightedLine[] {
  if (!logText) return [];

  const allLines = logText.split('\n');
  // Take last maxLines lines
  const startIndex = Math.max(0, allLines.length - maxLines);
  const lines = allLines.slice(startIndex);

  return lines.map((text, index) => {
    let level: HighlightedLine['level'] = 'normal';

    if (ERROR_LINE_PATTERN.test(text)) {
      level = 'error';
    } else if (WARNING_LINE_PATTERN.test(text)) {
      level = 'warning';
    } else if (INFO_LINE_PATTERN.test(text)) {
      level = 'info';
    }

    return {
      text,
      level,
      lineNumber: startIndex + index + 1,
    };
  });
}

/**
 * Extract the last N lines from a log string.
 */
export function extractLastLines(log: string, n: number): string {
  if (!log) return '';
  const lines = log.split('\n');
  return lines.slice(Math.max(0, lines.length - n)).join('\n');
}

/**
 * Calculate how often a specific job fails.
 * @param jobs - Recent jobs for the project (from getProjectJobs)
 * @param targetJobName - The job name to check frequency for
 * @returns FailureFrequency with counts and flaky indicator
 */
export function calculateFailureFrequency(
  jobs: Job[],
  targetJobName: string
): FailureFrequency {
  // Filter to matching job name
  const matchingJobs = jobs.filter(job => job.name === targetJobName);

  // Only count terminal statuses (success or failed)
  const terminalJobs = matchingJobs.filter(
    job => job.status === 'success' || job.status === 'failed'
  );

  const totalCount = terminalJobs.length;
  const failedCount = terminalJobs.filter(job => job.status === 'failed').length;

  // Flaky: has failures but less than 80% failure rate
  const isFlaky = totalCount > 0 && failedCount > 0 && (failedCount / totalCount) < 0.8;

  return {
    jobName: targetJobName,
    failedCount,
    totalCount,
    isFlaky,
  };
}
