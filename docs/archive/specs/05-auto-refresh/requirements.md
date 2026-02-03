# Requirements: Auto-Refresh with Live Status Indicator

## Business Context

From INTERVIEW_NOTES.md: The dashboard is currently manual-refresh only — users must click "Load Dashboard" to get updated data. This makes the dashboard unsuitable for wall screens, deployment monitoring sessions, or any scenario where continuous visibility is needed. The interview noted "background data refresh" as a future enhancement.

Auto-refresh with a data age indicator transforms the dashboard from a point-in-time snapshot into a live monitoring tool, which is essential for production deployment days and incident response.

---

## User Stories

### 5.1 Configurable Auto-Refresh Interval

**As a** user  
**I want to** set the dashboard to automatically refresh at a regular interval  
**So that** I always see current data without manual intervention

**Acceptance Criteria:**
- [ ] Auto-refresh interval selector: Off / 2 minutes / 5 minutes / 15 minutes
- [ ] Selector accessible from the control panel or header area
- [ ] Interval persisted in localStorage across sessions
- [ ] Default: Off (opt-in behaviour)
- [ ] Refresh cycle calls the same data load function as manual "Load Dashboard"
- [ ] Auto-refresh pauses when browser tab is hidden (Page Visibility API)
- [ ] Auto-refresh resumes when tab becomes visible again (with immediate refresh if data is stale)

---

### 5.2 Data Age Indicator

**As a** user  
**I want to** see when the dashboard data was last updated  
**So that** I know how fresh the information I'm looking at is

**Acceptance Criteria:**
- [ ] "Last updated X minutes ago" indicator in the header
- [ ] Updates in real-time (relative time recalculates every minute)
- [ ] Shows absolute time on hover (e.g., "14:23:45")
- [ ] Visual distinction:
  - Fresh (< 5 min): normal text
  - Aging (5-30 min): yellow/amber text
  - Stale (> 30 min): red text with warning icon
- [ ] Indicator visible in all view modes

---

### 5.3 Refresh Progress Indicator

**As a** user  
**I want to** see when the dashboard is actively refreshing data  
**So that** I know a refresh is in progress and can wait for it to complete

**Acceptance Criteria:**
- [ ] Visual indicator (pulse animation, spinner, or progress bar) during refresh
- [ ] Visible in the header area, not blocking the dashboard content
- [ ] Shows "Refreshing..." text alongside indicator
- [ ] If refresh fails, show error briefly then revert to last good data
- [ ] Next auto-refresh timer resets after each successful refresh

---

### 5.4 Stale Data Warning

**As a** user  
**I want to** be warned when the dashboard data is significantly stale  
**So that** I don't make decisions based on outdated information

**Acceptance Criteria:**
- [ ] When data is older than 30 minutes and auto-refresh is off, show a prominent banner
- [ ] Banner text: "Data is X minutes old. Click to refresh or enable auto-refresh."
- [ ] Banner includes quick-action button to refresh now
- [ ] Banner includes link to enable auto-refresh
- [ ] Banner dismissible (per session)

---

## Technical Notes

- Uses `setInterval` for refresh scheduling in `App.tsx`
- Uses `document.addEventListener('visibilitychange', ...)` for tab visibility detection
- `lastUpdated` timestamp already exists as state in `App.tsx` — currently set on load
- Relative time display: simple JS calculation, re-render every 60 seconds via `useEffect` + `setInterval`
- Auto-refresh should not trigger if a manual load is already in progress
- Consider debouncing: if user manually refreshes during auto-refresh countdown, reset the timer
- The refresh function is `loadDashboard(config)` in `App.tsx` — reuse directly

## Out of Scope

- Granular per-project refresh (all projects refresh together)
- WebSocket/Server-Sent Events for push-based updates
- Background sync via service worker
- Custom refresh intervals beyond the preset options
- Partial refresh (only refresh projects that changed)
