"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NgMetricsEngineService = void 0;
const package_scanner_service_1 = require("./package-scanner.service");
const risk_analysis_service_1 = require("./risk-analysis.service");
const code_analysis_service_1 = require("./code-analysis.service");
const fix_suggestion_service_1 = require("./fix-suggestion.service");
const migration_advisor_service_1 = require("./migration-advisor.service");
class NgMetricsEngineService {
    analyze(projectPath = process.cwd(), customSrcDir) {
        const packageScanner = new package_scanner_service_1.PackageScannerService();
        const riskAnalyzer = new risk_analysis_service_1.RiskAnalysisService();
        const codeAnalyzer = new code_analysis_service_1.CodeAnalysisService();
        const fixSuggestionService = new fix_suggestion_service_1.FixSuggestionService();
        const migrationAdvisor = new migration_advisor_service_1.MigrationAdvisorService();
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
    generateSummary(healthScore, codeIssues, fixSuggestions, migrationPlan) {
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
exports.NgMetricsEngineService = NgMetricsEngineService;
