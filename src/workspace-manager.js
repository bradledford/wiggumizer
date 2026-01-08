const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * Manages multi-repository workspaces
 * Allows running Ralph loops across multiple repos simultaneously
 */
class WorkspaceManager {
  constructor(options = {}) {
    this.workspaces = options.workspaces || [];
    this.baseDir = options.baseDir || process.cwd();
    this.verbose = options.verbose || false;
  }

  /**
   * Load workspaces from config
   */
  static fromConfig(config) {
    if (!config.workspaces || !Array.isArray(config.workspaces)) {
      return null;
    }

    return new WorkspaceManager({
      workspaces: config.workspaces,
      baseDir: process.cwd(),
      verbose: config.verbose
    });
  }

  /**
   * Validate all workspace paths exist
   */
  validate() {
    const results = [];

    for (const workspace of this.workspaces) {
      const workspacePath = this.resolvePath(workspace.path);
      const exists = fs.existsSync(workspacePath);
      const isDirectory = exists && fs.statSync(workspacePath).isDirectory();

      results.push({
        name: workspace.name || workspace.path,
        path: workspacePath,
        exists,
        isDirectory,
        valid: exists && isDirectory
      });
    }

    return results;
  }

  /**
   * Get all valid workspaces
   */
  getValidWorkspaces() {
    return this.validate().filter(w => w.valid);
  }

  /**
   * Get workspace status (files, git status, etc.)
   */
  getStatus() {
    const GitHelper = require('./git-helper');
    const FileSelector = require('./file-selector');

    const results = [];

    for (const workspace of this.workspaces) {
      const workspacePath = this.resolvePath(workspace.path);

      if (!fs.existsSync(workspacePath)) {
        results.push({
          name: workspace.name || workspace.path,
          path: workspacePath,
          status: 'not_found',
          error: 'Path does not exist'
        });
        continue;
      }

      try {
        // Check git status
        const isGitRepo = GitHelper.isGitRepo(workspacePath);
        const hasChanges = isGitRepo ? GitHelper.hasUncommittedChanges(workspacePath) : false;

        // Count files
        const selector = new FileSelector({
          cwd: workspacePath,
          include: workspace.include,
          exclude: workspace.exclude
        });
        const files = selector.getFiles();

        // Check for PROMPT.md
        const hasPrompt = fs.existsSync(path.join(workspacePath, 'PROMPT.md'));

        results.push({
          name: workspace.name || workspace.path,
          path: workspacePath,
          status: 'ok',
          isGitRepo,
          hasUncommittedChanges: hasChanges,
          fileCount: files.length,
          hasPrompt
        });
      } catch (error) {
        results.push({
          name: workspace.name || workspace.path,
          path: workspacePath,
          status: 'error',
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Resolve a workspace path (relative to baseDir or absolute)
   */
  resolvePath(workspacePath) {
    if (path.isAbsolute(workspacePath)) {
      return workspacePath;
    }
    return path.resolve(this.baseDir, workspacePath);
  }

  /**
   * Get files from all workspaces combined
   */
  getAllFiles() {
    const FileSelector = require('./file-selector');
    const allFiles = [];

    for (const workspace of this.workspaces) {
      const workspacePath = this.resolvePath(workspace.path);

      if (!fs.existsSync(workspacePath)) {
        continue;
      }

      try {
        const selector = new FileSelector({
          cwd: workspacePath,
          include: workspace.include,
          exclude: workspace.exclude
        });

        const files = selector.getFilesWithContent();

        // Add workspace prefix to file paths
        for (const file of files) {
          allFiles.push({
            workspace: workspace.name || workspace.path,
            workspacePath,
            path: file.path,
            fullPath: path.join(workspacePath, file.path),
            content: file.content
          });
        }
      } catch (error) {
        if (this.verbose) {
          console.warn(`Warning: Failed to get files from ${workspace.name || workspace.path}: ${error.message}`);
        }
      }
    }

    return allFiles;
  }

  /**
   * Write a file to a specific workspace
   */
  writeFile(workspaceName, filePath, content) {
    const workspace = this.workspaces.find(w =>
      (w.name || w.path) === workspaceName
    );

    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceName}`);
    }

    const workspacePath = this.resolvePath(workspace.path);
    const fullPath = path.join(workspacePath, filePath);

    // Ensure directory exists
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, content, 'utf-8');

    return fullPath;
  }

  /**
   * Display workspace status in a formatted way
   */
  displayStatus() {
    const status = this.getStatus();

    console.log(chalk.bold('\nWorkspace Status\n'));

    for (const ws of status) {
      if (ws.status === 'ok') {
        console.log(chalk.green('✓') + ` ${chalk.bold(ws.name)}`);
        console.log(chalk.dim(`  Path: ${ws.path}`));
        console.log(chalk.dim(`  Files: ${ws.fileCount}`));

        if (ws.isGitRepo) {
          if (ws.hasUncommittedChanges) {
            console.log(chalk.yellow('  Git: uncommitted changes'));
          } else {
            console.log(chalk.dim('  Git: clean'));
          }
        } else {
          console.log(chalk.dim('  Git: not a repository'));
        }

        if (ws.hasPrompt) {
          console.log(chalk.dim('  PROMPT.md: found'));
        } else {
          console.log(chalk.yellow('  PROMPT.md: not found'));
        }
      } else if (ws.status === 'not_found') {
        console.log(chalk.red('✗') + ` ${chalk.bold(ws.name)}`);
        console.log(chalk.red(`  Path not found: ${ws.path}`));
      } else {
        console.log(chalk.red('✗') + ` ${chalk.bold(ws.name)}`);
        console.log(chalk.red(`  Error: ${ws.error}`));
      }

      console.log();
    }
  }
}

module.exports = WorkspaceManager;
