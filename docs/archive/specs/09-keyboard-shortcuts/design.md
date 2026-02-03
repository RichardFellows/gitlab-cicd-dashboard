# Design: Keyboard Shortcuts & Power User Features

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                            App.tsx                                   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ useKeyboardShortcuts(shortcuts, options)  ← custom hook      │   │
│  │ State: keyboardSelectedIndex: number                          │   │
│  │ State: showShortcutsOverlay: boolean                          │   │
│  └──────────────────────────────────────────────────────────────┘   │
│              │                          │                           │
│              ▼                          ▼                           │
│  ┌─────────────────────┐   ┌──────────────────────────────────┐   │
│  │ Dashboard / Views    │   │ ShortcutsOverlay (modal)         │   │
│  │  + keyboard selection│   │  - Grouped shortcut list          │   │
│  │    highlight         │   │  - Closable via Esc              │   │
│  └─────────────────────┘   └──────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  src/hooks/useKeyboardShortcuts.ts                    │
│                                                                      │
│  - Registers global keydown listener                                 │
│  - Guards: input focus, modifier keys                               │
│  - Dispatches to registered shortcut handlers                       │
│  - Cleanup on unmount                                                │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **App mounts** → `useKeyboardShortcuts` hook registers `keydown` listener on `document`
2. **User presses key** → Handler checks guards (focus, modifiers), matches to registered shortcuts
3. **Shortcut matched** → Handler function called (e.g., `setViewType(ViewType.TABLE)`)
4. **Project navigation** → `j`/`k` updates `keyboardSelectedIndex`, view scrolls to selected project
5. **Overlay** → `?` toggles `showShortcutsOverlay` state, renders `ShortcutsOverlay` modal

## Component Structure

### New Components

#### `src/components/ShortcutsOverlay.tsx`

Modal overlay showing all available shortcuts.

```typescript
interface ShortcutsOverlayProps {
  onClose: () => void;
  darkMode?: boolean;
}
```

**Displays:**
- Title: "Keyboard Shortcuts"
- Grouped sections:
  - **Navigation**: 1-5 view switches
  - **Actions**: r (refresh), / (search), d (dark mode), ? (shortcuts)
  - **Projects**: j/k (navigate), Enter (expand), Esc (close)
- Each entry: `<kbd>` styled key + description text
- Close button (top-right ×)
- Closable via Esc key and click outside

### New Custom Hook

#### `src/hooks/useKeyboardShortcuts.ts`

```typescript
interface ShortcutDefinition {
  key: string;                    // e.g., 'r', '1', '/', '?', 'Escape', 'Enter'
  handler: (event: KeyboardEvent) => void;
  description: string;            // For overlay display
  category: 'navigation' | 'actions' | 'projects';
  requiresData?: boolean;         // Only active when dashboard has data
}

interface UseKeyboardShortcutsOptions {
  enabled: boolean;               // Master enable/disable
  shortcuts: ShortcutDefinition[];
}

function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions): void
```

**Implementation:**

```typescript
function useKeyboardShortcuts({ enabled, shortcuts }: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (event: KeyboardEvent) => {
      // Guard: skip if input element is focused
      const target = event.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      if (['input', 'textarea', 'select'].includes(tagName) || target.isContentEditable) {
        // Exception: Esc should work even in inputs (to blur/clear)
        if (event.key !== 'Escape') return;
      }

      // Guard: skip if modifier key is held (Ctrl, Cmd, Alt)
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      // Find matching shortcut
      const shortcut = shortcuts.find(s => s.key === event.key);
      if (shortcut) {
        event.preventDefault();
        shortcut.handler(event);
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [enabled, shortcuts]);
}
```

### Modified Components

#### `src/App.tsx`
- Add `keyboardSelectedIndex` state (number, -1 = nothing selected)
- Add `showShortcutsOverlay` state (boolean)
- Define shortcut array with all handlers
- Call `useKeyboardShortcuts` hook
- Pass `keyboardSelectedIndex` and `onKeyboardSelect` to Dashboard
- Render `ShortcutsOverlay` conditionally

#### `src/components/Dashboard.tsx`
- Accept `keyboardSelectedIndex` and `onKeyboardSelect` props
- Pass to CardView/TableView

#### `src/components/CardView.tsx`
- Accept `keyboardSelectedIndex` prop
- Apply highlight CSS class to selected card
- Scroll selected card into view via `scrollIntoView({ behavior: 'smooth', block: 'nearest' })`

#### `src/components/TableView.tsx`
- Accept `keyboardSelectedIndex` prop
- Apply highlight CSS class to selected row
- Scroll selected row into view

## Type Definitions

### Shortcut Definitions Constant

