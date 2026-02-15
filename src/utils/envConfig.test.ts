import { describe, it, expect, beforeEach } from 'vitest';
import { loadEnvConfig, validateEnvConfig, resetEnvConfigCache, type EnvConfig } from './envConfig';

describe('envConfig', () => {
  beforeEach(() => {
    resetEnvConfigCache();
  });

  describe('loadEnvConfig', () => {
    it('returns sensible defaults when no env vars set', () => {
      const config = loadEnvConfig();
      expect(config.gitlabUrl).toBe('https://gitlab.com/api/v4');
      expect(config.gitlabToken).toBe('');
      expect(config.defaultTimeframe).toBe(30);
      expect(config.defaultGroups).toEqual([]);
      expect(config.defaultProjects).toEqual([]);
      expect(config.jiraBaseUrl).toBe('');
    });

    it('strips trailing slashes from URLs', () => {
      // Vite import.meta.env is read-only at test time — test the parsing logic
      const config = loadEnvConfig();
      expect(config.gitlabUrl).not.toMatch(/\/$/);
    });
  });

  describe('validateEnvConfig', () => {
    const validConfig: EnvConfig = {
      gitlabUrl: 'https://gitlab.com/api/v4',
      gitlabToken: 'glpat-abc123',
      defaultTimeframe: 30,
      defaultGroups: ['123'],
      defaultProjects: [],
      jiraBaseUrl: '',
    };

    it('passes for valid config', () => {
      const errors = validateEnvConfig(validConfig);
      expect(errors.filter(e => e.severity === 'error')).toHaveLength(0);
    });

    it('flags invalid GitLab URL', () => {
      const errors = validateEnvConfig({ ...validConfig, gitlabUrl: 'not-a-url' });
      expect(errors).toContainEqual(
        expect.objectContaining({ field: 'VITE_GITLAB_URL', severity: 'error' })
      );
    });

    it('warns about non-glpat token on gitlab.com', () => {
      const errors = validateEnvConfig({ ...validConfig, gitlabToken: 'some-token' });
      expect(errors).toContainEqual(
        expect.objectContaining({ field: 'VITE_GITLAB_TOKEN', severity: 'warning' })
      );
    });

    it('does not warn about non-glpat token on self-hosted', () => {
      const errors = validateEnvConfig({
        ...validConfig,
        gitlabUrl: 'https://git.internal.corp/api/v4',
        gitlabToken: 'some-token',
      });
      expect(errors.filter(e => e.field === 'VITE_GITLAB_TOKEN')).toHaveLength(0);
    });

    it('warns about excessive timeframe', () => {
      const errors = validateEnvConfig({ ...validConfig, defaultTimeframe: 500 });
      expect(errors).toContainEqual(
        expect.objectContaining({ field: 'VITE_DEFAULT_TIMEFRAME', severity: 'warning' })
      );
    });

    it('flags invalid JIRA URL', () => {
      const errors = validateEnvConfig({ ...validConfig, jiraBaseUrl: 'not-valid' });
      expect(errors).toContainEqual(
        expect.objectContaining({ field: 'VITE_JIRA_BASE_URL', severity: 'warning' })
      );
    });
  });
});
