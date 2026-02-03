# Tasks: Keyboard Shortcuts & Power User Features

## Task Breakdown

Tasks ordered POC-first: prove the hook works, then add all shortcuts and the overlay.

---

### Setup

- [ ] **T0.1** Create `src/utils/shortcuts.ts` with `SHORTCUT_DEFINITIONS` — **S**
  - Define `ShortcutInfo` interface: `key`, `keyDisplay`, `description`, `category`
  - Export `SHORTCUT_DEFINITIONS` array with all 13 shortcuts
  - **Test:** Build passes

---

### Core Implementation

- [ ] **T1.1** Create `src/hooks/useKeyboardShortcuts.ts` custom hook — **M**
  - Accept `{ enabled, shortcuts }` options
  - Register `document.addEventListener('keydown', handler)` on mount
  - Guard: skip when `input`/`textarea`/`select`/`contenteditable` focused (except Esc)
  - Guard: skip when `ctrlKey`/`metaKey`/`altKey` held
  - Match `event.key` to registered shortcuts, call handler, `preventDefault()`
  - Cleanup: remove listener on unmount
  - Use stable callback ref pattern to avoid re-registering on every render
  - **Test:** Unit test with mock events — verify handler called, guards work, cleanup runs

- [ ] **T1.2** Add keyboard selection state to `src/App.tsx` — **S**
  - `const [keyboardSelectedIndex, setKeyboardSelectedIndex] = useState(-1)`
  - `const [showShortcutsOverlay, setShowShortcutsOverlay] = useState(false)`
  - Reset `keyboardSelectedIndex` to -1 when: search query changes, status filter changes, view type changes
  - **Test:** Build passes

- [ ] **T1.3** Define all shortcut handlers in `src/App.tsx` — **M**
  - View navigation (1-5): `setViewType(ViewType.CARD/TABLE/ENVIRONMENT/READINESS/MR_BOARD)`
  - Refresh (r): `loadDashboard(config)` guarded by `!loading && metrics`
  - Search (/): `document.getElementById('search-input')?.focus()` with `preventDefault()`
  - Dark mode (d): `setDarkMode(prev => !prev)`
  - Shortcuts (?): `setShowShortcutsOverlay(true)`
  - Next (j): increment `keyboardSelectedIndex` with wrap-around
  - Prev (k): decrement `keyboardSelectedIndex` with wrap-around
  - Open (Enter): `onProjectSelect(filteredProjects[keyboardSelectedIndex].id)` if valid
  - Close (Esc): cascade — overlay → project detail → search → selection
  - Wire all handlers into `useKeyboardShortcuts` hook
  - **Test:** Build passes, basic shortcut firing works

---

### UI Components

- [ ] **T2.1** Create `src/components/ShortcutsOverlay.tsx` — **M**
  - Props: `onClose`, `darkMode`
  - Modal overlay: semi-transparent backdrop + centred content panel
  - Group shortcuts from `SHORTCUT_DEFINITIONS` by category
  - Render each shortcut as: `<kbd>{keyDisplay}</kbd> — {description}`
  - Three sections: Navigation, Actions, Projects
  - Close: × button, Esc key, click on backdrop
  - `<kbd>` styled to look like physical keys (border, rounded corners, shadow)
  - Add CSS in `src/styles/ShortcutsOverlay.css`
  - **Test:** Renders all shortcuts grouped, close methods work

- [ ] **T2.2** Add keyboard selection highlight to `src/components/CardView.tsx` — **M**
  - Accept `keyboardSelectedIndex` prop
  - Apply `.keyboard-selected` CSS class to the card at the selected index
  - Use `useEffect` + `useRef` to call `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` on selected card
  - Highlight style: prominent border (`CHART_COLORS.primary`), subtle background tint
  - **Test:** Selected card has highlight class, scroll into view triggered

- [ ] **T2.3** Add keyboard selection highlight to `src/components/TableView.tsx` — **M**
  - Accept `keyboardSelectedIndex` prop
  - Apply `.keyboard-selected` CSS class to the selected table row
  - Use `useEffect` + `useRef` for scroll into view
  - Highlight style: background tint using primary colour at 10% opacity
  - **Test:** Selected row has highlight class, scroll into view triggered

