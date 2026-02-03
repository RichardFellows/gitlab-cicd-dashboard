# Design: Auto-Refresh with Live Status Indicator

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                            App.tsx                                   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ State: autoRefreshInterval: number (0 = off, ms otherwise)   │   │
│  │ State: lastUpdated: Date | null (already exists)             │   │
│  │ State: loading: boolean (already exists)                      │   │
│  │ Ref: autoRefreshTimerRef: ReturnType<typeof setInterval>     │   │
│  │ Ref: isTabVisible: boolean                                    │   │
│  │ Ref: staleDismissed: boolean                                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│              │                                                      │
│              ▼                                                      │
│  ┌────────────────────┐  ┌────────────────────┐                    │
│  │ RefreshStatusBar    │  │ StaleDataBanner     │                    │
│  │ (header component)  │  │ (conditional banner) │                   │
│  │ - Last updated      │  └────────────────────┘                    │
│  │ - Refresh indicator │                                            │
│  │ - Interval selector │                                            │
│  └────────────────────┘                                            │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   src/hooks/useAutoRefresh.ts                        │
│                                                                      │
│  - Custom hook managing interval, visibility, and timer lifecycle    │
│  - Returns: { startRefresh, stopRefresh, nextRefreshIn, isActive }  │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **User selects interval** → `autoRefreshInterval` state updates, persisted to localStorage
2. **Hook starts timer** → `useAutoRefresh` sets up `setInterval` with callback to `loadDashboard`
3. **Tab hidden** → Page Visibility API pauses timer, records pause time
4. **Tab visible** → Check elapsed time; if past due, refresh immediately; restart timer
5. **Refresh completes** → `lastUpdated` updates, timer resets
6. **Manual refresh** → Clears and restarts timer to avoid double refresh
7. **Data age check** → `RefreshStatusBar` computes relative time from `lastUpdated`, re-renders every 60s

## Component Structure

### New Components

#### `src/components/RefreshStatusBar.tsx`

Header bar showing refresh status and controls.

```typescript
interface RefreshStatusBarProps {
  lastUpdated: Date | null;
  loading: boolean;
  autoRefreshInterval: number;       // 0 = off, else milliseconds
  onIntervalChange: (interval: number) => void;
  onManualRefresh: () => void;
  darkMode?: boolean;
}
```

**Displays:**
- Left section: "Last updated X minutes ago" (relative time)
  - Hover tooltip shows absolute time
  - Colour coding: fresh (< 5min), aging (5-30min), stale (> 30min)
- Centre section: Refresh progress indicator (visible when `loading`)
  - Pulsing dot or small spinner + "Refreshing..."
- Right section: Auto-refresh interval selector (compact dropdown)
  - Options: Off / 2m / 5m / 15m
  - When active, show countdown: "Next refresh in Xs"

#### `src/components/StaleDataBanner.tsx`

Warning banner for stale data.

```typescript
interface StaleDataBannerProps {
  lastUpdated: Date | null;
  autoRefreshEnabled: boolean;
  onRefreshNow: () => void;
  onEnableAutoRefresh: () => void;
  onDismiss: () => void;
}
```

**Displays:**
- Only visible when: `lastUpdated` is > 30 minutes ago AND auto-refresh is off
- Banner text: "⚠️ Data is X minutes old. Refresh now or enable auto-refresh."
- Buttons: "Refresh Now" and "Enable Auto-Refresh (5 min)"
- Dismiss (×) button — hides for current session

### New Custom Hook

#### `src/hooks/useAutoRefresh.ts`

```typescript
interface UseAutoRefreshOptions {
  interval: number;              // 0 = disabled
  onRefresh: () => Promise<void>; // The refresh function
  enabled: boolean;              // Master enable/disable
  loading: boolean;              // Prevent refresh during existing load
}

interface UseAutoRefreshReturn {
  nextRefreshIn: number | null;  // Seconds until next refresh
  isActive: boolean;             // Whether auto-refresh is running
  pause: () => void;
  resume: () => void;
}
```

