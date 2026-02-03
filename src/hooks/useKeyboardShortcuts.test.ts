import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts, ShortcutHandler } from './useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const fireKey = (key: string, options: Partial<KeyboardEvent> = {}) => {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...options,
    });
    document.dispatchEvent(event);
    return event;
  };

  test('calls handler when matching key is pressed', () => {
    const handler = vi.fn();
    const shortcuts: ShortcutHandler[] = [{ key: 'r', handler }];

    renderHook(() => useKeyboardShortcuts({ enabled: true, shortcuts }));

    fireKey('r');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('does not call handler for non-matching key', () => {
    const handler = vi.fn();
    const shortcuts: ShortcutHandler[] = [{ key: 'r', handler }];

    renderHook(() => useKeyboardShortcuts({ enabled: true, shortcuts }));

    fireKey('x');
    expect(handler).not.toHaveBeenCalled();
  });

  test('does not call handler when disabled', () => {
    const handler = vi.fn();
    const shortcuts: ShortcutHandler[] = [{ key: 'r', handler }];

    renderHook(() => useKeyboardShortcuts({ enabled: false, shortcuts }));

    fireKey('r');
    expect(handler).not.toHaveBeenCalled();
  });

  test('does not fire when input element is focused', () => {
    const handler = vi.fn();
    const shortcuts: ShortcutHandler[] = [{ key: 'r', handler }];

    renderHook(() => useKeyboardShortcuts({ enabled: true, shortcuts }));

    // Create and focus an input element
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'r',
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  test('does not fire when textarea is focused', () => {
    const handler = vi.fn();
    const shortcuts: ShortcutHandler[] = [{ key: 'd', handler }];

    renderHook(() => useKeyboardShortcuts({ enabled: true, shortcuts }));

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'd',
      bubbles: true,
      cancelable: true,
    });
    textarea.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(textarea);
  });

  test('does not fire when select is focused', () => {
    const handler = vi.fn();
    const shortcuts: ShortcutHandler[] = [{ key: '1', handler }];

    renderHook(() => useKeyboardShortcuts({ enabled: true, shortcuts }));

    const select = document.createElement('select');
    document.body.appendChild(select);
    select.focus();

    const event = new KeyboardEvent('keydown', {
      key: '1',
      bubbles: true,
      cancelable: true,
    });
    select.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(select);
  });

  test('Escape fires even when input is focused', () => {
    const handler = vi.fn();
    const shortcuts: ShortcutHandler[] = [{ key: 'Escape', handler }];

    renderHook(() => useKeyboardShortcuts({ enabled: true, shortcuts }));

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);

    document.body.removeChild(input);
  });

  test('does not fire when Ctrl modifier is held', () => {
    const handler = vi.fn();
    const shortcuts: ShortcutHandler[] = [{ key: 'r', handler }];

    renderHook(() => useKeyboardShortcuts({ enabled: true, shortcuts }));

    fireKey('r', { ctrlKey: true });
    expect(handler).not.toHaveBeenCalled();
  });

  test('does not fire when Meta (Cmd) modifier is held', () => {
    const handler = vi.fn();
    const shortcuts: ShortcutHandler[] = [{ key: 'r', handler }];

    renderHook(() => useKeyboardShortcuts({ enabled: true, shortcuts }));

    fireKey('r', { metaKey: true });
    expect(handler).not.toHaveBeenCalled();
  });

  test('does not fire when Alt modifier is held', () => {
    const handler = vi.fn();
    const shortcuts: ShortcutHandler[] = [{ key: 'd', handler }];

    renderHook(() => useKeyboardShortcuts({ enabled: true, shortcuts }));

    fireKey('d', { altKey: true });
    expect(handler).not.toHaveBeenCalled();
  });

  test('removes event listener on unmount', () => {
    const handler = vi.fn();
    const shortcuts: ShortcutHandler[] = [{ key: 'r', handler }];

    const { unmount } = renderHook(() => useKeyboardShortcuts({ enabled: true, shortcuts }));

    fireKey('r');
    expect(handler).toHaveBeenCalledTimes(1);

    unmount();

    fireKey('r');
    // Should still be 1 — listener removed
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('removes event listener when disabled', () => {
    const handler = vi.fn();
    const shortcuts: ShortcutHandler[] = [{ key: 'r', handler }];

    const { rerender } = renderHook(
      ({ enabled }) => useKeyboardShortcuts({ enabled, shortcuts }),
      { initialProps: { enabled: true } }
    );

    fireKey('r');
    expect(handler).toHaveBeenCalledTimes(1);

    rerender({ enabled: false });

    fireKey('r');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('handles multiple shortcuts', () => {
    const rHandler = vi.fn();
    const dHandler = vi.fn();
    const shortcuts: ShortcutHandler[] = [
      { key: 'r', handler: rHandler },
      { key: 'd', handler: dHandler },
    ];

    renderHook(() => useKeyboardShortcuts({ enabled: true, shortcuts }));

    fireKey('r');
    fireKey('d');

    expect(rHandler).toHaveBeenCalledTimes(1);
    expect(dHandler).toHaveBeenCalledTimes(1);
  });

  test('calls preventDefault on matched shortcut', () => {
    const handler = vi.fn();
    const shortcuts: ShortcutHandler[] = [{ key: '/', handler }];

    renderHook(() => useKeyboardShortcuts({ enabled: true, shortcuts }));

    const spy = vi.spyOn(KeyboardEvent.prototype, 'preventDefault');
    fireKey('/');

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test('uses stable ref — handler updates without re-registering listener', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    const { rerender } = renderHook(
      ({ handler }) => useKeyboardShortcuts({ enabled: true, shortcuts: [{ key: 'r', handler }] }),
      { initialProps: { handler: handler1 } }
    );

    fireKey('r');
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).not.toHaveBeenCalled();

    rerender({ handler: handler2 });

    fireKey('r');
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });
});
