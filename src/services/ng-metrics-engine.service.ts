import { PackageScannerService, ScanResult } from './package-scanner.service';
import { RiskAnalysisService, HealthScore } from './risk-analysis.service';
import { CodeAnalysisService, FileAnalysisResult } from './code-analysis.service';
import { FixSuggestionService, GroupedSuggestions } from './fix-suggestion.service';
import { MigrationAdvisorService, MigrationStep } from './migration-advisor.service';

export interface UnifiedReport {
  projectHealth: {
    score: number;
    level: string;
  };
  dependencies: ScanResult['packages'];
  codeIssues: FileAnalysisResult[];
  fixes: GroupedSuggestions;
  migrationPlan: MigrationStep[];
  summary: string;
}

export class NgMetricsEngineService {
  public analyze(projectPath: string = process.cwd(), customSrcDir?: string): UnifiedReport {
    const packageScanner = new PackageScannerService();
    const riskAnalyzer = new RiskAnalysisService();
    const codeAnalyzer = new CodeAnalysisService();
    const fixSuggestionService = new FixSuggestionService();
    const migrationAdvisor = new MigrationAdvisorService();

    const scanResult = packageScanner.scan(projectPath);
    const healthScore = riskAnalyzer.analyze(scanResult);
    const codeIssues = codeAnalyzer.analyze(projectPath, customSrcDir);
    const fixSuggestions = fixSuggestionService.generate(healthScore, scanResult);
    const migrationPlan = migrationAdvisor.advise(scanResult, codeIssues);

    const summary = this.generateSummary(healthScore, codeIssues, fixSuggestions, migrationPlan);

    return {
      projectHealth: {
        score: healthScore.score,
        level: healthScore.level
      },
      dependencies: scanResult.packages,
      codeIssues,
      fixes: fixSuggestions,
      migrationPlan,
      summary
    };
  }

  private generateSummary(
    healthScore: HealthScore, 
    codeIssues: FileAnalysisResult[], 
    fixSuggestions: GroupedSuggestions, 
    migrationPlan: MigrationStep[]
  ): string {
    const totalIssues = healthScore.issues.length;
    const totalFilesWithIssues = codeIssues.length;
    const totalFixable = fixSuggestions.autoFixable.length;
    const totalMigrationSteps = migrationPlan.length;

    let summary = `Project Health Score: ${healthScore.score}/100 (${healthScore.level})`;
    if (totalIssues > 0) {
      summary += ` | Found ${totalIssues} issue(s)`;
    }
    if (totalFilesWithIssues > 0) {
      summary += ` in ${totalFilesWithIssues} file(s)`;
    }
    if (totalFixable > 0) {
      summary += ` | ${totalFixable} auto-fixable`;
    }
    if (totalMigrationSteps > 0) {
      summary += ` | ${totalMigrationSteps} migration step(s)`;
    }

    return summary;
  }
}
