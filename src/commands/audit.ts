import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { CodeAnalysisService } from '../services/code-analysis.service';
import { PackageScannerService } from '../services/package-scanner.service';
import { ConfigService } from '../services/config.service';

export const auditCommand = new Command('audit')
  .description('Audit the project for security issues, XSS risks, and unsafe practices')
  .option('-d, --dir <dir>', 'Source directory to analyze (default: src)')
  .action(async (options) => {
    const spinner = ora('Performing security audit...').start();

    try {
      // 1. Dependency Security Scan
      const scanner = new PackageScannerService();
      const scanResult = scanner.scan();
      const riskyPackages = scanResult.packages.filter(
        pkg => pkg.status === 'risky' || pkg.status === 'deprecated'
      );

      // 2. Code Security Scan
      const configService = new ConfigService();
      const config = configService.load(process.cwd());
      const codeAnalyzer = new CodeAnalysisService(config);
      const codeResults = codeAnalyzer.analyze(process.cwd(), options.dir);

      // Filter only security issues
      const securityIssues = codeResults.map(fileResult => ({
        file: fileResult.file,
        issues: fileResult.issues.filter(issue => issue.type === 'security_issue')
      })).filter(fileResult => fileResult.issues.length > 0);

      spinner.succeed(chalk.green('Security audit completed!'));

      console.log('\n' + chalk.red.bold('=================================================='));
      console.log(chalk.red.bold('             SECURITY AUDIT REPORT                '));
      console.log(chalk.red.bold('=================================================='));

      let totalIssues = riskyPackages.length + securityIssues.reduce((acc, f) => acc + f.issues.length, 0);

      if (totalIssues === 0) {
        console.log('\n' + chalk.green.bold('✔ No security issues or unsafe patterns detected! 🎉'));
      } else {
        console.log('\n' + chalk.red.bold(`Found ${totalIssues} security warning(s)`));

        // Display package issues
        if (riskyPackages.length > 0) {
          console.log('\n' + chalk.bold.yellow('Package Dependency Security Warnings:'));
          console.log('-'.repeat(50));
          riskyPackages.forEach(pkg => {
            console.log(chalk.yellow(`  ⚠ ${pkg.name} (${pkg.version || 'unknown'}) is marked as ${pkg.status}`));
            if (pkg.recommendation) {
              console.log(chalk.gray(`    → ${pkg.recommendation}`));
            }
          });
        }

        // Display code issues
        if (securityIssues.length > 0) {
          console.log('\n' + chalk.bold.red('Code-Level Security Violations (potential XSS):'));
          console.log('-'.repeat(50));
          for (const fileResult of securityIssues) {
            console.log(chalk.cyan.bold(`\n ${fileResult.file}`));
            for (const issue of fileResult.issues) {
              const lineInfo = issue.line ? chalk.gray(`(line ${issue.line})`) : '';
              console.log(`  ${chalk.red.bold('[Security Risk]')} ${issue.message} ${lineInfo}`);
              if (issue.suggestion) {
                console.log(chalk.gray(`    → Recommendation: ${issue.suggestion}`));
              }
            }
          }
        }
      }

      console.log('\n' + chalk.bold('Full Security Metadata:'));
      console.log('-'.repeat(50));
      console.log(JSON.stringify({
        packages: riskyPackages,
        code: securityIssues
      }, null, 2));

    } catch (error) {
      spinner.fail(chalk.red('Security audit failed!'));
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    }
  });
