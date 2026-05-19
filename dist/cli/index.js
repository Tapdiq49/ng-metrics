#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const scan_1 = require("../commands/scan");
const fix_1 = require("../commands/fix");
const code_1 = require("../commands/code");
const analyze_1 = require("../commands/analyze");
const program = new commander_1.Command();
program
    .name('ng-metrics')
    .description('CLI tool for Angular metrics')
    .version('1.0.0')
    .addCommand(scan_1.scanCommand)
    .addCommand(fix_1.fixCommand)
    .addCommand(code_1.codeCommand)
    .addCommand(analyze_1.analyzeCommand);
if (process.argv.length <= 2) {
    process.argv.push('analyze');
}
program.parse();
