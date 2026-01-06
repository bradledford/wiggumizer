const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const RalphLoop = require('../loop');

async function runCommand(options) {
  console.log(chalk.bold.blue('\n🎯 Wiggumizer v0.1.0'));
  console.log(chalk.dim('Ralph Wiggum style AI coding automation\n'));

  // Check if prompt file exists
  const promptPath = path.resolve(process.cwd(), options.prompt);

  if (!fs.existsSync(promptPath)) {
    console.error(chalk.red(`✗ Prompt file not found: ${options.prompt}`));
    console.log(chalk.yellow('\nCreate a PROMPT.md file with your instructions, then try again.'));
    console.log(chalk.dim('\nExample PROMPT.md:'));
    console.log(chalk.dim('  # Refactor Authentication\n'));
    console.log(chalk.dim('  Modernize the auth module to use async/await...\n'));
    process.exit(1);
  }

  // Read prompt
  const prompt = fs.readFileSync(promptPath, 'utf-8');

  console.log(chalk.cyan('Provider:') + ` ${options.provider}`);
  console.log(chalk.cyan('Prompt:') + ` ${options.prompt}`);
  console.log(chalk.cyan('Max iterations:') + ` ${options.maxIterations}`);
  console.log();

  // Create and run the loop
  const loop = new RalphLoop({
    prompt,
    provider: options.provider,
    maxIterations: parseInt(options.maxIterations),
    verbose: options.verbose,
    dryRun: options.dryRun,
    autoCommit: options.autoCommit || false
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
