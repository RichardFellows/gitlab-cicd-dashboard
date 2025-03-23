# CLAUDE.md - Guidelines for GitLab CI/CD Dashboard

## Running the Application
- Open `localhost:5050/` in a browser to run the application
- For local development with auto-refresh:
  - `npm run serve` (serves at localhost:5050)
  - `npm run start` (uses the scripts/start.js script)
  - `npm run proxy` (runs the scripts/proxy.js for API requests)
- Build process:
  - `npm run build` (copies necessary files from src to public)
- Testing:
  - `npm test` (runs unit tests)
  - `npm run test:deployment [url]` (verifies site functionality at the given URL)
- Requires Node.js >= 12.0.0

## Code Style Guidelines
- **Naming**: camelCase for variables/functions, PascalCase for classes
- **Indentation**: 2 spaces
- **Strings**: Use single quotes for string literals
- **Semicolons**: Required at end of statements
- **Documentation**: JSDoc comments for functions/classes
- **Error Handling**: Use try/catch blocks, log with console.error()
- **Module Pattern**: Class-based modules for services and IIFE module pattern

## Project Structure
```
project-root/
├── .github/                   # GitHub related files
│   └── workflows/             # GitHub Actions workflows
│       └── deploy-github-pages.yml # GitHub Pages deployment workflow
│
├── public/                    # Static assets
│   ├── index.html             # Dashboard UI
│   ├── assets/
│   │   └── images/            # Image assets
│   └── styles/                # Global styles
│
├── src/                       # Source code
│   ├── components/            # UI components
│   │   └── table-view/
│   │       ├── table-view.js  # Table component
│   │       └── table-view.css # Component-specific styles
│   │
│   ├── services/              # API and data services
│   │   ├── gitlab-api-service.js  # GitLab API communication
│   │   └── dashboard-data-service.js  # Dashboard data processing
│   │
│   ├── utils/                 # Utilities and helpers
│   │   └── pipeline-performance.js  # Pipeline metrics calculations
│   │
│   └── index.js               # Application entry point
│
├── scripts/                   # Development scripts
│   ├── proxy.js               # Proxy server for API requests
│   └── start.js               # Development server
│
├── tests/                     # Test files
│   ├── components/            # Component tests
│   ├── services/              # Service tests
│   └── utils/                 # Utility tests
│
├── jest.config.js             # Jest configuration
├── jest.setup.js              # Jest setup for the test environment
├── package.json               # Project dependencies and scripts
├── FEATURE_IDEAS.md           # Ideas for future development
└── CHANGELOG.md               # Project version history
```

## Testing
- Using Jest for unit testing
- Test files located in `tests/` directory, mirroring the source structure
- Test commands:
  - `npm test`: Run all tests
  - `npm run test:watch`: Run tests in watch mode
  
## Deployment
- Automated deployment to GitHub Pages via GitHub Actions
- The workflow is triggered on:
  - Pushes to the main branch
  - Manual dispatch from the GitHub Actions UI
- The deployment process:
  1. Checkout the repository
  2. Setup Node.js environment
  3. Install dependencies
  4. Run tests
  5. Run build process to copy necessary files from src to public
  6. Publish the contents of the `public/` directory to GitHub Pages
  7. Run post-deployment tests to verify site functionality
- Deployment configuration is in `.github/workflows/deploy-github-pages.yml`
- Build script is in `scripts/build.js`
- Post-deployment test script is in `scripts/test-deployment.js`

## Data Flow
API Token → GitLabApiService → DashboardDataService → UI Components (TableView)

## Key Features
- Project pipeline status visualization
- Pipeline success rate metrics
- Pipeline duration tracking
- Code coverage display
- Open merge request tracking
- Failed job analysis
- Recent commit history