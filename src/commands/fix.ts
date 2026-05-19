import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { FixEngineService } from '../services/fix-engine.service';

export const fixCommand = new Command('fix')
  .description('Apply safe fixes to package.json and source code files')
  .option('-d, --dir <dir>', 'Source directory to analyze and fix (default: src)')
  .option('--dry-run', 'Show changes without modifying files (default)')
  .option('--apply', 'Actually apply the changes')
  .action(async (options) => {
    const dryRun = !options.apply;
    const spinner = ora(dryRun ? 'Checking for safe fixes (dry-run)...' : 'Applying safe fixes...').start();

    try {
      const fixEngine = new FixEngineService();
      const result = fixEngine.apply(process.cwd(), options.dir, dryRun);
      
      spinner.succeed(dryRun ? 'Dry run completed!' : 'Fixes applied successfully!');

      console.log('\n' + chalk.bold('Fix Summary:'));
      console.log('='.repeat(50));
      console.log(chalk.cyan('Mode:'), dryRun ? chalk.yellow('Dry-run (no changes applied)') : chalk.green('Apply (changes made)'));
      console.log(chalk.cyan('Total changes:'), result.changes.length);

      if (result.changes.length > 0) {
        console.log('\n' + chalk.bold('Changes:'));
        console.log('-'.repeat(50));
        result.changes.forEach((change, index) => {
          const typeColor = change.type === 'remove' ? chalk.red : chalk.green;
          console.log(`${index + 1}. ${typeColor(change.type)}: ${chalk.cyan(change.package)}`);
          console.log(`   Before: ${chalk.gray(change.before)}`);
          console.log(`   After:  ${chalk.green(change.after)}`);
        });
      } else {
        console.log('\n' + chalk.green('No safe fixes needed!'));
      }

      console.log('\n' + chalk.bold('Full Metadata:'));
      console.log('-'.repeat(50));
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      spinner.fail(chalk.red('Fix failed!'));
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    }
  });
