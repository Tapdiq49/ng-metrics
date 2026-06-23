import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { PackageScannerService } from '../services/package-scanner.service';
import { RiskAnalysisService } from '../services/risk-analysis.service';
import { FixSuggestionService } from '../services/fix-suggestion.service';

export const scanCommand = new Command('scan')
  .description('Scan the project')
  .action(async () => {
    const spinner = ora('Scanning project...').start();

    try {
      const scanner = new PackageScannerService();
      const scanResult = scanner.scan(process.cwd());
      const riskAnalyzer = new RiskAnalysisService();
      const healthScore = riskAnalyzer.analyze(scanResult);
      const fixSuggestionService = new FixSuggestionService();
      const groupedSuggestions = fixSuggestionService.generate(healthScore, scanResult);
      
      spinner.succeed(chalk.green('Scan completed!'));
      
      console.log('\n' + chalk.bold('Project Health Score:'));
      console.log('='.repeat(50));
      
      const levelColors: Record<string, chalk.Chalk> = {
        excellent: chalk.green,
        good: chalk.blue,
        warning: chalk.yellow,
        critical: chalk.red
      };
      console.log(chalk.cyan('Score:'), `${healthScore.score}/100`);
      console.log(chalk.cyan('Level:'), levelColors[healthScore.level](healthScore.level));
      
      if (healthScore.issues.length > 0) {
        console.log('\n' + chalk.bold('Issues Found:'));
        console.log('-'.repeat(50));
        healthScore.issues.forEach((issue, index) => {
          console.log(`${index + 1}. ${chalk.yellow(issue)}`);
        });
      }

      const hasSuggestions = groupedSuggestions.autoFixable.length > 0 || groupedSuggestions.manualReviewRequired.length > 0;
      if (hasSuggestions) {
        console.log('\n' + chalk.bold('Fix Suggestions:'));
        console.log('='.repeat(50));

        if (groupedSuggestions.autoFixable.length > 0) {
          console.log('\n' + chalk.green.bold('✓ Auto-fixable:'));
          console.log('-'.repeat(50));
          groupedSuggestions.autoFixable.forEach((s, i) => {
            console.log(`${i + 1}. ${chalk.cyan(`[${s.priority}]`)} ${s.issue}`);
            console.log(chalk.gray(`   → ${s.suggestion}`));
          });
        }

        if (groupedSuggestions.manualReviewRequired.length > 0) {
          console.log('\n' + chalk.yellow.bold('⚠ Manual review required:'));
          console.log('-'.repeat(50));
          groupedSuggestions.manualReviewRequired.forEach((s, i) => {
            console.log(`${i + 1}. ${chalk.cyan(`[${s.priority}]`)} ${s.issue}`);
            console.log(chalk.gray(`   → ${s.suggestion}`));
          });
        }
      }
      
      console.log('\n' + chalk.bold('Angular Information:'));
      console.log('-'.repeat(50));
      
      if (scanResult.metadata.angularVersion) {
        console.log(chalk.cyan('Angular Version:'), scanResult.metadata.angularVersion);
        console.log(chalk.cyan('Angular 21+:'), scanResult.metadata.isAngular21Plus ? chalk.green('Yes') : chalk.yellow('No'));
      } else {
        console.log(chalk.yellow('No Angular core package detected'));
      }
      
      console.log('\n' + chalk.bold('Detected Packages:'));
      console.log('-'.repeat(50));
      
      scanResult.packages.forEach(pkg => {
        let packageLine = `${pkg.name} (${pkg.version || 'unknown'})`;
        
        if (pkg.status) {
          packageLine += ` - ${chalk.yellow(pkg.status)}`;
        }
        
        console.log(packageLine);
        
        if (pkg.recommendation) {
          console.log(chalk.gray(`  → ${pkg.recommendation}`));
        }
      });
      
      console.log('\n' + chalk.bold('Full Metadata:'));
      console.log('-'.repeat(50));
      console.log(JSON.stringify({
        scanResult,
        healthScore,
        fixSuggestions: groupedSuggestions
      }, null, 2));
    } catch (error) {
      spinner.fail(chalk.red('Scan failed!'));
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    }
  });
