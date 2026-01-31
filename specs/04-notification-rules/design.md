# Design: Notification Rules (Browser-Based Alerts)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                            App.tsx                                   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ State: notificationRules: NotificationRule[]                  │   │
│  │ State: notificationHistory: NotificationEntry[]               │   │
│  │ State: notificationsEnabled: boolean                          │   │
│  └──────────────────────────────────────────────────────────────┘   │
│              │                          │                           │
│              ▼                          ▼                           │
│  ┌─────────────────────┐   ┌──────────────────────────────────┐   │
│  │ NotificationSettings│   │ NotificationBell (header)         │   │
│  │  - Enable toggle    │   │  - Unread count badge             │   │
│  │  - Rule list        │   │  - History dropdown               │   │
│  │  - Add/edit rules   │   └──────────────────────────────────┘   │
│  └─────────────────────┘                                           │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  src/utils/notificationEngine.ts                     │
│                                                                      │
│  - evaluateRules(rules, metrics, previousMetrics): FiredNotification[]│
│  - shouldFire(rule, project, prev): boolean                          │
│  - sendBrowserNotification(notification): void                       │
│  - suppressDuplicate(ruleId, projectId): boolean                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **Dashboard refreshes** → `getMultiSourceMetrics()` returns new `DashboardMetrics`
2. **Evaluation triggered** → `evaluateRules(rules, newMetrics, previousMetrics)` runs
3. **Rules checked** → Each rule evaluated against current metrics per project
4. **Duplicate suppression** → Check if same rule+project already fired recently
5. **Notification sent** → `new Notification(title, { body, icon })` for each triggered rule
6. **History updated** → Fired notifications appended to history, persisted in localStorage
7. **Bell updated** → Unread count incremented

## Component Structure

### New Components

#### `src/components/NotificationSettings.tsx`

Settings panel for managing notification rules (in control panel or as separate tab).

```typescript
interface NotificationSettingsProps {
  enabled: boolean;
  permissionState: NotificationPermission;  // 'default' | 'granted' | 'denied'
  rules: NotificationRule[];
  projects: Project[];
  onToggleEnabled: () => void;
  onAddRule: (rule: Omit<NotificationRule, 'id'>) => void;
  onUpdateRule: (id: string, updates: Partial<NotificationRule>) => void;
  onDeleteRule: (id: string) => void;
  darkMode?: boolean;
}
```

**Displays:**
- Enable/disable toggle with permission state indicator
- List of existing rules with enable/disable toggle per rule
- "Add Rule" button → inline form or modal
- Rule edit form: type dropdown, scope (global/specific projects), threshold input
- Delete button per rule

#### `src/components/NotificationRuleForm.tsx`

Form for creating/editing a notification rule.

```typescript
interface NotificationRuleFormProps {
  rule?: NotificationRule;        // Edit mode if provided
  projects: Project[];
  onSave: (rule: Omit<NotificationRule, 'id'>) => void;
  onCancel: () => void;
}
```

**Fields:**
- Rule type: dropdown (pipeline-failure / coverage-drop / duration-spike / deployment-failure)
- Scope: radio (all projects / specific project dropdown)
- Threshold: number input (for coverage/duration types)
- Environment: dropdown (for deployment-failure type, using `EnvironmentName`)
- Name: auto-generated from type+scope, editable

#### `src/components/NotificationBell.tsx`

Header bell icon with badge and dropdown history.

```typescript
interface NotificationBellProps {
  history: NotificationEntry[];
  unreadCount: number;
  onMarkAllRead: () => void;
  onClickEntry: (entry: NotificationEntry) => void;
  darkMode?: boolean;
}
```

**Displays:**
- Bell icon (🔔) with numeric badge for unread count
- Click opens dropdown with notification history
- Each entry: icon, message, time ago, project link
- "Mark all read" button at top
- "No notifications" placeholder when empty

### Modified Components

#### `src/components/ControlPanel.tsx`
- Add "Notifications" section (collapsible) containing `NotificationSettings`
- Or add "🔔 Notifications" button that opens a side panel

#### `src/App.tsx`
- Add notification state management
- Run rule evaluation after each data refresh
- Render `NotificationBell` in the header area

## Type Definitions

### New types in `src/types/index.ts`

```typescript
// Notification rule types
export type NotificationRuleType =
  | 'pipeline-failure'      // Main branch pipeline failed
  | 'coverage-drop'         // Coverage below threshold
  | 'duration-spike'        // Duration increased above threshold %
  | 'deployment-failure';   // Failed deployment to specified environment

export interface NotificationRule {
  id: string;                           // Unique identifier
  type: NotificationRuleType;
  name: string;                         // Display name
  enabled: boolean;
  scope: 'all' | number[];             // 'all' projects or specific project IDs
  threshold?: number;                   // For coverage-drop (%) or duration-spike (%)
  environment?: EnvironmentName;        // For deployment-failure
  createdAt: string;
}

export interface NotificationEntry {
  id: string;
  ruleId: string;
  ruleName: string;
  ruleType: NotificationRuleType;
  projectId: number;
  projectName: string;
  message: string;
  value: number;                        // The metric value that triggered it
  timestamp: string;
  read: boolean;
}
```

