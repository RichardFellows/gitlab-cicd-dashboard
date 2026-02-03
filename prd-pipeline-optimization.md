# PRD: GitLab CI/CD Pipeline Optimization

## Overview
Optimize the GitLab CI/CD pipeline to reduce build times by eliminating redundant `npm ci` calls across jobs. Currently each job runs `npm ci` independently, adding ~3-4 minutes overhead per job.

## Goals
1. Run `npm ci` once per pipeline, reuse across all jobs
2. Reduce total pipeline time from ~43 minutes to ~25 minutes
3. Maintain existing functionality and test coverage

## Current State
- 6 jobs, each running `npm ci`: test, lint, build, deploy, post-deploy-test, e2e-test
- Cache configured but not effectively preventing redundant installs
- Total pipeline time: ~43 minutes

## Target State
- Single `install` job in `.pre` stage runs `npm ci`
- All downstream jobs use `node_modules/` artifact from install job
- No job runs `npm ci` except the install job

---

## User Stories

### US-001: Add Install Job
**Priority**: P1

Add a dedicated `install` job in the `.pre` stage that:
- Runs `npm ci` to install dependencies
- Creates artifact with `node_modules/` directory
- Artifact expires in 1 hour (sufficient for pipeline lifetime)
- Uses `package-lock.json` as cache key for optimal caching

**Acceptance Criteria:**
- [ ] New `install` job added to `.pre` stage
- [ ] Job runs `npm ci` successfully
- [ ] `node_modules/` exported as artifact
- [ ] Artifact has 1 hour expiry
- [ ] Cache key uses `package-lock.json` hash

### US-002: Update Test Job
**Priority**: P1

Update the `test` job to:
- Depend on `install` job via `needs: [install]`
- Remove the `npm ci` / `*install_dependencies` call
- Use node_modules from artifact

**Acceptance Criteria:**
- [ ] `test` job has `needs: [install]`
- [ ] No `npm ci` or `*install_dependencies` in script
- [ ] Job runs successfully with artifact dependencies

### US-003: Update Lint Job
**Priority**: P1

Update the `lint` job to:
- Depend on `install` job via `needs: [install]`
- Remove the `npm ci` / `*install_dependencies` call
- Use node_modules from artifact

**Acceptance Criteria:**
- [ ] `lint` job has `needs: [install]`
- [ ] No `npm ci` or `*install_dependencies` in script
- [ ] Job runs successfully with artifact dependencies

### US-004: Update Build Job
**Priority**: P1

Update the `build` job to:
- Depend on `install` job via `needs: [install]`
- Remove the `npm ci` / `*install_dependencies` call
- Keep existing `dist/` artifact output

**Acceptance Criteria:**
- [ ] `build` job has `needs: [install]`
- [ ] No `npm ci` or `*install_dependencies` in script
- [ ] `dist/` artifact still created
- [ ] Job runs successfully

### US-005: Update Post-Deploy-Test Job
**Priority**: P1

Update the `post-deploy-test` job to:
- Depend on both `install` and `deploy` jobs
- Remove the `npm ci` / `*install_dependencies` call

**Acceptance Criteria:**
- [ ] `post-deploy-test` job has `needs: [install, deploy]`
- [ ] No `npm ci` or `*install_dependencies` in script
- [ ] deploy.env artifact still accessible
- [ ] Job runs successfully

### US-006: Update E2E-Test Job
**Priority**: P1

Update the `e2e-test` job to:
- Depend on both `install` and `deploy` jobs
- Remove the `npm ci` call
- Keep Playwright image (has its own browser deps)

**Acceptance Criteria:**
- [ ] `e2e-test` job has `needs: [install, deploy]`
- [ ] No `npm ci` in script
- [ ] Playwright browsers still work
- [ ] Job runs successfully

### US-007: Update Release Job
**Priority**: P1

Update the `release` job to:
- Depend on `install` job
- Remove the `npm ci` / `*install_dependencies` call

**Acceptance Criteria:**
- [ ] `release` job has install in `needs` list
- [ ] No `npm ci` or `*install_dependencies` in script
- [ ] semantic-release still works
- [ ] Job runs successfully

### US-008: Remove Deprecated YAML Anchor
**Priority**: P2

Remove the `.install_dependencies` YAML anchor since it's no longer used.

**Acceptance Criteria:**
- [ ] `.install_dependencies` anchor removed from `.gitlab-ci.yml`
- [ ] No remaining references to `*install_dependencies`
- [ ] Pipeline YAML validates

### US-009: Validate Pipeline
**Priority**: P1

Verify the optimized pipeline works end-to-end:
- Run `glab ci lint` to validate syntax
- Check that all jobs are correctly configured
- Document expected time savings

**Acceptance Criteria:**
- [ ] `glab ci lint` passes
- [ ] All job dependencies are valid
- [ ] README or progress notes document the optimization
