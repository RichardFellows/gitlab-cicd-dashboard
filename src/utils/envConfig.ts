/**
 * Environment-based configuration abstraction layer.
 *
 * All deployment-specific values (URLs, tokens, defaults) are read from
 * Vite env vars (VITE_*) so the same build can target different GitLab
 * instances without code changes.
 *
 * Runtime precedence: localStorage config > env vars > hardcoded defaults.
 */

/** Typed environment configuration */
export interface EnvConfig {
  /** GitLab API base URL (e.g. "https://gitlab.com/api/v4") */
  gitlabUrl: string;
  /** Pre-configured GitLab token (empty = require manual entry) */
  gitlabToken: string;
  /** Default timeframe in days */
  defaultTimeframe: number;
  /** Default group IDs to pre-populate */
  defaultGroups: string[];
  /** Default project IDs to pre-populate */
  defaultProjects: string[];
  /** Optional JIRA base URL */
  jiraBaseUrl: string;
}

/** Validation error for startup checks */
export interface ConfigValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Parse a comma-separated env string into a trimmed, non-empty array.
 */
function parseCommaSeparated(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Read and parse environment configuration from Vite env vars.
 * Safe to call in browser — uses import.meta.env.
 */
export function loadEnvConfig(): EnvConfig {
  const env = import.meta.env;

  const timeframeRaw = env.VITE_DEFAULT_TIMEFRAME;
  const timeframe = timeframeRaw ? parseInt(timeframeRaw, 10) : 30;

  return {
    gitlabUrl: (env.VITE_GITLAB_URL || 'https://gitlab.com/api/v4').replace(/\/+$/, ''),
    gitlabToken: env.VITE_GITLAB_TOKEN || '',
    defaultTimeframe: isNaN(timeframe) || timeframe < 1 ? 30 : timeframe,
    defaultGroups: parseCommaSeparated(env.VITE_DEFAULT_GROUPS),
    defaultProjects: parseCommaSeparated(env.VITE_DEFAULT_PROJECTS),
    jiraBaseUrl: (env.VITE_JIRA_BASE_URL || '').replace(/\/+$/, ''),
  };
}

/**
 * Validate an EnvConfig and return any issues.
 * Called on startup to surface misconfigurations early.
 */
export function validateEnvConfig(config: EnvConfig): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  // URL validation
  if (config.gitlabUrl) {
    try {
      new URL(config.gitlabUrl);
    } catch {
      errors.push({
        field: 'VITE_GITLAB_URL',
        message: `Invalid URL: "${config.gitlabUrl}"`,
        severity: 'error',
      });
    }
  }

  // Token format hint (not enforced — self-hosted may differ)
  if (config.gitlabToken && !config.gitlabToken.startsWith('glpat-') && config.gitlabUrl.includes('gitlab.com')) {
    errors.push({
      field: 'VITE_GITLAB_TOKEN',
      message: 'Token does not start with "glpat-" — verify it is a valid GitLab Personal Access Token',
      severity: 'warning',
    });
  }

  // JIRA URL validation
  if (config.jiraBaseUrl) {
    try {
      new URL(config.jiraBaseUrl);
    } catch {
      errors.push({
        field: 'VITE_JIRA_BASE_URL',
        message: `Invalid JIRA URL: "${config.jiraBaseUrl}"`,
        severity: 'warning',
      });
    }
  }

  // Timeframe sanity
  if (config.defaultTimeframe > 365) {
    errors.push({
      field: 'VITE_DEFAULT_TIMEFRAME',
      message: `Timeframe ${config.defaultTimeframe}d is very large — may cause slow API responses`,
      severity: 'warning',
    });
  }

  return errors;
}

/** Singleton — loaded once per page load */
let _cached: EnvConfig | null = null;

/**
 * Get the environment config (cached after first call).
 */
export function getEnvConfig(): EnvConfig {
  if (!_cached) {
    _cached = loadEnvConfig();
  }
  return _cached;
}

/**
 * Reset the cached config (useful for tests).
 */
export function resetEnvConfigCache(): void {
  _cached = null;
}
