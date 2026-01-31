# Tasks: Notification Rules (Browser-Based Alerts)

## Task Breakdown

Tasks ordered POC-first: prove browser notifications work, then build the rule engine and UI.

---

### Setup

- [ ] **T0.1** Add notification types to `src/types/index.ts` — **S**
  - `NotificationRuleType`, `NotificationRule`, `NotificationEntry`
  - **Test:** Build passes

- [ ] **T0.2** Add notification `STORAGE_KEYS` to `src/types/index.ts` — **S**
  - `NOTIFICATION_RULES`, `NOTIFICATION_HISTORY`, `NOTIFICATIONS_ENABLED`, `NOTIFICATION_MUTED`
  - **Test:** Build passes

---

### Core Implementation

- [ ] **T1.1** Create `src/utils/notificationEngine.ts` — **L**
  - `evaluateRules(rules, currentMetrics, previousMetrics, deploymentCache): NotificationEntry[]`
  - `checkPipelineFailure(project, prevProject): boolean` — transition detection (was OK, now failed)
  - `checkCoverageDrop(project, threshold, prevProject): boolean` — dropped below threshold
  - `checkDurationSpike(project, threshold): boolean` — spike exceeds threshold
  - `checkDeploymentFailure(projectId, environment, deploymentCache): boolean` — failed deployment
  - Reference `METRICS_THRESHOLDS` from `src/utils/constants.ts` for default thresholds
  - **Test:** Unit tests for each check function with various metric combinations

- [ ] **T1.2** Implement duplicate suppression in `src/utils/notificationEngine.ts` — **M**
  - In-memory `Map<string, number>` tracking `${ruleId}_${projectId}` → last fired timestamp
  - 30-minute suppression window
  - `shouldSuppress(ruleId, projectId): boolean`
  - `clearSuppression(ruleId, projectId): void` — for when condition resolves
  - **Test:** Unit test: fire once → suppressed, wait → fires again

- [ ] **T1.3** Implement `sendBrowserNotification(entry: NotificationEntry)` in `src/utils/notificationEngine.ts` — **S**
  - Guard: check `Notification.permission === 'granted'`
  - Create `new Notification(title, { body, icon, tag })`
  - `onclick` → `window.focus()`, navigate to `#project/${projectId}`
  - **Test:** Mock `Notification` constructor, verify correct parameters

- [ ] **T1.4** Create `src/utils/notificationStorage.ts` — **M**
  - `getRules(): NotificationRule[]` — read from `STORAGE_KEYS.NOTIFICATION_RULES`
  - `saveRules(rules): void` — write to localStorage
  - `addRule(rule): NotificationRule` — generate ID, add to list
  - `updateRule(id, updates): void`
  - `deleteRule(id): void`
  - `getHistory(): NotificationEntry[]` — read from `STORAGE_KEYS.NOTIFICATION_HISTORY`
  - `appendHistory(entries): void` — add entries, enforce 50-entry max
  - `markAllRead(): void`
  - `isEnabled(): boolean` / `setEnabled(val): void`
  - `isMuted(): boolean` / `setMuted(val): void`
  - **Test:** Unit tests with mocked localStorage

---

### UI Components

- [ ] **T2.1** Create `src/components/NotificationBell.tsx` — **M**
  - Bell icon (🔔) with unread count badge
  - Click toggles dropdown panel
  - Dropdown shows last 50 notification entries with: icon, message, project name, relative time
  - Each entry clickable → navigates to project (`onClickEntry` callback)
  - "Mark all read" button at top of dropdown
  - "No notifications" empty state
  - Close dropdown on outside click
  - Add CSS in `src/styles/NotificationBell.css`
  - **Test:** Renders badge count, dropdown opens/closes, entries clickable

- [ ] **T2.2** Create `src/components/NotificationRuleForm.tsx` — **M**
  - Type dropdown: pipeline-failure / coverage-drop / duration-spike / deployment-failure
  - Scope: radio group (all projects / specific project — multi-select from loaded projects)
  - Threshold input: visible for coverage-drop and duration-spike types
  - Environment dropdown: visible for deployment-failure type (using `ENVIRONMENT_ORDER` from `src/types/index.ts`)
  - Name: auto-generated from type+scope, editable
  - Save / Cancel buttons
  - Form validation: threshold must be positive number, at least one project if scoped
  - **Test:** Renders all fields, conditional visibility, validates input

