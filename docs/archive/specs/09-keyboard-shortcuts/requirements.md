# Requirements: Keyboard Shortcuts & Power User Features

## Business Context

From the feature proposal: The dashboard is used repeatedly throughout the day by developers and team leads. Without keyboard navigation, every interaction requires mouse clicks — switching views, refreshing data, searching projects, navigating between projects. For a tool used this frequently, keyboard shortcuts significantly reduce friction and make the experience feel polished and professional.

This is a low-effort, high-impact quality-of-life improvement that differentiates the dashboard from a basic web page.

---

## User Stories

### 9.1 View Navigation Shortcuts

**As a** power user  
**I want to** switch between dashboard views using keyboard shortcuts  
**So that** I can navigate quickly without reaching for the mouse

**Acceptance Criteria:**
- [ ] `1` — Switch to Card view
- [ ] `2` — Switch to Table view
- [ ] `3` — Switch to Environment view
- [ ] `4` — Switch to Readiness view
- [ ] `5` — Switch to MR Board view (if Feature 7 implemented)
- [ ] Shortcuts only active when no input field is focused
- [ ] Current view visually indicated in the view type selector

---

### 9.2 Action Shortcuts

**As a** user  
**I want to** perform common actions via keyboard  
**So that** I can work faster

**Acceptance Criteria:**
- [ ] `r` — Refresh dashboard data (same as clicking "Load Dashboard")
- [ ] `/` — Focus the search input (prevents typing "/" in search)
- [ ] `d` — Toggle dark mode
- [ ] `Esc` — Close project details panel / collapse expanded items / clear search
- [ ] `?` — Show keyboard shortcuts overlay/help panel
- [ ] Shortcuts disabled when a text input, textarea, or select is focused

---

### 9.3 Project Navigation

**As a** developer  
**I want to** navigate between projects using keyboard  
**So that** I can review projects sequentially without clicking each one

**Acceptance Criteria:**
- [ ] `j` — Move selection to next project (down)
- [ ] `k` — Move selection to previous project (up)
- [ ] `Enter` — Open/expand the currently selected project's detail panel
- [ ] `Esc` — Close the detail panel and return to the project list
- [ ] Visual highlight on the currently keyboard-selected project
- [ ] Works in both Card and Table views
- [ ] Selection wraps around (last → first, first → last)

---

### 9.4 Shortcuts Help Overlay

**As a** new user  
**I want to** see a list of all available keyboard shortcuts  
**So that** I can learn and use them

**Acceptance Criteria:**
- [ ] `?` opens a modal overlay listing all shortcuts
- [ ] Grouped by category: Navigation, Actions, Projects
- [ ] Each entry shows: key(s), description
- [ ] Overlay closable via `Esc` or clicking outside
- [ ] Link to shortcuts from settings/help area (for discoverability)

---

## Technical Notes

- Use `document.addEventListener('keydown', ...)` in a top-level component or custom hook
- Guard: check `event.target` — skip if focused element is `input`, `textarea`, `select`, or `[contenteditable]`
- Guard: check for modifier keys — shortcuts should NOT fire if Ctrl/Cmd/Alt is held (to avoid conflicts with browser shortcuts)
- Use `event.key` (not `event.keyCode` which is deprecated)
- Project navigation requires tracking a `keyboardSelectedIndex` state
- Consider accessibility: keyboard navigation should complement, not replace, existing mouse/touch interaction
- All shortcuts should be no-ops when the relevant feature is not available (e.g., no refresh while already loading)

## Out of Scope

- Customisable key bindings (fixed shortcuts only)
- Vim-style command mode or sequences (e.g., `gg` to go to top)
- Keyboard shortcuts for sub-features (notifications, config management, etc.)
- Touch/swipe gestures
- Screen reader integration (separate accessibility concern)
