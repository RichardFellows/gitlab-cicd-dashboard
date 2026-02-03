import { describe, test, expect, beforeEach } from 'vitest';
import {
  getRules,
  saveRules,
  addRule,
  updateRule,
  deleteRule,
  getHistory,
  appendHistory,
  markAllRead,
  isEnabled,
  setEnabled,
  isMuted,
  setMuted,
} from './notificationStorage';
import { NotificationRule, NotificationEntry, STORAGE_KEYS } from '../types';

function makeRule(overrides: Partial<NotificationRule> = {}): Omit<NotificationRule, 'id'> {
  return {
    type: 'pipeline-failure',
    name: 'Test Rule',
    enabled: true,
    scope: 'all',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeEntry(overrides: Partial<NotificationEntry> = {}): NotificationEntry {
  return {
    id: `entry_${Date.now()}_${Math.random()}`,
    ruleId: 'r1',
    ruleName: 'Test Rule',
    ruleType: 'pipeline-failure',
    projectId: 1,
    projectName: 'Test Project',
    message: 'Pipeline failed',
    value: 0,
    timestamp: new Date().toISOString(),
    read: false,
    ...overrides,
  };
}

describe('notificationStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getRules', () => {
    test('returns empty array when no rules stored', () => {
      expect(getRules()).toEqual([]);
    });

    test('returns stored rules', () => {
      const rules: NotificationRule[] = [
        { id: 'r1', ...makeRule() },
      ];
      localStorage.setItem(STORAGE_KEYS.NOTIFICATION_RULES, JSON.stringify(rules));
      expect(getRules()).toEqual(rules);
    });

    test('returns empty array on invalid JSON', () => {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATION_RULES, 'not-json');
      expect(getRules()).toEqual([]);
    });

    test('returns empty array when value is not an array', () => {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATION_RULES, '{"foo": "bar"}');
      expect(getRules()).toEqual([]);
    });
  });

  describe('saveRules', () => {
    test('saves rules to localStorage', () => {
      const rules: NotificationRule[] = [{ id: 'r1', ...makeRule() }];
      saveRules(rules);
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATION_RULES) || '[]');
      expect(stored).toEqual(rules);
    });
  });

  describe('addRule', () => {
    test('adds a rule with generated ID', () => {
      const result = addRule(makeRule());
      expect(result).not.toBeNull();
      expect(result!.id).toMatch(/^rule_/);
      expect(result!.name).toBe('Test Rule');
      expect(getRules()).toHaveLength(1);
    });

    test('returns null when max rules reached', () => {
      // Add 20 rules
      for (let i = 0; i < 20; i++) {
        addRule(makeRule({ name: `Rule ${i}` }));
      }
      expect(getRules()).toHaveLength(20);

      // 21st should fail
      const result = addRule(makeRule({ name: 'Overflow' }));
      expect(result).toBeNull();
      expect(getRules()).toHaveLength(20);
    });
  });

  describe('updateRule', () => {
    test('updates an existing rule', () => {
      const rule = addRule(makeRule())!;
      updateRule(rule.id, { name: 'Updated Name', enabled: false });
      const rules = getRules();
      expect(rules[0].name).toBe('Updated Name');
      expect(rules[0].enabled).toBe(false);
    });

    test('does nothing for non-existent ID', () => {
      addRule(makeRule());
      updateRule('nonexistent', { name: 'Should not appear' });
      expect(getRules()[0].name).toBe('Test Rule');
    });
  });

  describe('deleteRule', () => {
    test('deletes a rule by ID', () => {
      const rule = addRule(makeRule())!;
      expect(getRules()).toHaveLength(1);
      deleteRule(rule.id);
      expect(getRules()).toHaveLength(0);
    });

    test('does nothing for non-existent ID', () => {
      addRule(makeRule());
      deleteRule('nonexistent');
      expect(getRules()).toHaveLength(1);
    });
  });

  describe('getHistory', () => {
    test('returns empty array when no history stored', () => {
      expect(getHistory()).toEqual([]);
    });

    test('returns stored history', () => {
      const entries = [makeEntry()];
      localStorage.setItem(STORAGE_KEYS.NOTIFICATION_HISTORY, JSON.stringify(entries));
      expect(getHistory()).toEqual(entries);
    });

    test('returns empty array on invalid JSON', () => {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATION_HISTORY, 'bad');
      expect(getHistory()).toEqual([]);
    });
  });

  describe('appendHistory', () => {
    test('appends entries to history', () => {
      const entry1 = makeEntry({ id: 'e1' });
      appendHistory([entry1]);
      expect(getHistory()).toHaveLength(1);

      const entry2 = makeEntry({ id: 'e2' });
      appendHistory([entry2]);
      expect(getHistory()).toHaveLength(2);
      // Newest first
      expect(getHistory()[0].id).toBe('e2');
    });

    test('enforces 50-entry max', () => {
      // Add 50 entries
      const entries = Array.from({ length: 50 }, (_, i) =>
        makeEntry({ id: `e${i}` })
      );
      appendHistory(entries);
      expect(getHistory()).toHaveLength(50);

      // Add 5 more
      const newEntries = Array.from({ length: 5 }, (_, i) =>
        makeEntry({ id: `new${i}` })
      );
      appendHistory(newEntries);
      const history = getHistory();
      expect(history).toHaveLength(50);
      // Newest should be first
      expect(history[0].id).toBe('new0');
    });

    test('does nothing with empty entries array', () => {
      appendHistory([makeEntry()]);
      const before = getHistory().length;
      appendHistory([]);
      expect(getHistory()).toHaveLength(before);
    });
  });

  describe('markAllRead', () => {
    test('marks all entries as read', () => {
      const entries = [
        makeEntry({ id: 'e1', read: false }),
        makeEntry({ id: 'e2', read: false }),
        makeEntry({ id: 'e3', read: true }),
      ];
      localStorage.setItem(STORAGE_KEYS.NOTIFICATION_HISTORY, JSON.stringify(entries));

      markAllRead();
      const history = getHistory();
      expect(history.every(e => e.read)).toBe(true);
    });
  });

  describe('isEnabled / setEnabled', () => {
    test('defaults to false', () => {
      expect(isEnabled()).toBe(false);
    });

    test('persists enabled state', () => {
      setEnabled(true);
      expect(isEnabled()).toBe(true);
      setEnabled(false);
      expect(isEnabled()).toBe(false);
    });
  });

  describe('isMuted / setMuted', () => {
    test('defaults to false', () => {
      expect(isMuted()).toBe(false);
    });

    test('persists muted state', () => {
      setMuted(true);
      expect(isMuted()).toBe(true);
      setMuted(false);
      expect(isMuted()).toBe(false);
    });
  });
});