- [ ] **T2.3** Create `src/components/NotificationSettings.tsx` — **L**
  - Enable/disable toggle with permission state display
  - Handle `Notification.requestPermission()` on first enable
  - Show permission state: ✅ Granted, ⚠️ Not requested, ❌ Denied (with help text)
  - Sound mute toggle
  - List of existing rules with per-rule enable/disable toggle
  - Per-rule actions: Edit, Delete (with confirmation)
  - "Add Rule" button → opens `NotificationRuleForm`
  - Rule count indicator (N / 20 max)
  - Add CSS in `src/styles/NotificationSettings.css`
  - **Test:** Permission handling, rule CRUD, enable/disable flow

- [ ] **T2.4** Integrate notification components into `src/App.tsx` — **L**
  - Add state: `notificationRules`, `notificationHistory`, `notificationsEnabled`, `previousMetrics`
  - Load state from localStorage on mount
  - After each data refresh (`loadDashboard` completion):
    - Call `evaluateRules()` with current and previous metrics
    - For each fired notification: call `sendBrowserNotification()`, append to history
    - Update `previousMetrics` ref for next evaluation cycle
  - Render `NotificationBell` in header (next to dark mode toggle and view type selector)
  - Add `NotificationSettings` as collapsible section in ControlPanel or as separate panel
  - Pass all handlers and state down
  - **Test:** Build passes, notifications fire on data refresh

---

### Tests

- [ ] **T3.1** Unit tests for `src/utils/notificationEngine.ts` — **L**
  - Each rule type with triggering and non-triggering metrics
  - Transition detection (only fire on status change, not continuously)
  - Duplicate suppression timing
  - Edge cases: null coverage, missing deployment data, zero pipelines
  - File: `src/utils/notificationEngine.test.ts`

- [ ] **T3.2** Unit tests for `src/utils/notificationStorage.ts` — **M**
  - CRUD operations on rules
  - History append and max enforcement
  - Enable/mute toggles
  - File: `src/utils/notificationStorage.test.ts`

- [ ] **T3.3** Component tests for NotificationBell — **S**
  - Badge count rendering
  - Dropdown interaction
  - Mark all read
  - File: `src/components/NotificationBell.test.tsx`

- [ ] **T3.4** Component tests for NotificationSettings — **M**
  - Permission flow (mock `Notification.requestPermission`)
  - Rule CRUD
  - Enable/disable
  - File: `src/components/NotificationSettings.test.tsx`

---

### Polish

- [ ] **T4.1** Dark mode styling — **S**
  - Bell icon, dropdown, settings panel, rule form
  - Badge colours for dark mode
  - Dropdown shadow/border for dark backgrounds

- [ ] **T4.2** Notification sound toggle — **S**
  - When unmuted, play a brief notification sound via `Audio` API
  - Use a simple bundled sound file or Web Audio API beep
  - Mute preference persisted via `STORAGE_KEYS.NOTIFICATION_MUTED`

- [ ] **T4.3** Feature detection and fallback — **S**
  - Check `'Notification' in window` before showing any notification UI
  - If not supported, hide notifications entirely with info message
  - Handle Safari's different `Notification.requestPermission` (callback vs Promise)

- [ ] **T4.4** Update E2E tests — **M**
  - Enable notifications (mock permission)
  - Create a rule
  - Verify bell icon appears
  - Verify notification history dropdown
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
- Notification evaluation pairs well with Feature 5 (Auto-Refresh) — without auto-refresh, rules only fire on manual dashboard load

## Notes

- Browser notifications only work while the tab is running (no background service worker in v1)
- Pair this with Feature 5 (Auto-Refresh) for meaningful alerting — without periodic refresh, rules only evaluate on manual "Load Dashboard"
- `previousMetrics` stored as a React ref (not state) to avoid unnecessary re-renders
- Suppression map is in-memory only (resets on page reload) which is intentional — avoids stale suppressions
- Rule evaluation is intentionally lightweight — no async calls, just metric comparison
