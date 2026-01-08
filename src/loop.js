const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const ClaudeProvider = require('./providers/claude');
const FileValidator = require('./validator');
const GitHelper = require('./git-helper');
const IterationLogger = require('./iteration-logger');
const ConvergenceAnalyzer = require('./convergence-analyzer');
const WorkspaceManager = require('./workspace-manager');
const PromptUpdater = require('./prompt-updater');

class RalphLoop {
  constructor(options) {
    this.prompt = options.prompt;
    this.maxIterations = options.maxIterations || 20;
    this.verbose = options.verbose || false;
    this.dryRun = options.dryRun || false;
    this.autoCommit = options.autoCommit || false;
    this.convergenceThreshold = options.convergenceThreshold || 0.02;
    this.filePatterns = options.filePatterns || {};
    this.contextLimits = options.contextLimits || { maxSize: 100000, maxFiles: 50 };
    this.iteration = 0;
    this.filesModifiedTotal = 0;

    // Initialize workspace manager (handles multi-repo support)
    this.workspaceManager = new WorkspaceManager({
      workspaces: options.workspaces,
      files: options.filePatterns,
      context: options.contextLimits,
      verbose: this.verbose
    });

    // Initialize iteration logger
    this.logger = new IterationLogger();

    // Initialize convergence analyzer
    this.convergence = new ConvergenceAnalyzer({
      threshold: this.convergenceThreshold,
      verbose: this.verbose
    });

    // Initialize prompt updater for work plan tracking
    this.promptUpdater = new PromptUpdater({
      promptPath: path.join(process.cwd(), options.prompt || 'PROMPT.md'),
      verbose: this.verbose,
      dryRun: this.dryRun
    });

    // Initialize provider
    const providerName = options.provider || 'claude';
    if (providerName === 'claude') {
      const providerConfig = {
        ...(options.providerConfig?.claude || {}),
        verbose: this.verbose,
        maxRetries: options.retry?.maxRetries,
        baseDelay: options.retry?.baseDelay,
        maxDelay: options.retry?.maxDelay,
        requestsPerMinute: options.rateLimit?.requestsPerMinute,
        requestsPerHour: options.rateLimit?.requestsPerHour
      };
      this.provider = new ClaudeProvider(providerConfig);
    } else {
      throw new Error(`Provider ${providerName} not yet implemented. Coming soon!`);
    }
  }

