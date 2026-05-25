#!/usr/bin/env node

import { Command } from 'commander';
import { scanCommand } from '../commands/scan';
import { fixCommand } from '../commands/fix';
import { codeCommand } from '../commands/code';
import { analyzeCommand } from '../commands/analyze';
import { auditCommand } from '../commands/audit';
import { initCommand } from '../commands/init';

const program = new Command();

program
  .name('ng-metrics')
  .description('CLI tool for Angular metrics')
  .version('1.0.0')
  .addCommand(initCommand)
  .addCommand(scanCommand)
  .addCommand(fixCommand)
  .addCommand(codeCommand)
  .addCommand(analyzeCommand)
  .addCommand(auditCommand);

if (process.argv.length <= 2) {
  process.argv.push('analyze');
}

program.parse();
