# PROMPT.md - Ralph Wiggum Loop Instructions

You are adding automatic release notes and versioning to the GitLab CI/CD Dashboard.

## Completion Promise

### Level 1: Local Verification
```bash
npm run lint && npm run build && npm test
```

### Level 2: CI Pipeline (Final)
The task is DONE when:
1. The branch is pushed and MR created
2. CI pipeline passes
3. After merging to main, a GitLab Release is created automatically

## Current Task Queue

Refer to `specs/auto-release/` for detailed requirements and design.

### Phase 1: Dependencies & Configuration

- [ ] **T1.1** Install semantic-release dependencies
- [ ] **T1.2** Create `.releaserc.json` configuration file
- [ ] **T1.3** Create initial version tag (v1.0.0)

### Phase 2: GitLab CI Integration

- [ ] **T2.1** Add `release` stage to `.gitlab-ci.yml`
- [ ] **T2.2** Document GL_TOKEN setup in CLAUDE.md

### Phase 3: Token Setup

- [x] **T3.1** GL_TOKEN CI variable already configured ✓

### Phase 4: Testing

- [ ] **T4.1** Test dry run locally (optional)
- [ ] **T4.2** Push branch and verify pipeline
- [ ] **T4.3** After merge, verify GitLab Release is created

### Phase 5: Documentation

- [ ] **T5.1** Update CLAUDE.md with release process
- [ ] **T5.2** Update README.md with releases section

## Working Guidelines

1. Read `specs/auto-release/design.md` for exact configuration
2. This is mostly config work, not code
3. Use conventional commit format for your commits
4. Test with `--dry-run` before pushing if possible

## Key Files

- `specs/auto-release/requirements.md` - What we're building
- `specs/auto-release/design.md` - Exact configuration to use
- `specs/auto-release/tasks.md` - Task breakdown
- `.releaserc.json` - semantic-release config (create this)
- `.gitlab-ci.yml` - Add release stage
- `package.json` - Add devDependencies

## Verification

```bash
# Local checks
npm run lint && npm run build && npm test

# Push and verify CI
git push -u origin feature/auto-release
glab ci status
```