  async run() {
    console.log(chalk.bold('Starting Ralph loop...\n'));

    const startTime = Date.now();

    // Show workspace info
    const workspaces = this.workspaceManager.getWorkspaces();
    if (this.workspaceManager.isMultiRepo()) {
      console.log(chalk.blue('ℹ Multi-repo mode:') + chalk.dim(` ${workspaces.length} workspaces`));
      for (const ws of workspaces) {
        console.log(chalk.dim(`  - ${ws.name}: ${ws.path}`));
      }
      console.log();
    }

    // Warn if git repos are dirty
    for (const workspace of workspaces) {
      if (this.workspaceManager.isMultiRepo()) {
        console.log(chalk.dim(`Checking workspace: ${workspace.name}`));
      }
      GitHelper.warnIfDirty(workspace.absolutePath);
    }

    // Store initial commits for rollback (per workspace)
    const initialCommits = new Map();
    for (const workspace of workspaces) {
      const commit = GitHelper.getCurrentCommit(workspace.absolutePath);
      if (commit) {
        initialCommits.set(workspace.name, commit);
      }
    }

    // Show auto-commit status
    if (this.autoCommit) {
      console.log(chalk.blue('ℹ Auto-commit enabled') + chalk.dim(' - Changes will be committed after each iteration'));
    } else {
      console.log(chalk.dim('ℹ Auto-commit disabled - Review changes with: git diff'));
    }

    // Show log location
    console.log(chalk.dim(`ℹ Logging to: ${this.logger.sessionDir}`));
    console.log();

    // Load and show work plan progress
    if (this.promptUpdater.load()) {
      const progress = this.promptUpdater.getProgress();
      if (progress.total > 0) {
        console.log(chalk.blue('Work Plan Progress:') + chalk.dim(` ${progress.completed}/${progress.total} tasks completed (${progress.percentage}%)`));
        const incomplete = this.promptUpdater.getIncompleteTasks();
        if (incomplete.length > 0 && this.verbose) {
          console.log(chalk.dim('  Remaining tasks:'));
          incomplete.slice(0, 3).forEach(task => {
            console.log(chalk.dim(`    - ${task.text}`));
          });
          if (incomplete.length > 3) {
            console.log(chalk.dim(`    ... and ${incomplete.length - 3} more`));
          }
        }
        console.log();
      }
    }

    let noChangeIterations = 0;
    let converged = false;
    let convergenceReason = '';

    while (this.iteration < this.maxIterations) {
      this.iteration++;

      const spinner = ora(`Iteration ${this.iteration}/${this.maxIterations}`).start();

      try {
        // Get current codebase state
        const codebaseContext = this.getCodebaseContext();

        // Update file hashes for convergence detection
        const hashComparison = this.convergence.updateFileHashes(codebaseContext.files);

        // Send to AI provider (prompt stays constant - true Ralph philosophy)
        const response = await this.provider.iterate({
          prompt: this.prompt,
          context: codebaseContext,
          iteration: this.iteration
        });

        spinner.succeed(`Iteration ${this.iteration}/${this.maxIterations}`);

        // Check if there are changes
        if (!response.hasChanges) {
          console.log(chalk.green('\n✓ Convergence detected!'));
          console.log(chalk.dim(`No changes after ${this.iteration} iterations.\n`));

          // Log iteration
          this.logger.logIteration(this.iteration, {
            prompt: this.prompt,
            response,
            filesModified: 0,
            convergence: true
          });

          converged = true;
          break;
        }

        // Display changes summary
        console.log(chalk.dim(`  ${response.summary}`));

        // Apply changes (if not dry run)
        let filesModified = 0;
        let modifiedFilesList = [];
        if (!this.dryRun && response.changes) {
          const result = this.applyChanges(response.changes);
          filesModified = result.count;
          modifiedFilesList = result.files;

          if (filesModified > 0) {
            console.log(chalk.green(`  ✓ Applied changes to ${filesModified} file(s)`));
            this.filesModifiedTotal += filesModified;
            noChangeIterations = 0;
          } else {
            console.log(chalk.yellow(`  ⚠ No files were modified`));
            noChangeIterations++;
          }
        } else if (this.dryRun) {
          console.log(chalk.yellow(`  ⚠ Dry run - changes not applied`));
          if (this.verbose) {
            console.log(chalk.dim(`\n${response.changes}\n`));
          }
        }

        // Record iteration in convergence analyzer
        this.convergence.recordIteration(this.iteration, {
          filesModified,
          filesList: modifiedFilesList,
          response: response.raw || response.changes || ''
        });

        // Update work plan progress based on this iteration
        if (filesModified > 0) {
          const updateContext = {
            filesModified: modifiedFilesList,
            completedWork: response.summary || response.reasoning || '',
            gitLog: this.getGitLogForWorkspace()
          };

          const updateResult = this.promptUpdater.updateTaskStatus(updateContext);

          if (updateResult.updated) {
            this.promptUpdater.save();
            if (this.verbose) {
              console.log(chalk.green(`  ✓ Updated ${updateResult.count} task(s) in work plan`));
            }

            // Show updated progress
            const progress = this.promptUpdater.getProgress();
            if (progress.total > 0) {
              console.log(chalk.dim(`  Progress: ${progress.completed}/${progress.total} (${progress.percentage}%)`));
            }
          }
        }

        // Check for advanced convergence
        const convergenceCheck = this.convergence.checkConvergence();

        if (convergenceCheck.converged) {
          console.log(chalk.green('\n✓ Convergence detected!'));
          console.log(chalk.dim(`${convergenceCheck.reason} (confidence: ${(convergenceCheck.confidence * 100).toFixed(0)}%)\n`));
          converged = true;
          convergenceReason = convergenceCheck.reason;

          // Log iteration
          this.logger.logIteration(this.iteration, {
            prompt: this.prompt,
            response,
            filesModified,
            convergence: true,
            convergenceReason: convergenceCheck.reason,
            convergenceConfidence: convergenceCheck.confidence
          });

          break;
        }

        // Warn about oscillation
        if (convergenceCheck.oscillation?.detected) {
          console.log(chalk.yellow(`  ⚠ ${convergenceCheck.oscillation.message}`));
          console.log(chalk.dim(`    Consider refining your prompt to avoid flip-flopping`));
        }

        // Show convergence confidence in verbose mode
        if (this.verbose && convergenceCheck.confidence > 0) {
          console.log(chalk.dim(`  Convergence confidence: ${(convergenceCheck.confidence * 100).toFixed(0)}%`));
        }

        // Log iteration
        this.logger.logIteration(this.iteration, {
          prompt: this.prompt,
          response,
          filesModified,
          convergence: false,
          convergenceConfidence: convergenceCheck.confidence
        });

        console.log();

      } catch (error) {
        spinner.fail(`Iteration ${this.iteration} failed`);

        // Log error
        this.logger.logIteration(this.iteration, {
          prompt: this.prompt,
          response: null,
          filesModified: 0,
          error: error.message
        });

        throw error;
      }
    }

    if (this.iteration >= this.maxIterations) {
      console.log(chalk.yellow('⚠ Max iterations reached without full convergence.'));
      console.log(chalk.dim('You may want to refine your prompt and try again.\n'));
    }

    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log(chalk.bold.green('Ralph loop complete!'));
    console.log(chalk.dim(`Total iterations: ${this.iteration}`));
    console.log(chalk.dim(`Total files modified: ${this.filesModifiedTotal}`));
    console.log(chalk.dim(`Duration: ${duration}s`));

    if (converged && convergenceReason) {
      console.log(chalk.dim(`Converged: ${convergenceReason}`));
    }

    // Get convergence summary
    const convergenceSummary = this.convergence.getSummary();

    // Log session summary
    this.logger.logSummary({
      totalIterations: this.iteration,
      converged,
      convergenceReason,
      filesModified: this.filesModifiedTotal,
      duration,
      convergenceSummary,
      config: {
        provider: this.provider.constructor.name,
        maxIterations: this.maxIterations
      }
    });

    // Show logs location
    console.log();
    console.log(chalk.blue('Session logs:') + chalk.dim(` ${this.logger.sessionDir}`));
    console.log(chalk.dim('View with: wiggumize logs'));

    // Remind user to review changes if not auto-committing
    if (!this.autoCommit && GitHelper.isGitRepo() && GitHelper.hasUncommittedChanges()) {
      console.log();
      console.log(chalk.blue('Next steps:'));
      console.log(chalk.dim('  git diff          # Review changes'));
      console.log(chalk.dim('  git add .         # Stage changes'));
      console.log(chalk.dim('  git commit -m "Your message"'));
    }
    console.log();

    // Return summary data for CHANGELOG generation
    return {
      totalIterations: this.iteration,
      filesModified: this.filesModifiedTotal,
      duration,
      converged,
      convergenceReason,
      convergenceSummary,
      sessionDir: this.logger.sessionDir
    };
  }

