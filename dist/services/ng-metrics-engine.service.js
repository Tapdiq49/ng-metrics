"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NgMetricsEngineService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const package_scanner_service_1 = require("./package-scanner.service");
const risk_analysis_service_1 = require("./risk-analysis.service");
const code_analysis_service_1 = require("./code-analysis.service");
const fix_suggestion_service_1 = require("./fix-suggestion.service");
const migration_advisor_service_1 = require("./migration-advisor.service");
class NgMetricsEngineService {
    /**
     * Climbs up the directory tree starting from startDir until it finds a directory
     * containing a package.json file. Falls back to process.cwd() if none is found.
     */
    findProjectRoot(startDir) {
        let currentDir = path.resolve(startDir);
        try {
            if (fs.existsSync(currentDir) && fs.statSync(currentDir).isFile()) {
                currentDir = path.dirname(currentDir);
            }
        }
        catch (e) {
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
    analyze(projectPath = process.cwd(), customSrcDir) {
        let resolvedProjectPath = projectPath;
        if (customSrcDir) {
            // Locate the project root containing package.json relative to the custom source directory
            const absoluteSrcDir = path.resolve(projectPath, customSrcDir);
            resolvedProjectPath = this.findProjectRoot(absoluteSrcDir);
        }
        const packageScanner = new package_scanner_service_1.PackageScannerService();
        const riskAnalyzer = new risk_analysis_service_1.RiskAnalysisService();
        const codeAnalyzer = new code_analysis_service_1.CodeAnalysisService();
        const fixSuggestionService = new fix_suggestion_service_1.FixSuggestionService();
        const migrationAdvisor = new migration_advisor_service_1.MigrationAdvisorService();
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
