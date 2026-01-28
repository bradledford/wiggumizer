const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const ClaudeProvider = require('./providers/claude');
const ClaudeCliProvider = require('./providers/claude-cli');
const GitHelper = require('./git-helper');
const IterationLogger = require('./iteration-logger');
const IterationJournal = require('./iteration-journal');
const ConvergenceAnalyzer = require('./convergence-analyzer');
const WorkspaceManager = require('./workspace-manager');
const PromptUpdater = require('./prompt-updater');
const ValidationRunner = require('./validation-runner');
const { ChatNotifier } = require('./chat');

class RalphLoop {
  constructor(options) {
    this.prompt = options.prompt;
    this.maxIterations = options.maxIterations || 20;
    this.verbose = options.verbose || false;
    this.dryRun = options.dryRun || false;
    this.autoCommit = options.autoCommit || false;
    this.filePatterns = options.filePatterns || {};
    this.contextLimits = options.contextLimits || { maxSize: 100000, maxFiles: 50 };
    this.fast = options.fast || false;  // Fast mode for quicker iterations
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

    // Initialize prompt updater for work plan tracking
    this.promptUpdater = new PromptUpdater({
      promptPath: path.join(process.cwd(), options.prompt || 'PROMPT.md'),
      verbose: this.verbose,
      dryRun: this.dryRun
    });

    // Initialize validation runner
    this.validationRunner = new ValidationRunner({
      ...options.validation,
      verbose: this.verbose
    });

    // Initialize convergence analyzer with goal-oriented tracking
    this.convergence = new ConvergenceAnalyzer({
      verbose: this.verbose,
      promptUpdater: this.promptUpdater,
      validationRunner: this.validationRunner,
      maxIterations: this.maxIterations
    });

    // Initialize provider
    const providerName = options.provider || 'claude';
    if (providerName === 'claude') {
      const providerConfig = {
        ...(options.providerConfig?.claude || {}),
        verbose: this.verbose,
        fast: this.fast,  // Pass fast mode flag for condensed prompts
        maxRetries: options.retry?.maxRetries,
        baseDelay: options.retry?.baseDelay,
        maxDelay: options.retry?.maxDelay,
        requestsPerMinute: options.rateLimit?.requestsPerMinute,
        requestsPerHour: options.rateLimit?.requestsPerHour
      };
      this.provider = new ClaudeProvider(providerConfig);
    } else if (providerName === 'claude-cli') {
      const providerConfig = {
        ...(options.providerConfig?.['claude-cli'] || {}),
        verbose: this.verbose,
        fast: this.fast  // Pass fast mode flag for condensed prompts
      };
      this.provider = new ClaudeCliProvider(providerConfig);
    } else {
      throw new Error(`Provider ${providerName} not yet implemented. Coming soon!`);
    }

    // Initialize chat notifier for external notifications
    this.chatNotifier = new ChatNotifier({
      provider: options.chatProvider,
      channel: options.chatChannel,
      contact: options.chatContact,
      group: options.chatGroup,
      webhookUrl: options.webhookUrl,
      verbose: this.verbose,
      providerConfig: options.chatProviderConfig
    });

    // Initialize iteration journal for non-Git repos
    this.iterationJournal = new IterationJournal({
      cwd: process.cwd(),
      verbose: this.verbose
    });

    // Track if we're in a Git repo (for deciding whether to use journal)
    this.isGitRepo = GitHelper.isGitRepo();
  }

