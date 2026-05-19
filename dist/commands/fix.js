"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fixCommand = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const fix_engine_service_1 = require("../services/fix-engine.service");
exports.fixCommand = new commander_1.Command('fix')
    .description('Apply safe fixes to package.json')
    .option('--dry-run', 'Show changes without modifying files (default)')
    .option('--apply', 'Actually apply the changes')
    .action(async (options) => {
    const dryRun = !options.apply;
    const spinner = (0, ora_1.default)(dryRun ? 'Checking for safe fixes (dry-run)...' : 'Applying safe fixes...').start();
    try {
        const fixEngine = new fix_engine_service_1.FixEngineService();
        const result = fixEngine.apply(process.cwd(), dryRun);
        spinner.succeed(dryRun ? 'Dry run completed!' : 'Fixes applied successfully!');
        console.log('\n' + chalk_1.default.bold('Fix Summary:'));
        console.log('='.repeat(50));
        console.log(chalk_1.default.cyan('Mode:'), dryRun ? chalk_1.default.yellow('Dry-run (no changes applied)') : chalk_1.default.green('Apply (changes made)'));
        console.log(chalk_1.default.cyan('Total changes:'), result.changes.length);
        if (result.changes.length > 0) {
            console.log('\n' + chalk_1.default.bold('Changes:'));
            console.log('-'.repeat(50));
            result.changes.forEach((change, index) => {
                const typeColor = change.type === 'remove' ? chalk_1.default.red : chalk_1.default.green;
                console.log(`${index + 1}. ${typeColor(change.type)}: ${chalk_1.default.cyan(change.package)}`);
                console.log(`   Before: ${chalk_1.default.gray(change.before)}`);
                console.log(`   After:  ${chalk_1.default.green(change.after)}`);
            });
        }
        else {
            console.log('\n' + chalk_1.default.green('No safe fixes needed!'));
        }
        console.log('\n' + chalk_1.default.bold('Full Metadata:'));
        console.log('-'.repeat(50));
        console.log(JSON.stringify(result, null, 2));
    }
    catch (error) {
        spinner.fail(chalk_1.default.red('Fix failed!'));
        console.error(chalk_1.default.red(error instanceof Error ? error.message : 'Unknown error'));
    }
});