```typescript
// src/utils/shortcuts.ts

export interface ShortcutInfo {
  key: string;
  keyDisplay: string;       // Display label (e.g., "?" vs "Shift+/")
  description: string;
  category: 'navigation' | 'actions' | 'projects';
}

export const SHORTCUT_DEFINITIONS: ShortcutInfo[] = [
  // Navigation
  { key: '1', keyDisplay: '1', description: 'Card View', category: 'navigation' },
  { key: '2', keyDisplay: '2', description: 'Table View', category: 'navigation' },
  { key: '3', keyDisplay: '3', description: 'Environment View', category: 'navigation' },
  { key: '4', keyDisplay: '4', description: 'Readiness View', category: 'navigation' },
  { key: '5', keyDisplay: '5', description: 'MR Board View', category: 'navigation' },

  // Actions
  { key: 'r', keyDisplay: 'R', description: 'Refresh dashboard', category: 'actions' },
  { key: '/', keyDisplay: '/', description: 'Focus search', category: 'actions' },
  { key: 'd', keyDisplay: 'D', description: 'Toggle dark mode', category: 'actions' },
  { key: '?', keyDisplay: '?', description: 'Show shortcuts', category: 'actions' },

  // Projects
  { key: 'j', keyDisplay: 'J', description: 'Next project', category: 'projects' },
  { key: 'k', keyDisplay: 'K', description: 'Previous project', category: 'projects' },
  { key: 'Enter', keyDisplay: '↵', description: 'Open project', category: 'projects' },
  { key: 'Escape', keyDisplay: 'Esc', description: 'Close / go back', category: 'projects' },
];
```

## Shortcut Handler Logic

### View Navigation (1-5)

```typescript
// In App.tsx shortcut setup
{ key: '1', handler: () => setViewType(ViewType.CARD) },
{ key: '2', handler: () => setViewType(ViewType.TABLE) },
{ key: '3', handler: () => setViewType(ViewType.ENVIRONMENT) },
{ key: '4', handler: () => setViewType(ViewType.READINESS) },
{ key: '5', handler: () => setViewType(ViewType.MR_BOARD) },
```

### Refresh (r)

```typescript
{
  key: 'r',
  handler: () => {
    if (!loading && metrics) {
      loadDashboard(config);
    }
  }
}
```

### Search Focus (/)

```typescript
{
  key: '/',
  handler: (event) => {
    event.preventDefault(); // Prevent "/" from typing in search
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.focus();
  }
}
```

### Project Navigation (j/k/Enter/Esc)

```typescript
{
  key: 'j',
  handler: () => {
    if (!metrics) return;
    setKeyboardSelectedIndex(prev => {
      const maxIndex = filteredProjects.length - 1;
      return prev >= maxIndex ? 0 : prev + 1; // Wrap around
    });
  }
}

{
  key: 'k',
  handler: () => {
    if (!metrics) return;
    setKeyboardSelectedIndex(prev => {
      const maxIndex = filteredProjects.length - 1;
      return prev <= 0 ? maxIndex : prev - 1; // Wrap around
    });
  }
}

{
  key: 'Enter',
  handler: () => {
    if (keyboardSelectedIndex >= 0 && filteredProjects[keyboardSelectedIndex]) {
      onProjectSelect(filteredProjects[keyboardSelectedIndex].id);
    }
  }
}

{
  key: 'Escape',
  handler: () => {
    if (showShortcutsOverlay) {
      setShowShortcutsOverlay(false);
    } else if (selectedProjectId) {
      setSelectedProjectId(null);
      window.location.hash = '';
    } else if (searchQuery) {
      setSearchQuery('');
    } else {
      setKeyboardSelectedIndex(-1);
    }
  }
}
```

## API Integration Points

No API calls. Keyboard shortcuts are purely client-side UI logic.

## UI/UX Design Notes

### Keyboard Selection Highlight
- In **Card View**: selected card gets a prominent border (using `CHART_COLORS.primary`) and subtle background tint
- In **Table View**: selected row gets a background highlight
- Highlight animates smoothly when moving between projects

### Shortcuts Overlay
- Semi-transparent dark overlay covering the full page
- Centred modal with white (or dark) background
- Three columns of shortcuts: Navigation | Actions | Projects
- `<kbd>` elements styled to look like keyboard keys
- Close via Esc, click outside, or × button

### Visual Hint
- Small "Press ? for shortcuts" hint text in the footer or near the settings toggle
- Shows only on first visit, then hidden via localStorage flag

### Search Focus Behaviour
- When `/` is pressed, search input receives focus
- If search already has text, cursor moves to end
- `Esc` while in search blurs the input and clears the text

## Dark Mode Considerations

- Keyboard selection highlight uses `CHART_COLORS_DARK.primary` in dark mode
- Shortcuts overlay uses dark background with light text
- `<kbd>` elements styled for dark mode (dark border, lighter background)
- All interactions remain visible and clear in dark mode

## Error Handling

- No error handling needed — shortcuts are no-ops when the target action is unavailable
- `r` (refresh) disabled when already loading
- `j`/`k` disabled when no projects loaded
- `Enter` disabled when nothing selected
- All graceful — no errors, just no action
