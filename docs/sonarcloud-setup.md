# SonarCloud Integration Setup

## Prerequisites

1. **SonarCloud Account** — Sign up at https://sonarcloud.io with GitLab SSO
2. **Organization** — Create org `cube-craw` (or match `sonar.organization` in `sonar-project.properties`)
3. **Project** — Import `cube-craw/gitlab-cicd-dashboard` from GitLab

## CI/CD Variable Setup

Add `SONAR_TOKEN` as a CI/CD variable:

- **Scope:** Group-level (`cube-craw` group) for reuse across projects, or project-level
- **Type:** Variable
- **Protected:** Yes (only runs on protected branches/tags)
- **Masked:** Yes (hidden from job logs)
- **Value:** Token from SonarCloud → My Account → Security → Generate Token

Once configured, remove `allow_failure: true` from the `sonarcloud` job in `.gitlab-ci.yml`.

## Quality Gate

The `sonar-scanner` runs with `-Dsonar.qualitygate.wait=true`, meaning:
- On **MR pipelines**: the job blocks until SonarCloud returns the quality gate result
- If the gate **fails**, the pipeline job fails → MR shows a failed check
- Default gate: "Sonar way" (no new bugs, no new vulnerabilities, ≥80% coverage on new code, <3% duplication)

Customise the gate at: SonarCloud → Project → Quality Gates

## Coverage Integration

The CI test job now runs `npm run test:coverage` which produces `coverage/lcov.info`. The scanner picks this up via `sonar.typescript.lcov.reportPaths` in `sonar-project.properties`.

## SonarCloud API Endpoints

Base URL: `https://sonarcloud.io/api`

Key endpoints the dashboard could consume:

| Endpoint | Purpose | Auth |
|----------|---------|------|
| `GET /measures/component?component=KEY&metricKeys=...` | Project metrics (coverage, bugs, vulnerabilities, code_smells, duplicated_lines_density) | Token |
| `GET /qualitygates/project_status?projectKey=KEY` | Quality gate status (OK/ERROR/WARN) | Token |
| `GET /issues/search?componentKeys=KEY&types=BUG,VULNERABILITY` | Open issues list | Token |
| `GET /measures/search_history?component=KEY&metrics=coverage&ps=30` | Metric history (trends) | Token |
| `GET /project_badges/measure?project=KEY&metric=coverage` | SVG badge (no auth needed) | None |

### Example: Get quality gate status
```bash
curl -u "$SONAR_TOKEN:" \
  "https://sonarcloud.io/api/qualitygates/project_status?projectKey=cube-craw_gitlab-cicd-dashboard"
```

### Useful metric keys
`coverage`, `bugs`, `vulnerabilities`, `code_smells`, `duplicated_lines_density`, `ncloc`, `reliability_rating`, `security_rating`, `sqale_rating`
