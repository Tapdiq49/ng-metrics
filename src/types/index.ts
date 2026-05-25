export interface PackageMetadata {
  name: string;
  version?: string;
  status?: string;
  recommendation?: string;
}

export interface ScanResult {
  metadata: {
    angularVersion?: string;
    isAngular21Plus: boolean;
  };
  packages: PackageMetadata[];
}

export interface HealthScore {
  score: number;
  level: 'excellent' | 'good' | 'warning' | 'critical';
  issues: string[];
}

export interface CodeIssue {
  type: 'deprecated_api' | 'anti_pattern' | 'rxjs_issue' | 'security_issue';
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
  priority: 'high' | 'medium' | 'low';
}

export interface GroupedSuggestions {
  autoFixable: FixSuggestion[];
  manualReviewRequired: FixSuggestion[];
}

export interface MigrationStep {
  step: number;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
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
  summary: string;
}

export interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}
