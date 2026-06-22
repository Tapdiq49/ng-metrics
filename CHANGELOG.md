# Changelog

All notable changes to this project will be documented in this file.

## [1.8.0] - 2026-06-22

### Added
- **Handlebars Template Engine**: Integrated Handlebars (`.hbs`) for generating HTML reports, fully separating logic from presentation.

### Changed
- **Async Architecture**: Refactored `TemplateRendererService` to use non-blocking asynchronous file operations (`fs/promises`).
- **Template Caching**: HTML report templates are now compiled and cached in memory for significantly improved performance on subsequent runs.
- **Type Centralization**: Moved internal type declarations (e.g., `HealthLevel`, `IssueType`) to the central `types/index.ts` file for better DRY compliance.

## [1.7.0] - 2026-06-16

### Added
- **Dead Code Analyzer**: Automatically detects unused components, directives, and pipes across the project.
- **Dead Code Fixer**: Integrated into `ng-metrics fix` command to automatically delete unused files and remove them from `NgModule` declarations and imports.
- Added Angular v22 support check to risk analysis.

### Changed
- Improved `CodeAnalysisService` to include the new Dead Code Analyzer logic.
- Bumped latest supported Angular version check to 22.
