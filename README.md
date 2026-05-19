# ng-metrics

> Angular project health analyzer - scan, analyze, and improve your Angular codebase

## Why ng-metrics?

Keeping Angular projects healthy and up-to-date can be challenging. ng-metrics centralizes project health checks into a single CLI tool:
- **Automates dependency analysis** for Angular, RxJS, zone.js, and more
- **Detects deprecated APIs and anti-patterns** in your TypeScript and templates
- **Calculates a health score** from 0-100 to track project status
- **Suggests safe fixes** and provides migration plans for upgrades
- **Saves time** compared to manual checks across multiple tools

## Features

- 🔍 **Dependency Analysis** - scan for Angular packages, deprecated dependencies, and zone.js usage
- 📊 **Code Analysis** - detect deprecated APIs, legacy template syntax, and RxJS bad patterns
- 🎯 **Project Health Score** - 0-100 score with excellent/good/warning/critical levels
- 🔧 **Fix Engine** - safe auto-fixes for tslint, codelyzer, and more
- 📋 **Migration Advisor** - step-by-step migration plans for Angular upgrades
- 📦 **Unified Report** - single command to run all analyses at once

## Installation

### Global Installation
```bash
npm install -g ng-metrics
```

### NPX Usage (no installation required)
```bash
npx ng-metrics
```

## Usage Examples

### Default: Run full analysis
```bash
ng-metrics
```

### Explicit full analysis
```bash
ng-metrics analyze
```

### Analyze custom source directory
```bash
ng-metrics analyze --dir src-app
```

### Scan dependencies only
```bash
ng-metrics scan
```

### Analyze TypeScript and template files
```bash
ng-metrics code
```

### Analyze custom directory
```bash
ng-metrics code --dir src-app
```

### View available fixes (dry-run)
```bash
ng-metrics fix --dry-run
```

### Apply safe fixes
```bash
ng-metrics fix --apply
```

### Show help
```bash
ng-metrics --help
```

## Example CLI Output

```
✔ Analysis complete!

Unified Report:
============================================================
Summary: Project Health Score: 75/100 (good) | Found 2 issue(s) in 2 file(s) | 4 migration step(s)

Project Health:
------------------------------------------------------------
  Score: 75/100
  Level: good

Next Steps:
------------------------------------------------------------
  • ng-metrics code - View detailed code issues
  • ng-metrics scan - View detailed dependency scan
  • ng-metrics --help - View all available commands
```

## What It Detects

### Dependencies
- Angular packages (@angular/*)
- NgRx packages (@ngrx/*)
- RxJS version
- zone.js (marked as legacy/optional for Angular 21+ zoneless)
- Risky packages (tslint, codelyzer)
- Deprecated packages

### Code Issues
- **Deprecated APIs**:
  - `toPromise()` → use `firstValueFrom`/`lastValueFrom`
  - `HttpModule` → use `HttpClientModule`
  - `@ViewChild static:true`
- **Anti-patterns**:
  - Legacy structural directives (*ngIf/*ngFor) for Angular 17+ control flow
- **RxJS Bad Patterns**:
  - Nested subscriptions → use higher-order operators (switchMap, mergeMap, etc.)

## Fix Engine

### Safe Fixes (Auto-applicable)
- Remove tslint
- Remove codelyzer

### Unsafe Fixes (Not Auto-applicable)
- Angular core version upgrades
- RxJS major version changes

## Migration Advisor

Generates step-by-step migration plans for:
- Angular 21+ zoneless architecture
- Angular 17+ control flow syntax
- Deprecated API replacements
- RxJS pattern fixes

## CLI Commands

| Command | Description |
|---------|-------------|
| `ng-metrics` | Run full analysis (default) |
| `ng-metrics analyze` | Run full analysis and generate unified report |
| `ng-metrics scan` | Scan dependencies only |
| `ng-metrics code` | Analyze TypeScript and template files |
| `ng-metrics fix` | Show available fixes (dry-run) |
| `ng-metrics --help` | Show all commands and options |

## Roadmap

Future features planned:
- HTML report generation (`--format html`)
- JSON/YAML report export
- CI/CD integration support
- Custom rule configuration
- Performance analysis
- Bundle size checks
- Multi-project workspace support
- GitHub Actions integration

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
