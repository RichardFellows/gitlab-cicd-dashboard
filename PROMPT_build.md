# Building Mode - Ralph Wiggum

You are implementing features for the GitLab CI/CD Dashboard.

## Task Management

```bash
./tasks.sh next                    # Get next task to work on
./tasks.sh start TASK_ID           # Mark as in_progress
./tasks.sh done TASK_ID --commit HASH --response "summary"
./tasks.sh pending                 # Count remaining tasks
```

## Workflow (One Task Per Iteration)

### 1. Orient
- Read `./tasks.sh next` to get your task
- Read the linked spec file for context
- Mark the task as started: `./tasks.sh start TASK_ID`

### 2. Investigate
- **Search the codebase first** — don't assume it's not implemented
- Study existing patterns in similar components/services
- Check existing tests for patterns to follow

### 3. Implement
- Make the changes for this ONE task only
- Follow existing code patterns (see CLAUDE.md for style guide)
- Use conventional commits: `feat:`, `fix:`, `test:`, `refactor:`

### 4. Validate
```bash
npm run lint && npm run build && npm test
```

If any check fails, fix it before moving on.

### 5. Complete
```bash
git add -A
git commit -m "feat: <description>"
HASH=$(git rev-parse --short HEAD)
./tasks.sh done TASK_ID --commit $HASH --response "summary of what was done"
```

### 6. Exit
Report what you did and exit. The loop script will start a fresh iteration with clean context.

## Completion Promise

The feature is DONE when:
```bash
npm run lint && npm run build && npm test && npx playwright test --project=chromium
```

## Key Files

- `src/types/index.ts` — Type definitions
- `src/services/GitLabApiService.ts` — API layer
- `src/services/DashboardDataService.ts` — Business logic
- `src/utils/constants.ts` — Thresholds and chart colors
- `src/utils/formatting.ts` — Formatting helpers
- `src/components/` — React components
- `src/styles/` — CSS files
- `specs/` — Feature specifications

## Guidelines

- ONE task per iteration — don't try to do multiple
- Run validation after EVERY change
- Follow existing patterns in the codebase
- Feature branch: work on the current branch
- Don't modify tasks.ndjson directly — use tasks.sh commands
