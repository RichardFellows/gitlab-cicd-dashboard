# PROMPT.md - Ralph Wiggum Loop Instructions

You are working on the GitLab CI/CD Dashboard project. Your goal is to complete tasks iteratively until the completion promise is met.

## Completion Promise

The task is DONE when ALL of the following pass:
```bash
npm run lint && npm run build && npm test && npx playwright test --project=chromium
```

Output `DONE` only when all checks pass. If any fail, analyze the error and fix it.

## Current Task Queue

Work through these tasks in order. Refer to `specs/priority-3-promotion-readiness/` for detailed requirements, design, and task breakdown.

### Phase 1: API Layer

- [ ] **T1.1** Add `getMergeRequestByBranch()` to GitLabApiService
- [ ] **T1.2** Add `getMergeRequestNotes()` to GitLabApiService
- [ ] **T1.3** Add `getRepositoryFile()` to GitLabApiService
- [ ] **T1.4** Add unit tests for new API methods

### Phase 2: Sign-off Parsing

- [ ] **T2.1** Add sign-off types to `src/types/index.ts`
- [ ] **T2.2** Add `SIGNOFF_REGEX` to `src/utils/constants.ts`
- [ ] **T2.3** Add `parseSignoffComment()` to DashboardDataService
- [ ] **T2.4** Add `parseCodeowners()` to DashboardDataService
- [ ] **T2.5** Add `getCodeowners()` to DashboardDataService
- [ ] **T2.6** Add `getMRSignoffs()` to DashboardDataService
- [ ] **T2.7** Add unit tests for parsing methods

### Phase 3: Readiness Calculation

- [ ] **T3.1** Add `getPostDeployTestStatus()` to DashboardDataService
- [ ] **T3.2** Add `calculateReadinessStatus()` to DashboardDataService
- [ ] **T3.3** Add `getProjectReadiness()` to DashboardDataService
- [ ] **T3.4** Add unit tests for readiness calculation

### Phase 4: UI Components

- [ ] **T4.1** Add `READINESS` to `ViewType` enum
- [ ] **T4.2** Create `ReadinessFilter.tsx` component
- [ ] **T4.3** Create `ReadinessRow.tsx` component
- [ ] **T4.4** Create `ReadinessDetails.tsx` component
- [ ] **T4.5** Create `ReadinessView.tsx` component
- [ ] **T4.6** Add component tests

### Phase 5: Integration

- [ ] **T5.1** Add view type toggle for Readiness view
- [ ] **T5.2** Wire ReadinessView into App.tsx
- [ ] **T5.3** Add CSS styles for readiness components
- [ ] **T5.4** Update E2E tests

### Phase 6: Polish

- [ ] **T6.1** Handle edge cases
- [ ] **T6.2** Caching and performance
- [ ] **T6.3** Error handling
- [ ] **T6.4** UX improvements

## Working Guidelines

1. **Read the spec first** - Check `specs/priority-3-promotion-readiness/` for requirements and design
2. **One task at a time** - Make a single focused change, then verify
3. **Run tests after each change** - Don't accumulate multiple untested changes
4. **Check existing code patterns** - Follow established style (especially Priority 2 components)

## Project Context

- React + TypeScript + Vite
- Vitest for unit tests, Playwright for E2E
- Feature branch: `feature/promotion-readiness`
- Depends on Priority 2 (Environment Overview) - reuse deployment types and services

## Key Files

- `specs/priority-3-promotion-readiness/` - Full specification
- `src/services/GitLabApiService.ts` - API layer
- `src/services/DashboardDataService.ts` - Business logic
- `src/types/index.ts` - Type definitions
- `src/components/EnvironmentMatrixView.tsx` - Reference for similar component patterns

## Verification Commands

```bash
# Quick check
npm run lint

# Full verification  
npm run lint && npm run build && npm test

# E2E
npx playwright test --project=chromium

# Full completion promise
npm run lint && npm run build && npm test && npx playwright test --project=chromium
```
