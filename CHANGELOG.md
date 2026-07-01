# Changelog

All notable changes to this project will be documented in this file.

## [1.11.0] - 2026-07-01

### Added
- **CI/CD Integration Support**: Added new command line options and example workflow configurations for GitHub Actions and GitLab CI.
  - `--fail-on-low-score`: Fails the process with exit code 1 if health score is below configured `minHealthScore`
  - `--min-score <score>`: Overrides the configured minimum health score
  - Example GitHub Actions workflow: `.github/workflows/ci.yml`
  - Example GitLab CI configuration: `docs/gitlab-ci-example.yml`
- **Documentation Updates**: Added comprehensive CI/CD integration guide to README.md with clear notes that all CI features are optional.

### Changed
- Improved error handling in `analyze` command to ensure proper process exit codes when using CI flags.

## [1.10.0] - 2026-06-29

### Fixed
- **Security Audit Filter Bug**: Fixed `audit` command where risky/deprecated packages were not detected correctly due to exact string matching — now uses substring checks.
- **JSON Parsing Errors**: Added proper try-catch error handling for JSON.parse operations in `PackageScannerService` and `FixEngineService` with meaningful error messages.

### Improved
- **Type Safety**: Removed all `any` type usages from source code (replaced with proper types like `Record<string, unknown>`, `PackageJson`, and used `vi.mocked()` instead of type casts in tests).
- **Code Duplication**: Extracted shared directory scanning logic to `src/utils/file-system.ts` and updated all services to use it.
- **Input Validation**: Added comprehensive input validation to `ConfigService` for all configuration options (srcDir, exclude, minHealthScore, useAst).
- **Magic Numbers**: Replaced hardcoded health score thresholds with named constants in `RiskAnalysisService` for better maintainability.

## [1.9.0] - 2026-06-23

### Fixed
- **Version Mismatch**: CLI now reads its version dynamically from `package.json` instead of a hardcoded string, so `ng-metrics --version` always returns the correct version.
- **Upgrade Step Numbering**: The Angular version upgrade suggestion in `FixSuggestionService` no longer prints every step as `1.` — the step counter is now incremented correctly (1., 2., 3., …).
- **Nested Subscription Detector**: Rewrote the parenthesis-balance algorithm in `CodeAnalysisService.detectNestedSubscriptions` to correctly track subscription depth and avoid false early resets of the `inSubscription` flag.
- **AST Memory Leak False Positives**: `AstCodeAnalyzerService` now checks whether a file already uses `takeUntil`, `unsubscribe()`, `take(1)`, or `first()` before flagging every `.subscribe()` call as a potential memory leak.
- **Dead Code False Positives in Libraries**: `DeadCodeAnalyzerService` now recognises classes that are re-exported from a barrel `index.ts` file as "used" and no longer incorrectly flags them as dead code.

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
