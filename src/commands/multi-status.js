const chalk = require('chalk');
const ConfigLoader = require('../config');
const WorkspaceManager = require('../workspace-manager');

/**
 * Display status of all configured workspaces
 */
async function multiStatusCommand(options) {
  console.log(chalk.bold.blue('\n🗂️  Multi-Repository Workspace Status\n'));

  // Load configuration
  const config = ConfigLoader.load();

  // Check if workspaces are configured
  if (!config.workspaces || config.workspaces.length === 0) {
    console.log(chalk.yellow('⚠ No workspaces configured'));
    console.log();
    console.log(chalk.dim('To configure workspaces, add to .wiggumizer.yml:'));
    console.log();
    console.log(chalk.dim('  workspaces:'));
    console.log(chalk.dim('    - name: backend'));
    console.log(chalk.dim('      path: ../my-backend'));
    console.log(chalk.dim('    - name: frontend'));
    console.log(chalk.dim('      path: ../my-frontend'));
    console.log();
    console.log(chalk.dim('Or use: wiggumize multi validate'));
    console.log();
    return;
  }

  // Create workspace manager
  const manager = new WorkspaceManager({
    workspaces: config.workspaces,
    verbose: options.verbose
  });

  // Display status
  manager.displayStatus();

  // Show summary
  const status = manager.getStatus();
  const validCount = status.filter(s => s.status === 'ok').length;
  const totalCount = status.length;

  if (validCount === totalCount) {
    console.log(chalk.green(`✓ All ${totalCount} workspace(s) are valid and accessible`));
  } else {
    console.log(chalk.yellow(`⚠ ${validCount}/${totalCount} workspace(s) are valid`));
  }

  // Show total file count
  if (options.verbose) {
    const totalFiles = status
      .filter(s => s.status === 'ok')
      .reduce((sum, s) => sum + (s.fileCount || 0), 0);
    console.log(chalk.dim(`Total files across workspaces: ${totalFiles}`));
  }

  console.log();
  console.log(chalk.dim('Run across all workspaces: wiggumize multi run'));
  console.log(chalk.dim('Validate configuration:    wiggumize multi validate'));
  console.log();
}

module.exports = multiStatusCommand;
