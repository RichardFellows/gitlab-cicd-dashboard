# GitLab CI/CD Dashboard

A dashboard to visualize CI/CD metrics for GitLab repositories under a specific group ID.

## Features

- Track pipeline success/failure rates
- Monitor build times
- View test coverage
- Compare metrics across repositories
- Real-time data updates

## Getting Started

1. Clone this repository
2. Open `index.html` in your browser
3. Enter your GitLab private token and group ID
4. View your CI/CD metrics

## Files

- `index.html` - Main dashboard interface
- `gitlab-api-service.js` - Service to fetch data from GitLab API
- `dashboard-data-service.js` - Service to process dashboard metrics
- `index.js` - Main application logic