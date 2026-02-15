import { DashboardConfig, STORAGE_KEYS } from '../types';
import { logger } from './logger';
import { getEnvConfig } from './envConfig';

const CURRENT_CONFIG_VERSION = 1;

/**
 * Create a default config seeded from environment variables.
 * Falls back to sensible hardcoded defaults when env vars are absent.
 */
export function createDefaultConfig(): DashboardConfig {
  const env = getEnvConfig();
  const now = new Date().toISOString();

  return {
    version: CURRENT_CONFIG_VERSION,
    gitlabUrl: env.gitlabUrl,
    token: env.gitlabToken,
    timeframe: env.defaultTimeframe,
    groups: env.defaultGroups.map(id => ({ id, addedAt: now })),
    projects: env.defaultProjects.map(id => ({ id, addedAt: now })),
    ...(env.jiraBaseUrl ? { jiraBaseUrl: env.jiraBaseUrl } : {}),
  };
}

/**
 * Migrate legacy single-group storage to new DashboardConfig format
 */
export function migrateLegacyConfig(): DashboardConfig | null {
  const savedUrl = localStorage.getItem(STORAGE_KEYS.GITLAB_URL);
  const savedGroupId = localStorage.getItem(STORAGE_KEYS.GROUP_ID);
  const savedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
  const savedTimeframe = localStorage.getItem(STORAGE_KEYS.TIMEFRAME);

  // Only migrate if we have legacy data
  if (!savedUrl && !savedGroupId && !savedToken) {
    return null;
  }

  const config: DashboardConfig = {
    version: CURRENT_CONFIG_VERSION,
    gitlabUrl: savedUrl || 'https://gitlab.com/api/v4',
    token: savedToken || '',
    timeframe: savedTimeframe ? parseInt(savedTimeframe, 10) : 30,
    groups: [],
    projects: []
  };

  // Migrate the legacy group ID if it exists
  if (savedGroupId) {
    config.groups.push({
      id: savedGroupId,
      addedAt: new Date().toISOString()
    });
  }

  return config;
}

/**
 * Load config from localStorage, migrating legacy data if needed
 */
export function loadConfig(): DashboardConfig {
  // Try to load new config format first
  const savedConfig = localStorage.getItem(STORAGE_KEYS.DASHBOARD_CONFIG);

  if (savedConfig) {
    try {
      const parsed = JSON.parse(savedConfig) as DashboardConfig;

      // Future: Add version migration logic here if needed
      // if (parsed.version < CURRENT_CONFIG_VERSION) { ... }

      return parsed;
    } catch (error) {
      logger.error('Failed to parse saved config:', error);
    }
  }

  // Try to migrate legacy config
  const legacyConfig = migrateLegacyConfig();
  if (legacyConfig) {
    logger.debug('Migrated legacy config to new format');
    saveConfig(legacyConfig);

    // Clean up legacy keys
    clearLegacyKeys();

    return legacyConfig;
  }

  // Return default config
  return createDefaultConfig();
}

/**
 * Save config to localStorage
 */
export function saveConfig(config: DashboardConfig): void {
  localStorage.setItem(STORAGE_KEYS.DASHBOARD_CONFIG, JSON.stringify(config));
}

/**
 * Clear legacy storage keys after migration
 */
function clearLegacyKeys(): void {
  localStorage.removeItem(STORAGE_KEYS.GITLAB_URL);
  localStorage.removeItem(STORAGE_KEYS.GROUP_ID);
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.TIMEFRAME);
}

/**
 * Clear all config data
 */
export function clearConfig(): void {
  localStorage.removeItem(STORAGE_KEYS.DASHBOARD_CONFIG);
  clearLegacyKeys();
  localStorage.removeItem(STORAGE_KEYS.SETTINGS_COLLAPSED);
}

/**
 * Check if config has at least one valid source
 */
export function hasValidSources(config: DashboardConfig): boolean {
  return config.groups.length > 0 || config.projects.length > 0;
}

/**
 * Check if config is ready to load (has token and at least one source)
 */
export function isConfigReady(config: DashboardConfig): boolean {
  return !!config.token && hasValidSources(config);
}
