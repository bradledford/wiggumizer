const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const GitHelper = require('./git-helper');
const IterationJournal = require('./iteration-journal');

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
    // Expand ~ to home directory
    if (workspacePath.startsWith('~')) {
      const os = require('os');
      workspacePath = path.join(os.homedir(), workspacePath.slice(1));
    }

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
        cwd: this.baseDir,
        breadcrumbs: this.readBreadcrumbs()
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

      // Get iteration history (Git or journal-based)
      const iterationContext = this.getIterationContext();

      return {
        isMultiRepo: false,
        files,
        cwd,
        breadcrumbs: this.readBreadcrumbs(),
        // Unified iteration context
        gitLog: iterationContext.gitLog,
        gitStatus: iterationContext.gitStatus,
        iterationHistory: iterationContext.iterationHistory,
        isGitRepo: iterationContext.isGitRepo
      };
    }
  }

  /**
   * Read breadcrumbs (ralph-notes.md) for strategic context
   * Supports both new location (.wiggumizer/ralph-notes.md) and legacy (.ralph-notes.md)
   * @param {string} cwd - Working directory (default: this.baseDir)
   * @returns {string|null} Breadcrumbs content or null if not found
   */
  readBreadcrumbs(cwd = null) {
    const basePath = cwd || this.baseDir;

    // Check new location first: .wiggumizer/ralph-notes.md
    const newPath = path.join(basePath, '.wiggumizer', 'ralph-notes.md');
    if (fs.existsSync(newPath)) {
      try {
        return fs.readFileSync(newPath, 'utf-8');
      } catch (error) {
        if (this.verbose) {
          console.warn(chalk.yellow(`Warning: Could not read breadcrumbs: ${error.message}`));
        }
      }
    }

    // Fall back to legacy location: .ralph-notes.md
    const legacyPath = path.join(basePath, '.ralph-notes.md');
    if (fs.existsSync(legacyPath)) {
      try {
        return fs.readFileSync(legacyPath, 'utf-8');
      } catch (error) {
        if (this.verbose) {
          console.warn(chalk.yellow(`Warning: Could not read breadcrumbs: ${error.message}`));
        }
      }
    }

    return null;
  }

  /**
   * Get iteration context (git log or journal-based history)
   * Provides unified interface regardless of whether Git is available
   * @param {string} cwd - Working directory (default: this.baseDir)
   * @returns {Object} Context with gitLog, gitStatus, iterationHistory, isGitRepo
   */
  getIterationContext(cwd = null) {
    const basePath = cwd || this.baseDir;
    const { execSync } = require('child_process');

    const isGitRepo = GitHelper.isGitRepo(basePath);

    if (isGitRepo) {
      // Git-based context (preferred)
      let gitLog = '';
      let gitStatus = '';

      try {
        gitLog = execSync('git log --oneline -10', {
          encoding: 'utf-8',
          cwd: basePath
        }).trim();
      } catch (error) {
        // Git log failed, leave empty
      }

      try {
        gitStatus = execSync('git status --short', {
          encoding: 'utf-8',
          cwd: basePath
        }).trim();
      } catch (error) {
        // Git status failed, leave empty
      }

      return {
        isGitRepo: true,
        gitLog,
        gitStatus,
        iterationHistory: gitLog // Unified interface
      };
    } else {
      // Journal-based context (fallback for non-Git repos)
      const journal = new IterationJournal({ cwd: basePath, verbose: this.verbose });
      const iterationHistory = journal.format(10);

      return {
        isGitRepo: false,
        gitLog: null,
        gitStatus: null,
        iterationHistory: iterationHistory || null
      };
    }
  }

  /**
   * Get a workspace by name
   * @param {string} name - Workspace name
   * @returns {Object|undefined} Workspace config or undefined
   */
  getWorkspaceByName(name) {
    return this.workspaces.find(ws => ws.name === name || path.basename(ws.path) === name);
  }

  /**
   * Get combined context from all workspaces
   * @param {Object} options - Options for context generation
   * @returns {string} Combined context string
   */
  getCombinedContext(options = {}) {
    const files = this.getAllFiles();
    const maxSize = options.maxSize || 100000;

    let context = '# Multi-Repository Codebase\n\n';
    let totalSize = context.length;

    // Group files by workspace
    const byWorkspace = {};
    for (const file of files) {
      if (!byWorkspace[file.workspace]) {
        byWorkspace[file.workspace] = [];
      }
      byWorkspace[file.workspace].push(file);
    }

    // Add files by workspace
    for (const [wsName, wsFiles] of Object.entries(byWorkspace)) {
      const wsHeader = `## Workspace: ${wsName}\n\n`;

      if (totalSize + wsHeader.length > maxSize) {
        break;
      }

      context += wsHeader;
      totalSize += wsHeader.length;

      for (const file of wsFiles) {
        const fileSection = `### File: ${file.path}\n\`\`\`\n${file.content}\n\`\`\`\n\n`;

        if (totalSize + fileSection.length > maxSize) {
          context += `...(${wsFiles.length - wsFiles.indexOf(file)} more files in ${wsName})\n\n`;
          break;
        }

        context += fileSection;
        totalSize += fileSection.length;
      }
    }

    return context;
  }

  /**
   * Apply changes from AI response
   * Parses the changes text (unified diff format) and applies them to the appropriate workspace(s)
   *
   * @param {string} changesText - The raw text from AI containing diffs
   * @param {function} applyCallback - Function(workspace, diffResults) to apply changes to a workspace
   * @returns {object} - { count: number, files: string[] }
   */
  applyChanges(changesText, applyCallback) {
    const DiffApplier = require('./diff-applier');

    const isMultiRepo = this.isMultiRepo();
    const changesByWorkspace = new Map();

    if (isMultiRepo) {
      // Multi-repo mode: parse workspace prefix from diff paths
      // Expected format: --- a/[workspace-name]/path/to/file
      const fileDiffs = DiffApplier.parseDiff(changesText);

      for (const fileDiff of fileDiffs) {
        const filePath = fileDiff.newPath || fileDiff.oldPath;
        if (!filePath) continue;

        // Extract workspace name from path like [workspace-name]/path/to/file
        const workspaceMatch = filePath.match(/^\[([^\]]+)\]\/(.+)$/);

        if (!workspaceMatch) {
          console.warn(chalk.yellow(`Warning: File ${filePath} has no workspace prefix in multi-repo mode, skipping`));
          continue;
        }

        const workspaceName = workspaceMatch[1];
        const relativeFilePath = workspaceMatch[2];

        const targetWorkspace = this.workspaces.find(w =>
          (w.name || w.path) === workspaceName
        );

        if (!targetWorkspace) {
          console.warn(chalk.yellow(`Warning: Unknown workspace ${workspaceName}, skipping ${filePath}`));
          continue;
        }

        const workspaceKey = targetWorkspace.name || targetWorkspace.path;

        if (!changesByWorkspace.has(workspaceKey)) {
          changesByWorkspace.set(workspaceKey, {
            workspace: targetWorkspace,
            diffText: ''
          });
        }

        // Reconstruct diff for this workspace with corrected paths
        let workspaceDiff = `--- a/${relativeFilePath}\n`;
        workspaceDiff += `+++ b/${relativeFilePath}\n`;
        for (const hunk of fileDiff.hunks) {
          workspaceDiff += `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@\n`;
          workspaceDiff += hunk.lines.join('\n') + '\n';
        }

        changesByWorkspace.get(workspaceKey).diffText += workspaceDiff;
      }
    } else {
      // Single-repo mode: apply diffs directly
      changesByWorkspace.set('default', {
        workspace: { name: 'default', path: process.cwd() },
        diffText: changesText
      });
    }

    // Apply changes to each workspace
    let totalFilesModified = 0;
    const allModifiedFiles = [];

    for (const { workspace, diffText } of changesByWorkspace.values()) {
      const result = applyCallback(workspace, diffText);

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
