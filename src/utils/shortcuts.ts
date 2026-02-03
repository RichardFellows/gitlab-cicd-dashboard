/**
 * Keyboard shortcut definitions for the dashboard.
 * Used by useKeyboardShortcuts hook and ShortcutsOverlay component.
 */

export type ShortcutCategory = 'navigation' | 'actions' | 'projects';

export interface ShortcutInfo {
  /** The key value from KeyboardEvent.key */
  key: string;
  /** Display label for the overlay (e.g., "Esc" instead of "Escape") */
  keyDisplay: string;
  /** Human-readable description */
  description: string;
  /** Grouping category for the overlay */
  category: ShortcutCategory;
}

export const SHORTCUT_DEFINITIONS: ShortcutInfo[] = [
  // Navigation — view switching
  { key: '1', keyDisplay: '1', description: 'Card View', category: 'navigation' },
  { key: '2', keyDisplay: '2', description: 'Table View', category: 'navigation' },
  { key: '3', keyDisplay: '3', description: 'Environment View', category: 'navigation' },
  { key: '4', keyDisplay: '4', description: 'Readiness View', category: 'navigation' },
  { key: '5', keyDisplay: '5', description: 'MR Board View', category: 'navigation' },

  // Actions
  { key: 'r', keyDisplay: 'R', description: 'Refresh dashboard', category: 'actions' },
  { key: '/', keyDisplay: '/', description: 'Focus search', category: 'actions' },
  { key: 'd', keyDisplay: 'D', description: 'Toggle dark mode', category: 'actions' },
  { key: '?', keyDisplay: '?', description: 'Show shortcuts', category: 'actions' },

  // Project navigation
  { key: 'j', keyDisplay: 'J', description: 'Next project', category: 'projects' },
  { key: 'k', keyDisplay: 'K', description: 'Previous project', category: 'projects' },
  { key: 'Enter', keyDisplay: '↵', description: 'Open project', category: 'projects' },
  { key: 'Escape', keyDisplay: 'Esc', description: 'Close / go back', category: 'projects' },
];

/** Category display labels for the overlay */
export const CATEGORY_LABELS: Record<ShortcutCategory, string> = {
  navigation: 'Navigation',
  actions: 'Actions',
  projects: 'Projects',
};
