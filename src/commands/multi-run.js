const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ConfigLoader = require('../config');
const WorkspaceManager = require('../workspace-manager');

/**
 * Run Ralph loop across all configured workspaces
 */
async function multiRunCommand(cliOptions) {
  const quiet = cliOptions.quiet || false;

  if (!quiet) {
    console.log(chalk.bold.blue('\n🗂️  Multi-Repository Ralph Loop\n'));
  }

  // Load configuration
  const config = ConfigLoader.load(cliOptions);

  // Check if workspaces are configured
  if (!config.workspaces || config.workspaces.length === 0) {
    console.error(chalk.red('✗ No workspaces configured'));
    console.log();
    console.log(chalk.dim('To configure workspaces, add to .wiggumizer.yml:'));
    console.log();
    console.log(chalk.dim('  workspaces:'));
    console.log(chalk.dim('    - name: backend'));
    console.log(chalk.dim('      path: ../my-backend'));
    console.log(chalk.dim('    - name: frontend'));
    console.log(chalk.dim('      path: ../my-frontend'));
    console.log();
    process.exit(1);
  }

  // Create workspace manager
  const manager = new WorkspaceManager({
    workspaces: config.workspaces,
    verbose: config.verbose
  });

  // Validate workspaces
  const validation = manager.validate();
  const invalidWorkspaces = validation.filter(v => !v.valid);

  if (invalidWorkspaces.length > 0) {
    console.error(chalk.red('✗ Some workspaces are invalid:'));
    for (const ws of invalidWorkspaces) {
      console.error(chalk.red(`  - ${ws.name}: ${ws.exists ? 'not a directory' : 'path not found'}`));
    }
    console.log();
    console.log(chalk.dim('Fix the paths in .wiggumizer.yml and try again.'));
    console.log(chalk.dim('Run: wiggumize multi validate'));
    console.log();
    process.exit(1);
  }

  // Check for prompt file
  const promptPath = path.resolve(process.cwd(), config.prompt || 'PROMPT.md');

  if (!fs.existsSync(promptPath)) {
    console.error(chalk.red(`✗ Prompt file not found: ${config.prompt || 'PROMPT.md'}`));
    console.log();
    console.log(chalk.dim('Create a PROMPT.md file with instructions for all workspaces.'));
    console.log(chalk.dim('Example: See examples/multi-repo/PROMPT.md'));
    console.log();
    process.exit(1);
  }

  // Read prompt
  const prompt = fs.readFileSync(promptPath, 'utf-8');

  if (!quiet) {
    console.log(chalk.cyan('Workspaces:'));
    for (const ws of config.workspaces) {
      const wsPath = manager.resolvePath(ws.path);
      console.log(chalk.dim(`  - ${ws.name || ws.path}: ${wsPath}`));
    }
    console.log();
    console.log(chalk.cyan('Provider:') + ` ${config.provider}`);
    console.log(chalk.cyan('Prompt:') + ` ${config.prompt || 'PROMPT.md'}`);
    console.log(chalk.cyan('Max iterations:') + ` ${config.maxIterations}`);
    console.log();
  }

  // Import and run the loop with workspaces configuration
  const RalphLoop = require('../loop');

  const loop = new RalphLoop({
    prompt,
    provider: config.provider,
    maxIterations: config.maxIterations,
    verbose: config.verbose && !quiet,
    dryRun: config.dryRun,
    autoCommit: config.autoCommit,
    convergenceThreshold: config.convergenceThreshold,
    workspaces: config.workspaces, // Pass workspaces to loop
    filePatterns: config.files,
    contextLimits: config.context,
    retry: config.retry,
    rateLimit: config.rateLimit,
    providerConfig: config.providers,
    quiet
  });

  try {
    const result = await loop.run();

    if (!quiet && result) {
      console.log();
      console.log(chalk.green('✓ Multi-repo Ralph loop complete!'));
      console.log(chalk.dim(`  Iterations: ${result.totalIterations}`));
      console.log(chalk.dim(`  Files modified: ${result.filesModified}`));
      console.log(chalk.dim(`  Duration: ${result.duration}s`));
      if (result.converged) {
        console.log(chalk.dim(`  Converged: ${result.convergenceReason || 'Yes'}`));
      }
      console.log();
    }

    return result;
  } catch (error) {
    console.error(chalk.red('\n✗ Error:'), error.message);
    if (config.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

module.exports = multiRunCommand;
