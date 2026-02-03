# Design: Promotion Readiness (Priority 3)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                            App.tsx                                   │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ ViewType: TABLE | CARD | ENVIRONMENT | READINESS               │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│              ┌───────────────┼───────────────┬───────────────┐      │
│              ▼               ▼               ▼               ▼      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  ┌────────────┐│
│  │  TableView   │  │ Environment  │  │ Readiness  │  │  CardView  ││
│  │  (existing)  │  │ Matrix (P2)  │  │   View     │  │ (existing) ││
│  │              │  │              │  │            │  │            ││
│  │              │  │              │  │ - Filter   │  │            ││
│  │              │  │              │  │ - List     │  │            ││
│  │              │  │              │  │ - Details  │  │            ││
│  └──────────────┘  └──────────────┘  └────────────┘  └────────────┘│
└─────────────────────────────────────────────────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     DashboardDataService.ts                          │
│                                                                      │
│  NEW METHODS:                                                        │
│  - getProjectReadiness(projectId): VersionReadiness[]               │
│  - getMRForBranch(projectId, branch): MergeRequest | null           │
│  - getMRSignoffs(projectId, mrIid): Signoff[]                       │
│  - getCodeowners(projectId): string[]                               │
│  - parseSignoffComment(body): ParsedSignoff | null                  │
│  - getPostDeployTestStatus(projectId, pipelineId): TestStatus       │
└─────────────────────────────────────────────────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      GitLabApiService.ts                             │
│                                                                      │
│  NEW METHODS:                                                        │
│  - getMergeRequestByBranch(projectId, branch): MergeRequest | null  │
│  - getMergeRequestNotes(projectId, mrIid): Note[]                   │
│  - getRepositoryFile(projectId, path, ref): FileContent | null      │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **User selects Readiness view** → ViewType changes to READINESS
2. **Load projects** → Use existing project list from metrics
3. **For each project:**
   a. Get deployments (from Priority 2 cache or fetch)
   b. For each deployment, find MR by branch name
   c. Fetch MR notes, parse for sign-offs
   d. Fetch CODEOWNERS, validate sign-off authors
   e. Check post-deploy stage for test status
4. **Render readiness list** → Show version + environment + status
5. **Filter/sort** → By project, environment, readiness state

## Type Definitions

```typescript
// src/types/index.ts - additions

// Sign-off parsed from MR comment
export interface Signoff {
  version: string;
  environment: EnvironmentName;
  author: string;           // GitLab username
  authorizedBy: string;     // CODEOWNERS match (if valid)
  timestamp: string;        // Comment created_at
  noteId: number;           // MR note ID for linking
  mrIid: number;            // MR IID
  isValid: boolean;         // Author in CODEOWNERS?
}

// Post-deploy test status
export interface PostDeployTestStatus {
  exists: boolean;          // Are there post-deploy jobs?
  passed: boolean | null;   // null if no tests
  jobId?: number;
  jobUrl?: string;
  jobName?: string;
}

// Readiness status enum
export type ReadinessStatus = 
  | 'ready'           // Deployed + signed off + tests passed (or no tests)
  | 'pending-signoff' // Deployed + tests passed, awaiting sign-off
  | 'tests-failed'    // Deployed but post-deploy tests failed
  | 'not-deployed';   // Not deployed to this environment

// Version readiness for an environment
export interface VersionReadiness {
  projectId: number;
  projectName: string;
  version: string;
  environment: EnvironmentName;
  deployment: Deployment | null;        // From Priority 2
  signoff: Signoff | null;              // Parsed from MR
  testStatus: PostDeployTestStatus;
  status: ReadinessStatus;
  mr?: {
    iid: number;
    webUrl: string;
    title: string;
  };
}

// Parsed sign-off from regex
export interface ParsedSignoff {
  version: string;
  environment: EnvironmentName;
}

// MR Note from GitLab API
export interface MRNote {
  id: number;
  body: string;
  author: {
    id: number;
    username: string;
    name: string;
  };
  created_at: string;
  system: boolean;          // Filter out system notes
}

// Add to ViewType enum
export enum ViewType {
  CARD = 'card',
  TABLE = 'table',
  ENVIRONMENT = 'environment',
  READINESS = 'readiness'    // NEW
}
```

## Component Design

### ReadinessView.tsx

Main container for the readiness view.

```typescript
interface ReadinessViewProps {
  projects: Project[];
  deploymentCache: Map<number, DeploymentsByEnv>;
  gitLabService: GitLabApiService;
  dashboardService: DashboardDataService;
  darkMode?: boolean;
}
```

**Responsibilities:**
- Filter bar (project, environment, status)
- Fetch readiness data on-demand
- Render ReadinessTable or ReadinessCards
- Handle loading states

### ReadinessFilter.tsx

Filter controls for the readiness view.