- [ ] **T2.4** Add `id="search-input"` to search input element — **S**
  - In whatever component contains the search input (likely header area of `Dashboard.tsx` or `App.tsx`)
  - Ensure the `/` shortcut can find and focus it
  - **Test:** Search input focusable via `document.getElementById`

- [ ] **T2.5** Add "Press ? for shortcuts" hint — **S**
  - Small muted text in the footer or near the settings area
  - Only shown on first visit (check localStorage flag: `STORAGE_KEYS` + `_shortcuts_hint_dismissed`)
  - Clickable: opens shortcuts overlay
  - Dismissible: hidden after first `?` press or explicit dismiss
  - **Test:** Hint shows on first visit, hidden after dismissal

- [ ] **T2.6** Wire everything into `src/App.tsx` — **M**
  - Render `ShortcutsOverlay` when `showShortcutsOverlay` is true
  - Pass `keyboardSelectedIndex` through `Dashboard` → `CardView`/`TableView`
  - Ensure all shortcuts integrated per T1.3
  - Add search input `id` if managed in App
  - **Test:** Full shortcut flow works end-to-end

---

### Tests

- [ ] **T3.1** Unit tests for `src/hooks/useKeyboardShortcuts.ts` — **M**
  - Shortcut handler called on matching key press
  - Handler NOT called when input focused
  - Handler NOT called when modifier key held
  - Esc handler works even when input focused
  - Cleanup removes listener
  - Use `@testing-library/react` `renderHook` + `fireEvent`
  - File: `src/hooks/useKeyboardShortcuts.test.ts`

- [ ] **T3.2** Component test for ShortcutsOverlay — **S**
  - All shortcut categories rendered
  - Close via Esc, click outside, × button
  - Correct number of shortcuts displayed
  - File: `src/components/ShortcutsOverlay.test.tsx`

- [ ] **T3.3** Integration test for keyboard navigation — **M**
  - Press `j` → selection moves down
  - Press `k` → selection moves up
  - Press `Enter` → project detail opens
  - Press `Esc` → detail closes
  - Wrap-around at list boundaries
  - Selection reset on filter change
  - File: `src/components/Dashboard.test.tsx` (extend)

- [ ] **T3.4** Integration test for action shortcuts — **S**
  - Press `1`-`5` → view type changes
  - Press `r` → refresh triggered (mock `loadDashboard`)
  - Press `d` → dark mode toggles
  - Press `/` → search input focused

---

### Polish

- [ ] **T4.1** Dark mode styling — **S**
  - Selection highlight uses `CHART_COLORS_DARK.primary` in dark mode
  - `<kbd>` elements styled for dark mode (darker border, appropriate contrast)
  - Overlay backdrop and content panel dark mode variants

- [ ] **T4.2** Selection highlight animation — **S**
  - Smooth border/background transition (CSS `transition: all 0.2s ease`)
  - Scroll into view uses smooth behaviour
  - Keyboard focus ring visible but not distracting

- [ ] **T4.3** Accessibility improvements — **S**
  - `aria-label` on selected project card/row
  - `role="dialog"` and `aria-modal="true"` on shortcuts overlay
  - `aria-keyshortcuts` attribute on elements with shortcuts
  - Ensure screen readers can identify the selected item

- [ ] **T4.4** Update E2E tests — **M**
  - Press `?` → overlay appears
  - Press `Esc` → overlay closes
  - Press `2` → view switches to Table
  - Press `j`/`k` → navigate projects
  - Press `Enter` → project detail opens
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
- No feature dependencies — works with whatever views/features are currently available

## Notes

- The hook uses `useRef` for the handler to avoid stale closures (common pitfall with `addEventListener` + React state)
- Shortcuts are intentionally simple single-key presses — no sequences, no chords
- `?` key requires Shift on most keyboards — handle via `event.key === '?'` which already accounts for this
- `/` needs `preventDefault()` to stop Firefox's quick-find from activating
- View number shortcuts (1-5) are extensible — just add more entries if new views are added
- Project navigation wraps around for convenience — pressing `j` at the last project goes to the first
