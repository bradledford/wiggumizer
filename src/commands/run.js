const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const RalphLoop = require('../loop');
const ConfigLoader = require('../config');

async function runCommand(cliOptions) {
  console.log(chalk.bold.blue('\n🎯 Wiggumizer v0.1.0'));
  console.log(chalk.dim('Ralph Wiggum style AI coding automation\n'));

  // Load and merge configuration
  const config = ConfigLoader.load(cliOptions);

  // Check if prompt file exists
  const promptPath = path.resolve(process.cwd(), config.prompt || 'PROMPT.md');

  if (!fs.existsSync(promptPath)) {
    console.error(chalk.red(`✗ Prompt file not found: ${config.prompt || 'PROMPT.md'}`));
    console.log(chalk.yellow('\nThe PROMPT.md file tells Wiggumizer what to do.'));
    console.log(chalk.dim('\nQuick start:'));
    console.log(chalk.dim('  1. Create PROMPT.md:'));
    console.log(chalk.dim('     echo "# Improve my code\\nModernize to async/await and improve naming" > PROMPT.md'));
    console.log(chalk.dim('  2. Run: wiggumize run'));
    console.log(chalk.dim('\nOr use init to create from template:'));
    console.log(chalk.dim('  wiggumize init'));
    console.log(chalk.dim('\nExample PROMPT.md:'));
    console.log(chalk.dim('─'.repeat(50)));
    console.log(chalk.cyan('# Refactor Authentication Module\n'));
    console.log(chalk.dim('Modernize the authentication code:\n'));
    console.log(chalk.dim('- Convert callbacks to async/await'));
    console.log(chalk.dim('- Add proper error handling'));
    console.log(chalk.dim('- Improve variable naming\n'));
    console.log(chalk.dim('Preserve existing functionality.'));
    console.log(chalk.dim('─'.repeat(50)));
    console.log();
    process.exit(1);
  }

  // Read prompt
  const prompt = fs.readFileSync(promptPath, 'utf-8');

  console.log(chalk.cyan('Provider:') + ` ${config.provider}`);
  console.log(chalk.cyan('Prompt:') + ` ${config.prompt || 'PROMPT.md'}`);
  console.log(chalk.cyan('Max iterations:') + ` ${config.maxIterations}`);
  if (config.convergenceThreshold) {
    console.log(chalk.cyan('Convergence threshold:') + ` ${(config.convergenceThreshold * 100).toFixed(1)}%`);
  }
  console.log();

  // Create and run the loop
  const loop = new RalphLoop({
    prompt,
    provider: config.provider,
    maxIterations: config.maxIterations,
    verbose: config.verbose,
    dryRun: config.dryRun,
    autoCommit: config.autoCommit,
    convergenceThreshold: config.convergenceThreshold,
    filePatterns: config.files,
    contextLimits: config.context,
    retry: config.retry,
    rateLimit: config.rateLimit,
    providerConfig: config.providers
  });

  try {
    await loop.run();
  } catch (error) {
    console.error(chalk.red('\n✗ Error:'), error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

module.exports = runCommand;
