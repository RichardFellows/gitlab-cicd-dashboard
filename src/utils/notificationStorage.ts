import { NotificationRule, NotificationEntry, STORAGE_KEYS } from '../types';

const MAX_HISTORY = 50;
const MAX_RULES = 20;

/**
 * Generate a unique rule ID
 */
function generateRuleId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================
// Rules CRUD
// ============================================

/**
 * Get all notification rules from localStorage
 */
export function getRules(): NotificationRule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATION_RULES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

/**
 * Save rules array to localStorage
 */
export function saveRules(rules: NotificationRule[]): void {
  localStorage.setItem(STORAGE_KEYS.NOTIFICATION_RULES, JSON.stringify(rules));
}

/**
 * Add a new notification rule
 * @returns The created rule with generated ID, or null if max reached
 */
export function addRule(rule: Omit<NotificationRule, 'id'>): NotificationRule | null {
  const rules = getRules();
  if (rules.length >= MAX_RULES) return null;

  const newRule: NotificationRule = {
    ...rule,
    id: generateRuleId(),
  };
  rules.push(newRule);
  saveRules(rules);
  return newRule;
}

/**
 * Update an existing rule by ID
 */
export function updateRule(id: string, updates: Partial<Omit<NotificationRule, 'id'>>): void {
  const rules = getRules();
  const index = rules.findIndex(r => r.id === id);
  if (index === -1) return;
  rules[index] = { ...rules[index], ...updates };
  saveRules(rules);
}

/**
 * Delete a rule by ID
 */
export function deleteRule(id: string): void {
  const rules = getRules().filter(r => r.id !== id);
  saveRules(rules);
}

// ============================================
// History Management
// ============================================

/**
 * Get notification history from localStorage
 */
export function getHistory(): NotificationEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

/**
 * Save history to localStorage
 */
function saveHistory(history: NotificationEntry[]): void {
  localStorage.setItem(STORAGE_KEYS.NOTIFICATION_HISTORY, JSON.stringify(history));
}

/**
 * Append new entries to history, enforcing 50-entry max
 * Newest entries are at the beginning of the array
 */
export function appendHistory(entries: NotificationEntry[]): void {
  if (entries.length === 0) return;
  const current = getHistory();
  const updated = [...entries, ...current].slice(0, MAX_HISTORY);
  saveHistory(updated);
}

/**
 * Mark all history entries as read
 */
export function markAllRead(): void {
  const history = getHistory();
  const updated = history.map(entry => ({ ...entry, read: true }));
  saveHistory(updated);
}

// ============================================
// Enable / Mute toggles
// ============================================

/**
 * Check if notifications are enabled
 */
export function isEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED) === 'true';
}

/**
 * Set notifications enabled/disabled
 */
export function setEnabled(val: boolean): void {
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED, String(val));
}

/**
 * Check if notification sound is muted
 */
export function isMuted(): boolean {
  return localStorage.getItem(STORAGE_KEYS.NOTIFICATION_MUTED) === 'true';
}

/**
 * Set notification sound muted/unmuted
 */
export function setMuted(val: boolean): void {
  localStorage.setItem(STORAGE_KEYS.NOTIFICATION_MUTED, String(val));
}
