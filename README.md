# ng-metrics

<!-- <a href="https://kofe.al/@tapdig"><img src="https://kofe.al/assets/images/logo/logo.png?v=1.0" width="200" height="50" alt="Alyshov Tapdig"></a>

You can support me here
</br> -->

&gt; Angular project health analyzer - scan, analyze, and improve your Angular codebase

## Why ng-metrics?

Keeping Angular projects healthy and up-to-date can be challenging. ng-metrics centralizes project health checks into a single CLI tool:
- **Automates dependency analysis** for Angular, RxJS, zone.js, and more
- **Detects deprecated APIs and anti-patterns** in your TypeScript and templates
- **Calculates a health score** from 0-100 to track project status
- **Suggests safe fixes** and provides migration plans for upgrades
- **Saves time** compared to manual checks across multiple tools

## Features

- **Dependency Analysis** - Risk Assessment: Penalizes risky/deprecated dependencies (tslint, codelyzer, legacy zone.js).
- **Dead Code Detection**: Identifies unused components, directives, and pipes and safely removes them.
- **Code Analysis** - detect deprecated APIs, legacy template syntax, and RxJS bad patterns
- **Bundle Size Analysis** - analyze your production build bundle sizes, identify large files, and get optimization recommendations
- **Project Health Score** - 0-100 score with excellent/good/warning/critical levels
- **Fix Engine** - safe auto-fixes for tslint, codelyzer, and more
- **Migration Advisor** - step-by-step migration plans for Angular upgrades
- **Unified Report** - single command to run all analyses at once
- **Multiple Output Formats** - export reports in text, JSON, YAML, or HTML formats (powered by Handlebars)
- **File Export** - save reports to files for documentation or CI/CD integration
- **Configuration File Support** - customize behavior with `.ng-metricsrc`, `.ng-metricsrc.json`, or `package.json`

## Configuration

### Quick Start

To create a default configuration file, run:

```bash
ng-metrics init
```

This will create `ng-metrics.config.json` with all default settings.

To overwrite an existing configuration file:

```bash
ng-metrics init --force
```

### Configuration Files

ng-metrics supports configuration files to customize its behavior. You can use one of the following files:

- `.ng-metricsrc` (JSON format)
- `.ng-metricsrc.json`
- `ng-metrics.config.json`
- `package.json` (under the `ngMetrics` field)

### Example Configuration

**ng-metrics.config.json**:
```json
{
  "srcDir": "src",
  "exclude": [
    "node_modules/",
    "dist/",
    "src/test/"
  ],
  "rules": {
    "changeDetectionOnPush": true,
    "legacyStructuralDirectives": true,
    "ngForTrackBy": true,
    "toPromise": true,
    "viewChildStatic": true,
    "httpModule": true,
    "windowDocumentReference": true,
    "nativeElementManipulation": true,
    "rxjsMemoryLeak": true,
    "nestedSubscriptions": true,
    "forTrackByIndex": true,
    "innerHtmlBinding": true,
    "bypassSecurityTrust": true,
    "bundleSize": true
  },
  "useAst": false,
  "minHealthScore": 80
}
```

**package.json**:
```json
{
  "name": "my-angular-app",
  "ngMetrics": {
    "srcDir": "src",
    "exclude": ["src/testing/"],
    "rules": {
      "changeDetectionOnPush": false
    }
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `srcDir` | string | `src` | Source directory to analyze |
| `exclude` | string[] | `[]` | Files/directories to exclude from analysis |
| `rules` | object | All true | Enable/disable specific analysis rules |
| `minHealthScore` | number | `undefined` | Minimum health score threshold (for CI/CD) |
| `useAst` | boolean | `false` | Use TypeScript AST for more accurate TypeScript analysis |

### Available Rules

| Rule | Description |
|------|-------------|
| `viewChildStatic` | Check for deprecated @ViewChild static option |
| `toPromise` | Check for deprecated RxJS toPromise() |
| `httpModule` | Check for deprecated HttpModule |
| `changeDetectionOnPush` | Check for missing ChangeDetectionStrategy.OnPush |
| `windowDocumentReference` | Check for direct window/document references |
| `nativeElementManipulation` | Check for direct nativeElement DOM manipulation |
| `rxjsMemoryLeak` | Check for potential RxJS subscription memory leaks (skips files that already use takeUntil / unsubscribe / take(1) / first()) |
| `nestedSubscriptions` | Check for nested RxJS subscriptions |
| `legacyStructuralDirectives` | Check for legacy *ngIf/*ngFor directives |
| `ngForTrackBy` | Check for missing trackBy in *ngFor |
| `forTrackByIndex` | Check for @for tracking by index |
| `innerHtmlBinding` | Check for [innerHTML] XSS risk |
| `bypassSecurityTrust` | Check for DOM sanitizer bypass |
| `bundleSize` | Enable bundle size analysis (true by default) |

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

### Export as JSON
```bash
ng-metrics analyze --format json
```

### Export as YAML
```bash
ng-metrics analyze --format yaml
```

### Export as HTML
```bash
ng-metrics analyze --format html
```

### Save report to file
```bash
ng-metrics analyze --format json --output report.json
ng-metrics analyze --format yaml --output report.yaml
ng-metrics analyze --format html --output report.html
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
  - Legacy structural directives (`*ngIf`, `*ngFor`) for Angular 17+ control flow
  - Direct reference to `window` or `document` (reduces SSR compatibility)
  - Direct DOM manipulation via `ElementRef.nativeElement` (use `Renderer2` instead)
  - Components missing `ChangeDetectionStrategy.OnPush` (performance optimization)
  - Lists (`*ngFor`) missing `trackBy` function (performance optimization)
  - Discouraged `@for` list tracking by `$index` or `index`