  getCodebaseContext() {
    // Use WorkspaceManager to gather context from all workspaces
    const context = this.workspaceManager.getCodebaseContext();

    if (this.verbose) {
      if (context.isMultiRepo) {
        const totalFiles = context.files.length;
        const totalSize = context.files.reduce((sum, f) => sum + f.content.length, 0);
        console.log(chalk.dim(`  Selected ${totalFiles} files across ${context.workspaces.length} workspaces (${Math.round(totalSize / 1024)}KB)`));
      } else {
        const totalFiles = context.files.length;
        const totalSize = context.files.reduce((sum, f) => sum + f.content.length, 0);
        console.log(chalk.dim(`  Selected ${totalFiles} files (${Math.round(totalSize / 1024)}KB)`));
      }
    }

    return context;
  }


  applyChanges(changesText) {
    // Use WorkspaceManager to apply changes to the appropriate workspace
    const result = this.workspaceManager.applyChanges(changesText, (workspace, changes) => {
      let filesModified = 0;
      const modifiedFiles = [];
      const backups = new Map();

      for (const { filePath, fileContent, fullPath } of changes) {
        try {
          // Validate file content before writing
          const validation = FileValidator.validate(filePath, fileContent);
          if (!validation.valid) {
            console.error(chalk.red(`    ✗ Validation failed for ${filePath}`));
            console.error(chalk.dim(`      ${validation.details}`));
            console.log(chalk.yellow('      Skipping this file to prevent breaking changes'));
            continue;
          }

          // Backup existing file
          if (fs.existsSync(fullPath)) {
            const backup = fs.readFileSync(fullPath, 'utf-8');
            backups.set(fullPath, backup);
          }

          // Ensure directory exists
          const dir = path.dirname(fullPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }

          // Write the file
          fs.writeFileSync(fullPath, fileContent, 'utf-8');

          if (this.verbose) {
            const displayPath = this.workspaceManager.isMultiRepo()
              ? `[${workspace.name}] ${filePath}`
              : filePath;
            console.log(chalk.dim(`    Modified: ${displayPath}`));
          }

          filesModified++;
          modifiedFiles.push(filePath);
        } catch (error) {
          console.error(chalk.red(`    ✗ Failed to write ${filePath}: ${error.message}`));

          // Rollback any files we've modified so far
          console.log(chalk.yellow('    Rolling back changes...'));
          for (const [backupPath, backupContent] of backups) {
            fs.writeFileSync(backupPath, backupContent, 'utf-8');
          }
          filesModified = 0;
          modifiedFiles.length = 0;
          break;
        }
      }

      // Create git backup if in a repo and files were modified (only if auto-commit is enabled)
      if (filesModified > 0 && this.autoCommit && GitHelper.isGitRepo(workspace.absolutePath)) {
        const committed = GitHelper.createBackupCommit(this.iteration, workspace.absolutePath);
        if (committed && this.verbose) {
          const repoLabel = this.workspaceManager.isMultiRepo()
            ? `[${workspace.name}]`
            : 'Git:';
          console.log(chalk.dim(`    ${repoLabel} Auto-committed iteration ${this.iteration}`));
        }
      }

      return {
        count: filesModified,
        files: modifiedFiles
      };
    });

    if (result.count === 0 && this.verbose) {
      console.log(chalk.yellow('    ⚠ No file modifications detected in response'));
      console.log(chalk.dim('\n  Raw response:'));
      console.log(chalk.dim(changesText.substring(0, 500) + '...'));
    }

    return result;
  }

  /**
   * Get git log for work plan tracking
   */
  getGitLogForWorkspace() {
    try {
      const { execSync } = require('child_process');
      const gitLog = execSync('git log --oneline -10', {
        encoding: 'utf-8',
        cwd: process.cwd()
      }).trim();
      return gitLog;
    } catch (error) {
      return '';
    }
  }
}

module.exports = RalphLoop;
