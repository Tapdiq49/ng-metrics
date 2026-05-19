"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanCommand = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const package_scanner_service_1 = require("../services/package-scanner.service");
const risk_analysis_service_1 = require("../services/risk-analysis.service");
const fix_suggestion_service_1 = require("../services/fix-suggestion.service");
exports.scanCommand = new commander_1.Command('scan')
    .description('Scan the project')
    .action(async () => {
    const spinner = (0, ora_1.default)('Scanning project...').start();
    try {
        const scanner = new package_scanner_service_1.PackageScannerService();
        const scanResult = scanner.scan();
        const riskAnalyzer = new risk_analysis_service_1.RiskAnalysisService();
        const healthScore = riskAnalyzer.analyze(scanResult);
        const fixSuggestionService = new fix_suggestion_service_1.FixSuggestionService();
        const groupedSuggestions = fixSuggestionService.generate(healthScore, scanResult);
        spinner.succeed(chalk_1.default.green('Scan completed!'));
        console.log('\n' + chalk_1.default.bold('Project Health Score:'));
        console.log('='.repeat(50));
        const levelColors = {
            excellent: chalk_1.default.green,
            good: chalk_1.default.blue,
            warning: chalk_1.default.yellow,
            critical: chalk_1.default.red
        };
        console.log(chalk_1.default.cyan('Score:'), `${healthScore.score}/100`);
        console.log(chalk_1.default.cyan('Level:'), levelColors[healthScore.level](healthScore.level));
        if (healthScore.issues.length > 0) {
            console.log('\n' + chalk_1.default.bold('Issues Found:'));
            console.log('-'.repeat(50));
            healthScore.issues.forEach((issue, index) => {
                console.log(`${index + 1}. ${chalk_1.default.yellow(issue)}`);
            });
        }
        const hasSuggestions = groupedSuggestions.autoFixable.length > 0 || groupedSuggestions.manualReviewRequired.length > 0;
        if (hasSuggestions) {
            console.log('\n' + chalk_1.default.bold('Fix Suggestions:'));
            console.log('='.repeat(50));
            if (groupedSuggestions.autoFixable.length > 0) {
                console.log('\n' + chalk_1.default.green.bold('✓ Auto-fixable:'));
                console.log('-'.repeat(50));
                groupedSuggestions.autoFixable.forEach((s, i) => {
                    console.log(`${i + 1}. ${chalk_1.default.cyan(`[${s.priority}]`)} ${s.issue}`);
                    console.log(chalk_1.default.gray(`   → ${s.suggestion}`));
                });
            }
            if (groupedSuggestions.manualReviewRequired.length > 0) {
                console.log('\n' + chalk_1.default.yellow.bold('⚠ Manual review required:'));
                console.log('-'.repeat(50));
                groupedSuggestions.manualReviewRequired.forEach((s, i) => {
                    console.log(`${i + 1}. ${chalk_1.default.cyan(`[${s.priority}]`)} ${s.issue}`);
                    console.log(chalk_1.default.gray(`   → ${s.suggestion}`));
                });
            }
        }
        console.log('\n' + chalk_1.default.bold('Angular Information:'));
        console.log('-'.repeat(50));
        if (scanResult.metadata.angularVersion) {
            console.log(chalk_1.default.cyan('Angular Version:'), scanResult.metadata.angularVersion);
            console.log(chalk_1.default.cyan('Angular 21+:'), scanResult.metadata.isAngular21Plus ? chalk_1.default.green('Yes') : chalk_1.default.yellow('No'));
        }
        else {
            console.log(chalk_1.default.yellow('No Angular core package detected'));
        }
        console.log('\n' + chalk_1.default.bold('Detected Packages:'));
        console.log('-'.repeat(50));
        scanResult.packages.forEach(pkg => {
            let packageLine = `${pkg.name} (${pkg.version || 'unknown'})`;
            if (pkg.status) {
                packageLine += ` - ${chalk_1.default.yellow(pkg.status)}`;
            }
            console.log(packageLine);
            if (pkg.recommendation) {
                console.log(chalk_1.default.gray(`  → ${pkg.recommendation}`));
            }
        });
        console.log('\n' + chalk_1.default.bold('Full Metadata:'));
        console.log('-'.repeat(50));
        console.log(JSON.stringify({
            scanResult,
            healthScore,
            fixSuggestions: groupedSuggestions
        }, null, 2));
    }
    catch (error) {
        spinner.fail(chalk_1.default.red('Scan failed!'));
        console.error(chalk_1.default.red(error instanceof Error ? error.message : 'Unknown error'));
    }
});
