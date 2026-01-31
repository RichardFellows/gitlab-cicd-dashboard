import { describe, test, expect } from 'vitest';
import { getDataAge, formatRelativeTime, formatAbsoluteTime } from './dataAge';

describe('getDataAge', () => {
  const base = new Date('2026-01-30T12:00:00Z');

  test('returns fresh status for data < 5 min old', () => {
    const lastUpdated = new Date(base.getTime() - 2 * 60 * 1000); // 2 min ago
    const result = getDataAge(lastUpdated, base);
    expect(result.status).toBe('fresh');
    expect(result.minutes).toBe(2);
  });

  test('returns fresh status for data just updated', () => {
    const result = getDataAge(base, base);
    expect(result.status).toBe('fresh');
    expect(result.minutes).toBe(0);
  });

  test('returns aging status for data 5-30 min old', () => {
    const lastUpdated = new Date(base.getTime() - 10 * 60 * 1000); // 10 min ago
    const result = getDataAge(lastUpdated, base);
    expect(result.status).toBe('aging');
    expect(result.minutes).toBe(10);
  });

  test('returns aging at exactly 5 min boundary', () => {
    const lastUpdated = new Date(base.getTime() - 5 * 60 * 1000);
    const result = getDataAge(lastUpdated, base);
    expect(result.status).toBe('aging');
    expect(result.minutes).toBe(5);
  });

  test('returns stale status for data > 30 min old', () => {
    const lastUpdated = new Date(base.getTime() - 45 * 60 * 1000);
    const result = getDataAge(lastUpdated, base);
    expect(result.status).toBe('stale');
    expect(result.minutes).toBe(45);
  });

  test('returns stale at exactly 30 min boundary', () => {
    const lastUpdated = new Date(base.getTime() - 30 * 60 * 1000);
    const result = getDataAge(lastUpdated, base);
    expect(result.status).toBe('stale');
    expect(result.minutes).toBe(30);
  });

  test('handles hours-old data', () => {
    const lastUpdated = new Date(base.getTime() - 3 * 60 * 60 * 1000); // 3 hours
    const result = getDataAge(lastUpdated, base);
    expect(result.status).toBe('stale');
    expect(result.minutes).toBe(180);
  });
});

describe('formatRelativeTime', () => {
  const base = new Date('2026-01-30T12:00:00Z');

  test('returns "just now" for < 1 min', () => {
    const date = new Date(base.getTime() - 30 * 1000);
    expect(formatRelativeTime(date, base)).toBe('just now');
  });

  test('returns "just now" for 0 seconds', () => {
    expect(formatRelativeTime(base, base)).toBe('just now');
  });

  test('returns "1 minute ago"', () => {
    const date = new Date(base.getTime() - 60 * 1000);
    expect(formatRelativeTime(date, base)).toBe('1 minute ago');
  });

  test('returns "X minutes ago" for < 60 min', () => {
    const date = new Date(base.getTime() - 23 * 60 * 1000);
    expect(formatRelativeTime(date, base)).toBe('23 minutes ago');
  });

  test('returns "1 hour ago"', () => {
    const date = new Date(base.getTime() - 60 * 60 * 1000);
    expect(formatRelativeTime(date, base)).toBe('1 hour ago');
  });

  test('returns "X hours ago" for >= 2 hours', () => {
    const date = new Date(base.getTime() - 3 * 60 * 60 * 1000);
    expect(formatRelativeTime(date, base)).toBe('3 hours ago');
  });

  test('returns "1 hour ago" for 90 minutes', () => {
    const date = new Date(base.getTime() - 90 * 60 * 1000);
    expect(formatRelativeTime(date, base)).toBe('1 hour ago');
  });
});

describe('formatAbsoluteTime', () => {
  test('formats time with zero-padded HH:MM:SS', () => {
    const date = new Date(2026, 0, 30, 9, 5, 3); // 09:05:03
    expect(formatAbsoluteTime(date)).toBe('09:05:03');
  });

  test('formats afternoon time', () => {
    const date = new Date(2026, 0, 30, 14, 23, 45);
    expect(formatAbsoluteTime(date)).toBe('14:23:45');
  });

  test('formats midnight', () => {
    const date = new Date(2026, 0, 30, 0, 0, 0);
    expect(formatAbsoluteTime(date)).toBe('00:00:00');
  });

  test('formats 23:59:59', () => {
    const date = new Date(2026, 0, 30, 23, 59, 59);
    expect(formatAbsoluteTime(date)).toBe('23:59:59');
  });
});
