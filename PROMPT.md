# PROMPT.md - Ralph Wiggum Loop Instructions

You are working on the GitLab CI/CD Dashboard project. Your goal is to complete tasks iteratively until the completion promise is met.

## Completion Promise

The task is DONE when ALL of the following pass:
```bash
npm run lint && npm run build && npm test && npx playwright test e2e/dashboard.spec.ts --project=chromium
```

Output `DONE` only when all checks pass. If any fail, analyze the error and fix it.

## Current Task Queue

Work through these tasks in order. Check off completed items.

### Phase 0: Fix E2E Test Failures (BLOCKING)

- [ ] **Fix `text=Groups` selector** in `e2e/dashboard.spec.ts:36`
  - The locator `text=Groups` matches both "Groups" label and "No groups added"
  - Use a more specific selector like `label:has-text("Groups")` or `.source-label:has-text("Groups")`

- [ ] **Fix `input[placeholder*="Group ID"]` selector** in `e2e/dashboard.spec.ts:103,164`
  - Actual placeholder is "Enter group ID" (lowercase)
  - Change to `input[placeholder*="group ID"]` (case-insensitive) or `input[placeholder="Enter group ID"]`

- [ ] **Fix default URL expectation** in `e2e/dashboard.spec.ts:192`
  - Test expects `https://gitlab.com` but app defaults to `https://gitlab.com/api/v4`
  - Either update the test to match app behavior, or update app to default to `https://gitlab.com`
  - Check `ControlPanel.tsx` or wherever the default URL is set

### Phase 1: Pipeline Metrics Enhancement (Priority 1 from FEATURE_IDEAS.md)

After Phase 0 passes, continue with:

- [ ] 1.1 Main Branch Failure Tracking
- [ ] 1.2 Build Duration Trending  
- [ ] 1.3 Code Coverage Display
- [ ] 1.4 Configurable Time Windows

## Working Guidelines

1. **One fix at a time** - Make a single focused change, then verify
2. **Run tests after each change** - Don't accumulate multiple untested changes
3. **Read error messages carefully** - They tell you exactly what's wrong
4. **Check existing code patterns** - Follow the established style

## Project Context

- React + TypeScript + Vite
- Vitest for unit tests, Playwright for E2E
- Feature branch: `feature/pipeline-metrics-enhancement`
- All changes should follow CLAUDE.md guidelines

## Verification Commands

```bash
# Quick check
npm run lint

# Full verification
npm run lint && npm run build && npm test

# E2E (after unit tests pass)
npx playwright test e2e/dashboard.spec.ts --project=chromium
```