  async run() {
    console.log(chalk.bold('Starting Ralph loop...\n'));

    const startTime = Date.now();

    // Connect chat notifier if configured
    if (this.chatNotifier.isEnabled()) {
      console.log(chalk.blue('ℹ Chat notifications:') + chalk.dim(` ${this.chatNotifier.providerName}`));
      await this.chatNotifier.connect();
    }

    // Show workspace info
    const workspaces = this.workspaceManager.getWorkspaces();
    if (this.workspaceManager.isMultiRepo()) {
      console.log(chalk.blue('ℹ Multi-repo mode:') + chalk.dim(` ${workspaces.length} workspaces`));
      for (const ws of workspaces) {
        console.log(chalk.dim(`  - ${ws.name}: ${ws.path}`));
      }
      console.log();
    }

    // Warn if git repos are dirty or show non-Git warning
    if (this.workspaceManager.isMultiRepo()) {
      for (const workspace of workspaces) {
        console.log(chalk.dim(`Checking workspace: ${workspace.name}`));
        GitHelper.warnIfDirty(workspace.absolutePath);
      }
    } else {
      // Single repo mode
      if (this.isGitRepo) {
        GitHelper.warnIfDirty();
      } else {
        // Show non-Git warning with journal info
        IterationJournal.displayNonGitWarning();
      }
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
      let heartbeat = null;

      try {
        // Get current codebase state
        const codebaseContext = this.getCodebaseContext();

        // For Claude CLI provider, snapshot file modification times before iteration
        // Claude CLI modifies files directly via its tools, not via diffs in the response
        // We use file snapshots (mtimes) instead of just the list of modified files,
        // because a file already in git status can still be modified further
        const isCliProvider = this.provider.constructor.name === 'ClaudeCliProvider';
        let fileSnapshotBefore = new Map();
        if (isCliProvider && !this.dryRun) {
          fileSnapshotBefore = GitHelper.getFileSnapshot();
        }

        // Set up streaming output handler for all providers
        // This shows real-time progress so users know it's not frozen
        let lastOutputTime = Date.now();
        let outputBuffer = '';
        let lastDisplayedSentence = '';

        const onOutput = (text) => {
          lastOutputTime = Date.now();
          outputBuffer += text;

          // Look for complete sentences (ending with . ! ? or newline)
          // We batch output until we have a meaningful chunk to display
          const sentenceMatch = outputBuffer.match(/^([\s\S]*?[.!?\n])\s*/);

          if (sentenceMatch) {
            const completeSentence = sentenceMatch[1].trim();
            // Remove the matched sentence from buffer
            outputBuffer = outputBuffer.slice(sentenceMatch[0].length);

            // Only update if we have meaningful content
            if (completeSentence && completeSentence !== lastDisplayedSentence) {
              lastDisplayedSentence = completeSentence;

              // Truncate if too long (max 80 chars)
              const displayLine = completeSentence.length > 80
                ? completeSentence.substring(0, 77) + '...'
                : completeSentence;

              spinner.text = `Iteration ${this.iteration}/${this.maxIterations}: ${chalk.dim(displayLine)}`;
            }
          }
        };

        // Heartbeat: update spinner periodically even without output
        // This prevents the appearance of being frozen
        // In fast mode, use shorter intervals for more responsive feedback
        const heartbeatInterval = this.fast ? 1000 : 2000;
        const waitThreshold = this.fast ? 2 : 3;
        heartbeat = setInterval(() => {
          const elapsed = Math.round((Date.now() - lastOutputTime) / 1000);
          if (elapsed > waitThreshold) {
            spinner.text = `Iteration ${this.iteration}/${this.maxIterations}: ${chalk.dim(`waiting for response... (${elapsed}s)`)}`;
          }
        }, heartbeatInterval);

        // Send to AI provider (prompt stays constant - true Ralph philosophy)
        // Always pass onOutput to show progress (not just in verbose mode)
        const response = await this.provider.iterate({
          prompt: this.prompt,
          context: codebaseContext,
          iteration: this.iteration,
          onOutput
        });

        clearInterval(heartbeat);
        spinner.succeed(`Iteration ${this.iteration}/${this.maxIterations}`);

        // Update file hashes for convergence detection (before checking response.hasChanges)
        // This ensures we have the current state recorded before deciding on convergence
        this.convergence.updateFileHashes(codebaseContext.files);

        // Check if there are changes
        if (!response.hasChanges) {
          console.log(chalk.green('\n✓ Convergence detected!'));
          console.log(chalk.dim(`No changes after ${this.iteration} iterations.\n`));

          // Record this iteration before breaking
          this.convergence.recordIteration(this.iteration, {
            filesModified: 0,
            filesList: [],
            response: response.raw || response.changes || ''
          });

          // Log iteration
          this.logger.logIteration(this.iteration, {
            prompt: this.prompt,
            response,
            filesModified: 0,
            convergence: true
          });

          converged = true;
          convergenceReason = 'No changes indicated by AI';
          break;
        }

        // Display changes summary
        console.log(chalk.dim(`  ${response.summary}`));

        // Apply changes (if not dry run)
        let filesModified = 0;
        let modifiedFilesList = [];
        if (!this.dryRun && response.changes) {
          // For Claude CLI provider, detect files modified via git status comparison
          // (Claude CLI modifies files directly via its tools, not via diffs)
          if (isCliProvider) {
            // Compare file snapshots to detect changes (even to files already in git status)
            const fileSnapshotAfter = GitHelper.getFileSnapshot();
            modifiedFilesList = GitHelper.compareSnapshots(fileSnapshotBefore, fileSnapshotAfter);
            filesModified = modifiedFilesList.length;

            if (this.verbose && filesModified > 0) {
              console.log(chalk.dim(`    Detected via git: ${modifiedFilesList.join(', ')}`));
            }

            // Auto-commit for CLI provider (when enabled)
            if (filesModified > 0 && this.autoCommit && GitHelper.isGitRepo()) {
              const committed = GitHelper.createBackupCommit(this.iteration);
              if (committed && this.verbose) {
                console.log(chalk.dim(`    Git: Auto-committed iteration ${this.iteration}`));
              }
            }
          } else {
            // For API provider, apply diffs from response
            const result = this.applyChanges(response.changes);
            filesModified = result.count;
            modifiedFilesList = result.files;
          }

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

        // Append to iteration journal (non-Git repos only)
        if (!this.isGitRepo && filesModified > 0) {
          this.iterationJournal.append({
            iteration: this.iteration,
            files: modifiedFilesList,
            summary: response.summary || 'Changes applied'
          });
        }

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

        // Check for advanced convergence using new multi-layered approach
        const convergenceCheck = await this.convergence.checkConvergence(this.iteration);

        if (convergenceCheck.converged) {
          console.log(chalk.green('\n✓ Convergence detected!'));

          // Show warning if convergence happened due to limits rather than completion
          if (convergenceCheck.warning) {
            console.log(chalk.yellow(`⚠ ${convergenceCheck.reason}`));
            if (convergenceCheck.incompleteTasks && convergenceCheck.incompleteTasks.length > 0) {
              console.log(chalk.yellow('  Incomplete tasks:'));
              convergenceCheck.incompleteTasks.slice(0, 5).forEach(task => {
                console.log(chalk.dim(`    - ${task}`));
              });
              if (convergenceCheck.incompleteTasks.length > 5) {
                console.log(chalk.dim(`    ... and ${convergenceCheck.incompleteTasks.length - 5} more`));
              }
            }
          } else {
            console.log(chalk.dim(`${convergenceCheck.reason} (confidence: ${(convergenceCheck.confidence * 100).toFixed(0)}%)`));
          }

          // Show validation results if present
          if (convergenceCheck.validation && convergenceCheck.validation.results.length > 0) {
            console.log(chalk.blue('\nValidation results:'));
            console.log(this.validationRunner.formatResults(convergenceCheck.validation.results));
          }

          console.log(); // blank line

          converged = true;
          convergenceReason = convergenceCheck.reason;

          // Log iteration
          this.logger.logIteration(this.iteration, {
            prompt: this.prompt,
            response,
            filesModified,
            convergence: true,
            convergenceReason: convergenceCheck.reason,
            convergenceConfidence: convergenceCheck.confidence,
            convergenceLayer: convergenceCheck.layer,
            validation: convergenceCheck.validation
          });

          break;
        }

        // Warn about oscillation
        if (convergenceCheck.oscillation?.detected) {
          console.log(chalk.yellow(`  ⚠ ${convergenceCheck.oscillation.message}`));
          console.log(chalk.dim(`    Consider refining your prompt to avoid flip-flopping`));
        }

        // Show progress toward goals in verbose mode
        if (this.verbose) {
          if (convergenceCheck.progress && convergenceCheck.progress.total > 0) {
            console.log(chalk.dim(`  Progress: ${convergenceCheck.progress.completed}/${convergenceCheck.progress.total} tasks (${convergenceCheck.progress.percentage}%)`));
          }
          if (convergenceCheck.confidence > 0) {
            console.log(chalk.dim(`  Convergence confidence: ${(convergenceCheck.confidence * 100).toFixed(0)}%`));
          }
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
        if (heartbeat) clearInterval(heartbeat);
        spinner.fail(`Iteration ${this.iteration} failed`);

        // Log error
        this.logger.logIteration(this.iteration, {
          prompt: this.prompt,
          response: null,
          filesModified: 0,
          error: error.message
        });

        // Send error notification via chat if configured
        await this.chatNotifier.notifyError({
          message: error.message,
          iteration: this.iteration,
          filesModifiedBeforeError: this.filesModifiedTotal,
          reason: this.categorizeError(error)
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

    // Build result object
    const result = {
      totalIterations: this.iteration,
      filesModified: this.filesModifiedTotal,
      duration,
      converged,
      convergenceReason,
      convergenceSummary,
      sessionDir: this.logger.sessionDir
    };

    // Send success notification via chat if configured
    await this.chatNotifier.notifySuccess(result);

    // Disconnect chat notifier
    await this.chatNotifier.disconnect();

    // Return summary data for session summary generation
    return result;
  }

  /**
   * Categorize an error for notification purposes
   * @param {Error} error - The error to categorize
   * @returns {string} Error category
   */
  categorizeError(error) {
    const message = error.message.toLowerCase();

    if (message.includes('rate limit') || message.includes('429')) {
      return 'Rate limit hit';
    }
    if (message.includes('authentication') || message.includes('unauthorized') || message.includes('401')) {
      return 'Authentication failed';
    }
    if (message.includes('permission') || message.includes('403')) {
      return 'Permission denied';
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'Request timeout';
    }
    if (message.includes('network') || message.includes('econnrefused') || message.includes('enotfound')) {
      return 'Network error';
    }
    if (message.includes('not found') || message.includes('404')) {
      return 'Resource not found';
    }

    return 'Unexpected error';
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
    const DiffApplier = require('./diff-applier');

    // Use WorkspaceManager to apply changes to the appropriate workspace
    const result = this.workspaceManager.applyChanges(changesText, (workspace, diffText) => {
      const workspacePath = this.workspaceManager.resolvePath(workspace.path);

      // Apply diffs using the DiffApplier
      const diffResult = DiffApplier.applyDiffs(diffText, workspacePath, this.verbose);

      // Create git backup if in a repo and files were modified (only if auto-commit is enabled)
      if (diffResult.filesModified.length > 0 && this.autoCommit && GitHelper.isGitRepo(workspacePath)) {
        const committed = GitHelper.createBackupCommit(this.iteration, workspacePath);
        if (committed && this.verbose) {
          const repoLabel = this.workspaceManager.isMultiRepo()
            ? `[${workspace.name}]`
            : 'Git:';
          console.log(chalk.dim(`    ${repoLabel} Auto-committed iteration ${this.iteration}`));
        }
      }

      // Report errors if any
      if (diffResult.errors.length > 0) {
        console.error(chalk.red(`    ✗ Errors applying diffs:`));
        for (const error of diffResult.errors) {
          console.error(chalk.red(`      ${error}`));
        }
      }

      return {
        count: diffResult.filesModified.length,
        files: diffResult.filesModified
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
