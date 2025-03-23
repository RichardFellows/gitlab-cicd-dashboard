# CLAUDE.md - Guidelines for GitLab CI/CD Dashboard

## Running the Application
- Open `public/index.html` in a browser to run the application
- No build process required (pure JavaScript/HTML)
- For local development with auto-refresh:
  - `npm run serve` (serves at localhost:5050)
  - `npm run start` (uses the scripts/start.js script)
  - `npm run proxy` (runs the scripts/proxy.js for API requests)
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