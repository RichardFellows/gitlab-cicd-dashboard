# CI/CD Best Practices Research

**Date:** 2026-01-26  
**Purpose:** Research compilation for gitlab-cicd-dashboard project  
**Context:** GitLab CI, 60+ repos, mixed Windows/OpenShift deployments

---

## Table of Contents
1. [Versioning Best Practices](#1-versioning-best-practices)
2. [Deployment Best Practices](#2-deployment-best-practices)
3. [Release Page Best Practices](#3-release-page-best-practices)
4. [Post-Deployment Testing Framework](#4-post-deployment-testing-framework)
5. [Recommendations for gitlab-cicd-dashboard](#5-recommendations-for-gitlab-cicd-dashboard)
6. [Action Items](#6-action-items)
7. [Sources](#7-sources)

---

## 1. Versioning Best Practices

### 1.1 SemVer vs CalVer: When to Use Each

#### Semantic Versioning (SemVer) - `MAJOR.MINOR.PATCH`

**Best For:**
- Libraries and APIs with clear public interfaces
- Projects where backward compatibility matters
- Software consumed as dependencies by other projects
- When you want to communicate the *nature* of changes

**Rules:**
- **MAJOR** - Incompatible API changes (breaking changes)
- **MINOR** - New functionality in backward-compatible manner
- **PATCH** - Backward-compatible bug fixes
- Pre-release: `1.0.0-alpha`, `1.0.0-beta.1`, `1.0.0-rc.1`
- Build metadata: `1.0.0+20130313144700`

**Key Insight:** SemVer requires a *declared public API*. Without a clear API contract, SemVer becomes meaningless.

#### Calendar Versioning (CalVer) - Various schemes

**Best For:**
- Large systems with broad scope (like Ubuntu, Twisted)
- Time-sensitive projects (security updates, timezone databases)
- When external factors drive releases (political, regulatory)
- Applications (vs libraries) where "compatibility" is less meaningful
- Projects with predictable release schedules

**Common Schemes:**
- `YY.MM` - Ubuntu style (24.04)
- `YYYY.MM.DD` - youtube-dl style
- `YY.MINOR.MICRO` - Twisted style (year + incremental)

**Hybrid Approach (Teradata style):**
Use `YY.MM` as a combined "major" version - only change when there's a breaking change. This gives the benefits of both:
- Dates communicate freshness
- Version bumps communicate compatibility

#### Recommendation for 60+ Repo Environment

For **internal applications** (deployed, not consumed as libraries):
- Consider CalVer (`YYYY.MM.BUILD`) - timestamps are immediately meaningful
- Or simplified SemVer focusing on MAJOR only for breaking changes

For **shared libraries**:
- Stick with SemVer - consumers need compatibility signals

### 1.2 Conventional Commits

**Verdict: YES, adopt it** - especially with tooling.

#### Benefits:
1. **Automatic changelog generation** - tools like `semantic-release`, `standard-version`
2. **Automatic version bumping** - `feat:` → MINOR, `fix:` → PATCH, `BREAKING CHANGE:` → MAJOR
3. **Structured commit history** - easier to navigate
4. **Trigger CI behaviors** - e.g., skip CI for docs-only changes

#### Specification:
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat:` - New feature (MINOR in SemVer)
- `fix:` - Bug fix (PATCH in SemVer)
- `docs:` - Documentation only
- `style:` - Formatting, no code change
- `refactor:` - Code change that neither fixes nor adds
- `perf:` - Performance improvement
- `test:` - Adding missing tests
- `chore:` - Maintenance, build changes
- `ci:` - CI configuration changes

**Breaking Changes:**
- Footer: `BREAKING CHANGE: description`
- Or append `!` after type: `feat!: remove deprecated API`

#### Enforcement:
- **commitlint** - Lint commit messages
- **husky** - Git hooks for pre-commit validation
- **GitLab CI** - Validate in pipeline

#### For Monorepo:
Use scopes to indicate which package: `feat(api): add new endpoint`

### 1.3 Monorepo Versioning Considerations

**Challenge:** Independent vs. synchronized versioning across packages.

#### Approaches:

**1. Fixed/Locked Versioning (e.g., Angular, Babel)**
- All packages share same version
- Simple, but version bumps affect all packages
- Good when packages are tightly coupled

**2. Independent Versioning (e.g., Lerna default)**
- Each package has own version
- More complex, but versions reflect actual changes
- Good when packages have different consumers

**3. Hybrid**
- Core packages locked together
- Peripheral packages independent

#### Tools for Monorepo Versioning:
- **Lerna** - `lerna version`, `lerna publish`
- **Nx** - Built-in versioning with `nx release`
- **Changesets** - Declare changes, generate versions
- **semantic-release-monorepo** - Automated releases per package

#### GitLab-Specific:
Since Richard's context is 60+ separate repos (not a true monorepo), consider:
- Shared CI templates for consistent versioning
- Group-level changelog aggregation
- Dependency tracking between repos

### 1.4 Pre-release Versions

**When to use:**
- `alpha` - Feature incomplete, API unstable, internal testing
- `beta` - Feature complete, API stabilizing, limited external testing
- `rc` (Release Candidate) - Ready for release unless bugs found

**SemVer Format:**
```
1.0.0-alpha < 1.0.0-alpha.1 < 1.0.0-beta < 1.0.0-beta.2 < 1.0.0-rc.1 < 1.0.0
```

**Best Practices:**
1. Use numbered pre-releases: `1.0.0-beta.1`, `1.0.0-beta.2`
2. Don't publish pre-releases to production package registries (use `--tag beta`)
3. Document what "alpha" vs "beta" means for your project
4. Consider `0.x.x` for initial development instead of alpha/beta

---

## 2. Deployment Best Practices

### 2.1 GitLab Deployment Environments

**Verdict: YES, use them** - they provide significant value.

#### Benefits:
1. **Visibility** - See what's deployed where from project overview
2. **Tracking** - Full deployment history per environment
3. **Rollback** - Easy rollback to previous deployments
4. **Protection** - Protected environments with approvals
5. **Variables** - Environment-scoped CI/CD variables
6. **DORA Metrics** - Automatic deployment frequency tracking
7. **Deploy Freezes** - Prevent deployments during blackout periods

#### Environment Tiers:
GitLab automatically detects tier from environment name:
- `production`, `live` → Production tier
- `staging`, `model`, `demo` → Staging tier
- `test`, `qc` → Testing tier
- `dev`, `review/*` → Development tier

Or explicitly set with `deployment_tier` keyword:
```yaml
deploy_prod:
  environment:
    name: customer-portal  # Non-standard name
    deployment_tier: production  # Explicit tier
```

#### Static vs Dynamic Environments:
```yaml
# Static - reused
deploy_staging:
  environment:
    name: staging
    url: https://staging.example.com

# Dynamic - per branch (review apps)
deploy_review:
  environment:
    name: review/$CI_COMMIT_REF_SLUG
    url: https://$CI_ENVIRONMENT_SLUG.example.com
    on_stop: stop_review
    auto_stop_in: 1 week
```

### 2.2 Deployment Strategies

#### Blue-Green Deployment
**How it works:**
- Maintain two identical production environments (Blue and Green)
- Deploy to inactive environment
- Switch router to new environment
- Keep old environment for instant rollback

**Pros:**
- Zero downtime deployment
- Instant rollback capability
- Full environment testing before cutover

**Cons:**
- Requires 2x infrastructure
- Database migrations can be tricky
- Session management during switchover

**Best for:** Critical applications requiring zero-downtime and instant rollback.

#### Canary Deployment
**How it works:**
- Deploy to small subset of infrastructure
- Route small percentage of traffic (1%, 5%, 10%...)
- Monitor for errors/performance issues
- Gradually increase traffic or rollback

**Pros:**
- Limits blast radius of bad deploys
- Real production testing
- Gradual confidence building

**Cons:**
- Requires traffic routing capability
- More complex monitoring
- Multiple versions running simultaneously

**Strategies for selecting canary users:**
- Random percentage
- Internal users first
- Geographic region
- Specific customer segments

**Best for:** High-traffic applications where you want to detect issues before full rollout.

#### Rolling Deployment
**How it works:**
- Update instances one at a time (or in batches)
- Old and new versions run simultaneously during rollout
- No additional infrastructure needed

**Pros:**
- No extra infrastructure
- Gradual rollout
- Built into most orchestrators (Kubernetes, OpenShift)

**Cons:**
- Multiple versions running during deploy
- Slower rollback (must roll forward or undo each)
- Requires backward-compatible changes

**Best for:** Standard deployments where brief coexistence of versions is acceptable.

### 2.3 Environment Promotion Patterns

#### Linear Promotion: dev → staging → prod
```yaml
stages:
  - build
  - deploy_dev
  - deploy_staging
  - deploy_prod

deploy_dev:
  stage: deploy_dev
  environment:
    name: development
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

deploy_staging:
  stage: deploy_staging
  environment:
    name: staging
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
  needs: [deploy_dev]

deploy_prod:
  stage: deploy_prod
  environment:
    name: production
  when: manual
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
  needs: [deploy_staging]
```

#### Considerations:
1. **Artifact promotion** - Same artifact through all environments
2. **Configuration variation** - Different configs per environment
3. **Database migrations** - Run once, not per environment
4. **Smoke tests** - Run after each environment deploy

### 2.4 Deployment Approvals and Gates

GitLab offers several mechanisms:

#### 1. Manual Jobs (`when: manual`)
Simple but no formal approval tracking.

#### 2. Protected Environments (Premium+)
```yaml
# In .gitlab-ci.yml
deploy_prod:
  environment:
    name: production
```
Then configure in Settings → CI/CD → Protected Environments:
- Required approvers
- Number of approvals needed
- Allow self-approval (or not)

#### 3. Deployment Approvals (Premium+)
- Multiple approval rules possible
- Different approvers for different environments
- Approval audit trail
- Comments on approvals/rejections

#### 4. Deploy Freeze Windows
```yaml
# Prevent deployments during maintenance/holidays
# Configure in Settings → CI/CD → Deploy freezes
```
Jobs can check `$CI_DEPLOY_FREEZE` variable.

### 2.5 Deployment Safety

#### Prevent Concurrent Deployments:
```yaml
deploy:
  resource_group: production  # Only one job at a time
```

#### Prevent Outdated Deployments:
Enable in Settings → CI/CD → "Prevent outdated deployment jobs"
- Newer pipeline's deploy wins
- Older pipeline's deploy fails with clear message

#### Protected Variables:
- Scope secrets to specific environments
- Only protected branches can access protected variables

---

## 3. Release Page Best Practices

### 3.1 What Should Be in Release Notes?

Based on Keep A Changelog principles:

#### Structure:
```markdown
## [1.2.0] - 2026-01-26

### Added
- New feature X for doing Y (#123)
- Support for Z integration

### Changed
- Improved performance of A by 50%
- Updated dependency B to v2.0

### Deprecated
- Feature C will be removed in v2.0

### Removed
- Legacy API endpoint /old/thing

### Fixed
- Bug where X would fail under Y conditions (#456)
- Memory leak in component Z

### Security
- Fixed XSS vulnerability in user input handling (CVE-2026-1234)
```

#### Guiding Principles:
1. **Changelogs are for humans** - not git log dumps
2. **Entry for every version** - no gaps
3. **Group same types of changes** - easier scanning
4. **Latest version first** - reverse chronological
5. **Show release date** - use ISO format (YYYY-MM-DD)
6. **Link to issues/MRs** - provide context

#### What NOT to do:
- Don't dump commit log verbatim
- Don't ignore deprecations
- Don't use ambiguous date formats
- Don't be inconsistent about what changes you mention

### 3.2 Linking Releases to Deployments

GitLab allows associating releases with:

#### Milestones:
```yaml
release:
  tag_name: $CI_COMMIT_TAG
  description: 'Release notes here'
  milestones:
    - 'v1.2'
    - 'Sprint 42'
```

Benefits:
- Shows milestone completion percentage
- Links issues to release
- Shows what was planned vs delivered

#### Environments:
While releases and deployments are tracked separately, you can:
1. Create release when deploying to production
2. Include deployment job link in release notes
3. Use release evidence for audit purposes

### 3.3 Release Artifacts - What to Include

#### Types of Assets:

**1. Source Code** (automatic)
- GitLab auto-attaches zip and tar.gz of source

**2. Build Artifacts**
```yaml
release:
  assets:
    links:
      - name: 'Linux Binary'
        url: 'https://example.com/releases/v1.0/app-linux'
        filepath: '/binaries/linux/app'
        link_type: 'package'
      - name: 'Windows Installer'
        url: 'https://example.com/releases/v1.0/app-setup.exe'
        link_type: 'package'
      - name: 'Docker Image'
        url: 'https://registry.example.com/app:v1.0'
        link_type: 'image'
```

**3. Documentation**
- PDF of docs at release time
- Link to versioned docs site

**4. Checksums**
- SHA256 sums for verifying downloads

**Link Types:**
- `runbook` - Operational runbook
- `package` - Compiled package/installer
- `image` - Container image
- `other` - Anything else

### 3.4 Change Categorization Best Practices

#### Conventional Changelog Categories:
- **Added** - New features
- **Changed** - Changes to existing functionality
- **Deprecated** - Features to be removed
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security fixes

#### Audience-Based Sections:
For complex projects, consider splitting:
- **For Users** - User-facing changes
- **For Developers** - API changes, SDK updates
- **For Operators** - Deployment, config changes

#### Automated Categorization:
With conventional commits, tools can auto-categorize:
- `feat:` → Added
- `fix:` → Fixed
- `perf:` → Changed (performance)
- `BREAKING CHANGE:` → Changed (with warning)

---

## 4. Post-Deployment Testing Framework

### 4.1 Types of Post-Deployment Tests

#### Smoke Tests
**Purpose:** Verify basic functionality works - "does it even run?"

**Characteristics:**
- Quick (seconds to a few minutes)
- Broad coverage, shallow depth
- Critical path only
- Run immediately after every deployment

**Example checks:**
- Application responds on health endpoint
- Login works
- Main page loads
- Database connection established
- Key integrations respond

#### Health Checks
**Purpose:** Verify the application is alive and ready.

**Types:**
- **Liveness** - Is the process running? (restart if not)
- **Readiness** - Is it ready to accept traffic? (don't route if not)
- **Startup** - Is it still starting up? (don't kill yet)

**Best Practices:**
- Liveness: Should ONLY check if process is stuck (not dependencies)
- Readiness: Check database, cache, required services
- Include version/build info in health response

```json
{
  "status": "healthy",
  "version": "1.2.0",
  "build": "abc123",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "external_api": "degraded"
  }
}
```

#### End-to-End (E2E) Tests
**Purpose:** Verify complete user journeys work.

**Characteristics:**
- Slower (minutes to hours for full suite)
- Narrow coverage, deep depth
- Simulates real user behavior
- May run subset post-deploy, full suite on schedule

**Example journeys:**
- User registration → email verification → login → purchase
- Admin creates product → user views → user purchases → order confirmed

### 4.2 What to Test After Deployment

#### Immediate (Smoke - every deploy):
1. ✅ Application responds (HTTP 200 on health endpoint)
2. ✅ Critical paths load (home page, login page)
3. ✅ Authentication works
4. ✅ Database connectivity
5. ✅ Key integrations respond

#### Short-term (5-15 minutes post-deploy):
1. 🔄 Core business flows (happy path)
2. 🔄 API endpoints respond correctly
3. 🔄 Background jobs are processing
4. 🔄 Monitoring/metrics are flowing

#### Scheduled (not every deploy):
1. 📅 Full E2E test suite
2. 📅 Performance/load tests
3. 📅 Security scans
4. 📅 Accessibility tests

### 4.3 Testing Strategies by Environment Type

| Environment | Test Type | Depth | Blocking? |
|-------------|-----------|-------|-----------|
| Dev/Review | Smoke | Light | No |
| Staging | Smoke + E2E subset | Medium | Yes for prod |
| Production | Smoke + Synthetic | Light | Rollback trigger |

#### Development/Review Apps:
- Quick smoke tests
- Non-blocking (informational)
- Focus on changed functionality
- May skip if tests passed in staging

#### Staging:
- Full smoke test suite
- E2E tests for critical paths
- **Must pass to promote to production**
- Performance baseline checks
- Integration tests with test doubles for external services

#### Production:
- Smoke tests immediately post-deploy
- Synthetic monitoring (continuous)
- Real user monitoring (RUM)
- Canary analysis if doing canary deploys

### 4.4 Tools and Frameworks

#### Playwright (E2E Browser Testing)
**Best for:** Modern web applications, cross-browser testing

**Features:**
- Auto-wait for elements
- Network interception
- Mobile emulation
- Parallel execution
- Screenshot/video on failure
- Trace viewer for debugging

**GitLab Integration:**
```yaml
e2e_tests:
  image: mcr.microsoft.com/playwright:v1.40.0
  script:
    - npm ci
    - npx playwright test
  artifacts:
    when: always
    paths:
      - playwright-report/
    reports:
      junit: results.xml
```

#### Grafana k6 (Load/Performance Testing)
**Best for:** API load testing, performance baselines

**Features:**
- Scriptable in JavaScript
- Built-in protocols (HTTP, WebSocket, gRPC)
- Threshold-based pass/fail
- Cloud execution option
- Grafana integration for visualization

**Test Types:**
- **Smoke** - Minimal load, sanity check
- **Load** - Normal expected load
- **Stress** - Beyond normal, find breaking point
- **Spike** - Sudden traffic surge
- **Soak** - Extended duration, find memory leaks

**GitLab Integration:**
```yaml
performance_test:
  image: grafana/k6
  script:
    - k6 run --out json=results.json tests/load.js
  artifacts:
    paths:
      - results.json
```

#### Custom Health Checks
**Best for:** Quick, specific validation

```bash
#!/bin/bash
# Simple health check script

BASE_URL="${1:-http://localhost:8080}"
MAX_RETRIES=30
RETRY_INTERVAL=10

for i in $(seq 1 $MAX_RETRIES); do
  response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
  if [ "$response" = "200" ]; then
    echo "✅ Application is healthy"
    exit 0
  fi
  echo "⏳ Waiting for application... (attempt $i/$MAX_RETRIES)"
  sleep $RETRY_INTERVAL
done

echo "❌ Application failed to become healthy"
exit 1
```

### 4.5 Structuring Post-Deploy Test Suites

#### Recommended Structure:
```
tests/
├── smoke/                    # Run every deploy
│   ├── health.spec.ts
│   ├── login.spec.ts
│   └── critical-paths.spec.ts
├── e2e/                      # Run on staging, scheduled on prod
│   ├── user-journey/
│   │   ├── registration.spec.ts
│   │   └── purchase.spec.ts
│   └── admin/
│       └── product-management.spec.ts
├── performance/              # Run on staging, before major releases
│   ├── load.js
│   └── stress.js
└── synthetic/                # Run continuously in production
    └── monitors/
        ├── homepage.spec.ts
        └── api-availability.spec.ts
```

#### Tagging for Selective Execution:
```typescript
// Playwright example
test('critical login flow @smoke @critical', async ({ page }) => {
  // ...
});

test('edge case login @e2e', async ({ page }) => {
  // ...
});
```

```yaml
# GitLab CI
smoke_tests:
  script:
    - npx playwright test --grep @smoke

full_e2e:
  script:
    - npx playwright test --grep @e2e
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
```

### 4.6 Handling Test Failures

#### Decision Matrix:

| Environment | Test Type | Failure Action |
|-------------|-----------|----------------|
| Dev/Review | Smoke | Alert, continue |
| Staging | Smoke | Block promotion |
| Staging | E2E | Block promotion |
| Production | Smoke | **Automatic rollback** |
| Production | E2E | Alert, investigate |

#### Automatic Rollback Strategy:
```yaml
deploy_production:
  script:
    - deploy-to-production.sh
  environment:
    name: production
    on_stop: rollback_production

smoke_test_production:
  script:
    - ./run-smoke-tests.sh || (./trigger-rollback.sh && exit 1)
  needs: [deploy_production]

rollback_production:
  script:
    - rollback-to-previous.sh
  environment:
    name: production
    action: stop
  when: manual  # Or triggered automatically
```

#### Alert & Investigate:
For non-critical failures:
1. Create incident automatically
2. Page on-call if severity warrants
3. Don't rollback - may be flaky test or edge case
4. Review within SLA

#### Flaky Test Handling:
1. Track flaky tests with retry data
2. Quarantine known flaky tests
3. Don't let flaky tests block deployments
4. Fix or remove flaky tests - don't ignore

---

## 5. Recommendations for gitlab-cicd-dashboard

Based on the research and the specific context (60+ repos, GitLab CI, Windows/OpenShift mix):

### 5.1 Versioning

1. **Adopt Conventional Commits** across all repos
   - Use commitlint in CI to enforce
   - Enables automatic changelog generation

2. **Use SemVer** for shared libraries/packages
   - Clear version meaning for consumers

3. **Consider CalVer** (`YYYY.MM.PATCH`) for applications
   - Immediately meaningful for deployments
   - Easy to track "how old is this?"

4. **Pre-releases** for shared libraries:
   - `x.y.z-beta.N` for testing
   - Publish to separate registry channel

### 5.2 Deployment

1. **Definitely use GitLab Environments**
   - Track deployments centrally
   - Enable DORA metrics for the dashboard
   - Supports your mixed environment scenario

2. **Standard environment progression:**
   ```
   dev → staging → production
   ```
   
3. **Protected Environments** for production
   - Require approval before deploy
   - Different approvers for different apps based on criticality

4. **Rolling deployments** for OpenShift workloads
   - Built-in support
   - Consider canary for critical services

5. **Blue-green** for Windows services if zero-downtime needed

### 5.3 Release Notes

1. **Automate release note generation** from conventional commits
   - Use `standard-version` or GitLab's release keyword

2. **Link releases to deployments** where possible

3. **Consistent categorization:**
   - Added, Changed, Fixed, Security

4. **Include in releases:**
   - Link to deployment
   - Relevant issue/MR links
   - Rollback instructions if needed

### 5.4 Post-Deployment Testing

1. **Smoke tests for every deployment:**
   - Health endpoint check
   - Critical path verification
   - 2-3 minutes max

2. **E2E tests gate staging → prod:**
   - Run after staging deploy
   - Must pass to enable prod deploy button

3. **Consider k6 for:**
   - Performance baselines
   - API endpoint verification

4. **Production monitoring:**
   - Synthetic tests on schedule
   - Alert on failure, don't auto-rollback

5. **Rollback strategy:**
   - Automatic rollback on smoke test failure in prod
   - Manual review for E2E failures

---

## 6. Action Items

### Immediate (This Sprint)
- [ ] Define versioning strategy for the dashboard project itself
- [ ] Set up basic environment definitions in GitLab
- [ ] Create smoke test template for repos to adopt

### Short-term (Next Month)
- [ ] Implement conventional commits enforcement (commitlint)
- [ ] Create shared CI template for smoke tests
- [ ] Configure protected environments for critical repos
- [ ] Document environment promotion process

### Medium-term (Quarter)
- [ ] Roll out conventional commits to all 60+ repos
- [ ] Implement automated changelog generation
- [ ] Set up E2E test suite for critical applications
- [ ] Configure deployment approvals for production environments
- [ ] Create dashboard view showing deployment frequency (DORA)

### Long-term
- [ ] Performance testing baseline for critical services
- [ ] Synthetic monitoring in production
- [ ] Automatic rollback automation
- [ ] Cross-repo dependency tracking

---

## 7. Sources

### Versioning
- [Semantic Versioning 2.0.0](https://semver.org/) - Official SemVer specification
- [Calendar Versioning](https://calver.org/) - CalVer patterns and examples
- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) - Commit message convention
- [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) - Changelog best practices
- [Monorepo.tools](https://monorepo.tools/) - Monorepo tooling comparison

### Deployment
- [GitLab Environments Documentation](https://docs.gitlab.com/ci/environments/) - Official GitLab docs
- [GitLab Deployment Safety](https://docs.gitlab.com/ci/environments/deployment_safety/) - Security practices
- [GitLab Deployment Approvals](https://docs.gitlab.com/ci/environments/deployment_approvals/) - Approval workflows
- [Blue-Green Deployment - Martin Fowler](https://martinfowler.com/bliki/BlueGreenDeployment.html)
- [Canary Release - Martin Fowler](https://martinfowler.com/bliki/CanaryRelease.html)
- [Gitflow Workflow - Atlassian](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow)

### Releases
- [GitLab Releases Documentation](https://docs.gitlab.com/user/project/releases/) - Official GitLab docs

### Testing
- [Playwright Documentation](https://playwright.dev/docs/intro) - E2E testing framework
- [Grafana k6 Documentation](https://grafana.com/docs/k6/latest/) - Load testing
- [Types of Software Testing - Atlassian](https://www.atlassian.com/continuous-delivery/software-testing/types-of-software-testing)
- [GitLab CI/CD YAML Reference](https://docs.gitlab.com/ci/yaml/) - Pipeline configuration

---

*Document compiled: 2026-01-26*  
*Last updated: 2026-01-26*
