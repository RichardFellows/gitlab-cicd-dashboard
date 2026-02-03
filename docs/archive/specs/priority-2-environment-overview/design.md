# Design: Environment Overview (Priority 2)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                            App.tsx                                   │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ ViewType selector: TABLE | CARD | ENVIRONMENT                  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│              ┌───────────────┼───────────────┐                      │
│              ▼               ▼               ▼                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐        │
│  │  TableView   │  │   CardView   │  │ EnvironmentMatrix  │        │
│  │              │  │              │  │                    │        │
│  │ (existing)   │  │ (existing)   │  │ - Matrix grid      │        │
│  │              │  │              │  │ - DeploymentCell   │        │
│  │              │  │              │  │ - ExpandedDetails  │        │
│  └──────────────┘  └──────────────┘  └────────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     DashboardDataService.ts                          │
│                                                                      │
│  NEW METHODS:                                                        │
│  - getProjectDeployments(projectId): DeploymentsByEnv               │
│  - parseDeployJobName(jobName): string | null                       │
│  - extractJiraKey(branchName): string | null                        │
└─────────────────────────────────────────────────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      GitLabApiService.ts                             │
│                                                                      │
│  NEW METHODS:                                                        │
│  - getProjectJobs(projectId, options): Job[]                        │
│  - getJobArtifact(projectId, jobId, path): any                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **User selects Environment view** → ViewType changes to ENVIRONMENT
2. **EnvironmentMatrixView renders** → Uses existing `metrics.projects` for project list
3. **On-demand loading** → When project row visible, fetch deploy jobs
4. **Parse deploy jobs** → Extract environment from job name via regex
5. **Fetch artifact** → Get `deploy-info.json` for version number
6. **Render cell** → Show version + status indicator
7. **Click to expand** → Show full deployment details inline

## Type Definitions

```typescript
// src/types/index.ts - additions

// Environment names (standard set)
export type EnvironmentName = 'dev' | 'sit' | 'uat' | 'prod';

// Standard environment order for display
export const ENVIRONMENT_ORDER: EnvironmentName[] = ['dev', 'sit', 'uat', 'prod'];

// Deployment info extracted from job + artifact
export interface Deployment {
  jobId: number;
  jobName: string;
  environment: EnvironmentName;
  version: string | null;        // From deploy-info.json or fallback to pipeline IID
  status: 'success' | 'failed' | 'running' | 'pending';
  timestamp: string;             // finished_at or created_at
  pipelineId: number;
  pipelineRef: string;           // Branch name
  jobUrl: string;
  pipelineUrl?: string;
  commitSha?: string;
  jiraKey?: string | null;       // Extracted from branch name
}

// Deployments grouped by environment for a project
export interface DeploymentsByEnv {
  projectId: number;
  deployments: Partial<Record<EnvironmentName, Deployment>>;
  loading: boolean;
  error?: string;
}

// Deploy artifact schema (what we write in CI)
export interface DeployInfoArtifact {
  version: string;
  // Future: could add more fields
}

// Add to ViewType enum
export enum ViewType {
  CARD = 'card',
  TABLE = 'table',
  ENVIRONMENT = 'environment'  // NEW
}
```

## Component Design

### EnvironmentMatrixView.tsx

Main container component for the environment matrix view.

```typescript
interface EnvironmentMatrixViewProps {
  projects: Project[];
  gitLabService: GitLabApiService;
  darkMode?: boolean;
  jiraBaseUrl?: string;  // Optional, from config
}
```

**Responsibilities:**
- Render header row with environment columns
- Render project rows with DeploymentCell per environment
- Manage loading state per project
- Handle expand/collapse of detail panels

### DeploymentCell.tsx

Individual cell showing deployment status for one project+environment.

```typescript
interface DeploymentCellProps {
  deployment: Deployment | null;
  loading: boolean;
  onClick: () => void;
  isExpanded: boolean;
}
```

**Display logic:**
- `null` deployment + not loading → Show "-"
- `loading` → Show spinner
- `deployment.status === 'success'` → Green indicator + version
- `deployment.status === 'failed'` → Red indicator + version

### DeploymentDetails.tsx

