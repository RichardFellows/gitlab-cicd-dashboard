# Changelog for GitLab CI/CD Dashboard

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Added GitHub Actions workflow for automatic deployment to GitHub Pages

### Changed
- Reorganized project structure for better maintainability:
  - Created `src/` directory with subdirectories for components, services, and utils
  - Created `public/` directory for static assets
  - Created `scripts/` directory for development scripts
  - Created `tests/` directory that mirrors the source structure
  - Updated file paths accordingly
- Made the table view the default view instead of card view
- Removed duplicated metrics in the expanded rows of the table view

### Fixed
- Updated `start.js` to correctly serve files from the new folder structure
- Fixed server paths to properly serve files from both `public/` and `src/` directories

## [1.0.0] - 2025-03-23

### Added
- Initial release of the GitLab CI/CD Dashboard
- Project pipeline status visualization
- Pipeline success rate metrics calculation
- Pipeline duration tracking
- Code coverage display
- Open merge request tracking
- Failed job analysis
- Recent commit history display
- Table view component for displaying project data
- Jest testing framework integration
- Proxy server for handling API requests

### Changed
- N/A (Initial release)

### Fixed
- N/A (Initial release)

## Future Commits

When making new commits, please follow this format:
```
## [Version] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes in existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Now removed features

### Fixed
- Bug fixes

### Security
- Vulnerability fixes
```