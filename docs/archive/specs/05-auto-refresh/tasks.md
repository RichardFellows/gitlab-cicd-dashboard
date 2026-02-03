# Tasks: Auto-Refresh with Live Status Indicator

## Task Breakdown

Tasks ordered POC-first: prove the hook and visibility handling work, then build the UI.

---

### Setup

- [ ] **T0.1** Add `AUTO_REFRESH_INTERVAL` to `STORAGE_KEYS` in `src/types/index.ts` — **S**
  - Value: `'gitlab_cicd_dashboard_auto_refresh_interval'`
  - **Test:** Build passes

- [ ] **T0.2** Add auto-refresh constants to `src/utils/constants.ts` — **S**
  - `AUTO_REFRESH_OPTIONS` array: `[{ label: 'Off', value: 0 }, { label: '2 min', value: 120000 }, ...]`
  - `STALE_DATA_THRESHOLD`: 30 minutes (ms)
  - `AGING_DATA_THRESHOLD`: 5 minutes (ms)
  - **Test:** Build passes

---

### Core Implementation

- [ ] **T1.1** Create `src/hooks/useAutoRefresh.ts` custom hook — **L**
  - Accept options: `interval`, `onRefresh`, `enabled`, `loading`
  - Set up `setInterval` when interval > 0 and enabled
  - Guard: don't call `onRefresh` if `loading` is true
  - Return: `nextRefreshIn` (seconds), `isActive` (boolean), `pause()`, `resume()`
  - Cleanup: clear interval on unmount or dependency change
  - **Test:** Unit test with fake timers — verify refresh callback called at interval, not called when loading

- [ ] **T1.2** Add Page Visibility API handling to `useAutoRefresh` — **M**
  - Listen to `document.addEventListener('visibilitychange', ...)`
  - On `hidden`: clear interval, record `pausedAt` timestamp
  - On `visible`: compute elapsed since `pausedAt`; if ≥ interval, trigger immediate refresh; restart interval
  - Cleanup: remove event listener on unmount
  - **Test:** Unit test with mock `document.visibilityState` — verify pause/resume behaviour

- [ ] **T1.3** Add countdown timer to `useAutoRefresh` — **M**
  - Separate `setInterval` (1 second) to decrement `nextRefreshIn`
  - Reset countdown on each refresh completion
  - When countdown reaches 0, it should align with the next refresh trigger
  - **Test:** Verify countdown decrements, resets after refresh

- [ ] **T1.4** Create `src/utils/dataAge.ts` utility — **S**
  - `getDataAge(lastUpdated: Date): { minutes: number; status: 'fresh' | 'aging' | 'stale' }`
  - `formatRelativeTime(date: Date): string` — "just now", "3 minutes ago", "1 hour ago"
  - `formatAbsoluteTime(date: Date): string` — "14:23:45"
  - **Test:** Unit tests for all formatting edge cases

---

### UI Components

- [ ] **T2.1** Create `src/components/RefreshStatusBar.tsx` — **M**
  - Accept props: `lastUpdated`, `loading`, `autoRefreshInterval`, `nextRefreshIn`, `onIntervalChange`, `onManualRefresh`, `darkMode`
  - Left: Relative time with colour coding (fresh=green, aging=yellow, stale=red)
  - Centre: Pulsing indicator when loading + "Refreshing..." text
  - Right: Compact interval selector dropdown
  - Right (when active): Countdown "Next: Xs"
  - Hover on time shows absolute timestamp tooltip
  - Real-time relative time: `useEffect` with 60-second `setInterval` to re-render
  - Add CSS in `src/styles/RefreshStatusBar.css`
  - **Test:** Component renders time, colour coding, loading state, dropdown

- [ ] **T2.2** Create `src/components/StaleDataBanner.tsx` — **S**
  - Accept props: `lastUpdated`, `autoRefreshEnabled`, `onRefreshNow`, `onEnableAutoRefresh`, `onDismiss`
  - Only render when data is stale (> 30 min) AND auto-refresh is off
  - Yellow/amber banner with warning icon
  - Buttons: "Refresh Now", "Enable Auto-Refresh"
  - Dismiss button (×) — uses `staleDismissed` ref in parent
  - Add CSS in `src/styles/StaleDataBanner.css`
  - **Test:** Shows when stale, hides when fresh, dismiss works, buttons fire callbacks

