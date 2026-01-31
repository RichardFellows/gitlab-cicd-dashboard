import { describe, it, expect } from 'vitest';
import { Job } from '../types';
import {
  categoriseFailure,
  highlightLog,
  extractLastLines,
  calculateFailureFrequency,
  FAILURE_PATTERNS,
} from './failureDiagnosis';

// ============================================
// categoriseFailure tests
// ============================================
describe('categoriseFailure', () => {
  it('detects dependency issues (npm ERR!)', () => {
    const result = categoriseFailure('npm ERR! code ERESOLVE\nnpm ERR! Could not resolve dependency');
    expect(result.type).toBe('dependency');
    expect(result.confidence).toBe('high');
    expect(result.icon).toBe('🔧');
    expect(result.label).toBe('Dependency Issue');
  });

  it('detects dependency issues (Cannot find module)', () => {
    const result = categoriseFailure("Error: Cannot find module 'lodash'");
    expect(result.type).toBe('dependency');
  });

  it('detects dependency issues (ENOENT)', () => {
    const result = categoriseFailure('ENOENT: no such file or directory');
    expect(result.type).toBe('dependency');
  });

  it('detects dependency issues (Module not found)', () => {
    const result = categoriseFailure("Module not found: Error: Can't resolve '@foo/bar'");
    expect(result.type).toBe('dependency');
  });

  it('detects infrastructure issues (Connection refused)', () => {
    const result = categoriseFailure('Error: Connection refused at 10.0.0.1:5432');
    expect(result.type).toBe('infrastructure');
    expect(result.icon).toBe('🏗️');
    expect(result.label).toBe('Infrastructure');
  });

  it('detects infrastructure issues (OOMKilled)', () => {
    const result = categoriseFailure('Container was OOMKilled');
    expect(result.type).toBe('infrastructure');
  });

  it('detects infrastructure issues (FATAL:)', () => {
    const result = categoriseFailure('FATAL: could not connect to database');
    expect(result.type).toBe('infrastructure');
  });

  it('detects infrastructure issues (out of memory)', () => {
    const result = categoriseFailure('JavaScript heap out of memory');
    expect(result.type).toBe('infrastructure');
  });

  it('detects test failures (AssertionError)', () => {
    const result = categoriseFailure('AssertionError: expected true to be false');
    expect(result.type).toBe('test-failure');
    expect(result.icon).toBe('🧪');
    expect(result.label).toBe('Test Failure');
  });

  it('detects test failures (FAIL)', () => {
    const result = categoriseFailure('FAIL src/components/App.test.tsx');
    expect(result.type).toBe('test-failure');
  });

  it('detects test failures (failing count)', () => {
    const result = categoriseFailure('  3 failing');
    expect(result.type).toBe('test-failure');
  });

  it('detects test failures (Expected to equal)', () => {
    const result = categoriseFailure('Expected 5 to equal 3');
    expect(result.type).toBe('test-failure');
  });

  it('detects timeout issues (Job exceeded timeout)', () => {
    const result = categoriseFailure('ERROR: Job exceeded timeout of 3600 seconds');
    // Since ERROR matches test-failure before timeout, let's check the actual pattern priority
    // The log contains "Job exceeded timeout" so timeout should match
    // Actually 'ERROR' matches test-failure first through 'error' keyword... but categoriseFailure
    // checks FAILURE_PATTERNS which have specific patterns, not the line-level highlighter
    expect(result.type).toBe('timeout');
    expect(result.icon).toBe('⏱️');
  });

  it('detects timeout (timed out)', () => {
    const result = categoriseFailure('Request timed out after 30s');
    expect(result.type).toBe('timeout');
  });

  it('detects timeout (deadline exceeded)', () => {
    const result = categoriseFailure('rpc error: code = DeadlineExceeded deadline exceeded');
    expect(result.type).toBe('timeout');
  });

  it('returns unknown for unrecognised logs', () => {
    const result = categoriseFailure('Everything looks fine\nBuild succeeded\nDone in 5s');
    expect(result.type).toBe('unknown');
    expect(result.confidence).toBe('low');
    expect(result.icon).toBe('❓');
    expect(result.matchedPattern).toBe('');
  });

  it('returns unknown for empty log', () => {
    const result = categoriseFailure('');
    expect(result.type).toBe('unknown');
  });

  it('returns first matching category (priority order)', () => {
    // This has both dependency and test patterns
    const result = categoriseFailure('npm ERR! Cannot find module "test"\nFAIL tests/foo.test.js');
    expect(result.type).toBe('dependency'); // dependency comes first
  });
});

// ============================================
// highlightLog tests
// ============================================
describe('highlightLog', () => {
  it('returns empty array for empty string', () => {
    expect(highlightLog('')).toEqual([]);
  });

  it('classifies error lines', () => {
    const lines = highlightLog('Step 1 complete\nERROR: something broke\nDone');
    expect(lines).toHaveLength(3);
    expect(lines[0].level).toBe('normal');
    expect(lines[1].level).toBe('error');
    expect(lines[2].level).toBe('normal');
  });

  it('classifies warning lines', () => {
    const lines = highlightLog('warning: deprecation notice\nnpm WARN old package');
    expect(lines[0].level).toBe('warning');
    expect(lines[1].level).toBe('warning');
  });

  it('classifies info lines', () => {
    const lines = highlightLog('[INFO] Building project\n[debug] checking cache');
    expect(lines[0].level).toBe('info');
    expect(lines[1].level).toBe('info');
  });

  it('classifies exception as error', () => {
    const lines = highlightLog('java.lang.RuntimeException: bad state');
    expect(lines[0].level).toBe('error');
  });

  it('classifies fatal as error', () => {
    const lines = highlightLog('FATAL: out of memory');
    expect(lines[0].level).toBe('error');
  });

  it('limits to last N lines', () => {
    const log = Array.from({ length: 200 }, (_, i) => `line ${i + 1}`).join('\n');
    const lines = highlightLog(log, 50);
    expect(lines).toHaveLength(50);
    expect(lines[0].lineNumber).toBe(151);
    expect(lines[49].lineNumber).toBe(200);
  });

  it('assigns correct line numbers', () => {
    const lines = highlightLog('a\nb\nc');
    expect(lines[0].lineNumber).toBe(1);
    expect(lines[1].lineNumber).toBe(2);
    expect(lines[2].lineNumber).toBe(3);
  });

  it('handles maxLines larger than actual lines', () => {
    const lines = highlightLog('a\nb', 100);
    expect(lines).toHaveLength(2);
    expect(lines[0].lineNumber).toBe(1);
  });
});

