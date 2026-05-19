import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { NgMetricsEngineService } from '../services/ng-metrics-engine.service';

export const analyzeCommand = new Command('analyze')
  .description('Run full analysis and generate unified report')
  .option('-d, --dir <dir>', 'Source directory to analyze (default: src)')
  .action(async (options) => {
    const spinner = ora('Running full analysis...').start();

    try {
      const engine = new NgMetricsEngineService();
      const report = engine.analyze(process.cwd(), options.dir);

      spinner.succeed(chalk.green('Analysis complete!'));

      console.log('\n' + chalk.bold('Unified Report:'));
      console.log('='.repeat(60));
      console.log(chalk.cyan.bold('Summary:'), report.summary);

      console.log('\n' + chalk.bold('Project Health:'));
      console.log('-'.repeat(60));
      const levelColors: Record<string, chalk.Chalk> = {
        excellent: chalk.green,
        good: chalk.blue,
        warning: chalk.yellow,
        critical: chalk.red
      };
      console.log(`  Score: ${chalk.cyan(report.projectHealth.score)}/100`);
      console.log(`  Level: ${levelColors[report.projectHealth.level](report.projectHealth.level)}`);

      if (report.dependencies.length > 0) {
        console.log('\n' + chalk.bold('Detected Dependencies:'));
        console.log('-'.repeat(60));
        report.dependencies.forEach(dep => {
          let line = `  ${chalk.cyan(dep.name)} (${dep.version || 'unknown'})`;
          if (dep.status) {
            line += ` - ${chalk.yellow(dep.status)}`;
          }
          console.log(line);
        });
      }

      if (report.codeIssues.length > 0) {
        console.log('\n' + chalk.bold('Code Issues:'));
        console.log('-'.repeat(60));
        for (const fileResult of report.codeIssues) {
          console.log('\n  ' + chalk.cyan.bold(fileResult.file));
          for (const issue of fileResult.issues) {
            const typeColor: Record<string, chalk.Chalk> = {
              deprecated_api: chalk.red,
              anti_pattern: chalk.yellow,
              rxjs_issue: chalk.magenta,
              security_issue: chalk.red.bold
            };
            const lineInfo = issue.line ? chalk.gray(`(line ${issue.line})`) : '';
            console.log(`    ${typeColor[issue.type](`[${issue.type}]`)} ${issue.message} ${lineInfo}`);
          }
        }
      }

      const hasFixes = report.fixes.autoFixable.length > 0 || report.fixes.manualReviewRequired.length > 0;
      if (hasFixes) {
        console.log('\n' + chalk.bold('Fix Suggestions:'));
        console.log('-'.repeat(60));

        if (report.fixes.autoFixable.length > 0) {
          console.log('\n  ' + chalk.green.bold('✓ Auto-fixable:'));
          report.fixes.autoFixable.forEach((fix, i) => {
            console.log(`    ${i + 1}. ${chalk.cyan(`[${fix.priority}]`)} ${fix.issue}`);
            console.log(`       ${chalk.gray(fix.suggestion)}`);
          });
        }

        if (report.fixes.manualReviewRequired.length > 0) {
          console.log('\n  ' + chalk.yellow.bold('⚠ Manual review required:'));
          report.fixes.manualReviewRequired.forEach((fix, i) => {
            console.log(`    ${i + 1}. ${chalk.cyan(`[${fix.priority}]`)} ${fix.issue}`);
            console.log(`       ${chalk.gray(fix.suggestion)}`);
          });
        }
      }

      if (report.migrationPlan.length > 0) {
        console.log('\n' + chalk.bold('Migration Plan:'));
        console.log('-'.repeat(60));
        report.migrationPlan.forEach(step => {
          const priorityColor = step.priority === 'high' ? chalk.red : step.priority === 'medium' ? chalk.yellow : chalk.blue;
          console.log(`  ${chalk.bold(`Step ${step.step}:`)} ${step.title}`);
          console.log(`     ${priorityColor(`[${step.priority}]`)} ${step.description}`);
        });
      }

      console.log('\n' + chalk.bold('Full Report (JSON):'));
      console.log('-'.repeat(60));
      console.log(JSON.stringify(report, null, 2));

      console.log('\n' + chalk.bold('Next Steps:'));
      console.log('-'.repeat(60));

      const nextSteps: string[] = [];

      if (report.fixes.autoFixable.length > 0) {
        nextSteps.push(chalk.cyan('ng-metrics fix --apply') + ' - Apply auto-fixable changes');
      }

      nextSteps.push(chalk.cyan('ng-metrics code') + ' - View detailed code issues');
      nextSteps.push(chalk.cyan('ng-metrics scan') + ' - View detailed dependency scan');
      nextSteps.push(chalk.cyan('ng-metrics --help') + ' - View all available commands');

      nextSteps.forEach(step => console.log(`  • ${step}`));
    } catch (error) {
      spinner.fail(chalk.red('Analysis failed!'));
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    }
  });
