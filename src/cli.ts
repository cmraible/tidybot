#!/usr/bin/env node
import { Command } from 'commander';
import { version } from '../package.json';
import { analyzeCommand } from './commands/analyze';

const program = new Command();

program
  .name('tidybot')
  .description('A CLI tool to detect flaky tests in GitHub repositories')
  .version(version);

program
  .command('analyze')
  .description('Analyze a GitHub repository for flaky tests')
  .argument('<repository>', 'GitHub repository in format owner/repo')
  .option('-d, --days <number>', 'Number of days to analyze', '30')
  .option('-o, --output <format>', 'Output format (json|table)', 'table')
  .action(analyzeCommand);

program.parse();
