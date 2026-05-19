import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { CodeAnalysisService } from '../services/code-analysis.service';

export const codeCommand = new Command('code')
  .description('Analyze Angular TypeScript and template files')
  .option('-d, --dir <dir>', 'Source directory to analyze (default: src)')
  .action(async (options) => {
    const spinner = ora('Analyzing code...').start();

    try {
      const analyzer = new CodeAnalysisService();
      const results = analyzer.analyze(process.cwd(), options.dir);

      spinner.succeed(chalk.green('Code analysis completed!'));

      console.log('\n' + chalk.bold('Code Analysis Results:'));
      console.log('='.repeat(50));

      if (results.length === 0) {
        console.log(chalk.green('No issues found! 🎉'));
      } else {
        console.log(chalk.yellow(`Found ${results.length} file(s) with issues`));

        for (const fileResult of results) {
          console.log('\n' + chalk.cyan.bold(fileResult.file));
          console.log('-'.repeat(50));

          for (const issue of fileResult.issues) {
            const typeColor: Record<string, chalk.Chalk> = {
              deprecated_api: chalk.red,
              anti_pattern: chalk.yellow,
              rxjs_issue: chalk.magenta
            };
            const prefix = typeColor[issue.type](`[${issue.type}]`);
            const lineInfo = issue.line ? chalk.gray(`(line ${issue.line})`) : '';
            console.log(`  ${prefix} ${issue.message} ${lineInfo}`);
          }
        }
      }

      console.log('\n' + chalk.bold('Full Metadata:'));
      console.log('-'.repeat(50));
      console.log(JSON.stringify(results, null, 2));
    } catch (error) {
      spinner.fail(chalk.red('Code analysis failed!'));
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    }
  });
