import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import type { Config } from '../types';

const defaultConfig: Config = {
  srcDir: 'src',
  exclude: [
    'node_modules/',
    'dist/'
  ],
  rules: {
    viewChildStatic: true,
    toPromise: true,
    httpModule: true,
    changeDetectionOnPush: true,
    windowDocumentReference: true,
    nativeElementManipulation: true,
    rxjsMemoryLeak: true,
    nestedSubscriptions: true,
    legacyStructuralDirectives: true,
    ngForTrackBy: true,
    forTrackByIndex: true,
    innerHtmlBinding: true,
    bypassSecurityTrust: true
  },
  minHealthScore: undefined
};

const CONFIG_FILE_NAME = 'ng-metrics.config.json';

export const initCommand = new Command('init')
  .description('Create default ng-metrics.config.json configuration file')
  .option('-f, --force', 'Overwrite existing configuration file if it exists')
  .action(async (options) => {
    const spinner = ora('Creating configuration file...').start();

    try {
      const projectPath = process.cwd();
      const configFilePath = path.resolve(projectPath, CONFIG_FILE_NAME);

      const fileExists = fs.existsSync(configFilePath);

      if (fileExists && !options.force) {
        spinner.fail(chalk.yellow('Configuration file already exists!'));
        console.log(chalk.cyan(`  File: ${configFilePath}`));
        console.log(chalk.gray('  Use --force flag to overwrite it'));
        process.exitCode = 1;
        return;
      }

      fs.writeFileSync(configFilePath, JSON.stringify(defaultConfig, null, 2), 'utf8');

      spinner.succeed(chalk.green('Configuration file created successfully! 🎉'));
      console.log('\n' + chalk.bold('Created:'));
      console.log(`  ${chalk.cyan(configFilePath)}`);
      
      console.log('\n' + chalk.bold('Next steps:'));
      console.log(chalk.gray('  1. Edit the configuration file to customize ng-metrics'));
      console.log(chalk.gray('  2. Run:'), chalk.cyan('ng-metrics analyze'));
      console.log(chalk.gray('  3. Check README.md for more information'));

    } catch (error) {
      spinner.fail(chalk.red('Failed to create configuration file!'));
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
      process.exitCode = 1;
    }
  });