- [ ] **T2.3** Integrate into `src/App.tsx` — **L**
  - Add `autoRefreshInterval` state, load from localStorage on mount
  - Add `useAutoRefresh` hook wired to `loadDashboard`
  - Add `staleDismissed` ref
  - Render `RefreshStatusBar` in header area (between view selector and settings toggle)
  - Render `StaleDataBanner` conditionally before dashboard content
  - Persist interval changes to localStorage via `STORAGE_KEYS.AUTO_REFRESH_INTERVAL`
  - Manual refresh resets the auto-refresh timer (call `useAutoRefresh` reset)
  - **Test:** Build passes, auto-refresh triggers dashboard load

- [ ] **T2.4** Add manual refresh button to `RefreshStatusBar` — **S**
  - Small ⟳ button next to the data age text
  - Click triggers `onManualRefresh`
  - Disabled when `loading` is true
  - Resets auto-refresh countdown
  - **Test:** Button fires callback, disabled during loading

---

### Tests

- [ ] **T3.1** Unit tests for `src/hooks/useAutoRefresh.ts` — **L**
  - Interval fires at correct time (use `vi.useFakeTimers()`)
  - Doesn't fire when loading
  - Pauses on visibility hidden, resumes on visible
  - Immediate refresh when returning to stale tab
  - Countdown decrements correctly
  - Cleanup on unmount
  - File: `src/hooks/useAutoRefresh.test.ts`

- [ ] **T3.2** Unit tests for `src/utils/dataAge.ts` — **S**
  - Relative time formatting at various intervals
  - Status classification (fresh/aging/stale)
  - Absolute time formatting
  - File: `src/utils/dataAge.test.ts`

- [ ] **T3.3** Component tests for RefreshStatusBar — **M**
  - Renders relative time with correct colour
  - Shows loading indicator when loading
  - Dropdown changes interval
  - Manual refresh button
  - File: `src/components/RefreshStatusBar.test.tsx`

- [ ] **T3.4** Component tests for StaleDataBanner — **S**
  - Shows when stale, hides when fresh
  - Buttons fire callbacks
  - Dismiss hides banner
  - File: `src/components/StaleDataBanner.test.tsx`

---

### Polish

- [ ] **T4.1** Dark mode styling — **S**
  - RefreshStatusBar time colours use dark-mode variants
  - StaleDataBanner uses dark amber background
  - Pulsing dot uses `CHART_COLORS_DARK.primary`
  - Dropdown styled for dark mode

- [ ] **T4.2** Rate limit detection and backoff — **M**
  - Detect HTTP 429 responses during refresh (modify `loadDashboard` error handling)
  - On rate limit: show "Rate limited" in RefreshStatusBar, skip next N cycles
  - Reset after successful refresh
  - **Test:** Unit test for backoff logic

- [ ] **T4.3** Network offline detection — **S**
  - Listen to `navigator.onLine` / `window.addEventListener('online'/'offline')`
  - When offline: pause auto-refresh, show "Offline" in RefreshStatusBar
  - When back online: resume auto-refresh with immediate refresh
  - **Test:** Mock online/offline events

- [ ] **T4.4** Update E2E tests — **M**
  - Set auto-refresh interval
  - Verify data age indicator shows
  - Verify stale banner appears after time
  - Verify refresh triggers at interval (mock time or short interval)
  - Extend `e2e/dashboard.spec.ts`

---

## Completion Criteria

All tasks complete when:
```bash
npm run lint && npm run build && npm test && npx playwright test --project=chromium
```
Passes with 0 failures.

## Dependencies

- **T0.x** (Setup) → no dependencies
- **T1.x** (Core) → depends on T0.x
- **T2.x** (UI) → depends on T1.x
- **T3.x** (Tests) → in parallel with T2.x
- **T4.x** (Polish) → depends on T2.x
- Pairs well with Feature 4 (Notification Rules) — auto-refresh triggers notification evaluation

## Notes

- The `lastUpdated` state already exists in `App.tsx` — just need to use it
- `loadDashboard(config)` already exists — the hook just needs to call it on interval
- Minimum 2-minute interval provides safety against API rate limits with 60+ projects
- Page Visibility API (`document.hidden`, `visibilitychange` event) supported in all modern browsers
- The hook should use `useRef` for the interval ID to avoid stale closure issues
- Consider using `useCallback` for the refresh function to maintain stable reference
