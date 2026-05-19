import * as fs from 'fs';
import * as path from 'path';
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
  /**
   * Climbs up the directory tree starting from startDir until it finds a directory
   * containing a package.json file. Falls back to process.cwd() if none is found.
   */
  private findProjectRoot(startDir: string): string {
    let currentDir = path.resolve(startDir);
    
    try {
      if (fs.existsSync(currentDir) && fs.statSync(currentDir).isFile()) {
        currentDir = path.dirname(currentDir);
      }
    } catch (e) {
      // Ignore
    }

    while (true) {
      if (fs.existsSync(path.join(currentDir, 'package.json'))) {
        return currentDir;
      }
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        break;
      }
      currentDir = parentDir;
    }
    return process.cwd();
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
      resolvedProjectPath = this.findProjectRoot(absoluteSrcDir);
    }

    const packageScanner = new PackageScannerService();
    const riskAnalyzer = new RiskAnalysisService();
    const codeAnalyzer = new CodeAnalysisService();
    const fixSuggestionService = new FixSuggestionService();
    const migrationAdvisor = new MigrationAdvisorService();

    const scanResult = packageScanner.scan(resolvedProjectPath);
    const healthScore = riskAnalyzer.analyze(scanResult);
    const codeIssues = codeAnalyzer.analyze(resolvedProjectPath, customSrcDir);
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
