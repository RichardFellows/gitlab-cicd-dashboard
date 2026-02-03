# Tasks: Automatic Release Notes & Versioning

## Task Breakdown

This is primarily configuration work, not code. Tasks are ordered for safe incremental setup.

---

### Phase 1: Dependencies & Configuration

- [ ] **T1.1** Install semantic-release dependencies
  ```bash
  npm install -D semantic-release @semantic-release/commit-analyzer \
    @semantic-release/release-notes-generator @semantic-release/gitlab
  ```

- [ ] **T1.2** Create `.releaserc.json` configuration file
  - Configure branches: `["main"]`
  - Configure tag format: `v${version}`
  - Configure commit-analyzer with conventional commits
  - Configure release-notes-generator with type sections
  - Configure gitlab plugin

- [ ] **T1.3** Create initial version tag
  ```bash
  git tag v1.0.0
  git push origin v1.0.0
  ```

**Verification:** `cat .releaserc.json` shows valid config, `git tag` shows v1.0.0

---

### Phase 2: GitLab CI Integration

- [ ] **T2.1** Add `release` stage to `.gitlab-ci.yml`
  - Add to stages list
  - Create release job with node:20 image
  - Run only on main branch
  - Run `npx semantic-release`

- [ ] **T2.2** Document GL_TOKEN setup
  - Add instructions to README or CLAUDE.md
  - Specify required scopes: `api`, `write_repository`

**Verification:** Pipeline config is valid: `gitlab-ci-lint .gitlab-ci.yml` or push and check

---

### Phase 3: Token Setup (Manual)

> ⚠️ This phase requires manual action in GitLab UI

- [ ] **T3.1** Create Project Access Token
  - GitLab → Settings → Access Tokens
  - Name: `semantic-release`
  - Role: Maintainer
  - Scopes: `api`, `write_repository`
  - Expiration: Set appropriate date

- [ ] **T3.2** Add GL_TOKEN CI variable
  - GitLab → Settings → CI/CD → Variables
  - Key: `GL_TOKEN`
  - Value: (token from T3.1)
  - Protected: Yes
  - Masked: Yes

**Verification:** Variable visible in CI/CD settings (value masked)

---

### Phase 4: Testing

- [ ] **T4.1** Test dry run locally
  ```bash
  GL_TOKEN=xxx npx semantic-release --dry-run
  ```
  - Should show "no release" if no new commits since tag

- [ ] **T4.2** Create test commit and merge
  - Create branch with `feat(test): add test feature` commit
  - Merge to main
  - Watch pipeline run release stage

- [ ] **T4.3** Verify GitLab Release created
  - Check Releases page for v1.1.0 (or appropriate version)
  - Verify release notes content
  - Verify tag created

**Verification:** GitLab Release exists with proper notes

---

### Phase 5: Documentation

- [ ] **T5.1** Update CLAUDE.md with release process
  - Document conventional commit format
  - Document how releases are triggered
  - Document how to check release status

- [ ] **T5.2** Create reusable template
  - Document steps to add to new project
  - List files to copy
  - List CI variables to set

- [ ] **T5.3** Update README.md
  - Add "Releases" section
  - Link to conventional commits spec
  - Explain version bump rules

**Verification:** Documentation is clear and complete

---

### Phase 6: Optional Enhancements

- [ ] **T6.1** Add commitlint for commit message validation (optional)
  - Install `@commitlint/cli` and `@commitlint/config-conventional`
  - Create `commitlint.config.js`
  - Add CI job to validate MR commits

- [ ] **T6.2** Add CHANGELOG.md generation (optional)
  - Add `@semantic-release/changelog` plugin
  - Add `@semantic-release/git` to commit changelog
  - Update `.releaserc.json`

**Verification:** Commitlint runs on MRs, CHANGELOG.md updates on release

---

## Completion Criteria

Feature is complete when:
1. Merging a `feat:` commit to main creates a MINOR release
2. Merging a `fix:` commit to main creates a PATCH release
3. GitLab Release is created with proper notes
4. Documentation exists for reuse

## Manual Steps Required

- T3.1: Create access token in GitLab UI
- T3.2: Add CI variable in GitLab UI

These cannot be automated and must be done by a user with Maintainer access.

## Files Created/Modified

| File | Action |
|------|--------|
| `package.json` | Add devDependencies |
| `.releaserc.json` | Create (new) |
| `.gitlab-ci.yml` | Add release stage |
| `CLAUDE.md` | Add release docs |
| `README.md` | Add releases section |
