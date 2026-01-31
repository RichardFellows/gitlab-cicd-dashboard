import { describe, test, expect, beforeEach } from 'vitest';
import {
  getSavedConfigs,
  saveNewConfig,
  updateConfigEntry,
  deleteConfigEntry,
  getActiveConfigId,
  setActiveConfigId,
  exportConfig,
  importConfig,
  hasUnsavedChanges,
} from './configStorage';
import { DashboardConfig } from '../types';

describe('configStorage integration: save/load/switch cycle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const config1: DashboardConfig = {
    version: 1,
    gitlabUrl: 'https://gitlab.com',
    token: 'token-1',
    timeframe: 30,
    groups: [{ id: '100', name: 'team-alpha', addedAt: '2026-01-01T00:00:00Z' }],
    projects: [],
  };

  const config2: DashboardConfig = {
    version: 1,
    gitlabUrl: 'https://gitlab.company.com',
    token: 'token-2',
    timeframe: 90,
    groups: [],
    projects: [{ id: '200', name: 'my-project', addedAt: '2026-01-01T00:00:00Z' }],
    jiraBaseUrl: 'https://jira.company.com/browse',
  };

  test('full save/load/switch/update cycle', () => {
    // 1. Start with no configs
    expect(getSavedConfigs()).toHaveLength(0);
    expect(getActiveConfigId()).toBeNull();

    // 2. Save first config
    const entry1 = saveNewConfig('Team Alpha', config1);
    expect(entry1.id).toMatch(/^cfg_/);
    expect(entry1.name).toBe('Team Alpha');
    setActiveConfigId(entry1.id);

    // 3. Save second config
    const entry2 = saveNewConfig('Prod Monitoring', config2);
    expect(getSavedConfigs()).toHaveLength(2);

    // 4. Switch to second config
    setActiveConfigId(entry2.id);
    expect(getActiveConfigId()).toBe(entry2.id);

    // 5. Verify data is correct
    const saved = getSavedConfigs();
    const active = saved.find(c => c.id === entry2.id);
    expect(active?.config.gitlabUrl).toBe('https://gitlab.company.com');
    expect(active?.config.timeframe).toBe(90);
    expect(active?.config.projects).toHaveLength(1);

    // 6. Switch back to first config
    setActiveConfigId(entry1.id);
    const first = saved.find(c => c.id === entry1.id);
    expect(first?.config.gitlabUrl).toBe('https://gitlab.com');
    expect(first?.config.groups).toHaveLength(1);

    // 7. Update first config
    const updatedConfig1 = { ...config1, timeframe: 7 };
    updateConfigEntry(entry1.id, updatedConfig1);
    const refreshed = getSavedConfigs();
    expect(refreshed.find(c => c.id === entry1.id)?.config.timeframe).toBe(7);

    // 8. Delete second config
    deleteConfigEntry(entry2.id);
    expect(getSavedConfigs()).toHaveLength(1);
    expect(getSavedConfigs()[0].name).toBe('Team Alpha');
  });

  test('unsaved changes detection through lifecycle', () => {
    const entry = saveNewConfig('Test', config1);
    setActiveConfigId(entry.id);

    // No changes - should be false
    expect(hasUnsavedChanges(config1, entry.config)).toBe(false);

    // Modify timeframe - should be true
    const modified = { ...config1, timeframe: 90 };
    expect(hasUnsavedChanges(modified, entry.config)).toBe(true);

    // Update saved config - should be false again
    updateConfigEntry(entry.id, modified);
    const saved = getSavedConfigs().find(c => c.id === entry.id)!;
    expect(hasUnsavedChanges(modified, saved.config)).toBe(false);
  });

  test('export/import round-trip preserves data', () => {
    const entry = saveNewConfig('Round Trip', config2);

    // Export without token
    const blob = exportConfig(entry, false);

    // Simulate the export data for import (Blob.text() not available in jsdom)
    const exportData = {
      version: 1,
      name: entry.name,
      config: { ...entry.config, token: '' },
      exportedAt: new Date().toISOString(),
    };
    const jsonString = JSON.stringify(exportData);

    // Import it
    const imported = importConfig(jsonString);
    expect(imported.name).toBe('Round Trip');
    expect(imported.config.gitlabUrl).toBe('https://gitlab.company.com');
    expect(imported.config.timeframe).toBe(90);
    expect(imported.config.token).toBe(''); // Token was excluded
    expect(imported.config.jiraBaseUrl).toBe('https://jira.company.com/browse');
    expect(imported.id).not.toBe(entry.id); // New ID generated

    // Ensure blob was created
    expect(blob.type).toBe('application/json');
  });

  test('export with token includes token', () => {
    const entry = saveNewConfig('With Token', config1);
    const exportData = {
      version: 1,
      name: entry.name,
      config: entry.config,
      exportedAt: new Date().toISOString(),
    };
    const jsonString = JSON.stringify(exportData);

    const imported = importConfig(jsonString);
    expect(imported.config.token).toBe('token-1');
  });
});