### New `STORAGE_KEYS` entries

```typescript
NOTIFICATION_RULES: 'gitlab_cicd_dashboard_notification_rules',
NOTIFICATION_HISTORY: 'gitlab_cicd_dashboard_notification_history',
NOTIFICATIONS_ENABLED: 'gitlab_cicd_dashboard_notifications_enabled',
NOTIFICATION_MUTED: 'gitlab_cicd_dashboard_notification_muted'
```

## Notification Engine: `src/utils/notificationEngine.ts`

### Rule Evaluation Logic

```typescript
function evaluateRules(
  rules: NotificationRule[],
  currentMetrics: DashboardMetrics,
  previousMetrics: DashboardMetrics | null,
  deploymentCache: Map<number, DeploymentsByEnv>
): FiredNotification[]
```

#### Pipeline Failure Rule
```typescript
// Fires when: main branch pipeline status is 'failed'
// AND previous status was NOT 'failed' (transition detection)
function checkPipelineFailure(project: Project, prevProject?: Project): boolean {
  const current = project.metrics.mainBranchPipeline;
  const prev = prevProject?.metrics.mainBranchPipeline;
  return current.status === 'failed' && (!prev || prev.status !== 'failed');
}
```

#### Coverage Drop Rule
```typescript
// Fires when: coverage drops below threshold
// AND was previously above threshold (or first check)
function checkCoverageDrop(project: Project, threshold: number, prevProject?: Project): boolean {
  const current = project.metrics.codeCoverage.coverage;
  const prev = prevProject?.metrics.codeCoverage.coverage;
  if (current === null) return false;
  return current < threshold && (prev === null || prev >= threshold);
}
```

#### Duration Spike Rule
```typescript
// Fires when: duration spike percentage exceeds threshold
function checkDurationSpike(project: Project, threshold: number): boolean {
  const spike = project.metrics.durationSpikePercent || 0;
  return spike >= threshold;
}
```

#### Deployment Failure Rule
```typescript
// Fires when: latest deployment to specified environment has status 'failed'
function checkDeploymentFailure(
  projectId: number,
  environment: EnvironmentName,
  deploymentCache: Map<number, DeploymentsByEnv>
): boolean {
  const deployments = deploymentCache.get(projectId);
  if (!deployments) return false;
  const deployment = deployments.deployments[environment];
  return deployment?.status === 'failed';
}
```

### Duplicate Suppression

```typescript
// In-memory map: `${ruleId}_${projectId}` → last fired timestamp
const suppressionMap = new Map<string, number>();
const SUPPRESSION_WINDOW = 30 * 60 * 1000; // 30 minutes

function shouldSuppress(ruleId: string, projectId: number): boolean {
  const key = `${ruleId}_${projectId}`;
  const lastFired = suppressionMap.get(key);
  if (lastFired && Date.now() - lastFired < SUPPRESSION_WINDOW) {
    return true; // Suppress
  }
  suppressionMap.set(key, Date.now());
  return false;
}
```

### Browser Notification

```typescript
function sendBrowserNotification(entry: NotificationEntry): void {
  if (Notification.permission !== 'granted') return;

  const notification = new Notification(entry.ruleName, {
    body: `${entry.projectName}: ${entry.message}`,
    icon: '/favicon.ico',
    tag: `${entry.ruleId}_${entry.projectId}`,  // Replaces existing notification with same tag
    requireInteraction: false,
  });

  notification.onclick = () => {
    window.focus();
    window.location.hash = `#project/${entry.projectId}`;
    notification.close();
  };
}
```

## API Integration Points

No new API calls. Rule evaluation uses:
- `Project.metrics.mainBranchPipeline.status` — already fetched
- `Project.metrics.codeCoverage.coverage` — already fetched
- `Project.metrics.durationSpikePercent` — already computed
- `DeploymentsByEnv` from deployment cache — already fetched

## UI/UX Design Notes

### Notification Bell Placement
- Top-right of the dashboard header, next to dark mode toggle
- Badge shows unread count (red circle with white number)
- Dropdown opens below bell, max-height scrollable

### Settings Integration
- Collapsible "Notifications" section in ControlPanel
- Or a gear icon next to the bell that opens NotificationSettings as a side panel
- Keep it discoverable but not cluttering the main control flow

### Permission Flow
1. User enables notifications toggle → `Notification.requestPermission()` fires
2. Browser shows native permission dialog
3. If granted → toggle stays on, "Permission granted ✓" shown
4. If denied → toggle turns off, "Permission denied — enable in browser settings" shown with instructions
5. If previously granted → toggle just enables/disables the evaluation engine

## Dark Mode Considerations

- Bell icon uses light colour in dark mode
- History dropdown has dark background
- Rule list and form use dark-mode form styles
- Permission status badges use appropriate contrast

## Error Handling

- `Notification` API not supported: hide feature entirely, show "Notifications not supported in this browser"
- Permission denied: clearly indicate denial and provide help text
- localStorage full: notification history trimmed to last 25 entries
- Rule evaluation errors: log to console, don't break data refresh cycle
- malformed rules in localStorage: gracefully ignore and reset to empty array
