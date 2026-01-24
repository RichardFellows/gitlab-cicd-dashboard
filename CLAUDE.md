# CLAUDE.md - Guidelines for GitLab CI/CD Dashboard

## Recent Updates
- Fixed TypeScript type issues for successful build process:
  - Added `draft` property to MergeRequest interface
  - Added `coverage` property to Pipeline interface  
  - Added `jobs` property to Pipeline interface
  - Fixed test mocks for proper TypeScript compatibility
- Enhanced GitLab API authentication with proper header case sensitivity
- Improved proxy configuration for proper API token handling
- Added detailed logging for API request debugging
- Enhanced token retrieval and validation from localStorage

## Running the Application
- Open `localhost:5050/` in a browser to run the application
- For local development with auto-refresh:
  - `npm run dev` (starts Vite dev server at localhost:5050)
- Build process:
  - `npm run build` (builds the React app for production)
  - `npm run preview` (preview the production build locally)
- Testing:
  - `npm test` (runs unit tests)
  - `npm run test:watch` (runs tests in watch mode)
  - `npm run test:deployment [url]` (verifies site functionality at the given URL)
- Linting:
  - `npm run lint` (runs ESLint to check code quality)
- Requires Node.js >= 18.0.0

## Known Issues
- Some component tests still need updating to properly mock Chart.js
- Some tests are temporarily disabled until they can be fixed

## Pre-Push Checklist
Before pushing any changes to remote, always verify locally:
1. `npm run lint` - Ensure no linting errors
2. `npm run build` - Ensure TypeScript compiles and Vite builds successfully
3. `npm test` - Ensure all tests pass

Only push after all three checks pass.

## Feature Branch Workflow
When completing a feature, always create a feature branch and push to GitLab for review:

1. **Create feature branch**: `git checkout -b feature/<feature-name>`
2. **Run verification checks**: lint, build, and test (see Pre-Push Checklist)
3. **Commit changes**: Use conventional commit format (e.g., `feat:`, `fix:`, `docs:`)
4. **Push to GitLab**: `git push -u origin feature/<feature-name>`
5. **Create MR with details**: Use `glab mr create` with full description including:
   - Summary of changes
   - List of new/modified files
   - Test evidence (lint, build, test output)
   - Manual testing steps
6. **Provide MR link**: Share the merge request URL for review

### GitLab CLI (glab)
Install the GitLab CLI for MR operations: https://gitlab.com/gitlab-org/cli

```bash
# Create MR with description
glab mr create --title "feat: description" --description "## Summary..."

# View MR
glab mr view 1

# List open MRs
glab mr list
```

### Branch Naming Convention
- `feature/<name>` - New features
- `fix/<name>` - Bug fixes
- `refactor/<name>` - Code refactoring
- `docs/<name>` - Documentation updates

