# Requirements: Promotion Readiness (Priority 3)

## Business Context

Teams need to know when a version is ready to promote to the next environment, especially production. Currently this is a manual process with no unified visibility. The goal is to:

1. Show readiness status at a glance
2. Drive adoption of post-deployment tests
3. Capture sign-off evidence in a structured, auditable way

This builds on Priority 2 (Environment Overview) which tracks what's deployed where.

---

## User Stories

### 3.1 Readiness View

**As a** team lead  
**I want to** see which versions are ready for promotion to the next environment  
**So that** I can confidently approve deployments

**Acceptance Criteria:**
- [ ] Separate view showing promotion readiness status
- [ ] List versions with their current environment and readiness status
- [ ] Filter by project, environment, or readiness state
- [ ] Show what's blocking promotion (missing sign-off, failed tests)

---

### 3.2 Sign-off Capture via MR Comments

**As a** developer or business user  
**I want to** record my sign-off in a structured MR comment  
**So that** the dashboard can track approval status

**Acceptance Criteria:**
- [ ] Strict comment format: `SIGNOFF: <version> <environment>`
  - Example: `SIGNOFF: v2.3.45 UAT`
- [ ] Sign-off author validated against CODEOWNERS file
- [ ] Sign-off applies to specific version + environment combination
- [ ] Invalid sign-offs (wrong format, unauthorized user) ignored with optional warning

**Comment format specification:**
```
SIGNOFF: v<version> <environment>

Examples:
SIGNOFF: v2.3.45 UAT
SIGNOFF: v1.0.12 DEV
SIGNOFF: v3.0.0 PROD
```

---

### 3.3 CODEOWNERS Validation

**As a** the system  
**I need to** validate sign-off authors against CODEOWNERS  
**So that** only authorized people can approve promotions

**Acceptance Criteria:**
- [ ] Fetch CODEOWNERS file from repository root
- [ ] Parse CODEOWNERS to extract authorized usernames
- [ ] Match MR comment author against CODEOWNERS list
- [ ] Handle missing CODEOWNERS gracefully (allow any commenter? or require setup?)

**CODEOWNERS location:** Repository root (`/CODEOWNERS`)

---

### 3.4 MR Linkage

**As a** the system  
**I need to** link deployments to their source MR  
**So that** I can find sign-off comments

**Acceptance Criteria:**
- [ ] Match deployment's branch name to MR source branch
- [ ] One MR per version (simplifying assumption)
- [ ] Handle missing MR gracefully (no sign-off possible)
- [ ] Cache MR data to avoid repeated API calls

---

### 3.5 Post-Deploy Test Results

**As a** a team lead  
**I want to** see post-deployment test results  
**So that** I have automated proof the deployment works

**Acceptance Criteria:**
- [ ] Identify post-deploy test jobs by stage name (`post-deploy`)
- [ ] Show pass/fail status for post-deploy tests
- [ ] Handle projects without post-deploy tests (show "No tests")
- [ ] Link to test job for details

---

### 3.6 Readiness Indicator

**As a** a user  
**I want to** see a clear "ready for promotion" indicator  
**So that** I know at a glance what can be promoted

**Acceptance Criteria:**
- [ ] Ready = deployed + sign-off + tests passed (if tests exist)
- [ ] Show readiness status: ✓ Ready, ⏳ Pending sign-off, ✗ Tests failed, ⚠️ No tests
- [ ] Visual distinction between states (colors, icons)

**Readiness logic:**
```
if (deployed to environment):
  if (post-deploy tests exist):
    if (tests passed):
      if (sign-off from CODEOWNERS):
        → READY
      else:
        → PENDING SIGN-OFF
    else:
      → TESTS FAILED
  else:
    if (sign-off from CODEOWNERS):
      → READY (no tests)
    else:
      → PENDING SIGN-OFF (no tests)
else:
  → NOT DEPLOYED
```

---

## Technical Notes

### API Endpoints

| Data | Endpoint |
|------|----------|
| MR by branch | `GET /projects/:id/merge_requests?source_branch=:branch` |
| MR notes | `GET /projects/:id/merge_requests/:iid/notes` |
| CODEOWNERS | `GET /projects/:id/repository/files/CODEOWNERS?ref=HEAD` |
| Pipeline jobs | Already available from Priority 2 |

### Sign-off Regex

```javascript
const SIGNOFF_REGEX = /^SIGNOFF:\s*v?([\d.]+)\s+(DEV|SIT|UAT|PROD)\s*$/im;
```

### CODEOWNERS Parsing

```
# Example CODEOWNERS format
* @jane @bob
/src/ @alice
```

Extract all unique usernames (without @).

### Data Dependencies

- **From Priority 2:** Deployment data (version, environment, branch, pipeline)
- **New:** MR notes, CODEOWNERS file

---

## Out of Scope (v1)

- Creating sign-offs from the dashboard (read-only)
- Multiple sign-off requirements (e.g., tech + business)
- Sign-off expiry or revocation
- Promotion automation (just visibility)
- Detailed test results breakdown (just pass/fail)
