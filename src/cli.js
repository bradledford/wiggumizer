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
  .version('0.3.1');

// Run command - the core of Wiggumizer
program
  .command('run')
  .description('Run a Ralph loop to iteratively refine code')
  .option('-p, --prompt <file>', 'Prompt file to use', 'PROMPT.md')
  .option('-P, --provider <name>', 'AI provider to use', process.env.WIGGUMIZER_PROVIDER || 'claude')
  .option('-m, --max-iterations <num>', 'Maximum iterations', '20')
  .option('-v, --verbose', 'Verbose output')
  .option('-q, --quiet', 'Minimal output (only errors and final result)')
  .option('--dry-run', 'Show what would change without modifying files')
  .option('--auto-commit', 'Automatically commit changes after each iteration')
  .option('--watch', 'Watch PROMPT.md for changes and auto-restart loop')
  .option('--files <patterns>', 'Glob patterns for files to include (comma-separated)')
  .option('--convergence-threshold <num>', 'Convergence threshold (0.0 to 1.0)', '0.02')
  .option('--continue', 'Continue from previous session if available')
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
  .argument('[action]', 'Action: list, show')
  .argument('[name]', 'Template name (for show action)')
  .action((action, name) => {
    const { listTemplates, getTemplate, templates } = require('./prompt-templates');

    if (!action || action === 'list') {
      console.log(chalk.bold('\nAvailable Prompt Templates\n'));
      listTemplates().forEach(t => {
        console.log(chalk.blue(`  ${t.id.padEnd(14)}`), chalk.dim(t.description));
      });
      console.log();
      console.log(chalk.dim('Use a template: wiggumize init --template <name>'));
      console.log(chalk.dim('View template:  wiggumize template show <name>\n'));
      return;
    }

    if (action === 'show') {
      if (!name) {
        console.log(chalk.red('✗ Template name required'));
        console.log(chalk.dim('Usage: wiggumize template show <name>\n'));
        process.exit(1);
      }

      if (!templates[name]) {
        console.log(chalk.red(`✗ Template not found: ${name}`));
        console.log(chalk.dim('\nAvailable templates:'));
        listTemplates().forEach(t => console.log(chalk.dim(`  ${t.id}`)));
        console.log();
        process.exit(1);
      }

      const template = getTemplate(name);
      console.log(chalk.bold(`\nTemplate: ${template.name}\n`));
      console.log(chalk.dim('─'.repeat(60)));
      console.log(template.content);
      console.log(chalk.dim('─'.repeat(60)));
      console.log();
      return;
    }

    console.log(chalk.yellow(`Unknown action: ${action}`));
    console.log(chalk.dim('Available actions: list, show\n'));
  });

// Multi command - multi-repository workspace management
const multiCommand = program
  .command('multi')
  .description('Manage multi-repository workspaces');

multiCommand
  .command('status')
  .description('Show status of all configured workspaces')
  .option('-v, --verbose', 'Show detailed file information')
  .action(async (options) => {
    const multiStatusCommand = require('./commands/multi-status');
    await multiStatusCommand(options);
  });

multiCommand
  .command('run')
  .description('Run Ralph loop across all configured workspaces')
  .option('-p, --prompt <file>', 'Prompt file to use', 'PROMPT.md')
  .option('-P, --provider <name>', 'AI provider to use', process.env.WIGGUMIZER_PROVIDER || 'claude')
  .option('-m, --max-iterations <num>', 'Maximum iterations', '20')
  .option('-v, --verbose', 'Verbose output')
  .option('-q, --quiet', 'Minimal output')
  .option('--dry-run', 'Show what would change without modifying files')
  .option('--auto-commit', 'Automatically commit changes after each iteration')
  .action(async (options) => {
    const multiRunCommand = require('./commands/multi-run');
    await multiRunCommand(options);
  });

multiCommand
  .command('validate')
  .description('Validate workspace configuration')
  .action(async () => {
    const multiValidateCommand = require('./commands/multi-validate');
    await multiValidateCommand();
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

// Summary command - generate session summary from logs
program
  .command('summary')
  .description('Generate SESSION-SUMMARY.md from session logs')
  .option('-s, --session <id>', 'Generate from specific session (default: most recent)')
  .option('--commit', 'Show commit message')
  .option('--pr', 'Show PR description')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    const summaryCommand = require('./commands/summary');
    await summaryCommand(options);
  });

// Doctor command - diagnose issues
program
  .command('doctor')
  .description('Diagnose installation and configuration issues')
  .action(() => {
    const fs = require('fs');
    const path = require('path');

    console.log(chalk.blue('🏥 Wiggumizer Doctor\n'));

    // Check Node version
    const nodeVersion = process.version;
    const nodeVersionNum = parseFloat(nodeVersion.slice(1));
    if (nodeVersionNum >= 18) {
      console.log(chalk.green('✓') + ` Node.js: ${nodeVersion}`);
    } else {
      console.log(chalk.red('✗') + ` Node.js: ${nodeVersion} (requires >= 18.0.0)`);
    }

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

    // Check for config file
    const configPath = path.join(process.cwd(), '.wiggumizer.yml');
    if (fs.existsSync(configPath)) {
      console.log(chalk.green('✓') + ' .wiggumizer.yml found');
      
      // Check for workspaces config
      const ConfigLoader = require('./config');
      const config = ConfigLoader.load();
      if (config.workspaces && config.workspaces.length > 0) {
        console.log(chalk.green('✓') + ` Multi-repo: ${config.workspaces.length} workspace(s) configured`);
      }
    } else {
      console.log(chalk.yellow('⚠') + ' .wiggumizer.yml not found (run: wiggumize init)');
    }

    // Check for PROMPT.md
    const promptPath = path.join(process.cwd(), 'PROMPT.md');
    if (fs.existsSync(promptPath)) {
      console.log(chalk.green('✓') + ' PROMPT.md found');
    } else {
      console.log(chalk.yellow('⚠') + ' PROMPT.md not found (required for running)');
    }

    // Check git
    const GitHelper = require('./git-helper');
    if (GitHelper.isGitRepo()) {
      console.log(chalk.green('✓') + ' Git repository detected');
      if (GitHelper.hasUncommittedChanges()) {
        console.log(chalk.yellow('⚠') + ' Uncommitted changes detected');
      }
    } else {
      console.log(chalk.yellow('⚠') + ' Not a git repository (recommended for safety)');
    }

    console.log();

    // Summary
    if (hasAnthropicKey && nodeVersionNum >= 18) {
      console.log(chalk.green('✓ Wiggumizer is ready to go!\n'));
    } else {
      console.log(chalk.yellow('⚠ Some issues need attention before running.\n'));
    }
  });

program.parse(process.argv);