**Logic:**
1. Set up `setInterval` when `interval > 0` and `enabled`
2. On tick: if not `loading`, call `onRefresh()`
3. Listen to `document.visibilitychange`:
   - `hidden` → clear interval, record `pausedAt`
   - `visible` → compute elapsed since pause; if ≥ interval, refresh immediately; restart interval
4. Countdown timer: separate `setInterval` every second to update `nextRefreshIn`
5. Cleanup: clear all intervals on unmount or dependency change

### Modified Components

#### `src/App.tsx`
- Add `autoRefreshInterval` state (loaded from localStorage)
- Add `useAutoRefresh` hook wired to `loadDashboard`
- Add `RefreshStatusBar` in header area (above/below view type selector)
- Add `StaleDataBanner` conditionally before dashboard content
- Persist interval to localStorage on change
- Pass `loading` state to prevent concurrent refreshes

#### `src/components/ControlPanel.tsx`
- No changes needed — refresh controls live in `RefreshStatusBar` (separate from config controls)
- Alternatively, the interval selector could live in ControlPanel — design decision at implementation time

## Type Definitions

### New `STORAGE_KEYS` entry

```typescript
// In src/types/index.ts STORAGE_KEYS
AUTO_REFRESH_INTERVAL: 'gitlab_cicd_dashboard_auto_refresh_interval'
```

### Auto-refresh interval options

```typescript
// In src/utils/constants.ts
export const AUTO_REFRESH_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '2 min', value: 2 * 60 * 1000 },
  { label: '5 min', value: 5 * 60 * 1000 },
  { label: '15 min', value: 15 * 60 * 1000 },
] as const;

export const STALE_DATA_THRESHOLD = 30 * 60 * 1000;  // 30 minutes
export const AGING_DATA_THRESHOLD = 5 * 60 * 1000;    // 5 minutes
```

## API Integration Points

No new API calls. Auto-refresh calls the existing `loadDashboard(config)` function in `App.tsx`, which internally calls `DashboardDataService.getMultiSourceMetrics()`.

**Rate limit consideration:** With 60+ projects, each refresh makes hundreds of API calls. The minimum 2-minute interval provides safety margin. If rate limiting is detected (HTTP 429), the refresh should:
1. Log the error
2. Back off: skip this refresh cycle
3. Show "Rate limited — next refresh delayed" in RefreshStatusBar

## UI/UX Design Notes

### RefreshStatusBar Placement
- Sits in the dashboard header, between the view type selector and the control panel toggle
- Compact single-line design: `[Last updated 3 min ago] [●] [⟳ Auto: 5m ▾]`
- Does not take up extra vertical space — inline with existing header elements

### Stale Data Banner
- Full-width banner below the header, above dashboard content
- Yellow/amber background for warning
- Compact: single line with inline buttons
- Dismissible via × button (session-only)

### Loading Indicator
- Small pulsing dot (matching `CHART_COLORS.primary`) next to "Last updated" text
- Or thin progress bar at the top of the page (like GitHub's loading indicator)
- Text changes to "Refreshing..." during load

### Countdown Display
- When auto-refresh active, show "Next refresh in Xs" in muted text
- Updates every second
- Resets to full interval after each refresh

## Dark Mode Considerations

- RefreshStatusBar text colours adapt to dark mode
- Fresh/aging/stale colour coding adjusted for dark backgrounds:
  - Fresh: `CHART_COLORS_DARK.success` (green)
  - Aging: `CHART_COLORS_DARK.warning` (yellow)
  - Stale: `CHART_COLORS_DARK.danger` (red)
- Stale data banner uses darker amber background with light text
- Pulsing dot uses `CHART_COLORS_DARK.primary`

## Error Handling

- Refresh failure: show brief error toast "Refresh failed — will retry", don't clear existing data
- Rate limiting (HTTP 429): back off, show "Rate limited" status, double the interval temporarily
- Network offline: detect via `navigator.onLine`, pause auto-refresh, show "Offline" indicator
- Multiple rapid refreshes: `loading` guard prevents concurrent requests
- Tab visibility edge case: if tab hidden for hours, don't queue up multiple refreshes — just do one on resume
