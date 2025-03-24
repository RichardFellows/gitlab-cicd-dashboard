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
├── public/                    # Static assets that aren't processed by Vite
│
├── src/                       # Source code
│   ├── components/            # React components
│   │   ├── CardView.tsx       # Card view component
│   │   ├── ControlPanel.tsx   # Control panel component
│   │   ├── Dashboard.tsx      # Main dashboard component
│   │   ├── ProjectDetails.tsx # Project details component
│   │   ├── SummarySection.tsx # Summary section component
│   │   └── TableView.tsx      # Table view component
│   │
│   ├── services/              # API and data services
│   │   ├── GitLabApiService.ts # GitLab API communication
│   │   └── DashboardDataService.ts # Dashboard data processing
│   │
│   ├── styles/                # CSS files for components
│   │   ├── index.css          # Global styles
│   │   ├── TableView.css      # Table view styles
│   │   └── CardView.css       # Card view styles
│   │
│   ├── types/                 # TypeScript type definitions
│   │   └── index.ts           # Shared type definitions
│   │
│   ├── utils/                 # Utilities and helpers
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
- GitHub Actions for CI/CD
- GitHub Pages for hosting

