import { DashboardConfig, SavedConfigEntry, STORAGE_KEYS } from '../types';
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
