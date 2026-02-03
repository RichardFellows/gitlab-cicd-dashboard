import { useEffect, useRef, useCallback, useState } from 'react';

export interface UseAutoRefreshOptions {
  /** Interval in ms. 0 = disabled */
  interval: number;
  /** Async function to call on each refresh tick */
  onRefresh: () => Promise<void>;
  /** Master enable/disable (e.g. only after first load) */
  enabled: boolean;
  /** When true, skip the refresh callback (prevents concurrent requests) */
  loading: boolean;
}

export interface UseAutoRefreshReturn {
  /** Seconds until next scheduled refresh, or null if inactive */
  nextRefreshIn: number | null;
  /** Whether the auto-refresh timer is actively running */
  isActive: boolean;
  /** Pause auto-refresh (e.g. when tab hidden) */
  pause: () => void;
  /** Resume auto-refresh (e.g. when tab visible again) */
  resume: () => void;
  /** Reset the timer (e.g. after a manual refresh) */
  resetTimer: () => void;
  /** Whether auto-refresh is currently paused */
  isPaused: boolean;
  /** Whether we are offline */
  isOffline: boolean;
  /** Whether rate-limited (backoff active) */
  isRateLimited: boolean;
  /** Report a rate-limit error to trigger backoff */
  reportRateLimit: () => void;
}

export function useAutoRefresh({
  interval,
  onRefresh,
  enabled,
  loading,
}: UseAutoRefreshOptions): UseAutoRefreshReturn {
  const [nextRefreshIn, setNextRefreshIn] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isRateLimited, setIsRateLimited] = useState(false);

  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const loadingRef = useRef(loading);
  const onRefreshRef = useRef(onRefresh);
  const intervalRef = useRef(interval);
  const rateLimitSkipsRef = useRef(0);

  // Keep refs in sync so timers always see latest values
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);
  useEffect(() => { intervalRef.current = interval; }, [interval]);

  const isActive = interval > 0 && enabled && !isPaused && !isOffline;

  // Clear both timers
  const clearTimers = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    if (countdownTimerRef.current !== null) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  // Start the refresh + countdown timers
  const startTimers = useCallback(() => {
    clearTimers();

    const currentInterval = intervalRef.current;
    if (currentInterval <= 0) {
      setNextRefreshIn(null);
      return;
    }

    // Set countdown starting value
    setNextRefreshIn(Math.round(currentInterval / 1000));

    // Countdown timer — ticks every second
    countdownTimerRef.current = setInterval(() => {
      setNextRefreshIn(prev => {
        if (prev === null || prev <= 1) return Math.round(currentInterval / 1000);
        return prev - 1;
      });
    }, 1000);

    // Refresh timer — ticks at the interval
    refreshTimerRef.current = setInterval(() => {
      if (!loadingRef.current) {
        // Check rate-limit backoff
        if (rateLimitSkipsRef.current > 0) {
          rateLimitSkipsRef.current -= 1;
          return;
        }
        onRefreshRef.current();
      }
      // Reset countdown
      setNextRefreshIn(Math.round(currentInterval / 1000));
    }, currentInterval);
  }, [clearTimers]);

  // Reset timer (called after manual refresh)
  const resetTimer = useCallback(() => {
    if (intervalRef.current > 0 && !isPaused && !isOffline) {
      startTimers();
    }
  }, [isPaused, isOffline, startTimers]);

  // Pause
  const pause = useCallback(() => {
    setIsPaused(true);
    pausedAtRef.current = Date.now();
    clearTimers();
    setNextRefreshIn(null);
  }, [clearTimers]);

  // Resume
  const resume = useCallback(() => {
    setIsPaused(false);
    const pausedAt = pausedAtRef.current;
    pausedAtRef.current = null;

    if (intervalRef.current <= 0 || !enabled) return;

    // If we were paused longer than the interval, trigger immediate refresh
    if (pausedAt && Date.now() - pausedAt >= intervalRef.current) {
      if (!loadingRef.current) {
        onRefreshRef.current();
      }
    }

    startTimers();
  }, [enabled, startTimers]);

  // Report rate limit — skip next 2 refresh cycles
  const reportRateLimit = useCallback(() => {
    rateLimitSkipsRef.current = 2;
    setIsRateLimited(true);
    // Clear after the backoff period
    setTimeout(() => {
      setIsRateLimited(false);
    }, intervalRef.current * 2 || 60000);
  }, []);

  // Page Visibility API
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        pause();
      } else {
        resume();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pause, resume]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Start/stop timers when interval or enabled changes
  useEffect(() => {
    if (interval > 0 && enabled && !isPaused && !isOffline) {
      startTimers();
    } else {
      clearTimers();
      setNextRefreshIn(null);
    }

    return () => {
      clearTimers();
    };
  }, [interval, enabled, isPaused, isOffline, startTimers, clearTimers]);

  return {
    nextRefreshIn,
    isActive,
    pause,
    resume,
    resetTimer,
    isPaused,
    isOffline,
    isRateLimited,
    reportRateLimit,
  };
}
