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
  .option('--auto-commit', 'Automatically commit changes after each iteration')
  .action(async (options) => {
    const runCommand = require('./commands/run');
    await runCommand(options);
  });

// Init command - initialize configuration
program
  .command('init')
  .description('Initialize Wiggumizer configuration')
  .option('--force', 'Overwrite existing .wiggumizer.yml')
  .action(async (options) => {
    const ConfigLoader = require('./config');
    const fs = require('fs');
    const path = require('path');

    console.log(chalk.blue('🎯 Initializing Wiggumizer\n'));

    const configPath = path.join(process.cwd(), '.wiggumizer.yml');

    // Check if config already exists
    if (fs.existsSync(configPath) && !options.force) {
      console.log(chalk.yellow('⚠ .wiggumizer.yml already exists'));
      console.log(chalk.dim('Use --force to overwrite\n'));
      process.exit(1);
    }

    try {
      if (options.force && fs.existsSync(configPath)) {
        // Overwrite
        fs.writeFileSync(configPath, ConfigLoader.generateDefaultConfig(), 'utf-8');
        console.log(chalk.green('✓ Overwrote .wiggumizer.yml'));
      } else {
        ConfigLoader.createProjectConfig();
        console.log(chalk.green('✓ Created .wiggumizer.yml'));
      }

      console.log(chalk.dim(`  ${configPath}\n`));
      console.log(chalk.blue('Next steps:'));
      console.log(chalk.dim('  1. Edit .wiggumizer.yml to customize settings'));
      console.log(chalk.dim('  2. Set your API key: export ANTHROPIC_API_KEY=...'));
      console.log(chalk.dim('  3. Create PROMPT.md with your instructions'));
      console.log(chalk.dim('  4. Run: wiggumize run\n'));
    } catch (error) {
      console.error(chalk.red('✗ Failed to create config:'), error.message);
      process.exit(1);
    }
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
