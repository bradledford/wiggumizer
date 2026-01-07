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
  .option('--template <name>', 'Prompt template to use (refactor, bugfix, feature, testing, docs)')
  .action(async (options) => {
    const ConfigLoader = require('./config');
    const { listTemplates, getTemplate } = require('./prompt-templates');
    const fs = require('fs');
    const path = require('path');

    console.log(chalk.blue('🎯 Initializing Wiggumizer\n'));

    const configPath = path.join(process.cwd(), '.wiggumizer.yml');
    const promptPath = path.join(process.cwd(), 'PROMPT.md');

    // Check if config already exists
    if (fs.existsSync(configPath) && !options.force) {
      console.log(chalk.yellow('⚠ .wiggumizer.yml already exists'));
      console.log(chalk.dim('Use --force to overwrite\n'));
      process.exit(1);
    }

    try {
      // Create config
      if (options.force && fs.existsSync(configPath)) {
        fs.writeFileSync(configPath, ConfigLoader.generateDefaultConfig(), 'utf-8');
        console.log(chalk.green('✓ Overwrote .wiggumizer.yml'));
      } else {
        ConfigLoader.createProjectConfig();
        console.log(chalk.green('✓ Created .wiggumizer.yml'));
      }
      console.log(chalk.dim(`  ${configPath}`));

      // Create PROMPT.md from template
      if (!fs.existsSync(promptPath) || options.force) {
        const templateName = options.template || 'blank';
        const template = getTemplate(templateName);
        fs.writeFileSync(promptPath, template.content, 'utf-8');
        console.log(chalk.green(`✓ Created PROMPT.md from '${template.name}' template`));
        console.log(chalk.dim(`  ${promptPath}`));
      } else {
        console.log(chalk.yellow('⚠ PROMPT.md already exists (skipped)'));
        console.log(chalk.dim('  Use --force to overwrite'));
      }

      console.log();
      console.log(chalk.blue('Available templates:'));
      listTemplates().forEach(t => {
        console.log(chalk.dim(`  ${t.id.padEnd(12)} - ${t.description}`));
      });

      console.log();
      console.log(chalk.blue('Next steps:'));
      console.log(chalk.dim('  1. Edit PROMPT.md with your specific instructions'));
      console.log(chalk.dim('  2. Set your API key: export ANTHROPIC_API_KEY=your-key'));
      console.log(chalk.dim('  3. Run: wiggumize run\n'));
    } catch (error) {
      console.error(chalk.red('✗ Failed to initialize:'), error.message);
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

// Logs command - view iteration logs
program
  .command('logs')
  .description('View iteration logs from previous runs')
  .option('-s, --session <id>', 'View specific session')
  .option('-i, --iteration <num>', 'View specific iteration (requires --session)')
  .action(async (options) => {
    const logsCommand = require('./commands/logs');
    await logsCommand(options);
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
