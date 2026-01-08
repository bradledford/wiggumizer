const fs = require('fs');
const path = require('path');
const FileSelector = require('./file-selector');
const GitHelper = require('./git-helper');
const { execSync } = require('child_process');

/**
 * Manages multiple repositories/workspaces for Wiggumizer
 * Coordinates file discovery, context gathering, and changes across repos
 */
class WorkspaceManager {
  constructor(config) {
    this.workspaces = this.parseWorkspaces(config);
    this.verbose = config.verbose || false;
  }

  /**
   * Parse and validate workspace configuration
   */
  parseWorkspaces(config) {
    // If no workspaces defined, use current directory as single workspace
    if (!config.workspaces || config.workspaces.length === 0) {
      return [{
        name: 'default',
        path: process.cwd(),
        absolutePath: process.cwd(),
        include: config.files?.include || ['**/*'],
        exclude: config.files?.exclude || [],
        contextLimits: config.context || { maxSize: 100000, maxFiles: 50 }
      }];
    }

    // Parse multiple workspaces
    return config.workspaces.map((ws, index) => {
      const workspacePath = ws.path || process.cwd();

      // Resolve to absolute path
      const absolutePath = path.isAbsolute(workspacePath)
        ? workspacePath
        : path.resolve(process.cwd(), workspacePath);

      // Validate path exists
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`Workspace path does not exist: ${absolutePath}`);
      }

      return {
        name: ws.name || `workspace-${index + 1}`,
        path: workspacePath,
        absolutePath,
        include: ws.include || config.files?.include || ['**/*'],
        exclude: ws.exclude || config.files?.exclude || [],
        contextLimits: ws.context || config.context || { maxSize: 100000, maxFiles: 50 }
      };
    });
  }

  /**
   * Get all workspaces
   */
  getWorkspaces() {
    return this.workspaces;
  }

  /**
   * Check if we're in multi-repo mode
   */
  isMultiRepo() {
    return this.workspaces.length > 1;
  }

  /**
   * Gather context from all workspaces
   */
  getCodebaseContext() {
    if (!this.isMultiRepo()) {
      // Single repo mode - use simple context gathering
      return this.getSingleRepoContext(this.workspaces[0]);
    }

    // Multi-repo mode - gather from all workspaces
    const allFiles = [];
    const workspaceContexts = [];

    for (const workspace of this.workspaces) {
      const selector = new FileSelector({
        cwd: workspace.absolutePath,
        include: workspace.include,
        exclude: workspace.exclude,
        respectGitignore: true,
        maxContextSize: workspace.contextLimits.maxSize || 100000,
        maxFiles: workspace.contextLimits.maxFiles || 50,
        verbose: this.verbose
      });

      const files = selector.getFilesWithContent();

      // Tag files with workspace info
      const taggedFiles = files.map(file => ({
        ...file,
        workspace: workspace.name,
        workspacePath: workspace.absolutePath,
        fullPath: path.join(workspace.absolutePath, file.path)
      }));

      allFiles.push(...taggedFiles);

      // Get git context for this workspace
      const gitContext = this.getGitContext(workspace.absolutePath);

      workspaceContexts.push({
        name: workspace.name,
        path: workspace.path,
        absolutePath: workspace.absolutePath,
        fileCount: files.length,
        gitContext
      });

      if (this.verbose) {
        const stats = selector.getStats();
        console.log(`  [${workspace.name}] ${stats.fileCount} files (${Math.round(stats.totalSize / 1024)}KB)`);
      }
    }

    return {
      workspaces: workspaceContexts,
      files: allFiles,
      isMultiRepo: true
    };
  }

  /**
   * Get context for single repo (backwards compatibility)
   */
  getSingleRepoContext(workspace) {
    const selector = new FileSelector({
      cwd: workspace.absolutePath,
      include: workspace.include,
      exclude: workspace.exclude,
      respectGitignore: true,
      maxContextSize: workspace.contextLimits.maxSize || 100000,
      maxFiles: workspace.contextLimits.maxFiles || 50,
      verbose: this.verbose
    });

    const files = selector.getFilesWithContent();

    const context = {
      cwd: workspace.absolutePath,
      files,
      isMultiRepo: false
    };

    // Add git context
    const gitContext = this.getGitContext(workspace.absolutePath);
    if (gitContext.gitLog) context.gitLog = gitContext.gitLog;
    if (gitContext.gitStatus) context.gitStatus = gitContext.gitStatus;

    // Add breadcrumbs
    const breadcrumbsPath = path.join(workspace.absolutePath, '.ralph-notes.md');
    if (fs.existsSync(breadcrumbsPath)) {
      try {
        context.breadcrumbs = fs.readFileSync(breadcrumbsPath, 'utf-8');
      } catch (error) {
        // Not critical
      }
    }

    return context;
  }

  /**
   * Get git context for a specific directory
   */
  getGitContext(cwd) {
    const context = {};

    if (!GitHelper.isGitRepo(cwd)) {
      return context;
    }

    try {
      const gitLog = execSync('git log --oneline -10 --decorate', {
        encoding: 'utf-8',
        cwd
      }).trim();
      if (gitLog) {
        context.gitLog = gitLog;
      }

      const gitStatus = execSync('git status --short', {
        encoding: 'utf-8',
        cwd
      }).trim();
      if (gitStatus) {
        context.gitStatus = gitStatus;
      }
    } catch (error) {
      // Git commands failed - not critical
      if (this.verbose) {
        console.log(`  Could not fetch git context for ${cwd}`);
      }
    }

    return context;
  }

  /**
   * Apply changes to the appropriate workspace
   * Parses file paths and routes to correct repo
   */
  applyChanges(changesText, applyCallback) {
    const filePattern = /##\s*File:\s*([^\n]+)\n```[^\n]*\n([\s\S]*?)```/g;
    let match;
    const changesByWorkspace = new Map();

    // Parse all changes and group by workspace
    while ((match = filePattern.exec(changesText)) !== null) {
      let filePath = match[1].trim();
      const fileContent = match[2];

      // Check if file path has workspace prefix: [workspace-name] path/to/file
      let targetWorkspace = null;
      const workspaceMatch = filePath.match(/^\[([^\]]+)\]\s*(.+)$/);

      if (workspaceMatch) {
        // Explicit workspace specified
        const workspaceName = workspaceMatch[1];
        filePath = workspaceMatch[2];
        targetWorkspace = this.workspaces.find(ws => ws.name === workspaceName);

        if (!targetWorkspace) {
          console.error(`Unknown workspace: ${workspaceName}`);
          continue;
        }
      } else {
        // Try to determine workspace from file path
        targetWorkspace = this.findWorkspaceForFile(filePath);
      }

      if (!targetWorkspace) {
        if (this.verbose) {
          console.warn(`Could not determine workspace for file: ${filePath}`);
        }
        continue;
      }

      // Group changes by workspace
      if (!changesByWorkspace.has(targetWorkspace)) {
        changesByWorkspace.set(targetWorkspace, []);
      }

      changesByWorkspace.get(targetWorkspace).push({
        filePath,
        fileContent,
        fullPath: path.join(targetWorkspace.absolutePath, filePath)
      });
    }

    // Apply changes to each workspace
    let totalFilesModified = 0;
    const modifiedFiles = [];

    for (const [workspace, changes] of changesByWorkspace) {
      const result = applyCallback(workspace, changes);
      totalFilesModified += result.count;
      modifiedFiles.push(...result.files.map(f => ({
        workspace: workspace.name,
        path: f
      })));
    }

    return {
      count: totalFilesModified,
      files: modifiedFiles
    };
  }

  /**
   * Find which workspace a file belongs to
   * Checks if file exists in any workspace
   */
  findWorkspaceForFile(filePath) {
    // If only one workspace, use it
    if (this.workspaces.length === 1) {
      return this.workspaces[0];
    }

    // Check each workspace to see if file exists there
    for (const workspace of this.workspaces) {
      const fullPath = path.join(workspace.absolutePath, filePath);
      if (fs.existsSync(fullPath)) {
        return workspace;
      }
    }

    // File doesn't exist anywhere - use first workspace as default
    // (new files will be created in the default workspace)
    return this.workspaces[0];
  }

  /**
   * Get workspace by name
   */
  getWorkspace(name) {
    return this.workspaces.find(ws => ws.name === name);
  }

  /**
   * Get workspace containing a specific path
   */
  getWorkspaceByPath(filePath) {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

    for (const workspace of this.workspaces) {
      if (absolutePath.startsWith(workspace.absolutePath)) {
        return workspace;
      }
    }

    return null;
  }
}

module.exports = WorkspaceManager;
