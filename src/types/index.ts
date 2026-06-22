export interface PackageMetadata {
  name: string;
  version?: string;
  status?: string;
  recommendation?: string;
}

export type HealthLevel = 'excellent' | 'good' | 'warning' | 'critical';
export type IssueType = 'deprecated_api' | 'anti_pattern' | 'rxjs_issue' | 'security_issue';
export type PriorityLevel = 'high' | 'medium' | 'low';


export interface ScanResult {
  metadata: {
    angularVersion?: string;
    isAngular21Plus: boolean;
  };
  packages: PackageMetadata[];
}

export interface HealthScore {
  score: number;
  level: HealthLevel;
  issues: string[];
}

export interface CodeIssue {
  type: IssueType;
  message: string;
  line?: number;
  suggestion?: string;
}

export interface FileAnalysisResult {
  file: string;
  issues: CodeIssue[];
}

export interface FixSuggestion {
  issue: string;
  suggestion: string;
  priority: PriorityLevel;
}

export interface GroupedSuggestions {
  autoFixable: FixSuggestion[];
  manualReviewRequired: FixSuggestion[];
}

export interface MigrationStep {
  step: number;
  title: string;
  description: string;
  priority: PriorityLevel;
}

export interface FixChange {
  type: string;
  package: string;
  before: string;
  after: string;
}

export interface FixResult {
  applied: boolean;
  changes: FixChange[];
}

export interface UnifiedReport {
  projectHealth: {
    score: number;
    level: string;
  };
  dependencies: PackageMetadata[];
  codeIssues: FileAnalysisResult[];
  fixes: GroupedSuggestions;
  migrationPlan: MigrationStep[];
  /** Bundle size analysis results (if enabled) */
  bundleAnalysis?: BundleAnalysisResult;
  summary: string;
}

export interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

export interface ConfigRules {
  /** Enable/disable @ViewChild static option check */
  viewChildStatic?: boolean;
  /** Enable/disable toPromise() deprecation check */
  toPromise?: boolean;
  /** Enable/disable HttpModule deprecation check */
  httpModule?: boolean;
  /** Enable/disable ChangeDetectionStrategy.OnPush check */
  changeDetectionOnPush?: boolean;
  /** Enable/disable window/document direct reference check */
  windowDocumentReference?: boolean;
  /** Enable/disable nativeElement DOM manipulation check */
  nativeElementManipulation?: boolean;
  /** Enable/disable RxJS subscription memory leak check */
  rxjsMemoryLeak?: boolean;
  /** Enable/disable nested subscriptions check */
  nestedSubscriptions?: boolean;
  /** Enable/disable legacy structural directives (*ngIf, *ngFor) check */
  legacyStructuralDirectives?: boolean;
  /** Enable/disable *ngFor trackBy check */
  ngForTrackBy?: boolean;
  /** Enable/disable @for track by index check */
  forTrackByIndex?: boolean;
  /** Enable/disable [innerHTML] XSS check */
  innerHtmlBinding?: boolean;
  /** Enable/disable DOM sanitizer bypass check */
  bypassSecurityTrust?: boolean;
  /** Enable/disable bundle size analysis */
  bundleSize?: boolean;
}

export interface Config {
  /** Source directory to analyze (default: src) */
  srcDir?: string;
  /** Files/directories to exclude from analysis */
  exclude?: string[];
  /** Enable/disable specific rules */
  rules?: ConfigRules;
  /** Minimum health score threshold (for CI/CD) */
  minHealthScore?: number;
  /** Use TypeScript AST for more accurate analysis (default: false for backward compatibility) */
  useAst?: boolean;
}

export interface BundleFile {
  /** Path to the bundle file */
  path: string;
  /** Size of the file in bytes */
  sizeBytes: number;
  /** Human-readable size (e.g., 1.2 MB, 500 KB) */
  sizeHumanReadable: string;
  /** Type of the bundle file */
  type: 'main' | 'polyfills' | 'styles' | 'scripts' | 'vendor' | 'chunk' | 'other';
}

export interface BundleAnalysisResult {
  /** Total size of all bundles in bytes */
  totalSizeBytes: number;
  /** Human-readable total size */
  totalSizeHumanReadable: string;
  /** List of analyzed bundle files */
  files: BundleFile[];
  /** Warnings about bundle sizes */
  warnings: string[];
  /** Recommendations for reducing bundle size */
  recommendations: string[];
}

export interface ConfigFile {
  ngMetrics?: Config;
}
