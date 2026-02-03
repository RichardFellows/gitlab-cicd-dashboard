# Tasks: Saved Dashboard Configurations / Bookmarks

## Task Breakdown

Tasks ordered POC-first: prove storage layer works, then build the UI.

---

### Setup

- [ ] **T0.1** Add `SAVED_CONFIGS` and `ACTIVE_CONFIG_ID` to `STORAGE_KEYS` in `src/types/index.ts` — **S**
  - `SAVED_CONFIGS: 'gitlab_cicd_dashboard_saved_configs'`
  - `ACTIVE_CONFIG_ID: 'gitlab_cicd_dashboard_active_config_id'`
  - **Test:** Build passes

- [ ] **T0.2** Add `SavedConfigEntry` and `ExportedConfig` types to `src/types/index.ts` — **S**
  - Fields: `id`, `name`, `config: DashboardConfig`, `createdAt`, `updatedAt`
  - Export format with `version`, `name`, `config`, `exportedAt`
  - **Test:** Build passes

---

### Core Implementation

- [ ] **T1.1** Create `src/utils/configStorage.ts` — **L**
  - `getSavedConfigs(): SavedConfigEntry[]` — read from localStorage, handle parse errors
  - `saveNewConfig(name, config): SavedConfigEntry` — generate ID, set timestamps, enforce 20-config max
  - `updateConfigEntry(id, config): void` — update config data and `updatedAt`
  - `renameConfigEntry(id, newName): void` — update name
  - `deleteConfigEntry(id): void` — remove by ID
  - `getActiveConfigId() / setActiveConfigId(id)` — read/write active ID
  - `generateConfigId(): string` — timestamp + random suffix
  - Read/write using `STORAGE_KEYS.SAVED_CONFIGS` and `STORAGE_KEYS.ACTIVE_CONFIG_ID`
  - **Test:** Unit tests for all CRUD operations with mocked localStorage

- [ ] **T1.2** Implement `exportConfig(entry, includeToken): Blob` in `src/utils/configStorage.ts` — **M**
  - Create `ExportedConfig` object
  - If `includeToken` is false, replace token with empty string
  - Return JSON `Blob` with `application/json` MIME type
  - **Test:** Unit test verifying JSON content, token exclusion

