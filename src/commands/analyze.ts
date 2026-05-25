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
  .option('-f, --format <format>', 'Output format: text, json, yaml, html (default: text)')
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
        case 'html':
          outputContent = generateHtmlReport(report);
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

function generateHtmlReport(report: any): string {
  const levelColors: Record<string, string> = {
    excellent: '#10b981',
    good: '#3b82f6',
    warning: '#f59e0b',
    critical: '#ef4444'
  };

  const typeColors: Record<string, string> = {
    deprecated_api: '#ef4444',
    anti_pattern: '#f59e0b',
    rxjs_issue: '#a855f7',
    security_issue: '#dc2626'
  };

  const priorityColors: Record<string, string> = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#3b82f6'
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ng-metrics - Project Health Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
      min-height: 100vh;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      color: white;
      padding: 2rem;
      text-align: center;
    }
    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }
    .header p {
      font-size: 1.1rem;
      opacity: 0.9;
    }
    .content {
      padding: 2rem;
    }
    .section {
      margin-bottom: 2rem;
    }
    .section-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #e2e8f0;
    }
    .score-card {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      padding: 2rem;
      border-radius: 12px;
      margin-bottom: 1.5rem;
    }
    .score-circle {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border: 4px solid ${levelColors[report.projectHealth.level]};
      background: white;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    .score-number {
      font-size: 2.5rem;
      font-weight: 800;
      color: ${levelColors[report.projectHealth.level]};
    }
    .score-label {
      font-size: 0.85rem;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 600;
    }
    .score-info {
      flex: 1;
    }
    .score-info h3 {
      font-size: 1.3rem;
      color: #1e293b;
      margin-bottom: 0.5rem;
    }
    .score-info p {
      color: #64748b;
    }
    .level-badge {
      display: inline-block;
      padding: 0.4rem 1rem;
      border-radius: 20px;
      font-weight: 600;
      font-size: 0.9rem;
      color: white;
      background: ${levelColors[report.projectHealth.level]};
    }
    .summary {
      background: #f8fafc;
      border-left: 4px solid #3b82f6;
      padding: 1.25rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
    }
    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1.25rem;
      transition: all 0.2s;
    }
    .card:hover {
      border-color: #3b82f6;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
    }
    .card-title {
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 0.5rem;
    }
    .card-version {
      color: #64748b;
      font-size: 0.9rem;
    }
    .card-status {
      margin-top: 0.5rem;
      font-size: 0.85rem;
      color: #f59e0b;
      font-weight: 500;
    }
    .file-section {
      margin-bottom: 1.5rem;
    }
    .file-header {
      background: #f1f5f9;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 0.75rem;
      font-weight: 600;
      color: #1e293b;
    }
    .issue-item {
      margin-left: 1.5rem;
      padding: 1rem;
      background: white;
      border-left: 4px solid;
      margin-bottom: 0.75rem;
      border-radius: 0 8px 8px 0;
    }
    .issue-type {
      display: inline-block;
      font-weight: 700;
      font-size: 0.8rem;
      text-transform: uppercase;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      color: white;
      margin-bottom: 0.5rem;
    }
    .issue-message {
      color: #1e293b;
      margin-bottom: 0.5rem;
    }
    .issue-line {
      color: #64748b;
      font-size: 0.85rem;
    }
    .issue-suggestion {
      margin-top: 0.5rem;
      font-size: 0.9rem;
      color: #64748b;
      background: #f8fafc;
      padding: 0.75rem;
      border-radius: 4px;
    }
    .fix-section {
      margin-bottom: 1.5rem;
    }
    .fix-header {
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 0.75rem;
    }
    .fix-item {
      padding: 1rem;
      background: #f8fafc;
      border-radius: 8px;
      margin-bottom: 0.75rem;
    }
    .fix-priority {
      display: inline-block;
      font-weight: 700;
      font-size: 0.75rem;
      text-transform: uppercase;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      color: white;
      margin-right: 0.5rem;
    }
    .fix-issue {
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 0.5rem;
    }
    .fix-suggestion {
      color: #64748b;
      font-size: 0.9rem;
    }
    .migration-step {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .step-number {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #3b82f6;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      flex-shrink: 0;
    }
    .step-content {
      flex: 1;
      padding: 0.75rem;
      background: #f8fafc;
      border-radius: 8px;
    }
    .step-title {
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 0.5rem;
    }
    .step-desc {
      color: #64748b;
    }
    .footer {
      text-align: center;
      padding: 1.5rem;
      background: #f8fafc;
      color: #64748b;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 ng-metrics Report</h1>
      <p>Angular Project Health Analysis</p>
    </div>
    <div class="content">
      <div class="section">
        <div class="score-card">
          <div class="score-circle">
            <div class="score-number">${report.projectHealth.score}</div>
            <div class="score-label">Score</div>
          </div>
          <div class="score-info">
            <h3>Project Health</h3>
            <p>${report.summary}</p>
            <div class="level-badge">${report.projectHealth.level}</div>
          </div>
        </div>
        <div class="summary">
          <strong>Summary:</strong> ${report.summary}
        </div>
      </div>

      ${report.dependencies.length > 0 ? `
      <div class="section">
        <h2 class="section-title">Detected Dependencies</h2>
        <div class="card-grid">
          ${report.dependencies.map((dep: any) => `
            <div class="card">
              <div class="card-title">${dep.name}</div>
              <div class="card-version">${dep.version || 'unknown'}</div>
              ${dep.status ? `<div class="card-status">⚠ ${dep.status}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>` : ''}

      ${report.codeIssues.length > 0 ? `
      <div class="section">
        <h2 class="section-title">Code Issues</h2>
        ${report.codeIssues.map((fileResult: any) => `
          <div class="file-section">
            <div class="file-header">📁 ${fileResult.file}</div>
            ${fileResult.issues.map((issue: any) => `
              <div class="issue-item" style="border-left-color: ${typeColors[issue.type]}">
                <span class="issue-type" style="background: ${typeColors[issue.type]}">${issue.type}</span>
                <div class="issue-message">${issue.message}</div>
                ${issue.line ? `<div class="issue-line">Line ${issue.line}</div>` : ''}
                ${issue.suggestion ? `<div class="issue-suggestion">💡 ${issue.suggestion}</div>` : ''}
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>` : ''}

      ${(report.fixes.autoFixable.length > 0 || report.fixes.manualReviewRequired.length > 0) ? `
      <div class="section">
        <h2 class="section-title">Fix Suggestions</h2>

        ${report.fixes.autoFixable.length > 0 ? `
        <div class="fix-section">
          <div class="fix-header">✓ Auto-fixable</div>
          ${report.fixes.autoFixable.map((fix: any, i: number) => `
            <div class="fix-item">
              <span class="fix-priority" style="background: ${priorityColors[fix.priority]}">${fix.priority}</span>
              <div class="fix-issue">${i + 1}. ${fix.issue}</div>
              <div class="fix-suggestion">${fix.suggestion}</div>
            </div>
          `).join('')}
        </div>` : ''}

        ${report.fixes.manualReviewRequired.length > 0 ? `
        <div class="fix-section">
          <div class="fix-header">⚠ Manual review required</div>
          ${report.fixes.manualReviewRequired.map((fix: any, i: number) => `
            <div class="fix-item">
              <span class="fix-priority" style="background: ${priorityColors[fix.priority]}">${fix.priority}</span>
              <div class="fix-issue">${i + 1}. ${fix.issue}</div>
              <div class="fix-suggestion">${fix.suggestion}</div>
            </div>
          `).join('')}
        </div>` : ''}
      </div>` : ''}

      ${report.migrationPlan.length > 0 ? `
      <div class="section">
        <h2 class="section-title">Migration Plan</h2>
        ${report.migrationPlan.map((step: any) => `
          <div class="migration-step">
            <div class="step-number">${step.step}</div>
            <div class="step-content">
              <div class="step-title">${step.title}</div>
              <div class="step-desc">${step.description}</div>
            </div>
          </div>
        `).join('')}
      </div>` : ''}
    </div>
    <div class="footer">
      Generated by ng-metrics | ${new Date().toLocaleString()}
    </div>
  </div>
</body>
</html>
`;
}
