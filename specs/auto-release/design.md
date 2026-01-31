# Design: Automatic Release Notes & Versioning

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     GitLab CI Pipeline                          │
│                                                                 │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────────────┐ │
│  │  test   │ → │  build  │ → │ deploy  │ → │    release      │ │
│  │         │   │         │   │         │   │ (main only)     │ │
│  └─────────┘   └─────────┘   └─────────┘   └─────────────────┘ │
│                                                    │            │
└────────────────────────────────────────────────────│────────────┘
                                                     │
                                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    semantic-release                              │
│                                                                 │
│  1. Analyze commits since last tag                              │
│  2. Determine version bump (major/minor/patch)                  │
│  3. Generate release notes                                      │
│  4. Create Git tag                                              │
│  5. Publish GitLab Release                                      │
└─────────────────────────────────────────────────────────────────┘
                                                     │
                                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GitLab Releases                               │
│                                                                 │
│  Tag: v1.2.0                                                    │
│  Release Notes: Auto-generated markdown                         │
│  Links: Pipeline, Commits, MRs                                  │
└─────────────────────────────────────────────────────────────────┘
```

## semantic-release Configuration

### Package Dependencies

```json
{
  "devDependencies": {
    "semantic-release": "^24.0.0",
    "@semantic-release/commit-analyzer": "^13.0.0",
    "@semantic-release/release-notes-generator": "^14.0.0",
    "@semantic-release/gitlab": "^13.0.0",
    "@semantic-release/changelog": "^6.0.0",
    "@semantic-release/git": "^10.0.0"
  }
}
```

### Release Configuration (.releaserc.json)

```json
{
  "branches": ["main"],
  "tagFormat": "v${version}",
  "plugins": [
    ["@semantic-release/commit-analyzer", {
      "preset": "conventionalcommits",
      "releaseRules": [
        { "type": "feat", "release": "minor" },
        { "type": "fix", "release": "patch" },
        { "type": "perf", "release": "patch" },
        { "type": "revert", "release": "patch" },
        { "type": "docs", "release": false },
        { "type": "style", "release": false },
        { "type": "chore", "release": false },
        { "type": "refactor", "release": false },
        { "type": "test", "release": false },
        { "breaking": true, "release": "major" }
      ]
    }],
    ["@semantic-release/release-notes-generator", {
      "preset": "conventionalcommits",
      "presetConfig": {
        "types": [
          { "type": "feat", "section": "✨ Features" },
          { "type": "fix", "section": "🐛 Bug Fixes" },
          { "type": "perf", "section": "⚡ Performance" },
          { "type": "revert", "section": "⏪ Reverts" },
          { "type": "docs", "section": "📚 Documentation", "hidden": false },
          { "type": "chore", "section": "🔧 Maintenance", "hidden": true },
          { "type": "refactor", "section": "♻️ Refactoring", "hidden": true },
          { "type": "test", "section": "✅ Tests", "hidden": true }
        ]
      }
    }],
    ["@semantic-release/gitlab", {
      "gitlabUrl": "https://gitlab.com",
      "successComment": false
    }]
  ]
}
```

## GitLab CI Configuration

### New Release Stage

Add to `.gitlab-ci.yml`:

```yaml
stages:
  - test
  - build
  - deploy
  - release  # NEW

# ... existing stages ...

# Semantic Release - runs on main branch only
release:
  stage: release
  image: node:20
  variables:
    # Use GitLab CI predefined variables
    GITLAB_TOKEN: $GL_TOKEN
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: on_success
  before_script:
    - npm ci --include=dev
  script:
    - npx semantic-release
  dependencies: []  # Don't need artifacts from other jobs
```

### Required CI/CD Variables

Set in GitLab → Settings → CI/CD → Variables:

| Variable | Description | Protected | Masked |
|----------|-------------|-----------|--------|
| `GL_TOKEN` | Personal/Project Access Token with `api` + `write_repository` | Yes | Yes |

### Token Permissions

Create a Project Access Token (Settings → Access Tokens) with:
- Role: Maintainer
- Scopes: `api`, `write_repository`

Or use a Personal Access Token with the same scopes.

## Version Initialization

For the first release, create an initial tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Or let semantic-release create v1.0.0 automatically on first run with a `feat:` commit.

## Conventional Commits Enforcement (Optional)

To enforce commit format, add commitlint:

```json
{
  "devDependencies": {
    "@commitlint/cli": "^19.0.0",
    "@commitlint/config-conventional": "^19.0.0"
  }
}
```

`commitlint.config.js`:
```javascript
module.exports = {
  extends: ['@commitlint/config-conventional']
};
```

GitLab CI job (optional):
```yaml
lint-commits:
  stage: test
  image: node:20
  script:
    - npm ci
    - npx commitlint --from $CI_MERGE_REQUEST_DIFF_BASE_SHA --to HEAD
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
```

## Reusability

To adopt in another project:

1. Copy files:
   - `.releaserc.json`
   - Add release stage to `.gitlab-ci.yml`

2. Install dependencies:
   ```bash
   npm install -D semantic-release @semantic-release/commit-analyzer \
     @semantic-release/release-notes-generator @semantic-release/gitlab
   ```

3. Configure `GL_TOKEN` in CI/CD variables

4. Create initial tag (if starting fresh):
   ```bash
   git tag v1.0.0 && git push origin v1.0.0
   ```

5. Start using conventional commits

## Release Notes Example

```markdown
# v1.2.0 (2026-01-26)

## ✨ Features

* **dashboard:** add environment matrix view ([#4](https://gitlab.com/.../merge_requests/4)) ([abc1234](https://gitlab.com/.../commit/abc1234))
* **dashboard:** add promotion readiness tracking ([#5](https://gitlab.com/.../merge_requests/5)) ([def5678](https://gitlab.com/.../commit/def5678))

## 🐛 Bug Fixes

* **api:** fix pipeline duration calculation ([cde9012](https://gitlab.com/.../commit/cde9012))
```

## Testing Strategy

### Local Testing

```bash
# Dry run - see what would be released
npx semantic-release --dry-run

# Check commit format
npx commitlint --from HEAD~5 --to HEAD
```

### CI Testing

1. Create a test branch with `feat:` commit
2. Merge to main
3. Verify release job runs
4. Check GitLab Releases page for new release
