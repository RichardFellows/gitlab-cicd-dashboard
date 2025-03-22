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

### Running Locally with CORS Proxy (Recommended)

When running locally, you may encounter CORS (Cross-Origin Resource Sharing) issues when trying to access the GitLab API. To solve this, use the included proxy server:

1. Make sure you have Node.js installed
2. Open a terminal and navigate to the project directory
3. Start the proxy server:
   ```
   node proxy.js
   ```
4. In another terminal, start a local web server for the dashboard:
   ```
   python -m http.server
   ```
5. Open a browser and go to `http://localhost:8000`
6. Enter your GitLab API token and group ID
7. The dashboard will automatically use the proxy to avoid CORS issues

The proxy server runs on port 3000 by default. It forwards your requests to the GitLab API while adding the necessary CORS headers.

## Files

- `index.html` - Main dashboard interface
- `gitlab-api-service.js` - Service to fetch data from GitLab API
- `dashboard-data-service.js` - Service to process dashboard metrics
- `index.js` - Main application logic
- `pipeline-performance.js` - Pipeline metrics calculations
- `proxy.js` - CORS proxy server for local development