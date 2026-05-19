"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.codeCommand = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const code_analysis_service_1 = require("../services/code-analysis.service");
exports.codeCommand = new commander_1.Command('code')
    .description('Analyze Angular TypeScript and template files')
    .option('-d, --dir <dir>', 'Source directory to analyze (default: src)')
    .action(async (options) => {
    const spinner = (0, ora_1.default)('Analyzing code...').start();
    try {
        const analyzer = new code_analysis_service_1.CodeAnalysisService();
        const results = analyzer.analyze(process.cwd(), options.dir);
        spinner.succeed(chalk_1.default.green('Code analysis completed!'));
        console.log('\n' + chalk_1.default.bold('Code Analysis Results:'));
        console.log('='.repeat(50));
        if (results.length === 0) {
            console.log(chalk_1.default.green('No issues found! 🎉'));
        }
        else {
            console.log(chalk_1.default.yellow(`Found ${results.length} file(s) with issues`));
            for (const fileResult of results) {
                console.log('\n' + chalk_1.default.cyan.bold(fileResult.file));
                console.log('-'.repeat(50));
                for (const issue of fileResult.issues) {
                    const typeColor = {
                        deprecated_api: chalk_1.default.red,
                        anti_pattern: chalk_1.default.yellow,
                        rxjs_issue: chalk_1.default.magenta
                    };
                    const prefix = typeColor[issue.type](`[${issue.type}]`);
                    const lineInfo = issue.line ? chalk_1.default.gray(`(line ${issue.line})`) : '';
                    console.log(`  ${prefix} ${issue.message} ${lineInfo}`);
                }
            }
        }
        console.log('\n' + chalk_1.default.bold('Full Metadata:'));
        console.log('-'.repeat(50));
        console.log(JSON.stringify(results, null, 2));
    }
    catch (error) {
        spinner.fail(chalk_1.default.red('Code analysis failed!'));
        console.error(chalk_1.default.red(error instanceof Error ? error.message : 'Unknown error'));
    }
});
