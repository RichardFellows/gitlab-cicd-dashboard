import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  getSavedConfigs,
  saveNewConfig,
  updateConfigEntry,
  renameConfigEntry,
  deleteConfigEntry,
  getActiveConfigId,
  setActiveConfigId,
  exportConfig,
  importConfig,
  hasUnsavedChanges,
} from './configStorage';
import { DashboardConfig, STORAGE_KEYS, SavedConfigEntry } from '../types';

const mockConfig: DashboardConfig = {
  version: 1,
  gitlabUrl: 'https://gitlab.com',
  token: 'glpat-test-token',
  timeframe: 30,
  groups: [{ id: '123', name: 'my-group', addedAt: '2026-01-01T00:00:00Z' }],
  projects: [],
  jiraBaseUrl: 'https://jira.company.com/browse',
};

describe('configStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('getSavedConfigs', () => {
    test('returns empty array when no configs saved', () => {
      expect(getSavedConfigs()).toEqual([]);
    });

    test('returns saved configs from localStorage', () => {
      const configs: SavedConfigEntry[] = [
        { id: 'cfg_1', name: 'Test', config: mockConfig, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
      ];
      localStorage.setItem(STORAGE_KEYS.SAVED_CONFIGS, JSON.stringify(configs));
      expect(getSavedConfigs()).toEqual(configs);
    });

    test('returns empty array on invalid JSON', () => {
      localStorage.setItem(STORAGE_KEYS.SAVED_CONFIGS, 'not-json');
      expect(getSavedConfigs()).toEqual([]);
    });

    test('returns empty array when value is not an array', () => {
      localStorage.setItem(STORAGE_KEYS.SAVED_CONFIGS, JSON.stringify({ foo: 'bar' }));
      expect(getSavedConfigs()).toEqual([]);
    });
  });

  describe('saveNewConfig', () => {
    test('saves a new config and returns it with id and timestamps', () => {
      const entry = saveNewConfig('My Config', mockConfig);
      expect(entry.id).toMatch(/^cfg_/);
      expect(entry.name).toBe('My Config');
      expect(entry.config).toEqual(mockConfig);
      expect(entry.createdAt).toBeTruthy();
      expect(entry.updatedAt).toBeTruthy();

      const saved = getSavedConfigs();
      expect(saved).toHaveLength(1);
      expect(saved[0].name).toBe('My Config');
    });

    test('trims name whitespace', () => {
      const entry = saveNewConfig('  Spaced Name  ', mockConfig);
      expect(entry.name).toBe('Spaced Name');
    });

    test('enforces max 20 configs limit', () => {
      // Save 20 configs
      for (let i = 0; i < 20; i++) {
        saveNewConfig(`Config ${i}`, mockConfig);
      }
      expect(getSavedConfigs()).toHaveLength(20);

      // 21st should throw
      expect(() => saveNewConfig('One Too Many', mockConfig)).toThrow(/Maximum 20/);
    });
  });

  describe('updateConfigEntry', () => {
    test('updates config and updatedAt timestamp', () => {
      const entry = saveNewConfig('Test', mockConfig);
      const updatedConfig = { ...mockConfig, timeframe: 90 };

      updateConfigEntry(entry.id, updatedConfig);

      const saved = getSavedConfigs();
      expect(saved[0].config.timeframe).toBe(90);
      expect(new Date(saved[0].updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(entry.updatedAt).getTime()
      );
    });

    test('throws when id not found', () => {
      expect(() => updateConfigEntry('nonexistent', mockConfig)).toThrow(/not found/);
    });
  });

  describe('renameConfigEntry', () => {
    test('renames a config', () => {
      const entry = saveNewConfig('Old Name', mockConfig);
      renameConfigEntry(entry.id, 'New Name');

      const saved = getSavedConfigs();
      expect(saved[0].name).toBe('New Name');
    });

    test('throws when id not found', () => {
      expect(() => renameConfigEntry('nonexistent', 'Name')).toThrow(/not found/);
    });
  });

  describe('deleteConfigEntry', () => {
    test('deletes a config by id', () => {
      const entry1 = saveNewConfig('Config 1', mockConfig);
      saveNewConfig('Config 2', mockConfig);

      deleteConfigEntry(entry1.id);

      const saved = getSavedConfigs();
      expect(saved).toHaveLength(1);
      expect(saved[0].name).toBe('Config 2');
    });

    test('clears active config id if deleting active config', () => {
      const entry = saveNewConfig('Active', mockConfig);
      setActiveConfigId(entry.id);
      expect(getActiveConfigId()).toBe(entry.id);

      deleteConfigEntry(entry.id);
      expect(getActiveConfigId()).toBeNull();
    });
  });

  describe('getActiveConfigId / setActiveConfigId', () => {
    test('returns null when not set', () => {
      expect(getActiveConfigId()).toBeNull();
    });

    test('stores and retrieves active config id', () => {
      setActiveConfigId('cfg_123');
      expect(getActiveConfigId()).toBe('cfg_123');
    });

    test('clears active config id when set to null', () => {
      setActiveConfigId('cfg_123');
      setActiveConfigId(null);
      expect(getActiveConfigId()).toBeNull();
    });
  });

  describe('hasUnsavedChanges', () => {
    test('returns false for identical configs', () => {
      expect(hasUnsavedChanges(mockConfig, { ...mockConfig })).toBe(false);
    });

    test('ignores token differences', () => {
      const changed = { ...mockConfig, token: 'different-token' };
      expect(hasUnsavedChanges(changed, mockConfig)).toBe(false);
    });

    test('detects gitlabUrl change', () => {
      const changed = { ...mockConfig, gitlabUrl: 'https://other.com' };
      expect(hasUnsavedChanges(changed, mockConfig)).toBe(true);
    });

    test('detects timeframe change', () => {
      const changed = { ...mockConfig, timeframe: 90 };
      expect(hasUnsavedChanges(changed, mockConfig)).toBe(true);
    });

    test('detects group addition', () => {
      const changed = {
        ...mockConfig,
        groups: [...mockConfig.groups, { id: '456', addedAt: '2026-01-01T00:00:00Z' }],
      };
      expect(hasUnsavedChanges(changed, mockConfig)).toBe(true);
    });

    test('detects project addition', () => {
      const changed = {
        ...mockConfig,
        projects: [{ id: '789', addedAt: '2026-01-01T00:00:00Z' }],
      };
      expect(hasUnsavedChanges(changed, mockConfig)).toBe(true);
    });

    test('detects jiraBaseUrl change', () => {
      const changed = { ...mockConfig, jiraBaseUrl: 'https://other-jira.com' };
      expect(hasUnsavedChanges(changed, mockConfig)).toBe(true);
    });
  });

  describe('exportConfig', () => {
    const readBlob = (blob: Blob): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(blob);
      });

    test('exports config as JSON blob', async () => {
      const entry: SavedConfigEntry = {
        id: 'cfg_1',
        name: 'Test Config',
        config: mockConfig,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      const blob = exportConfig(entry, true);
      expect(blob.type).toBe('application/json');

      const text = await readBlob(blob);
      const parsed = JSON.parse(text);
      expect(parsed.version).toBe(1);
      expect(parsed.name).toBe('Test Config');
      expect(parsed.config.token).toBe('glpat-test-token');
      expect(parsed.exportedAt).toBeTruthy();
    });

    test('excludes token when includeToken is false', async () => {
      const entry: SavedConfigEntry = {
        id: 'cfg_1',
        name: 'Test',
        config: mockConfig,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      const blob = exportConfig(entry, false);
      const text = await readBlob(blob);
      const parsed = JSON.parse(text);
      expect(parsed.config.token).toBe('');
    });
  });

  describe('importConfig', () => {
    test('imports valid JSON', () => {
      const json = JSON.stringify({
        version: 1,
        name: 'Imported Config',
        config: {
          version: 1,
          gitlabUrl: 'https://gitlab.com',
          token: 'test',
          timeframe: 30,
          groups: [{ id: '123', addedAt: '2026-01-01T00:00:00Z' }],
          projects: [],
        },
        exportedAt: '2026-01-01T00:00:00Z',
      });

      const entry = importConfig(json);
      expect(entry.id).toMatch(/^cfg_/);
      expect(entry.name).toBe('Imported Config');
      expect(entry.config.gitlabUrl).toBe('https://gitlab.com');
      expect(entry.config.groups).toHaveLength(1);
    });

    test('throws on invalid JSON', () => {
      expect(() => importConfig('not json')).toThrow(/Invalid JSON/);
    });

    test('throws on missing version', () => {
      const json = JSON.stringify({ name: 'Test', config: mockConfig });
      expect(() => importConfig(json)).toThrow(/version/);
    });

    test('throws on missing name', () => {
      const json = JSON.stringify({ version: 1, config: mockConfig });
      expect(() => importConfig(json)).toThrow(/name/);
    });

    test('throws on empty name', () => {
      const json = JSON.stringify({ version: 1, name: '  ', config: mockConfig });
      expect(() => importConfig(json)).toThrow(/name/);
    });

    test('throws on missing config', () => {
      const json = JSON.stringify({ version: 1, name: 'Test' });
      expect(() => importConfig(json)).toThrow(/config/);
    });

    test('throws on missing gitlabUrl', () => {
      const json = JSON.stringify({
        version: 1,
        name: 'Test',
        config: { timeframe: 30, groups: [], projects: [] },
      });
      expect(() => importConfig(json)).toThrow(/gitlabUrl/);
    });

    test('throws on missing timeframe', () => {
      const json = JSON.stringify({
        version: 1,
        name: 'Test',
        config: { gitlabUrl: 'https://gitlab.com', groups: [], projects: [] },
      });
      expect(() => importConfig(json)).toThrow(/timeframe/);
    });

    test('throws on missing groups array', () => {
      const json = JSON.stringify({
        version: 1,
        name: 'Test',
        config: { gitlabUrl: 'https://gitlab.com', timeframe: 30, projects: [] },
      });
      expect(() => importConfig(json)).toThrow(/groups/);
    });

    test('throws on missing projects array', () => {
      const json = JSON.stringify({
        version: 1,
        name: 'Test',
        config: { gitlabUrl: 'https://gitlab.com', timeframe: 30, groups: [] },
      });
      expect(() => importConfig(json)).toThrow(/projects/);
    });

    test('defaults token to empty string if missing', () => {
      const json = JSON.stringify({
        version: 1,
        name: 'Test',
        config: {
          gitlabUrl: 'https://gitlab.com',
          timeframe: 30,
          groups: [],
          projects: [],
        },
      });

      const entry = importConfig(json);
      expect(entry.config.token).toBe('');
    });

    test('preserves jiraBaseUrl if present', () => {
      const json = JSON.stringify({
        version: 1,
        name: 'Test',
        config: {
          gitlabUrl: 'https://gitlab.com',
          timeframe: 30,
          groups: [],
          projects: [],
          jiraBaseUrl: 'https://jira.example.com',
        },
      });

      const entry = importConfig(json);
      expect(entry.config.jiraBaseUrl).toBe('https://jira.example.com');
    });
  });
});
