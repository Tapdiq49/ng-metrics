#!/usr/bin/env node

import { Command } from 'commander';
import { scanCommand } from '../commands/scan';
import { fixCommand } from '../commands/fix';
import { codeCommand } from '../commands/code';
import { analyzeCommand } from '../commands/analyze';

const program = new Command();

program
  .name('ng-metrics')
  .description('CLI tool for Angular metrics')
  .version('1.0.0')
  .addCommand(scanCommand)
  .addCommand(fixCommand)
  .addCommand(codeCommand)
  .addCommand(analyzeCommand);

if (process.argv.length <= 2) {
  process.argv.push('analyze');
}

program.parse();
