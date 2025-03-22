# CLAUDE.md - Guidelines for GitLab CI/CD Dashboard

## Running the Application
- Open `index.html` in a browser to run the application
- No build process required (pure JavaScript/HTML)
- For local development with auto-refresh: `python -m http.server` (then navigate to localhost:8000)

## Code Style Guidelines
- **Naming**: camelCase for variables/functions, PascalCase for classes
- **Indentation**: 2 spaces
- **Strings**: Use single quotes for string literals
- **Semicolons**: Required at end of statements
- **Documentation**: JSDoc comments for functions/classes
- **Error Handling**: Use try/catch blocks, log with console.error()
- **Module Pattern**: Class-based modules for services

## Project Structure
- `index.html`: Dashboard UI
- `index.js`: Application entry point and initialization
- `gitlab-api-service.js`: GitLab API communication
- `dashboard-data-service.js`: Dashboard data processing
- `pipeline-performance.js`: Pipeline metrics calculations

## Data Flow
API Token → GitLabApiService → DashboardDataService → UI Components