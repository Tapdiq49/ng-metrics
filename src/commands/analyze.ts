import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { stringify } from 'yaml';
import { NgMetricsEngineService } from '../services/ng-metrics-engine.service';

export const analyzeCommand = new Command('analyze')
  .description('Run full analysis and generate unified report')
  .option('-d, --dir <dir>', 'Source directory to analyze (default: src)')
  .option('-f, --format <format>', 'Output format: text, json, yaml (default: text)')
  .option('-o, --output <file>', 'Output file path (optional, saves to file instead of stdout)')
  .action(async (options) => {
    const spinner = ora('Running full analysis...').start();

    try {
      const engine = new NgMetricsEngineService();
      const report = engine.analyze(process.cwd(), options.dir);

      spinner.succeed(chalk.green('Analysis complete!'));

      let outputContent: string;
      const format = options.format?.toLowerCase() || 'text';

      switch (format) {
        case 'json':
          outputContent = JSON.stringify(report, null, 2);
          break;
        case 'yaml':
          outputContent = stringify(report, {
            indent: 2,
            lineWidth: -1
          });
          break;
        case 'text':
        default:
          outputContent = generateTextReport(report);
          break;
      }

      if (options.output) {
        const outputPath = path.resolve(process.cwd(), options.output);
        fs.writeFileSync(outputPath, outputContent, 'utf8');
        console.log(chalk.green(`Report saved to: ${outputPath}`));
      } else {
        console.log(outputContent);
      }
    } catch (error) {
      spinner.fail(chalk.red('Analysis failed!'));
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    }
  });

function generateTextReport(report: any): string {
  let result = '';

  result += '\n' + chalk.bold('Unified Report:') + '\n';
  result += '='.repeat(60) + '\n';
  result += chalk.cyan.bold('Summary:') + ' ' + report.summary + '\n';

  result += '\n' + chalk.bold('Project Health:') + '\n';
  result += '-'.repeat(60) + '\n';
  const levelColors: Record<string, chalk.Chalk> = {
    excellent: chalk.green,
    good: chalk.blue,
    warning: chalk.yellow,
    critical: chalk.red
  };
  result += `  Score: ${chalk.cyan(report.projectHealth.score)}/100\n`;
  result += `  Level: ${levelColors[report.projectHealth.level](report.projectHealth.level)}\n`;

  if (report.dependencies.length > 0) {
    result += '\n' + chalk.bold('Detected Dependencies:') + '\n';
    result += '-'.repeat(60) + '\n';
    report.dependencies.forEach((dep: any) => {
      let line = `  ${chalk.cyan(dep.name)} (${dep.version || 'unknown'})`;
      if (dep.status) {
        line += ` - ${chalk.yellow(dep.status)}`;
      }
      result += line + '\n';
    });
  }

  if (report.codeIssues.length > 0) {
    result += '\n' + chalk.bold('Code Issues:') + '\n';
    result += '-'.repeat(60) + '\n';
    for (const fileResult of report.codeIssues) {
      result += '\n  ' + chalk.cyan.bold(fileResult.file) + '\n';
      for (const issue of fileResult.issues) {
        const typeColor: Record<string, chalk.Chalk> = {
          deprecated_api: chalk.red,
          anti_pattern: chalk.yellow,
          rxjs_issue: chalk.magenta,
          security_issue: chalk.red.bold
        };
        const lineInfo = issue.line ? chalk.gray(`(line ${issue.line})`) : '';
        result += `    ${typeColor[issue.type](`[${issue.type}]`)} ${issue.message} ${lineInfo}\n`;
      }
    }
  }

  const hasFixes = report.fixes.autoFixable.length > 0 || report.fixes.manualReviewRequired.length > 0;
  if (hasFixes) {
    result += '\n' + chalk.bold('Fix Suggestions:') + '\n';
    result += '-'.repeat(60) + '\n';

    if (report.fixes.autoFixable.length > 0) {
      result += '\n  ' + chalk.green.bold('✓ Auto-fixable:') + '\n';
      report.fixes.autoFixable.forEach((fix: any, i: number) => {
        result += `    ${i + 1}. ${chalk.cyan(`[${fix.priority}]`)} ${fix.issue}\n`;
        result += `       ${chalk.gray(fix.suggestion)}\n`;
      });
    }

    if (report.fixes.manualReviewRequired.length > 0) {
      result += '\n  ' + chalk.yellow.bold('⚠ Manual review required:') + '\n';
      report.fixes.manualReviewRequired.forEach((fix: any, i: number) => {
        result += `    ${i + 1}. ${chalk.cyan(`[${fix.priority}]`)} ${fix.issue}\n`;
        result += `       ${chalk.gray(fix.suggestion)}\n`;
      });
    }
  }

  if (report.migrationPlan.length > 0) {
    result += '\n' + chalk.bold('Migration Plan:') + '\n';
    result += '-'.repeat(60) + '\n';
    report.migrationPlan.forEach((step: any) => {
      const priorityColor = step.priority === 'high' ? chalk.red : step.priority === 'medium' ? chalk.yellow : chalk.blue;
      result += `  ${chalk.bold(`Step ${step.step}:`)} ${step.title}\n`;
      result += `     ${priorityColor(`[${step.priority}]`)} ${step.description}\n`;
    });
  }

  result += '\n' + chalk.bold('Full Report (JSON):') + '\n';
  result += '-'.repeat(60) + '\n';
  result += JSON.stringify(report, null, 2) + '\n';

  result += '\n' + chalk.bold('Next Steps:') + '\n';
  result += '-'.repeat(60) + '\n';

  const nextSteps: string[] = [];

  if (report.fixes.autoFixable.length > 0) {
    nextSteps.push(chalk.cyan('ng-metrics fix --apply') + ' - Apply auto-fixable changes');
  }

  nextSteps.push(chalk.cyan('ng-metrics code') + ' - View detailed code issues');
  nextSteps.push(chalk.cyan('ng-metrics scan') + ' - View detailed dependency scan');
  nextSteps.push(chalk.cyan('ng-metrics --help') + ' - View all available commands');

  nextSteps.forEach(step => result += `  • ${step}\n`);

  return result;
}
