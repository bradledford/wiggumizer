const chalk = require('chalk');
const ConfigLoader = require('../config');
const WorkspaceManager = require('../workspace-manager');
const GitHelper = require('../git-helper');

/**
 * Validate multi-repository workspace configuration
 */
async function multiValidateCommand() {
  console.log(chalk.bold.blue('\n🔍 Validating Workspace Configuration\n'));

  // Load configuration
  const config = ConfigLoader.load();

  // Check if workspaces are configured
  if (!config.workspaces || config.workspaces.length === 0) {
    console.log(chalk.yellow('⚠ No workspaces configured in .wiggumizer.yml'));
    console.log();
    console.log(chalk.dim('Add workspaces to your configuration:'));
    console.log();
    console.log(chalk.cyan('  workspaces:'));
    console.log(chalk.cyan('    - name: backend        # Friendly name'));
    console.log(chalk.cyan('      path: ../my-backend  # Relative or absolute path'));
    console.log(chalk.cyan('      include:             # Optional: file patterns'));
    console.log(chalk.cyan('        - "src/**/*.js"'));
    console.log(chalk.cyan('      exclude:             # Optional: exclude patterns'));
    console.log(chalk.cyan('        - "test/**"'));
    console.log(chalk.cyan('    - name: frontend'));
    console.log(chalk.cyan('      path: ../my-frontend'));
    console.log();
    return;
  }

  // Create workspace manager
  const manager = new WorkspaceManager({
    workspaces: config.workspaces,
    verbose: true
  });

  // Validate each workspace
  const validation = manager.validate();
  let hasErrors = false;

  console.log(chalk.dim('Checking workspaces...\n'));

  for (const ws of validation) {
    if (ws.valid) {
      console.log(chalk.green('✓') + ` ${chalk.bold(ws.name)}`);
      console.log(chalk.dim(`  Path: ${ws.path}`));

      // Additional checks
      const checks = [];

      // Check if it's a git repo
      if (GitHelper.isGitRepo(ws.path)) {
        checks.push(chalk.green('✓') + ' Git repository');
        
        // Check for uncommitted changes
        if (GitHelper.hasUncommittedChanges(ws.path)) {
          checks.push(chalk.yellow('⚠') + ' Has uncommitted changes');
        } else {
          checks.push(chalk.green('✓') + ' Clean working tree');
        }
      } else {
        checks.push(chalk.yellow('⚠') + ' Not a git repository');
      }

      // Check for package.json (Node.js project)
      const fs = require('fs');
      const path = require('path');
      
      if (fs.existsSync(path.join(ws.path, 'package.json'))) {
        checks.push(chalk.green('✓') + ' Node.js project (package.json found)');
      }

      // Check for PROMPT.md
      if (fs.existsSync(path.join(ws.path, 'PROMPT.md'))) {
        checks.push(chalk.green('✓') + ' Has local PROMPT.md');
      }

      // Display checks
      for (const check of checks) {
        console.log(chalk.dim(`  ${check}`));
      }

    } else {
      hasErrors = true;
      console.log(chalk.red('✗') + ` ${chalk.bold(ws.name)}`);
      console.log(chalk.red(`  Path: ${ws.path}`));
      
      if (!ws.exists) {
        console.log(chalk.red('  Error: Path does not exist'));
      } else if (!ws.isDirectory) {
        console.log(chalk.red('  Error: Path is not a directory'));
      }
    }

    console.log();
  }

  // Summary
  const validCount = validation.filter(v => v.valid).length;
  const totalCount = validation.length;

  if (hasErrors) {
    console.log(chalk.red(`✗ Validation failed: ${validCount}/${totalCount} workspaces valid`));
    console.log();
    console.log(chalk.dim('Fix the invalid workspace paths in .wiggumizer.yml'));
    console.log();
    process.exit(1);
  } else {
    console.log(chalk.green(`✓ All ${totalCount} workspace(s) validated successfully`));
    console.log();
    console.log(chalk.dim('Ready to run: wiggumize multi run'));
    console.log();
  }
}

module.exports = multiValidateCommand;