Expanded detail panel shown when cell is clicked.

```typescript
interface DeploymentDetailsProps {
  deployment: Deployment;
  jiraBaseUrl?: string;
}
```

**Displays:**
- Version (large)
- Status badge
- Timestamp (relative + absolute)
- Branch name with link to MR/branch
- JIRA link (if key extracted and base URL configured)
- Link to GitLab job

## Service Methods

### GitLabApiService.ts

```typescript
/**
 * Get jobs for a project, optionally filtered by scope
 */
async getProjectJobs(
  projectId: number, 
  options?: { 
    scope?: string[],  // e.g., ['success', 'failed']
    per_page?: number 
  }
): Promise<Job[]>

/**
 * Get a specific artifact file from a job
 * Returns parsed JSON or null if not found
 */
async getJobArtifact<T>(
  projectId: number, 
  jobId: number, 
  artifactPath: string
): Promise<T | null>
```

### DashboardDataService.ts

```typescript
// Regex for identifying deploy jobs and extracting environment
const DEPLOY_JOB_REGEX = /deploy.*?(dev|sit|uat|prod)/i;

/**
 * Parse job name to extract environment
 * Returns null if not a deploy job
 */
parseDeployJobName(jobName: string): EnvironmentName | null

/**
 * Extract JIRA key from branch name
 * e.g., "feature/JIRA-123-description" → "JIRA-123"
 */
extractJiraKey(branchName: string): string | null

/**
 * Get latest deployment per environment for a project
 * Fetches jobs, filters to deploy jobs, gets artifacts for version
 */
async getProjectDeployments(projectId: number): Promise<DeploymentsByEnv>
```

## State Management

In App.tsx, add:

```typescript
// Cache of deployment data per project
const [deploymentCache, setDeploymentCache] = useState<Map<number, DeploymentsByEnv>>(new Map());

// Function to fetch deployments for a project (called on-demand)
const fetchProjectDeployments = async (projectId: number) => {
  if (deploymentCache.has(projectId)) return;
  
  setDeploymentCache(prev => new Map(prev).set(projectId, { 
    projectId, 
    deployments: {}, 
    loading: true 
  }));
  
  try {
    const data = await dashboardService.getProjectDeployments(projectId);
    setDeploymentCache(prev => new Map(prev).set(projectId, data));
  } catch (error) {
    setDeploymentCache(prev => new Map(prev).set(projectId, { 
      projectId, 
      deployments: {}, 
      loading: false, 
      error: String(error) 
    }));
  }
};
```

## JIRA Configuration

Add to DashboardConfig:

```typescript
export interface DashboardConfig {
  // ... existing fields
  jiraBaseUrl?: string;  // e.g., "https://jira.company.com/browse"
}
```

Add input field in ControlPanel (optional, collapsible "Integrations" section).

## CSS / Styling

Follow existing patterns in `styles/index.css`:

```css
/* Environment Matrix View */
.environment-matrix { }
.environment-matrix-header { }
.environment-matrix-row { }
.deployment-cell { }
.deployment-cell--success { }
.deployment-cell--failed { }
.deployment-cell--empty { }
.deployment-cell--loading { }
.deployment-details { }
.deployment-details__version { }
.deployment-details__meta { }
```

Support dark mode via `.dark-mode` parent selector.

## API Considerations

### Rate Limits
- Jobs API: One call per project (paginated if needed)
- Artifacts API: One call per deploy job with artifact
- Mitigation: On-demand loading, caching

### Error Handling
- 404 on artifact → Fall back to pipeline IID as version
- Jobs API failure → Show error state in row
- Partial failures → Show what we can, indicate errors

## Testing Strategy

### Unit Tests
- `parseDeployJobName()` with various job name formats
- `extractJiraKey()` with various branch name formats
- `getProjectDeployments()` with mocked API responses

### Component Tests
- EnvironmentMatrixView renders project rows
- DeploymentCell shows correct status indicators
- DeploymentDetails expands with full info
- Loading states displayed correctly

### E2E Tests
- View switching to Environment view
- Expand/collapse deployment details
- (Would need test GitLab group with deploy jobs for full E2E)
