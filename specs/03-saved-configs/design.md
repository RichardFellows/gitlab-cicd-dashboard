# Design: Saved Dashboard Configurations / Bookmarks

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                            App.tsx                                   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ State: savedConfigs: SavedConfigEntry[]                       │   │
│  │ State: activeConfigId: string | null                          │   │
│  └──────────────────────────────────────────────────────────────┘   │
│              │                                                      │
│              ▼                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ ControlPanel                                                  │   │
│  │  ┌───────────────────────────────────────────────────────┐   │   │
│  │  │ ConfigSelector (dropdown + save/manage buttons)        │   │   │
│  │  └───────────────────────────────────────────────────────┘   │   │
│  │  ┌───────────────────────────────────────────────────────┐   │   │
│  │  │ ConfigManager (rename/delete/import/export modal)      │   │   │
│  │  └───────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     src/utils/configStorage.ts                       │
│                                                                      │
│  - getSavedConfigs(): SavedConfigEntry[]                            │
│  - saveConfigEntry(entry): void                                      │
│  - deleteConfigEntry(id): void                                       │
│  - updateConfigEntry(id, updates): void                              │
│  - exportConfig(entry, includeToken): Blob                          │
│  - importConfig(json): SavedConfigEntry                              │
│  - setActiveConfigId(id): void                                       │
│  - getActiveConfigId(): string | null                                │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **App mounts** → Load `savedConfigs` from localStorage, load `activeConfigId`
2. **User selects config** → `ConfigSelector` onChange → update `config` state in `App.tsx` with selected entry's `DashboardConfig` → auto-refresh dashboard
3. **User clicks Save** → Prompt for name → create `SavedConfigEntry` → persist to localStorage → update `savedConfigs` state
4. **User manages configs** → `ConfigManager` modal opens → CRUD operations → persist changes
5. **User exports** → Generate JSON blob → trigger download via browser File API
6. **User imports** → File input → parse JSON → validate schema → add to savedConfigs

## Component Structure

### New Components

#### `src/components/ConfigSelector.tsx`

Dropdown and action buttons for switching/saving configurations.

```typescript
interface ConfigSelectorProps {
  savedConfigs: SavedConfigEntry[];
  activeConfigId: string | null;
  currentConfig: DashboardConfig;
  hasUnsavedChanges: boolean;
  onSelectConfig: (id: string) => void;
  onSaveConfig: (name: string) => void;
  onUpdateConfig: (id: string) => void;
  onManageConfigs: () => void;
  disabled?: boolean;
}
```

**Displays:**
- Dropdown with saved config names (active one selected)
- "Unsaved changes" indicator when current config differs from active saved config
- Save button (💾) — opens name prompt for new, or updates existing
- Manage button (⚙️) — opens ConfigManager modal

#### `src/components/ConfigManager.tsx`

Modal dialog for managing saved configurations.

```typescript
interface ConfigManagerProps {
  savedConfigs: SavedConfigEntry[];
  activeConfigId: string | null;
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
  onExport: (id: string, includeToken: boolean) => void;
  onImport: (file: File) => void;
  onClose: () => void;
}
```

**Displays:**
- List of saved configs with: name, created date, group/project count
- Per-config actions: Rename, Delete, Export
- Import button with file input
- Close button

#### `src/components/SaveConfigDialog.tsx`

Simple prompt dialog for naming a configuration.

```typescript
interface SaveConfigDialogProps {
  existingNames: string[];
  defaultName?: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}
```

### Modified Components

#### `src/components/ControlPanel.tsx`
- Add `ConfigSelector` above or alongside the existing form controls
- Accept new props: `savedConfigs`, `activeConfigId`, config management callbacks

#### `src/App.tsx`
- Add `savedConfigs` and `activeConfigId` state
- Add `hasUnsavedChanges` computed from comparing current config to active saved config
- Add handlers for all CRUD operations on saved configs
- Load saved configs from localStorage on mount
- When selecting a saved config, update `config` state and trigger dashboard refresh

## Type Definitions

### New types in `src/types/index.ts`

```typescript
export interface SavedConfigEntry {
  id: string;                    // UUID-like unique identifier
  name: string;                  // User-provided display name
  config: DashboardConfig;       // The actual configuration
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
}

// Export format (token optionally excluded)
export interface ExportedConfig {
  version: number;               // Schema version for forward compat
  name: string;
  config: DashboardConfig;       // Token may be empty string
  exportedAt: string;
}
```

### New `STORAGE_KEYS` entries

