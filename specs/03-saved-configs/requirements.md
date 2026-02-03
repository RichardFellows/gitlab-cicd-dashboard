# Requirements: Saved Dashboard Configurations / Bookmarks

## Business Context

From INTERVIEW_NOTES.md: "All teams should be able to use the same dashboard" and teams configure their own groups. Currently, the dashboard stores only a single `DashboardConfig` in localStorage. Users who monitor multiple GitLab instances, different project subsets, or different teams must reconfigure each time they switch context.

Saved configurations make the dashboard practical for multi-team adoption — each user can maintain named configs like "My Team", "Platform Group", "Prod Monitoring" and switch between them instantly.

---

## User Stories

### 3.1 Save Named Configuration

**As a** user  
**I want to** save my current dashboard configuration with a name  
**So that** I can quickly return to this exact setup later

**Acceptance Criteria:**
- [ ] "Save Configuration" button accessible from the control panel
- [ ] Prompted to enter a name for the configuration
- [ ] Saved config includes: GitLab URL, token, groups, projects, timeframe, JIRA base URL
- [ ] Duplicate name handling: option to overwrite or rename
- [ ] Success confirmation shown after save
- [ ] Maximum 20 saved configurations (to prevent localStorage bloat)

---

### 3.2 Switch Between Saved Configurations

**As a** user  
**I want to** switch between my saved configurations from a dropdown  
**So that** I can change monitoring context without reconfiguring

**Acceptance Criteria:**
- [ ] Dropdown/selector in the control panel showing all saved config names
- [ ] Selecting a config loads its settings into the control panel
- [ ] Dashboard automatically refreshes with the new configuration
- [ ] Current unsaved changes prompt "Save before switching?" confirmation
- [ ] Active config name displayed prominently

---

### 3.3 Manage Saved Configurations

**As a** user  
**I want to** rename, delete, and update my saved configurations  
**So that** I can keep my configuration list clean and current

**Acceptance Criteria:**
- [ ] Rename: edit the name of a saved configuration
- [ ] Delete: remove a saved configuration with confirmation
- [ ] Update: overwrite a saved config with current settings
- [ ] Reorder: drag or manual ordering of configs (stretch goal)

---

### 3.4 Import/Export Configurations

**As a** team member  
**I want to** export my configuration as JSON and import configs from teammates  
**So that** we can share dashboard setups without manual reconfiguration

**Acceptance Criteria:**
- [ ] "Export" button downloads current or selected config as JSON file
- [ ] "Import" button accepts a JSON file and adds the config to saved list
- [ ] Import validates JSON schema before accepting
- [ ] Tokens are **excluded** from export by default (security)
- [ ] Option to include token in export (with clear warning)
- [ ] Import prompts for token if not included in the file

---

## Technical Notes

- Saved configs stored in localStorage as a JSON array of `DashboardConfig` objects
- New `STORAGE_KEYS` entry needed: `SAVED_CONFIGS` and `ACTIVE_CONFIG_ID`
- Each saved config needs a unique ID (UUID or timestamp-based) and display name
- Existing `DashboardConfig` interface already contains all needed fields
- The `loadConfig()` / `saveConfig()` utilities in `src/utils/configMigration.ts` need extension
- Consider a `SavedConfigEntry` wrapper type that adds `id`, `name`, `createdAt`, `updatedAt`
- Import/export uses browser File API (`Blob` for download, `FileReader` for upload)

## Out of Scope

- Cloud/server-side config storage or syncing
- Config sharing via URL (would require encoding config in URL params)
- Per-config view preferences (view type, dark mode, filters)
- Config versioning or change history
- Real-time config sync between browser tabs
