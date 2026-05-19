"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeCommand = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const ng_metrics_engine_service_1 = require("../services/ng-metrics-engine.service");
exports.analyzeCommand = new commander_1.Command('analyze')
    .description('Run full analysis and generate unified report')
    .option('-d, --dir <dir>', 'Source directory to analyze (default: src)')
    .action(async (options) => {
    const spinner = (0, ora_1.default)('Running full analysis...').start();
    try {
        const engine = new ng_metrics_engine_service_1.NgMetricsEngineService();
        const report = engine.analyze(process.cwd(), options.dir);
        spinner.succeed(chalk_1.default.green('Analysis complete!'));
        console.log('\n' + chalk_1.default.bold('Unified Report:'));
        console.log('='.repeat(60));
        console.log(chalk_1.default.cyan.bold('Summary:'), report.summary);
        console.log('\n' + chalk_1.default.bold('Project Health:'));
        console.log('-'.repeat(60));
        const levelColors = {
            excellent: chalk_1.default.green,
            good: chalk_1.default.blue,
            warning: chalk_1.default.yellow,
            critical: chalk_1.default.red
        };
        console.log(`  Score: ${chalk_1.default.cyan(report.projectHealth.score)}/100`);
        console.log(`  Level: ${levelColors[report.projectHealth.level](report.projectHealth.level)}`);
        if (report.dependencies.length > 0) {
            console.log('\n' + chalk_1.default.bold('Detected Dependencies:'));
            console.log('-'.repeat(60));
            report.dependencies.forEach(dep => {
                let line = `  ${chalk_1.default.cyan(dep.name)} (${dep.version || 'unknown'})`;
                if (dep.status) {
                    line += ` - ${chalk_1.default.yellow(dep.status)}`;
                }
                console.log(line);
            });
        }
        if (report.codeIssues.length > 0) {
            console.log('\n' + chalk_1.default.bold('Code Issues:'));
            console.log('-'.repeat(60));
            for (const fileResult of report.codeIssues) {
                console.log('\n  ' + chalk_1.default.cyan.bold(fileResult.file));
                for (const issue of fileResult.issues) {
                    const typeColor = {
                        deprecated_api: chalk_1.default.red,
                        anti_pattern: chalk_1.default.yellow,
                        rxjs_issue: chalk_1.default.magenta
                    };
                    const lineInfo = issue.line ? chalk_1.default.gray(`(line ${issue.line})`) : '';
                    console.log(`    ${typeColor[issue.type](`[${issue.type}]`)} ${issue.message} ${lineInfo}`);
                }
            }
        }
        const hasFixes = report.fixes.autoFixable.length > 0 || report.fixes.manualReviewRequired.length > 0;
        if (hasFixes) {
            console.log('\n' + chalk_1.default.bold('Fix Suggestions:'));
            console.log('-'.repeat(60));
            if (report.fixes.autoFixable.length > 0) {
                console.log('\n  ' + chalk_1.default.green.bold('✓ Auto-fixable:'));
                report.fixes.autoFixable.forEach((fix, i) => {
                    console.log(`    ${i + 1}. ${chalk_1.default.cyan(`[${fix.priority}]`)} ${fix.issue}`);
                    console.log(`       ${chalk_1.default.gray(fix.suggestion)}`);
                });
            }
            if (report.fixes.manualReviewRequired.length > 0) {
                console.log('\n  ' + chalk_1.default.yellow.bold('⚠ Manual review required:'));
                report.fixes.manualReviewRequired.forEach((fix, i) => {
                    console.log(`    ${i + 1}. ${chalk_1.default.cyan(`[${fix.priority}]`)} ${fix.issue}`);
                    console.log(`       ${chalk_1.default.gray(fix.suggestion)}`);
                });
            }
        }
        if (report.migrationPlan.length > 0) {
            console.log('\n' + chalk_1.default.bold('Migration Plan:'));
            console.log('-'.repeat(60));
            report.migrationPlan.forEach(step => {
                const priorityColor = step.priority === 'high' ? chalk_1.default.red : step.priority === 'medium' ? chalk_1.default.yellow : chalk_1.default.blue;
                console.log(`  ${chalk_1.default.bold(`Step ${step.step}:`)} ${step.title}`);
                console.log(`     ${priorityColor(`[${step.priority}]`)} ${step.description}`);
            });
        }
        console.log('\n' + chalk_1.default.bold('Full Report (JSON):'));
        console.log('-'.repeat(60));
        console.log(JSON.stringify(report, null, 2));
        console.log('\n' + chalk_1.default.bold('Next Steps:'));
        console.log('-'.repeat(60));
        const nextSteps = [];
        if (report.fixes.autoFixable.length > 0) {
            nextSteps.push(chalk_1.default.cyan('ng-metrics fix --apply') + ' - Apply auto-fixable changes');
        }
        nextSteps.push(chalk_1.default.cyan('ng-metrics code') + ' - View detailed code issues');
        nextSteps.push(chalk_1.default.cyan('ng-metrics scan') + ' - View detailed dependency scan');
        nextSteps.push(chalk_1.default.cyan('ng-metrics --help') + ' - View all available commands');
        nextSteps.forEach(step => console.log(`  • ${step}`));
    }
    catch (error) {
        spinner.fail(chalk_1.default.red('Analysis failed!'));
        console.error(chalk_1.default.red(error instanceof Error ? error.message : 'Unknown error'));
    }
});
