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
    console.log(chalk.yellow('\nCreate a PROMPT.md file with your instructions, then try again.'));
    console.log(chalk.dim('\nExample PROMPT.md:'));
    console.log(chalk.dim('  # Refactor Authentication\n'));
    console.log(chalk.dim('  Modernize the auth module to use async/await...\n'));
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
