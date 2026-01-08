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
   * Get all workspaces
   */
  getWorkspaces() {
    return this.workspaces;
  }

  /**
   * Check if this is a multi-repo workspace
   */
  isMultiRepo() {
    return this.workspaces && this.workspaces.length > 0;
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
   * Get codebase context (files and metadata) for all workspaces
   * This is used to build the context sent to the AI provider
   */
  getCodebaseContext() {
    const isMultiRepo = this.isMultiRepo();

    if (isMultiRepo) {
      // Multi-repo mode: gather files from all workspaces
      const files = this.getAllFiles();
      const workspaces = this.workspaces.map(w => ({
        name: w.name || w.path,
        path: this.resolvePath(w.path)
      }));

      return {
        isMultiRepo: true,
        files,
        workspaces,
        cwd: this.baseDir
      };
    } else {
      // Single repo mode: use FileSelector directly
      const FileSelector = require('./file-selector');
      const cwd = process.cwd();

      const selector = new FileSelector({
        cwd,
        respectGitignore: true,
        verbose: this.verbose
      });

      const files = selector.getFilesWithContent();

      return {
        isMultiRepo: false,
        files,
        cwd
      };
    }
  }

  /**
   * Apply changes from AI response
   * Parses the changes text and applies them to the appropriate workspace(s)
   *
   * @param {string} changesText - The raw text from AI containing file changes
   * @param {function} applyCallback - Function(workspace, changes) to apply changes to a workspace
   * @returns {object} - { count: number, files: string[] }
   */
  applyChanges(changesText, applyCallback) {
    // Parse changes to extract file modifications
    // Pattern: ## File: [workspace-name] path/to/file.js OR ## File: path/to/file.js
    const filePattern = /##\s*File:\s*(?:\[([^\]]+)\]\s*)?([^\n]+)\n```[^\n]*\n([\s\S]*?)```/g;

    const isMultiRepo = this.isMultiRepo();
    const changesByWorkspace = new Map();
    let match;

    // Group changes by workspace
    while ((match = filePattern.exec(changesText)) !== null) {
      const workspaceName = match[1]?.trim();
      const filePath = match[2].trim();
      const fileContent = match[3];

      let targetWorkspace;

      if (isMultiRepo) {
        // In multi-repo mode, find the workspace by name
        if (!workspaceName) {
          console.warn(chalk.yellow(`Warning: File ${filePath} has no workspace prefix in multi-repo mode, skipping`));
          continue;
        }

        targetWorkspace = this.workspaces.find(w =>
          (w.name || w.path) === workspaceName
        );

        if (!targetWorkspace) {
          console.warn(chalk.yellow(`Warning: Unknown workspace ${workspaceName}, skipping ${filePath}`));
          continue;
        }
      } else {
        // In single-repo mode, use current directory
        targetWorkspace = {
          name: 'default',
          path: process.cwd()
        };
      }

      const workspaceKey = targetWorkspace.name || targetWorkspace.path;

      if (!changesByWorkspace.has(workspaceKey)) {
        changesByWorkspace.set(workspaceKey, {
          workspace: targetWorkspace,
          changes: []
        });
      }

      const workspacePath = this.resolvePath(targetWorkspace.path);
      const fullPath = path.join(workspacePath, filePath);

      changesByWorkspace.get(workspaceKey).changes.push({
        filePath,
        fileContent,
        fullPath
      });
    }

    // Apply changes to each workspace
    let totalFilesModified = 0;
    const allModifiedFiles = [];

    for (const { workspace, changes } of changesByWorkspace.values()) {
      const result = applyCallback(workspace, changes);

      if (result && result.count) {
        totalFilesModified += result.count;
        allModifiedFiles.push(...result.files);
      }
    }

    return {
      count: totalFilesModified,
      files: allModifiedFiles
    };
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
