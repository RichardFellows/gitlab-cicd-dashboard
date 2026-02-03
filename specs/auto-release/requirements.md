# Requirements: Automatic Release Notes & Versioning

## Business Context

Currently, releases and versioning are manual. We want:
- Automatic version bumps based on commit types
- Auto-generated release notes from commits and MR descriptions
- GitLab Releases with proper tags

This should be a reusable pattern across projects.

---

## User Stories

### 1. Automatic Version Bumping

**As a** developer  
**I want** the version to automatically increment on merge to main  
**So that** I don't have to manually manage version numbers

**Acceptance Criteria:**
- [ ] Version follows SemVer (MAJOR.MINOR.PATCH)
- [ ] Starting version: 1.0.0
- [ ] Bump logic based on conventional commits:
  - `fix:` → PATCH (1.0.0 → 1.0.1)
  - `feat:` → MINOR (1.0.0 → 1.1.0)
  - `BREAKING CHANGE:` in commit footer → MAJOR (1.0.0 → 2.0.0)
- [ ] Runs on every merge to main branch

---

### 2. Auto-Generated Release Notes

**As a** team member  
**I want** release notes generated from commits and MR descriptions  
**So that** changes are documented automatically

**Acceptance Criteria:**
- [ ] Group commits by type (Features, Bug Fixes, etc.)
- [ ] Include commit messages since last release
- [ ] Include MR titles/descriptions where relevant
- [ ] Link to commits and MRs in release notes

**Example output:**
```markdown
## [1.2.0] - 2026-01-26

### Features
- Add environment matrix view (#4)
- Add promotion readiness tracking (#5)

### Bug Fixes  
- Fix pipeline duration calculation (#3)
```

---

### 3. GitLab Release Creation

**As a** team  
**I want** releases published to GitLab Releases  
**So that** we have a clear release history with tags

**Acceptance Criteria:**
- [ ] Create Git tag for each release (e.g., `v1.2.0`)
- [ ] Create GitLab Release with release notes
- [ ] Link release to the triggering pipeline
- [ ] Release visible on project's Releases page

---

### 4. Reusable Pattern

**As a** developer with multiple projects  
**I want** this to be easily adoptable in other repos  
**So that** I can standardize release management

**Acceptance Criteria:**
- [ ] Configuration is minimal and documented
- [ ] Can be copied to other GitLab projects
- [ ] Works with standard GitLab CI
- [ ] No external services required (just GitLab + npm packages)

---

## Technical Notes

### Tooling: semantic-release

Use [semantic-release](https://semantic-release.gitbook.io/) with GitLab plugin:
- `@semantic-release/commit-analyzer` - determine version bump
- `@semantic-release/release-notes-generator` - generate changelog
- `@semantic-release/gitlab` - publish to GitLab Releases
- `@semantic-release/git` - commit version updates (optional)

### Conventional Commits

Format: `<type>(<scope>): <description>`

Types:
- `feat:` - New feature (MINOR)
- `fix:` - Bug fix (PATCH)
- `docs:` - Documentation only
- `style:` - Formatting, no code change
- `refactor:` - Code change, no feature/fix
- `perf:` - Performance improvement
- `test:` - Adding tests
- `chore:` - Maintenance

Breaking changes: Add `BREAKING CHANGE:` in commit footer → MAJOR bump

### GitLab CI Integration

```yaml
release:
  stage: release
  image: node:20
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
  script:
    - npm ci
    - npx semantic-release
```

### Authentication

Requires `GL_TOKEN` or `GITLAB_TOKEN` with:
- `api` scope
- `write_repository` scope (to push tags)

---

## Out of Scope (v1)

- CHANGELOG.md file generation (just GitLab Releases)
- npm/package publishing
- Multiple release branches (just main)
- Pre-release versions (alpha, beta)