```typescript
// In src/types/index.ts STORAGE_KEYS
SAVED_CONFIGS: 'gitlab_cicd_dashboard_saved_configs',
ACTIVE_CONFIG_ID: 'gitlab_cicd_dashboard_active_config_id'
```

## Storage Schema

### localStorage: `STORAGE_KEYS.SAVED_CONFIGS`

```json
[
  {
    "id": "cfg_1706616000000",
    "name": "My Team",
    "config": {
      "version": 1,
      "gitlabUrl": "https://gitlab.company.com",
      "token": "glpat-xxx",
      "timeframe": 30,
      "groups": [{ "id": "123", "name": "my-team" }],
      "projects": [],
      "jiraBaseUrl": "https://jira.company.com/browse"
    },
    "createdAt": "2026-01-30T10:00:00Z",
    "updatedAt": "2026-01-30T10:00:00Z"
  }
]
```

### localStorage: `STORAGE_KEYS.ACTIVE_CONFIG_ID`

```json
"cfg_1706616000000"
```

## New Utility: `src/utils/configStorage.ts`

```typescript
/**
 * Get all saved configurations from localStorage
 */
export function getSavedConfigs(): SavedConfigEntry[]

/**
 * Save a new configuration entry
 * Generates unique ID, sets timestamps
 * Enforces max 20 configs limit
 */
export function saveNewConfig(name: string, config: DashboardConfig): SavedConfigEntry

/**
 * Update an existing configuration entry
 * Updates config data and updatedAt timestamp
 */
export function updateConfigEntry(id: string, config: DashboardConfig): void

/**
 * Rename a configuration
 */
export function renameConfigEntry(id: string, newName: string): void

/**
 * Delete a configuration
 */
export function deleteConfigEntry(id: string): void

/**
 * Export a configuration as a downloadable JSON Blob
 * @param includeToken - If false, token is replaced with empty string
 */
export function exportConfig(entry: SavedConfigEntry, includeToken: boolean): Blob

/**
 * Import a configuration from JSON string
 * Validates schema, generates new ID
 * @throws Error if schema invalid
 */
export function importConfig(jsonString: string): SavedConfigEntry

/**
 * Get/set the active configuration ID
 */
export function getActiveConfigId(): string | null
export function setActiveConfigId(id: string | null): void

/**
 * Generate a unique config ID
 */
function generateConfigId(): string {
  return `cfg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}
```

## Import/Export JSON Schema

```json
{
  "version": 1,
  "name": "My Team Config",
  "config": {
    "version": 1,
    "gitlabUrl": "https://gitlab.company.com",
    "token": "",
    "timeframe": 30,
    "groups": [{ "id": "123", "name": "my-team", "addedAt": "..." }],
    "projects": [],
    "jiraBaseUrl": "https://jira.company.com/browse"
  },
  "exportedAt": "2026-01-30T10:00:00Z"
}
```

### Validation Rules
- `version` must be a number
- `name` must be a non-empty string
- `config` must have `gitlabUrl` (string), `timeframe` (number), `groups` (array), `projects` (array)
- If `token` is empty string, prompt user to enter their token after import

## UI/UX Design Notes

### ConfigSelector Placement
- Above the existing GitLab URL / Token / Timeframe fields in `ControlPanel`
- Horizontal layout: `[Dropdown ▾] [💾 Save] [⚙ Manage]`
- When no configs saved, show "No saved configurations" with "Save Current" call-to-action

### ConfigManager Modal
- Overlay modal (not a new page/view)
- Clean list with hover actions
- Import dropzone: drag-and-drop or click to browse
- Export download triggers immediately (no preview)

### Unsaved Changes Detection
- Compare current `config` with active saved config (deep equality)
- Show yellow dot on dropdown when there are unsaved changes
- On switch: "You have unsaved changes. Save before switching?" dialog

### Save Dialog
- Simple modal with text input for name
- If name already exists: "A configuration with this name already exists. Overwrite?"
- Auto-suggest name from first group/project name if available

## Dark Mode Considerations

- ConfigSelector dropdown uses standard dark-mode form styles (already handled by CSS)
- ConfigManager modal uses dark background with light text
- Import/export buttons styled consistently with existing buttons
- Modal overlay has semi-transparent dark backdrop
- Focus states visible in dark mode

## Error Handling

- localStorage full: Show error "Cannot save configuration. Local storage is full."
- Import invalid JSON: Show error "Invalid configuration file. Please check the format."
- Import missing required fields: Show specific validation error
- Maximum configs reached: Show error "Maximum 20 configurations reached. Delete an existing one first."
- Token not included in import: Show info prompt "This configuration does not include a token. Please enter your GitLab token."
