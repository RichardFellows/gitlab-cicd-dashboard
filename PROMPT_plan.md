# Planning Mode - Gap Analysis for New Features

You are analyzing the GitLab CI/CD Dashboard to generate implementation tasks for 10 new features.

## Task Management

Tasks are stored in `tasks.ndjson`. Use these commands:

```bash
./tasks.sh add "title" --spec specs/file.md --priority high
./tasks.sh list                    # See existing tasks
./tasks.sh pending                 # Count pending tasks
```

**Priority levels:** high, medium, low

## Phase 0: Orient

0a. Study ALL specs in `specs/01-*` through `specs/10-*`:
    - Each has `requirements.md`, `design.md`, and `tasks.md`
    - The `tasks.md` files contain pre-planned implementation tasks with complexity estimates (S/M/L/XL)
0b. Run `./tasks.sh list` to see any existing tasks.
0c. Study `src/` to understand what's already implemented — especially:
    - `src/types/index.ts` — existing types
    - `src/services/DashboardDataService.ts` — existing data service
    - `src/services/GitLabApiService.ts` — existing API service
    - `src/components/` — existing component patterns
    - `src/utils/constants.ts` — existing constants
    - `src/App.tsx` — main app orchestration

## Phase 1: Gap Analysis

For each of the 10 feature specs, compare the requirements against existing code.

**IMPORTANT: Search the codebase before assuming something is missing.**

For each gap found, create a task:

```bash
./tasks.sh add "Add HealthScore type to types/index.ts" --spec specs/01-health-score/design.md --priority high
./tasks.sh add "Create HealthScoreBadge component" --spec specs/01-health-score/tasks.md --priority medium
```

### Task Granularity
Each task should be completable in **one Ralph iteration** (one Claude session). That means:
- One file or small set of related files
- One logical unit of work
- Should be testable independently

### Priority Guidelines
- **high**: Foundation work (types, services, utilities) that other tasks depend on
- **high**: Features 1, 3, 5 (Health Score, Saved Configs, Auto-Refresh — high value, no new API calls)
- **medium**: Features 2, 7, 8 (Comparison View, MR Board, Timeline — medium complexity)
- **medium**: Features 4, 6 (Notifications, Failure Diagnosis — new API calls needed)
- **low**: Features 9, 10 (Keyboard Shortcuts, Export — polish/nice-to-have)

### Task Ordering Within Features
Follow the pattern from the `tasks.md` files:
1. Setup (types, constants, storage keys)
2. Core implementation (services, utilities)
3. UI components
4. Tests
5. Integration & polish

## Phase 2: Cross-Feature Dependencies

Identify shared work that benefits multiple features:
- New utility functions used by multiple features
- Shared types or interfaces
- Common UI patterns (e.g., loading skeletons, error boundaries)
- Architecture improvements (e.g., API rate limiting helps all features)

Create these as standalone high-priority tasks.

## Phase 3: Architecture Tasks

From the architecture observations in the feature specs overview, also create tasks for:
- Debug logging flag (replace verbose console.log)
- Legacy JS file cleanup
- React Error Boundary
- API request queuing/throttling
- Loading skeleton components
- GitLabApiService unit tests

These should be **medium** priority — they improve quality but aren't features.

## Guardrails

99. IMPORTANT: Plan only. Do NOT implement anything.
999. Do NOT assume functionality is missing — search the codebase first.
9999. Each task should be small enough to complete in one iteration.
99999. Link tasks to specs using `--spec specs/<feature>/file.md`.
999999. Use the pre-planned tasks from each feature's `tasks.md` as your guide — don't reinvent, adapt them for the NDJSON format.

## Completion

When gap analysis is complete:

```bash
./tasks.sh pending   # Should show total tasks created
./tasks.sh export    # Show markdown summary
```

Then report the total task count, breakdown by priority, and estimated build iterations needed.
