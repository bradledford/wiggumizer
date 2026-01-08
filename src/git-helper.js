const { execSync } = require('child_process');
const chalk = require('chalk');

class GitHelper {
  static isGitRepo(cwd = null) {
    try {
      const options = { stdio: 'ignore' };
      if (cwd) options.cwd = cwd;
      execSync('git rev-parse --git-dir', options);
      return true;
    } catch {
      return false;
    }
  }

  static hasUncommittedChanges(cwd = null) {
    try {
      const options = { encoding: 'utf-8' };
      if (cwd) options.cwd = cwd;
      const status = execSync('git status --porcelain', options);
      return status.trim().length > 0;
    } catch {
      return false;
    }
  }

  static createBackupCommit(iteration, cwd = null) {
    try {
      const options = { stdio: 'ignore' };
      if (cwd) options.cwd = cwd;
      execSync('git add .', options);
      execSync(
        `git commit -m "Wiggumizer iteration ${iteration} - auto backup"`,
        options
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  static rollbackToCommit(commitHash, cwd = null) {
    try {
      const options = { stdio: 'ignore' };
      if (cwd) options.cwd = cwd;
      execSync(`git reset --hard ${commitHash}`, options);
      return true;
    } catch {
      return false;
    }
  }

  static getCurrentCommit(cwd = null) {
    try {
      const options = { encoding: 'utf-8' };
      if (cwd) options.cwd = cwd;
      return execSync('git rev-parse HEAD', options).trim();
    } catch {
      return null;
    }
  }

  static warnIfDirty(cwd = null) {
    if (!GitHelper.isGitRepo(cwd)) {
      console.log(chalk.yellow('\n⚠ Warning: Not a git repository'));
      console.log(chalk.dim('Consider running: git init\n'));
      return;
    }

    if (GitHelper.hasUncommittedChanges(cwd)) {
      console.log(chalk.yellow('\n⚠ Warning: Uncommitted changes detected'));
      console.log(chalk.dim('Consider committing your changes before running Wiggumizer\n'));
    }
  }
}

module.exports = GitHelper;
