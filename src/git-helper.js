const { execSync } = require('child_process');
const chalk = require('chalk');

class GitHelper {
  static isGitRepo() {
    try {
      execSync('git rev-parse --git-dir', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  static hasUncommittedChanges() {
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf-8' });
      return status.trim().length > 0;
    } catch {
      return false;
    }
  }

  static createBackupCommit(iteration) {
    try {
      execSync('git add .', { stdio: 'ignore' });
      execSync(
        `git commit -m "Wiggumizer iteration ${iteration} - auto backup"`,
        { stdio: 'ignore' }
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  static rollbackToCommit(commitHash) {
    try {
      execSync(`git reset --hard ${commitHash}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  static getCurrentCommit() {
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    } catch {
      return null;
    }
  }

  static warnIfDirty() {
    if (!GitHelper.isGitRepo()) {
      console.log(chalk.yellow('\n⚠ Warning: Not a git repository'));
      console.log(chalk.dim('Consider running: git init\n'));
      return;
    }

    if (GitHelper.hasUncommittedChanges()) {
      console.log(chalk.yellow('\n⚠ Warning: Uncommitted changes detected'));
      console.log(chalk.dim('Consider committing your changes before running Wiggumizer\n'));
    }
  }
}

module.exports = GitHelper;