- [ ] **T1.3** Implement `importConfig(jsonString): SavedConfigEntry` in `src/utils/configStorage.ts` — **M**
  - Parse JSON
  - Validate required fields: `version`, `name`, `config.gitlabUrl`, `config.timeframe`, `config.groups`, `config.projects`
  - Generate new unique ID (don't use imported ID)
  - Set `createdAt` and `updatedAt` to import time
  - Throw descriptive error on validation failure
  - **Test:** Unit tests with valid import, missing fields, malformed JSON

- [ ] **T1.4** Implement `hasUnsavedChanges(current, saved)` utility function — **S**
  - Deep comparison of `DashboardConfig` objects
  - Ignore token field in comparison (token changes don't count as "unsaved changes" for UX purposes)
  - **Test:** Unit test with identical configs, differing configs

---

### UI Components

- [ ] **T2.1** Create `src/components/ConfigSelector.tsx` — **M**
  - Dropdown showing saved config names (active one selected)
  - "Unsaved changes" yellow indicator dot when current config differs
  - Save button (💾) — when no active config, prompts for new name; when active, updates existing
  - Manage button (⚙️) — fires `onManageConfigs` callback
  - "No saved configurations" placeholder when list empty
  - Add CSS in `src/styles/ConfigSelector.css`
  - **Test:** Renders dropdown with configs, fires callbacks on select/save/manage

- [ ] **T2.2** Create `src/components/SaveConfigDialog.tsx` — **S**
  - Modal overlay with text input for config name
  - Validate: non-empty, warn on duplicate names
  - Save / Cancel buttons
  - Auto-suggest name from first group name if available
  - **Test:** Renders input, validates, fires onSave/onCancel

- [ ] **T2.3** Create `src/components/ConfigManager.tsx` — **L**
  - Modal overlay listing all saved configs
  - Per-config row: name, created date, groups count, projects count
  - Per-config actions: Rename (inline edit), Delete (with confirmation), Export (with token checkbox)
  - Import section: file input (accept `.json`)
  - Read file via `FileReader`, pass to `importConfig()`
  - Show validation errors inline
  - Close button
  - Add CSS in `src/styles/ConfigManager.css`
  - **Test:** Renders config list, rename/delete/export/import flows

- [ ] **T2.4** Integrate `ConfigSelector` into `src/components/ControlPanel.tsx` — **M**
  - Add ConfigSelector above existing form controls
  - Accept new props: `savedConfigs`, `activeConfigId`, config management callbacks
  - Layout: ConfigSelector as first row of the control panel
  - **Test:** ConfigSelector visible in ControlPanel, callbacks wired

- [ ] **T2.5** Wire config management into `src/App.tsx` — **L**
  - Add state: `savedConfigs`, `activeConfigId`, `showConfigManager`, `showSaveDialog`
  - Load saved configs from localStorage on mount (in `loadSavedSettings`)
  - Implement handlers:
    - `handleSelectConfig(id)` — load config, set active, refresh dashboard
    - `handleSaveConfig(name)` — save current config, update state
    - `handleUpdateConfig(id)` — update existing config
    - `handleDeleteConfig(id)` — delete, clear active if deleted
    - `handleRenameConfig(id, newName)` — rename
    - `handleExportConfig(id, includeToken)` — generate blob, trigger download
    - `handleImportConfig(file)` — read file, import, add to state
  - Compute `hasUnsavedChanges` via `useMemo`
  - Pass all callbacks to ControlPanel
  - **Test:** Build passes, handlers work end-to-end

---

### Tests

- [ ] **T3.1** Unit tests for `src/utils/configStorage.ts` — **M**
  - CRUD operations with mocked localStorage
  - Export with/without token
  - Import with valid/invalid JSON
  - Max config limit enforcement
  - File: `src/utils/configStorage.test.ts`

- [ ] **T3.2** Component tests for ConfigSelector — **S**
  - Render with empty/populated config list
  - Select fires callback
  - Unsaved changes indicator
  - File: `src/components/ConfigSelector.test.tsx`

- [ ] **T3.3** Component tests for ConfigManager — **M**
  - Render with configs
  - Rename, delete, export flows
  - Import with valid/invalid files
  - File: `src/components/ConfigManager.test.tsx`

- [ ] **T3.4** Integration test: save/load/switch cycle — **M**
  - Save a config, switch away, switch back, verify data restored
  - Extend existing `src/components/ControlPanel.test.tsx` or create new integration test

---

### Polish

- [ ] **T4.1** Dark mode styling for config components — **S**
  - ConfigSelector dropdown, SaveConfigDialog, ConfigManager modal
  - Ensure modal overlay has appropriate dark backdrop
  - Focus states visible in dark mode

- [ ] **T4.2** File download UX — **S**
  - Export triggers immediate download with filename: `{config-name}.gitlab-dashboard.json`
  - Sanitise config name for filename (replace spaces with hyphens, strip special chars)

- [ ] **T4.3** Confirmation dialogs — **S**
  - "Save before switching?" when unsaved changes exist
  - "Are you sure?" on delete
  - Token inclusion warning on export

- [ ] **T4.4** Update E2E tests — **M**
  - Save a configuration
  - Switch between configurations
  - Delete a configuration
  - Export/import round-trip
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

## Notes

- Saved configs share the same localStorage as the main config — both use `STORAGE_KEYS`
- Existing `loadConfig()` / `saveConfig()` in `src/utils/configMigration.ts` continue to manage the "active" config; saved configs are a parallel storage layer
- Token security: by default, exports strip the token. Users must opt-in to include it.
- Config IDs use timestamp + random to avoid collisions without a UUID library
- 20-config limit keeps localStorage usage reasonable (~200KB worst case)
