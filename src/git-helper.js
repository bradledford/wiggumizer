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

  /**
   * Get list of modified/added/deleted files from git status
   * Returns relative file paths
   * @param {string|null} cwd - Working directory
   * @returns {Array<string>} List of modified file paths
   */
  static getModifiedFiles(cwd = null) {
    try {
      const options = { encoding: 'utf-8' };
      if (cwd) options.cwd = cwd;

      // Get porcelain status (machine-readable format)
      const status = execSync('git status --porcelain', options);

      if (!status.trim()) {
        return [];
      }

      // Parse porcelain output: "XY filename" or "XY original -> renamed"
      // X = index status, Y = worktree status
      // We want files that are modified (M), added (A), deleted (D), renamed (R), or untracked (?)
      const files = status.trim().split('\n')
        .map(line => {
          // Format: "XY filename" or "XY old -> new" for renames
          const match = line.match(/^..\s+(.+?)(?:\s+->\s+(.+))?$/);
          if (match) {
            // For renames, return the new filename
            return match[2] || match[1];
          }
          return null;
        })
        .filter(Boolean);

      return files;
    } catch {
      return [];
    }
  }

  /**
   * Get a snapshot of file modification times for tracking changes
   * @param {string|null} cwd - Working directory
   * @returns {Map<string, number>} Map of file path to mtime
   */
  static getFileSnapshot(cwd = null) {
    const files = GitHelper.getModifiedFiles(cwd);
    const snapshot = new Map();
    const fs = require('fs');
    const path = require('path');
    const basePath = cwd || process.cwd();

    for (const file of files) {
      try {
        const fullPath = path.join(basePath, file);
        const stat = fs.statSync(fullPath);
        snapshot.set(file, stat.mtimeMs);
      } catch {
        // File might be deleted, mark with 0
        snapshot.set(file, 0);
      }
    }

    return snapshot;
  }

  /**
   * Compare two snapshots and return newly modified files
   * @param {Map<string, number>} before - Snapshot before operation
   * @param {Map<string, number>} after - Snapshot after operation
   * @returns {Array<string>} List of files that changed between snapshots
   */
  static compareSnapshots(before, after) {
    const changed = [];

    // Find files that are new or have different mtimes
    for (const [file, mtime] of after) {
      if (!before.has(file) || before.get(file) !== mtime) {
        changed.push(file);
      }
    }

    // Find files that were deleted (in before but not in after with mtime > 0)
    for (const [file] of before) {
      if (!after.has(file)) {
        changed.push(file);
      }
    }

    return changed;
  }
}

module.exports = GitHelper;
