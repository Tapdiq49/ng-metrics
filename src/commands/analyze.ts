import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { stringify } from 'yaml';
import { NgMetricsEngineService } from '../services/ng-metrics-engine.service';
import { TemplateRendererService } from '../services/template-renderer.service';
import { ConfigService } from '../services/config.service';
import type { UnifiedReport, PackageMetadata, FixSuggestion, MigrationStep } from '../types';

export const analyzeCommand = new Command('analyze')
  .description('Run full analysis and generate unified report')
  .option('-d, --dir <dir>', 'Source directory to analyze (default: src)')
  .option('-f, --format <format>', 'Output format: text, json, yaml, html (default: text)')
  .option('-o, --output <file>', 'Output file path (optional, saves to file instead of stdout)')
  .option('--fail-on-low-score', 'Fail the process if health score is below minHealthScore from config')
  .option('--min-score <score>', 'Override minHealthScore from config with this value')
  .action(async (options) => {
    const spinner = ora('Running full analysis...').start();

    try {
      const engine = new NgMetricsEngineService();
      const report = engine.analyze(process.cwd(), options.dir);
      
      // Load config for CI check
      const configService = new ConfigService();
      const config = configService.load(process.cwd());
      
      // Determine the minimum score threshold
      let minScore = config.minHealthScore;
      if (options.minScore) {
        minScore = parseInt(options.minScore, 10);
      }

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
        case 'html':
          const renderer = new TemplateRendererService();
          outputContent = await renderer.renderReportTemplate(report);
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
      
      // Check if we need to fail on low score
      if (options.failOnLowScore && minScore !== undefined) {
        if (report.projectHealth.score < minScore) {
          console.error(chalk.red(`\n❌ Health score (${report.projectHealth.score}/100) is below the required minimum (${minScore}/100)`));
          process.exit(1);
        } else {
          console.log(chalk.green(`\n✅ Health score (${report.projectHealth.score}/100) meets or exceeds the required minimum (${minScore}/100)`));
        }
      }
    } catch (error) {
      spinner.fail(chalk.red('Analysis failed!'));
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  });

function generateTextReport(report: UnifiedReport): string {
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
    report.dependencies.forEach((dep: PackageMetadata) => {
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
      report.fixes.autoFixable.forEach((fix: FixSuggestion, i: number) => {
        result += `    ${i + 1}. ${chalk.cyan(`[${fix.priority}]`)} ${fix.issue}\n`;
        result += `       ${chalk.gray(fix.suggestion)}\n`;
      });
    }

    if (report.fixes.manualReviewRequired.length > 0) {
      result += '\n  ' + chalk.yellow.bold('⚠ Manual review required:') + '\n';
      report.fixes.manualReviewRequired.forEach((fix: FixSuggestion, i: number) => {
        result += `    ${i + 1}. ${chalk.cyan(`[${fix.priority}]`)} ${fix.issue}\n`;
        result += `       ${chalk.gray(fix.suggestion)}\n`;
      });
    }
  }

  if (report.migrationPlan.length > 0) {
    result += '\n' + chalk.bold('Migration Plan:') + '\n';
    result += '-'.repeat(60) + '\n';
    report.migrationPlan.forEach((step: MigrationStep) => {
      const priorityColor = step.priority === 'high' ? chalk.red : step.priority === 'medium' ? chalk.yellow : chalk.blue;
      result += `  ${chalk.bold(`Step ${step.step}:`)} ${step.title}\n`;
      result += `     ${priorityColor(`[${step.priority}]`)} ${step.description}\n`;
    });
  }

  if (report.bundleAnalysis) {
    result += '\n' + chalk.bold('Bundle Size Analysis:') + '\n';
    result += '-'.repeat(60) + '\n';
    result += `  Total Size: ${chalk.cyan(report.bundleAnalysis.totalSizeHumanReadable)}\n`;
    
    if (report.bundleAnalysis.files.length > 0) {
      result += '\n  Bundle Files:\n';
      report.bundleAnalysis.files.forEach((file) => {
        result += `    • ${file.path}: ${chalk.cyan(file.sizeHumanReadable)} (${file.type})\n`;
      });
    }

    if (report.bundleAnalysis.warnings.length > 0) {
      result += '\n  Warnings:\n';
      report.bundleAnalysis.warnings.forEach((warning) => {
        result += `    ⚠ ${chalk.yellow(warning)}\n`;
      });
    }

    if (report.bundleAnalysis.recommendations.length > 0) {
      result += '\n  Recommendations:\n';
      report.bundleAnalysis.recommendations.forEach((rec) => {
        result += `    • ${chalk.gray(rec)}\n`;
      });
    }
  }


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
