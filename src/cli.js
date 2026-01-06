#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name('wiggumize')
  .description('Ralph Wiggum style AI coding automation')
  .version('0.1.0');

// Run command - the core of Wiggumizer
program
  .command('run')
  .description('Run a Ralph loop to iteratively refine code')
  .option('-p, --prompt <file>', 'Prompt file to use', 'PROMPT.md')
  .option('-P, --provider <name>', 'AI provider to use', process.env.WIGGUMIZER_PROVIDER || 'claude')
  .option('-m, --max-iterations <num>', 'Maximum iterations', '20')
  .option('-v, --verbose', 'Verbose output')
  .option('--dry-run', 'Show what would change without modifying files')
  .action(async (options) => {
    const runCommand = require('./commands/run');
    await runCommand(options);
  });

// Init command - initialize configuration
program
  .command('init')
  .description('Initialize Wiggumizer configuration')
  .action(async () => {
    console.log(chalk.blue('🎯 Wiggumizer initialization'));
    console.log(chalk.yellow('\nThis will be implemented by Wiggumizer itself!'));
    console.log(chalk.dim('Coming soon after we bootstrap the run command...\n'));
  });

// Template command - manage templates
program
  .command('template')
  .description('Manage prompt templates')
  .action(() => {
    console.log(chalk.yellow('Template management coming soon!'));
  });

// Doctor command - diagnose issues
program
  .command('doctor')
  .description('Diagnose installation and configuration issues')
  .action(() => {
    console.log(chalk.blue('🏥 Wiggumizer Doctor\n'));

    // Check Node version
    const nodeVersion = process.version;
    console.log(chalk.green('✓') + ` Node.js: ${nodeVersion}`);

    // Check for API keys
    const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

    if (hasAnthropicKey) {
      console.log(chalk.green('✓') + ' Anthropic API key found');
    } else {
      console.log(chalk.red('✗') + ' Anthropic API key not found (set ANTHROPIC_API_KEY)');
    }

    if (hasOpenAIKey) {
      console.log(chalk.green('✓') + ' OpenAI API key found');
    } else {
      console.log(chalk.yellow('⚠') + ' OpenAI API key not found (optional)');
    }

    console.log(chalk.dim('\nWiggumizer is ready to go!\n'));
  });

program.parse(process.argv);
