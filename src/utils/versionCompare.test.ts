import { describe, it, expect } from 'vitest';
import { parseVersion, compareVersions } from './versionCompare';

describe('parseVersion', () => {
  it('parses semver strings', () => {
    expect(parseVersion('2.3.45')).toEqual([2, 3, 45]);
    expect(parseVersion('1.0.0')).toEqual([1, 0, 0]);
    expect(parseVersion('10.20.30')).toEqual([10, 20, 30]);
  });

  it('strips v prefix', () => {
    expect(parseVersion('v2.3.45')).toEqual([2, 3, 45]);
    expect(parseVersion('V1.0.0')).toEqual([1, 0, 0]);
  });

  it('parses pipeline IID format', () => {
    expect(parseVersion('#123')).toEqual([123]);
    expect(parseVersion('#1')).toEqual([1]);
    expect(parseVersion('#9999')).toEqual([9999]);
  });

  it('returns empty array for empty or invalid input', () => {
    expect(parseVersion('')).toEqual([]);
    expect(parseVersion('#abc')).toEqual([]);
  });

  it('handles partial semver (two parts)', () => {
    expect(parseVersion('1.2')).toEqual([1, 2]);
  });

  it('handles single number', () => {
    expect(parseVersion('42')).toEqual([42]);
  });
});

describe('compareVersions', () => {
  describe('semver comparisons', () => {
    it('correctly compares different patch versions', () => {
      expect(compareVersions('2.3.45', '2.3.40')).toBe(1);
      expect(compareVersions('2.3.40', '2.3.45')).toBe(-1);
    });

    it('correctly compares different minor versions', () => {
      expect(compareVersions('2.4.0', '2.3.99')).toBe(1);
      expect(compareVersions('1.9.0', '2.0.0')).toBe(-1);
    });

    it('correctly compares different major versions', () => {
      expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
      expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
    });

    it('returns 0 for equal versions', () => {
      expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
      expect(compareVersions('0.0.0', '0.0.0')).toBe(0);
    });

    it('handles versions with v prefix', () => {
      expect(compareVersions('v2.3.45', 'v2.3.40')).toBe(1);
      expect(compareVersions('v1.0.0', '1.0.0')).toBe(0);
    });

    it('treats missing components as zero', () => {
      expect(compareVersions('1.2', '1.2.0')).toBe(0);
      expect(compareVersions('1.2.1', '1.2')).toBe(1);
    });
  });

  describe('IID comparisons', () => {
    it('correctly compares pipeline IIDs', () => {
      expect(compareVersions('#123', '#120')).toBe(1);
      expect(compareVersions('#100', '#200')).toBe(-1);
      expect(compareVersions('#50', '#50')).toBe(0);
    });
  });

  describe('null handling', () => {
    it('null equals null', () => {
      expect(compareVersions(null, null)).toBe(0);
    });

    it('null is less than any version', () => {
      expect(compareVersions(null, '1.0.0')).toBe(-1);
      expect(compareVersions(null, '#1')).toBe(-1);
    });

    it('any version is greater than null', () => {
      expect(compareVersions('1.0.0', null)).toBe(1);
      expect(compareVersions('#1', null)).toBe(1);
    });
  });

  describe('mixed format comparisons', () => {
    it('compares IID vs semver by first component', () => {
      // #200 = [200], 1.2.3 = [1,2,3] → 200 > 1
      expect(compareVersions('#200', '1.2.3')).toBe(1);
      // #1 = [1], 2.0.0 = [2,0,0] → 1 < 2
      expect(compareVersions('#1', '2.0.0')).toBe(-1);
    });
  });
});