### Commit Message Format
Use conventional commits:
```
feat: add multi-source dashboard configuration

Brief description of changes.

- Bullet point details
- More details

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

Do NOT merge to main directly. Push feature branches for review first.

### Review Apps
Each MR creates a review environment with build artifacts for testing:
- Environment URL links to job artifacts (requires GitLab login to view)
- Artifacts are retained for 1 week
- For public preview, test locally with `npm run dev`

**Future enhancement**: Consider adding Surge.sh or Netlify deployment for public MR previews.

## Code Style Guidelines
- **Naming**: camelCase for variables/functions, PascalCase for classes and React components
- **Indentation**: 2 spaces
- **Strings**: Use single quotes for string literals
- **Semicolons**: Required at end of statements
- **Documentation**: JSDoc comments for functions/classes
- **Error Handling**: Use try/catch blocks, log with console.error()
- **Components**: Function components with React hooks

## Project Structure
```
project-root/
├── .github/                   # GitHub related files
│   └── workflows/             # GitHub Actions workflows
│       └── deploy-github-pages.yml # GitHub Pages deployment workflow
│
├── .gitlab-ci.yml             # GitLab CI/CD pipeline configuration
│
├── src/                       # Source code
│   ├── components/            # React components
│   │   ├── CardView.tsx       # Card view component
│   │   ├── ControlPanel.tsx   # Control panel component
│   │   ├── Dashboard.tsx      # Main dashboard component
│   │   ├── ProjectDetails.tsx # Project details component
│   │   ├── SourceChip.tsx     # Chip component for group/project display
│   │   ├── SourceManager.tsx  # Multi-source group/project manager
│   │   ├── SummarySection.tsx # Summary section component
│   │   └── TableView.tsx      # Table view component
│   │
│   ├── services/              # API and data services
│   │   ├── GitLabApiService.ts # GitLab API communication
│   │   └── DashboardDataService.ts # Dashboard data processing
│   │
│   ├── styles/                # CSS files for components
│   │   ├── index.css          # Global styles
│   │   ├── CardView.css       # Card view styles
│   │   ├── SourceManager.css  # Source manager styles
│   │   └── TableView.css      # Table view styles
│   │
│   ├── types/                 # TypeScript type definitions
│   │   └── index.ts           # Shared type definitions
│   │
│   ├── utils/                 # Utilities and helpers
│   │   ├── configMigration.ts # Config migration and persistence
│   │   └── formatting.ts      # Formatting utilities
│   │
│   ├── test/                  # Test configuration
│   │   ├── setup.ts           # Test setup file
│   │   └── mocks.tsx          # Test mocks for React components
│   │
│   ├── App.tsx                # Main App component
│   └── main.tsx               # Application entry point
│
├── scripts/                   # Development and deployment scripts
│   └── test-deployment.js     # Post-deployment test script
│
├── index.html                 # HTML entry point
├── vite.config.ts             # Vite configuration
├── tsconfig.json              # TypeScript configuration
├── tsconfig.node.json         # TypeScript configuration for Node.js
├── .eslintrc.cjs              # ESLint configuration
├── package.json               # Project dependencies and scripts
├── FEATURE_IDEAS.md           # Ideas for future development
└── CHANGELOG.md               # Project version history
```

## Testing
- Using Vitest for unit testing
- Test files located in the same directories as the source files they test, with a .test.ts(x) extension
- Test mocks in src/test/mocks.tsx
- Test commands:
  - `npm test`: Run all tests
  - `npm run test:watch`: Run tests in watch mode
  - `npm run test:coverage`: Run tests with coverage
  
## Test Data (GitLab Group)

A test group is available on GitLab for testing the dashboard with realistic data:

- **Group ID**: `122839760`
- **Group Path**: `test-group6330604`
- **Group URL**: https://gitlab.com/groups/test-group6330604

### Test Projects

| Project | Description | Pipeline State | Open MRs |
|---------|-------------|----------------|----------|
| api-service | Backend API service | ✅ success | 0 |
| frontend-app | React frontend | ❌ failed (test failure) | 1 |
| data-processor | Data processing service | ✅ success | 0 |
| auth-service | Authentication microservice | ✅ success | 0 |
| notification-service | Notification service | ✅ success | 2 (1 draft) |

### Test Merge Requests
- **notification-service**: 2 open MRs (email notifications feature, Slack integration draft)
- **frontend-app**: 1 open MR (bug fix for failing tests)

### Usage
To test the dashboard locally with this group:
1. Run `npm run dev`
2. Enter GitLab URL: `https://gitlab.com`
3. Enter Group ID: `122839760`
4. Enter your GitLab Personal Access Token

## Deployment

### GitLab CI/CD (Primary)
- Automated deployment to GitLab Pages via `.gitlab-ci.yml`
- Pipeline stages: test → build → deploy → post-deploy
- Triggered on pushes to any branch (deploy only on main)
- GitLab Pages URL: https://richard2.gitlab.io/gitlab-cicd-dashboard

### GitHub Actions (Legacy)
- Automated deployment to GitHub Pages via GitHub Actions
- The workflow is triggered on:
  - Pushes to the main branch
  - Manual dispatch from the GitHub Actions UI
- The deployment process:
  1. Checkout the repository
  2. Setup Node.js environment
  3. Install dependencies
  4. Run tests
  5. Run build process (TypeScript compilation and Vite build)
  6. Publish the contents of the `dist/` directory to GitHub Pages
  7. Run post-deployment tests to verify site functionality
- Deployment configuration is in `.github/workflows/deploy-github-pages.yml`
- Post-deployment test script is in `scripts/test-deployment.js`

## Data Flow
Vite → React App → GitLabApiService → DashboardDataService → React Components (Dashboard, TableView, CardView, etc.)

## Key Features
- Project pipeline status visualization
- Pipeline success rate metrics
- Pipeline duration tracking
- Code coverage display
- Open merge request tracking
- Failed job analysis
- Recent commit history

## Technology Stack
- React for the UI
- TypeScript for type safety
- Vite as the build tool
- Chart.js for data visualization
- GitLab CI/CD for pipelines (primary)
- GitLab Pages for hosting (primary)
- GitHub Actions for CI/CD (legacy)
- GitHub Pages for hosting (legacy)