- **RxJS Bad Patterns**:
  - Nested subscriptions → use higher-order operators (switchMap, mergeMap, etc.)
  - Potential memory leaks (active subscriptions without `takeUntil`, `take(1)`, `first()`, or `unsubscribe()`)

## Bundle Size Analysis

ng-metrics automatically analyzes your Angular build bundles (looking in `dist/`, `dist/browser/`, or `build/` directories by default):

- **Total Bundle Size**: Shows the combined size of all your production bundles
- **Individual File Analysis**: Breaks down each bundle (main, polyfills, styles, vendor, etc.) with their sizes
- **Warnings for Large Bundles**: Alerts you when main bundle exceeds 1MB or any bundle exceeds 2MB
- **Optimization Recommendations**: Provides actionable suggestions like:
  - Using Angular's built-in build optimizer
  - Implementing lazy loading for feature modules
  - Tree-shaking unused code and dependencies
  - Optimizing images and assets
  - Splitting large vendor bundles

**Note**: Make sure you've built your Angular project for production before running bundle analysis! (e.g., `ng build --configuration production`)

## Fix Engine

### Safe Fixes (Auto-applicable)
- Remove `tslint` and `codelyzer` from package dependencies
- Remove legacy `{ static: true | false }` configurations from `@ViewChild` declarations
- Automatically migrate RxJS `toPromise()` to `firstValueFrom()` conversion
- Dead Code Removal (Deletes unused component/directive/pipe files and cleans up module imports/declarations)
- *More coming soon!*

## Migration Advisor

Generates step-by-step migration plans for:
- Angular 21+ zoneless architecture
- Angular 17+ control flow syntax
- Deprecated API replacements
- RxJS pattern fixes

## CLI Commands

| Command | Description |
|---------|-------------|
| `ng-metrics init` | Create default ng-metrics.config.json configuration file |
| `ng-metrics init --force` | Overwrite existing configuration file |
| `ng-metrics` | Run full analysis (default) |
| `ng-metrics analyze` | Run full analysis and generate unified report |
| `ng-metrics analyze --format <format>` | Specify output format: text (default), json, yaml, html |
| `ng-metrics analyze --output <file>` | Save report to file instead of stdout |
| `ng-metrics scan` | Scan dependencies only |
| `ng-metrics code` | Analyze TypeScript and template files |
| `ng-metrics audit` | Audit the project for security issues, XSS risks, and unsafe practices |
| `ng-metrics fix` | Show available fixes (dry-run) |
| `ng-metrics --help` | Show all commands and options |

## CI/CD Integration

ng-metrics can be easily integrated into your CI/CD pipelines. **This integration is optional** - you can use ng-metrics normally without any CI setup.

If you want to automatically check your project's health on every commit or pull request (and optionally block builds/deploys if the health score is too low), follow the examples below.

### GitHub Actions

Add a `.github/workflows/ng-metrics.yml` file to your project:

```yaml
name: ng-metrics CI

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  ng-metrics:
    name: Run ng-metrics Analysis
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install ng-metrics
        run: npm install -g ng-metrics
      
      - name: Run ng-metrics analyze
        run: ng-metrics analyze --fail-on-low-score
      
      - name: Upload analysis report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: ng-metrics-report
          path: ng-metrics-report.*
```

### GitLab CI

Add a `.gitlab-ci.yml` file to your project (or add to existing one):

```yaml
stages:
  - analyze

ng-metrics:
  stage: analyze
  image: node:20
  script:
    - npm install -g ng-metrics
    - ng-metrics analyze --fail-on-low-score
  artifacts:
    when: always
    paths:
      - ng-metrics-report.*
```

### CI Command Options

All of these options are **completely optional**:

- `--fail-on-low-score`: Fails the process with exit code 1 if the health score is below `minHealthScore` (only use this if you want to block CI pipelines on low scores)
- `--min-score <score>`: Overrides the config value and uses this minimum score instead (requires `--fail-on-low-score`)
- `--output <file>`: Saves the report to a file for later review (can be used with or without CI)

## Roadmap

Future features planned:
- Custom rule configuration
- Performance analysis
- Multi-project workspace support

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
