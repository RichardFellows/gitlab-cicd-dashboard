# Requirements: Notification Rules (Browser-Based Alerts)

## Business Context

From INTERVIEW_NOTES.md: The dashboard is currently pull-based — users only see problems when they visit. The interview explicitly noted "alerting/notifications" as out of scope for the initial MVP, with "visual flagging is sufficient" as the initial approach. Now that the MVP is stable, browser-based notifications provide a natural next step: turning the dashboard from passive monitoring into active alerting without requiring a server.

This is especially valuable for teams with production deployments or flaky pipelines, where early notification can save hours of investigation.

---

## User Stories

### 4.1 Opt-in to Browser Notifications

**As a** user  
**I want to** enable browser notifications for the dashboard  
**So that** I get alerted when something important happens even if the tab isn't visible

**Acceptance Criteria:**
- [ ] "Enable Notifications" toggle in the control panel or settings area
- [ ] First toggle triggers `Notification.requestPermission()` browser prompt
- [ ] Permission state clearly shown (enabled/disabled/denied)
- [ ] If browser permission denied, show instructions to enable in browser settings
- [ ] Preference persisted in localStorage

---

### 4.2 Create Notification Rules

**As a** team lead  
**I want to** define rules for when I should be notified  
**So that** I only get alerts for conditions I care about

**Acceptance Criteria:**
- [ ] Rule types available:
  - Main branch pipeline failure (any project or specific project)
  - Coverage dropped below threshold (configurable %)
  - Duration spike detected (above configured % threshold)
  - New failed deployment to a specific environment
- [ ] Each rule can be global (all projects) or scoped to specific projects
- [ ] Rules can be enabled/disabled individually
- [ ] Rules stored in localStorage alongside dashboard config
- [ ] Maximum 20 rules per configuration

---

### 4.3 Receive Notifications

**As a** user  
**I want to** receive browser notifications when my rules are triggered  
**So that** I can respond quickly to pipeline problems

**Acceptance Criteria:**
- [ ] Notifications fire during data refresh cycle (when dashboard refreshes)
- [ ] Each notification shows: rule name, affected project, current value
- [ ] Clicking a notification focuses the dashboard tab and selects the affected project
- [ ] Duplicate suppression: same rule+project combination doesn't fire again until condition resolves
- [ ] Notification sound optional (can be muted)

---

### 4.4 Notification History

**As a** user  
**I want to** see a history of recent notifications  
**So that** I can review alerts I may have missed

**Acceptance Criteria:**
- [ ] Notification bell icon in the header with unread count badge
- [ ] Dropdown panel showing last 50 notifications with timestamp
- [ ] Each entry shows: rule type, project name, value, time
- [ ] Click on entry navigates to the affected project detail
- [ ] "Mark all read" button
- [ ] History persisted in localStorage (last 50 only)

---

## Technical Notes

- Uses Web Notifications API (`Notification.requestPermission()`, `new Notification()`)
- Rules evaluated during `DashboardDataService.getMultiSourceMetrics()` completion or in the auto-refresh cycle (Feature 5)
- Duplicate suppression: track `lastFired: Record<ruleId_projectId, timestamp>` in memory
- Threshold values reference existing `METRICS_THRESHOLDS` from `src/utils/constants.ts`
- Consider service worker for background notification delivery (stretch goal — requires dashboard to be running)
- Browser notifications require HTTPS or localhost
- `Notification.permission` states: 'default', 'granted', 'denied'

## Out of Scope

- Email or SMS notifications (requires server-side infrastructure)
- Service worker background checks (stretch goal only — requires PWA setup)
- Webhook integrations (Slack, Teams, PagerDuty)
- Notification rules shared between users (each user manages their own)
- Sound customisation (simple mute toggle only)
