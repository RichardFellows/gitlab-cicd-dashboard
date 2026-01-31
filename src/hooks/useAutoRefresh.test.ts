import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoRefresh } from './useAutoRefresh';

describe('useAutoRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Default to online
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
    Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test('should not be active when interval is 0', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoRefresh({ interval: 0, onRefresh, enabled: true, loading: false })
    );

    expect(result.current.isActive).toBe(false);
    expect(result.current.nextRefreshIn).toBeNull();
  });

  test('should not be active when disabled', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoRefresh({ interval: 120000, onRefresh, enabled: false, loading: false })
    );

    expect(result.current.isActive).toBe(false);
  });

  test('should be active when interval > 0 and enabled', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoRefresh({ interval: 120000, onRefresh, enabled: true, loading: false })
    );

    expect(result.current.isActive).toBe(true);
    expect(result.current.nextRefreshIn).toBe(120);
  });

  test('should call onRefresh after interval elapses', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    renderHook(() =>
      useAutoRefresh({ interval: 120000, onRefresh, enabled: true, loading: false })
    );

    expect(onRefresh).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(120000);
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  test('should NOT call onRefresh when loading is true', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    renderHook(() =>
      useAutoRefresh({ interval: 120000, onRefresh, enabled: true, loading: true })
    );

    act(() => {
      vi.advanceTimersByTime(120000);
    });

    expect(onRefresh).not.toHaveBeenCalled();
  });

  test('countdown should decrement every second', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoRefresh({ interval: 5000, onRefresh, enabled: true, loading: false })
    );

    expect(result.current.nextRefreshIn).toBe(5);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.nextRefreshIn).toBe(4);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.nextRefreshIn).toBe(3);
  });

  test('countdown should reset after refresh fires', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoRefresh({ interval: 5000, onRefresh, enabled: true, loading: false })
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
    // After refresh fires, countdown resets
    expect(result.current.nextRefreshIn).toBe(5);
  });

  test('resetTimer restarts countdown', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoRefresh({ interval: 10000, onRefresh, enabled: true, loading: false })
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.nextRefreshIn).toBe(5);

    act(() => {
      result.current.resetTimer();
    });

    // After reset, countdown is back to 10
    expect(result.current.nextRefreshIn).toBe(10);
  });

  test('should pause and resume', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoRefresh({ interval: 5000, onRefresh, enabled: true, loading: false })
    );

    act(() => {
      result.current.pause();
    });

    expect(result.current.isPaused).toBe(true);
    expect(result.current.isActive).toBe(false);
    expect(result.current.nextRefreshIn).toBeNull();

    // Advance time — should NOT trigger refresh
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onRefresh).not.toHaveBeenCalled();

    act(() => {
      result.current.resume();
    });

    expect(result.current.isPaused).toBe(false);
    expect(result.current.isActive).toBe(true);
  });

  test('should trigger immediate refresh on resume if past due', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoRefresh({ interval: 5000, onRefresh, enabled: true, loading: false })
    );

    act(() => {
      result.current.pause();
    });

    // Simulate time passing beyond the interval
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    act(() => {
      result.current.resume();
    });

    // Should have triggered an immediate refresh
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  test('should handle Page Visibility API', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoRefresh({ interval: 5000, onRefresh, enabled: true, loading: false })
    );

    expect(result.current.isActive).toBe(true);

    // Simulate tab hidden
    act(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current.isPaused).toBe(true);

    // Simulate tab visible again (after interval)
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    act(() => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current.isPaused).toBe(false);
    // Should have called onRefresh immediately (past due)
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  test('should clean up timers on unmount', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { unmount } = renderHook(() =>
      useAutoRefresh({ interval: 5000, onRefresh, enabled: true, loading: false })
    );

    unmount();

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(onRefresh).not.toHaveBeenCalled();
  });

  test('should stop timers when interval changes to 0', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ interval }) =>
        useAutoRefresh({ interval, onRefresh, enabled: true, loading: false }),
      { initialProps: { interval: 5000 } }
    );

    expect(result.current.isActive).toBe(true);

    rerender({ interval: 0 });

    expect(result.current.isActive).toBe(false);
    expect(result.current.nextRefreshIn).toBeNull();
  });

  test('reportRateLimit should set isRateLimited and skip cycles', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoRefresh({ interval: 5000, onRefresh, enabled: true, loading: false })
    );

    act(() => {
      result.current.reportRateLimit();
    });

    expect(result.current.isRateLimited).toBe(true);

    // Next refresh cycle should be skipped
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onRefresh).not.toHaveBeenCalled();

    // Second cycle also skipped (backoff = 2)
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onRefresh).not.toHaveBeenCalled();

    // Third cycle should fire
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
