import { useEffect, useRef } from 'react';

export interface ShortcutHandler {
  /** The key value from KeyboardEvent.key */
  key: string;
  /** Handler called when shortcut fires */
  handler: (event: KeyboardEvent) => void;
}

export interface UseKeyboardShortcutsOptions {
  /** Master enable/disable toggle */
  enabled: boolean;
  /** Array of key→handler mappings */
  shortcuts: ShortcutHandler[];
}

/**
 * Custom hook that registers global keyboard shortcuts.
 *
 * Guards:
 * - Skips when an input/textarea/select/contenteditable element is focused
 *   (exception: Escape always fires)
 * - Skips when Ctrl/Cmd/Alt modifier is held (avoids browser shortcut conflicts)
 *
 * Uses a stable ref for the handler to avoid re-registering listeners on every render.
 */
export function useKeyboardShortcuts({ enabled, shortcuts }: UseKeyboardShortcutsOptions): void {
  // Keep a stable ref to the latest shortcuts array so the listener
  // always sees fresh handlers without needing to re-register.
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    if (!enabled) return;

    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();

      // Guard: skip if input element is focused (except for Escape)
      const isInputFocused =
        ['input', 'textarea', 'select'].includes(tagName) || target.isContentEditable;

      if (isInputFocused && event.key !== 'Escape') {
        return;
      }

      // Guard: skip if modifier key is held (Ctrl, Cmd, Alt)
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      // Find matching shortcut
      const matched = shortcutsRef.current.find(s => s.key === event.key);
      if (matched) {
        event.preventDefault();
        matched.handler(event);
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [enabled]);
}