// ============================================
// extractLastLines tests
// ============================================
describe('extractLastLines', () => {
  it('returns empty string for empty input', () => {
    expect(extractLastLines('', 10)).toBe('');
  });

  it('extracts last N lines', () => {
    const log = 'line1\nline2\nline3\nline4\nline5';
    expect(extractLastLines(log, 3)).toBe('line3\nline4\nline5');
  });

  it('returns all lines when N exceeds total', () => {
    const log = 'a\nb';
    expect(extractLastLines(log, 10)).toBe('a\nb');
  });

  it('returns last 1 line', () => {
    expect(extractLastLines('a\nb\nc', 1)).toBe('c');
  });
});

// ============================================
// calculateFailureFrequency tests
// ============================================
describe('calculateFailureFrequency', () => {
  const makeJob = (name: string, status: string): Job => ({
    id: Math.random() * 10000 | 0,
    name,
    stage: 'test',
    status,
    web_url: 'https://example.com',
    created_at: '2025-01-01T00:00:00Z',
  });

  it('calculates frequency for all-pass jobs', () => {
    const jobs = [
      makeJob('test', 'success'),
      makeJob('test', 'success'),
      makeJob('test', 'success'),
    ];
    const result = calculateFailureFrequency(jobs, 'test');
    expect(result.failedCount).toBe(0);
    expect(result.totalCount).toBe(3);
    expect(result.isFlaky).toBe(false);
  });

  it('calculates frequency for all-fail jobs', () => {
    const jobs = [
      makeJob('build', 'failed'),
      makeJob('build', 'failed'),
      makeJob('build', 'failed'),
    ];
    const result = calculateFailureFrequency(jobs, 'build');
    expect(result.failedCount).toBe(3);
    expect(result.totalCount).toBe(3);
    expect(result.isFlaky).toBe(false); // 100% failure is not flaky
  });

  it('detects flaky jobs (inconsistent failures)', () => {
    const jobs = [
      makeJob('lint', 'success'),
      makeJob('lint', 'failed'),
      makeJob('lint', 'success'),
      makeJob('lint', 'failed'),
      makeJob('lint', 'success'),
    ];
    const result = calculateFailureFrequency(jobs, 'lint');
    expect(result.failedCount).toBe(2);
    expect(result.totalCount).toBe(5);
    expect(result.isFlaky).toBe(true);
  });

  it('handles no matching jobs', () => {
    const jobs = [makeJob('build', 'success')];
    const result = calculateFailureFrequency(jobs, 'nonexistent');
    expect(result.failedCount).toBe(0);
    expect(result.totalCount).toBe(0);
    expect(result.isFlaky).toBe(false);
  });

  it('handles empty jobs array', () => {
    const result = calculateFailureFrequency([], 'test');
    expect(result.failedCount).toBe(0);
    expect(result.totalCount).toBe(0);
    expect(result.isFlaky).toBe(false);
  });

  it('ignores non-terminal statuses (running, pending)', () => {
    const jobs = [
      makeJob('deploy', 'success'),
      makeJob('deploy', 'running'),
      makeJob('deploy', 'pending'),
      makeJob('deploy', 'failed'),
    ];
    const result = calculateFailureFrequency(jobs, 'deploy');
    expect(result.totalCount).toBe(2); // only success + failed
    expect(result.failedCount).toBe(1);
    expect(result.isFlaky).toBe(true);
  });

  it('filters by exact job name', () => {
    const jobs = [
      makeJob('test', 'failed'),
      makeJob('test:unit', 'success'),
      makeJob('test', 'success'),
    ];
    const result = calculateFailureFrequency(jobs, 'test');
    expect(result.totalCount).toBe(2);
    expect(result.failedCount).toBe(1);
  });

  it('sets jobName in result', () => {
    const result = calculateFailureFrequency([], 'my-job');
    expect(result.jobName).toBe('my-job');
  });
});

// ============================================
// FAILURE_PATTERNS structure
// ============================================
describe('FAILURE_PATTERNS', () => {
  it('has all expected categories', () => {
    const categories = FAILURE_PATTERNS.map(p => p.category);
    expect(categories).toContain('dependency');
    expect(categories).toContain('infrastructure');
    expect(categories).toContain('test-failure');
    expect(categories).toContain('timeout');
  });

  it('all patterns have at least one regex', () => {
    for (const entry of FAILURE_PATTERNS) {
      expect(entry.patterns.length).toBeGreaterThan(0);
    }
  });

  it('all patterns have valid confidence', () => {
    for (const entry of FAILURE_PATTERNS) {
      expect(['high', 'medium', 'low']).toContain(entry.confidence);
    }
  });
});
