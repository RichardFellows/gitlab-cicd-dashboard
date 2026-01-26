# GitLab CI/CD Dashboard

A dashboard to visualize CI/CD metrics for GitLab repositories under a specific group ID.

## Features

- Track pipeline success/failure rates
- Monitor build times
- View test coverage
- Compare metrics across repositories
- Real-time data updates
- Main branch pipeline status
- Recent commits display
- Settings persistence with localStorage

## Getting Started

### Basic Usage

1. Clone this repository
2. Open `index.html` in your browser
3. Enter your GitLab private token and group ID
4. View your CI/CD metrics

### Running Locally with Dev Server (Recommended)

When running locally, you may encounter CORS (Cross-Origin Resource Sharing) issues when trying to access the GitLab API. We've included an all-in-one development server that handles this automatically:

1. Make sure you have Node.js installed (version 12 or higher)
2. Open a terminal and navigate to the project directory
3. Run the development server:
   ```
   npm start
   ```

This will:
- Start the proxy server on an available port
- Start an HTTP server on port 5050
- Automatically open your browser to `http://localhost:5050`
- Configure the dashboard to use the correct proxy URL

The dashboard will automatically use the proxy to avoid CORS issues. Your browser will open to the dashboard once everything is running.

### Alternative: Manual Setup

If you prefer to run the servers manually:

1. Start the proxy server:
   ```
   npm run proxy
   ```
2. In another terminal, start a local web server:
   ```
   npm run serve
   ```
3. Open your browser to `http://localhost:5050`

## Files

- `index.html` - Main dashboard interface
- `gitlab-api-service.js` - Service to fetch data from GitLab API
- `dashboard-data-service.js` - Service to process dashboard metrics
- `index.js` - Main application logic
- `pipeline-performance.js` - Pipeline metrics calculations
- `proxy.js` - CORS proxy server for local development
- `start.js` - Combined development server script
- `package.json` - Project metadata and npm scripts

## Versioning

This project uses [semantic-release](https://github.com/semantic-release/semantic-release) for automatic versioning and changelog generation.

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/) format:

- `feat:` - New feature (bumps minor version)
- `fix:` - Bug fix (bumps patch version)
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Breaking changes should include `BREAKING CHANGE:` in the commit body or use `!` suffix (e.g., `feat!:` or `fix!:`).

### Releases

Releases are automatically created when commits are pushed to the `main` branch. The release process:

1. Analyzes commit messages since the last release
2. Determines the next version number
3. Updates CHANGELOG.md
4. Creates a Git tag
5. Creates a GitLab release