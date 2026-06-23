import * as path from 'path';
import { PackageScannerService } from './package-scanner.service';
import { RiskAnalysisService } from './risk-analysis.service';
import { CodeAnalysisService } from './code-analysis.service';
import { FixSuggestionService } from './fix-suggestion.service';
import { MigrationAdvisorService } from './migration-advisor.service';
import { ConfigService } from './config.service';
import { BundleAnalyzerService } from './bundle-analyzer.service';
import { findProjectRoot } from '../utils/project-root';
import type { HealthScore, FileAnalysisResult, GroupedSuggestions, MigrationStep, UnifiedReport, Config, BundleAnalysisResult } from '../types';

export class NgMetricsEngineService {
  private configService: ConfigService;

  constructor() {
    this.configService = new ConfigService();
  }

  /**
   * Coordinates the full analysis report. Resolves the correct project root
   * to ensure code analysis and package scanning check the same project context.
   */
  public analyze(projectPath: string = process.cwd(), customSrcDir?: string): UnifiedReport {
    let resolvedProjectPath = projectPath;
    if (customSrcDir) {
      // Locate the project root containing package.json relative to the custom source directory
      const absoluteSrcDir = path.resolve(projectPath, customSrcDir);
      resolvedProjectPath = findProjectRoot(absoluteSrcDir);
    }

    const config = this.configService.load(resolvedProjectPath);

    const packageScanner = new PackageScannerService();
    const riskAnalyzer = new RiskAnalysisService();
    const codeAnalyzer = new CodeAnalysisService(config);
    const fixSuggestionService = new FixSuggestionService();
    const migrationAdvisor = new MigrationAdvisorService();
    const bundleAnalyzer = new BundleAnalyzerService(config);

    const scanResult = packageScanner.scan(resolvedProjectPath);
    const healthScore = riskAnalyzer.analyze(scanResult);
    const codeIssues = codeAnalyzer.analyze(resolvedProjectPath, customSrcDir);
    const fixSuggestions = fixSuggestionService.generate(healthScore, scanResult);
    const migrationPlan = migrationAdvisor.advise(scanResult, codeIssues);
    
    // Run bundle analysis if enabled in config
    let bundleAnalysis: BundleAnalysisResult | undefined;
    if (config.rules?.bundleSize !== false) {
      const analysis = bundleAnalyzer.analyze(resolvedProjectPath);
      bundleAnalysis = analysis !== null ? analysis : undefined;
    }

    const summary = this.generateSummary(healthScore, codeIssues, fixSuggestions, migrationPlan, bundleAnalysis);

    return {
      projectHealth: {
        score: healthScore.score,
        level: healthScore.level
      },
      dependencies: scanResult.packages,
      codeIssues,
      fixes: fixSuggestions,
      migrationPlan,
      bundleAnalysis,
      summary
    };
  }

  private generateSummary(
    healthScore: HealthScore, 
    codeIssues: FileAnalysisResult[], 
    fixSuggestions: GroupedSuggestions, 
    migrationPlan: MigrationStep[],
    bundleAnalysis?: { totalSizeHumanReadable?: string } | null
  ): string {
    const totalIssues = healthScore.issues.length;
    const totalFilesWithIssues = codeIssues.length;
    const totalFixable = fixSuggestions.autoFixable.length;
    const totalMigrationSteps = migrationPlan.length;

    let summary = `Project Health Score: ${healthScore.score}/100 (${healthScore.level})`;
    if (bundleAnalysis?.totalSizeHumanReadable) {
      summary += ` | Total Bundle Size: ${bundleAnalysis.totalSizeHumanReadable}`;
    }
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
