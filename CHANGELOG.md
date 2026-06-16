# Changelog

All notable changes to this project will be documented in this file.

## [1.7.0] - 2026-06-16

### Added
- **Dead Code Analyzer**: Automatically detects unused components, directives, and pipes across the project.
- **Dead Code Fixer**: Integrated into `ng-metrics fix` command to automatically delete unused files and remove them from `NgModule` declarations and imports.
- Added Angular v22 support check to risk analysis.

### Changed
- Improved `CodeAnalysisService` to include the new Dead Code Analyzer logic.
- Bumped latest supported Angular version check to 22.