```typescript
interface ReadinessFilterProps {
  projects: Project[];
  selectedProject: number | null;
  selectedEnvironment: EnvironmentName | null;
  selectedStatus: ReadinessStatus | 'all';
  onChange: (filters: ReadinessFilters) => void;
}
```

### ReadinessRow.tsx

Single row showing version readiness.

```typescript
interface ReadinessRowProps {
  readiness: VersionReadiness;
  onExpand: () => void;
  isExpanded: boolean;
}
```

**Display:**
- Project name
- Version
- Environment badge
- Status indicator (icon + color)
- Sign-off info (who, when) or "Pending"
- Test status badge
- Expand for details

### ReadinessDetails.tsx

Expanded details panel.

```typescript
interface ReadinessDetailsProps {
  readiness: VersionReadiness;
  jiraBaseUrl?: string;
}
```

**Shows:**
- Full deployment info (timestamp, pipeline link)
- MR link and title
- Sign-off details (author, timestamp, comment link)
- Test job link and status
- What's blocking (if not ready)

## Service Methods

### GitLabApiService.ts

```typescript
/**
 * Find MR by source branch
 */
async getMergeRequestByBranch(
  projectId: number,
  branch: string
): Promise<MergeRequest | null>

/**
 * Get notes/comments on an MR
 */
async getMergeRequestNotes(
  projectId: number,
  mrIid: number
): Promise<MRNote[]>

/**
 * Get file content from repository
 */
async getRepositoryFile(
  projectId: number,
  filePath: string,
  ref: string = 'HEAD'
): Promise<{ content: string } | null>
```

### DashboardDataService.ts

```typescript
// Regex patterns
const SIGNOFF_REGEX = /^SIGNOFF:\s*v?([\d.]+)\s+(DEV|SIT|UAT|PROD)\s*$/im;
const CODEOWNERS_USER_REGEX = /@([\w-]+)/g;

/**
 * Parse a comment body for sign-off
 */
parseSignoffComment(body: string): ParsedSignoff | null

/**
 * Parse CODEOWNERS file content
 */
parseCodeowners(content: string): string[]

/**
 * Get CODEOWNERS usernames for a project (cached)
 */
async getCodeowners(projectId: number): Promise<string[]>

/**
 * Get sign-offs from MR comments
 */
async getMRSignoffs(
  projectId: number,
  mrIid: number,
  codeowners: string[]
): Promise<Signoff[]>

/**
 * Get post-deploy test status from pipeline
 */
async getPostDeployTestStatus(
  projectId: number,
  pipelineId: number
): Promise<PostDeployTestStatus>

/**
 * Calculate readiness status
 */
calculateReadinessStatus(
  deployment: Deployment | null,
  signoff: Signoff | null,
  testStatus: PostDeployTestStatus
): ReadinessStatus

/**
 * Get full readiness data for a project
 */
async getProjectReadiness(projectId: number): Promise<VersionReadiness[]>
```

## Caching Strategy

```typescript
// In App.tsx or a dedicated cache
interface ReadinessCache {
  codeowners: Map<number, string[]>;           // projectId → usernames
  mrByBranch: Map<string, MergeRequest | null>; // "projectId:branch" → MR
  signoffs: Map<string, Signoff[]>;            // "projectId:mrIid" → signoffs
}
```

Cache invalidation: Manual refresh button or time-based (5 min).

## Readiness Logic

```typescript
function calculateReadinessStatus(
  deployment: Deployment | null,
  signoff: Signoff | null,
  testStatus: PostDeployTestStatus
): ReadinessStatus {
  if (!deployment) {
    return 'not-deployed';
  }
  
  // If tests exist, they must pass
  if (testStatus.exists && !testStatus.passed) {
    return 'tests-failed';
  }
  
  // Need valid sign-off
  if (!signoff || !signoff.isValid) {
    return 'pending-signoff';
  }
  
  return 'ready';
}
```

## CSS / Styling

```css
/* Readiness View */
.readiness-view { }
.readiness-filter { }
.readiness-table { }
.readiness-row { }
.readiness-row--ready { }
.readiness-row--pending { }
.readiness-row--failed { }
.readiness-status-badge { }
.readiness-status-badge--ready { color: green; }
.readiness-status-badge--pending { color: orange; }
.readiness-status-badge--failed { color: red; }
.readiness-details { }
```

## Testing Strategy

### Unit Tests
- `parseSignoffComment()` with valid/invalid formats
- `parseCodeowners()` with various CODEOWNERS formats
- `calculateReadinessStatus()` all state combinations
- `getMRSignoffs()` filtering and validation

### Component Tests
- ReadinessView renders filter and list
- ReadinessRow shows correct status indicators
- ReadinessDetails shows all fields
- Filter changes update displayed items

### E2E Tests
- Switch to Readiness view
- Filter by project/environment/status
- Expand row to see details
