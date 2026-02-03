import { DashboardConfig, ExportedConfig, SavedConfigEntry, STORAGE_KEYS } from '../types';
import { logger } from './logger';

const MAX_SAVED_CONFIGS = 20;

/**
 * Generate a unique config ID using timestamp + random suffix
 */
function generateConfigId(): string {
  return `cfg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Get all saved configurations from localStorage
 */
export function getSavedConfigs(): SavedConfigEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVED_CONFIGS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (error) {
    logger.error('Failed to parse saved configs:', error);
    return [];
  }
}

/**
 * Persist saved configs array to localStorage
 */
function persistConfigs(configs: SavedConfigEntry[]): void {
  localStorage.setItem(STORAGE_KEYS.SAVED_CONFIGS, JSON.stringify(configs));
}

/**
 * Save a new configuration entry.
 * Generates unique ID, sets timestamps.
 * Enforces max 20 configs limit.
 */
export function saveNewConfig(name: string, config: DashboardConfig): SavedConfigEntry {
  const configs = getSavedConfigs();

  if (configs.length >= MAX_SAVED_CONFIGS) {
    throw new Error(`Maximum ${MAX_SAVED_CONFIGS} configurations reached. Delete an existing one first.`);
  }

  const now = new Date().toISOString();
  const entry: SavedConfigEntry = {
    id: generateConfigId(),
    name: name.trim(),
    config: { ...config },
    createdAt: now,
    updatedAt: now,
  };

  configs.push(entry);
  persistConfigs(configs);
  return entry;
}

/**
 * Update an existing configuration entry's config data and updatedAt timestamp
 */
export function updateConfigEntry(id: string, config: DashboardConfig): void {
  const configs = getSavedConfigs();
  const index = configs.findIndex(c => c.id === id);
  if (index === -1) {
    throw new Error(`Configuration with id "${id}" not found.`);
  }

  configs[index] = {
    ...configs[index],
    config: { ...config },
    updatedAt: new Date().toISOString(),
  };
  persistConfigs(configs);
}

/**
 * Rename a configuration
 */
export function renameConfigEntry(id: string, newName: string): void {
  const configs = getSavedConfigs();
  const index = configs.findIndex(c => c.id === id);
  if (index === -1) {
    throw new Error(`Configuration with id "${id}" not found.`);
  }

  configs[index] = {
    ...configs[index],
    name: newName.trim(),
    updatedAt: new Date().toISOString(),
  };
  persistConfigs(configs);
}

/**
 * Delete a configuration by ID
 */
export function deleteConfigEntry(id: string): void {
  const configs = getSavedConfigs();
  const filtered = configs.filter(c => c.id !== id);
  persistConfigs(filtered);

  // Clear active config ID if we deleted the active one
  if (getActiveConfigId() === id) {
    setActiveConfigId(null);
  }
}

/**
 * Get the active configuration ID from localStorage
 */
export function getActiveConfigId(): string | null {
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_CONFIG_ID) || null;
}

/**
 * Set the active configuration ID in localStorage
 */
export function setActiveConfigId(id: string | null): void {
  if (id === null) {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_CONFIG_ID);
  } else {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_CONFIG_ID, id);
  }
}

/**
 * Deep comparison of two DashboardConfig objects to detect unsaved changes.
 * Ignores the token field (token changes don't count as "unsaved changes" for UX).
 */
export function hasUnsavedChanges(current: DashboardConfig, saved: DashboardConfig): boolean {
  // Compare all fields except token
  if (current.version !== saved.version) return true;
  if (current.gitlabUrl !== saved.gitlabUrl) return true;
  if (current.timeframe !== saved.timeframe) return true;
  if ((current.jiraBaseUrl || '') !== (saved.jiraBaseUrl || '')) return true;

  // Compare groups
  if (current.groups.length !== saved.groups.length) return true;
  for (let i = 0; i < current.groups.length; i++) {
    if (current.groups[i].id !== saved.groups[i].id) return true;
  }

  // Compare projects
  if (current.projects.length !== saved.projects.length) return true;
  for (let i = 0; i < current.projects.length; i++) {
    if (current.projects[i].id !== saved.projects[i].id) return true;
  }

  return false;
}

/**
 * Export a configuration as a downloadable JSON Blob.
 * @param entry - The saved config entry to export
 * @param includeToken - If false, token is replaced with empty string
 */
export function exportConfig(entry: SavedConfigEntry, includeToken: boolean): Blob {
  const exportData: ExportedConfig = {
    version: 1,
    name: entry.name,
    config: {
      ...entry.config,
      token: includeToken ? entry.config.token : '',
    },
    exportedAt: new Date().toISOString(),
  };

  return new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
}

/**
 * Import a configuration from a JSON string.
 * Validates schema, generates new ID and timestamps.
 * @throws Error if schema is invalid or JSON is malformed
 */
export function importConfig(jsonString: string): SavedConfigEntry {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('Invalid JSON format. Please check the file.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid configuration file. Expected a JSON object.');
  }

  const data = parsed as Record<string, unknown>;

  // Validate required top-level fields
  if (typeof data.version !== 'number') {
    throw new Error('Invalid configuration: missing or invalid "version" field.');
  }
  if (typeof data.name !== 'string' || !data.name.trim()) {
    throw new Error('Invalid configuration: missing or empty "name" field.');
  }

  const config = data.config as Record<string, unknown> | undefined;
  if (!config || typeof config !== 'object') {
    throw new Error('Invalid configuration: missing "config" field.');
  }

  // Validate required config fields
  if (typeof config.gitlabUrl !== 'string') {
    throw new Error('Invalid configuration: missing "config.gitlabUrl" field.');
  }
  if (typeof config.timeframe !== 'number') {
    throw new Error('Invalid configuration: missing or invalid "config.timeframe" field.');
  }
  if (!Array.isArray(config.groups)) {
    throw new Error('Invalid configuration: missing "config.groups" array.');
  }
  if (!Array.isArray(config.projects)) {
    throw new Error('Invalid configuration: missing "config.projects" array.');
  }

  const now = new Date().toISOString();
  const importedConfig: DashboardConfig = {
    version: typeof config.version === 'number' ? config.version : 1,
    gitlabUrl: config.gitlabUrl as string,
    token: typeof config.token === 'string' ? config.token : '',
    timeframe: config.timeframe as number,
    groups: config.groups as DashboardConfig['groups'],
    projects: config.projects as DashboardConfig['projects'],
    ...(typeof config.jiraBaseUrl === 'string' ? { jiraBaseUrl: config.jiraBaseUrl } : {}),
  };

  return {
    id: generateConfigId(),
    name: (data.name as string).trim(),
    config: importedConfig,
    createdAt: now,
    updatedAt: now,
  };
}
