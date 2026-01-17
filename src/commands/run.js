const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const RalphLoop = require('../loop');
const ConfigLoader = require('../config');
const SummaryGenerator = require('../summary-generator');
const IterationLogger = require('../iteration-logger');

async function runCommand(cliOptions) {
  const quiet = cliOptions.quiet || false;

  if (!quiet) {
    const packageJson = require('../../package.json');
    console.log(chalk.bold.blue('\n🎯 Wiggumizer v${packageJson.version}'));
    console.log(chalk.dim('Ralph Wiggum style AI coding automation\n'));
  }

  // Load and merge configuration
  const config = ConfigLoader.load(cliOptions);

  // Handle --files option (comma-separated patterns)
  if (cliOptions.files) {
    const patterns = cliOptions.files.split(',').map(p => p.trim());
    config.files = config.files || {};
    config.files.include = patterns;
  }

  // Handle --convergence-threshold option
  if (cliOptions.convergenceThreshold) {
    config.convergenceThreshold = parseFloat(cliOptions.convergenceThreshold);
  }

  // Handle --continue option (resume from previous session)
  let resumeState = null;
  if (cliOptions.continue) {
    resumeState = findPreviousSession(quiet);
    if (resumeState && !quiet) {
      console.log(chalk.blue(`📂 Resuming from session: ${resumeState.sessionId}`));
      console.log(chalk.dim(`   Last iteration: ${resumeState.lastIteration}`));
      console.log(chalk.dim(`   Files modified: ${resumeState.filesModified}`));
      console.log();
    }
  }

  // Check if prompt file exists
  const promptPath = path.resolve(process.cwd(), config.prompt || 'PROMPT.md');

  if (!fs.existsSync(promptPath)) {
    console.error(chalk.red(`✗ Prompt file not found: ${config.prompt || 'PROMPT.md'}`));
    console.log(chalk.yellow('\nThe PROMPT.md file tells Wiggumizer what to do.'));
    console.log(chalk.dim('\nQuick start:'));
    console.log(chalk.dim('  1. Create PROMPT.md:'));
    console.log(chalk.dim('     echo "# Improve my code\\nModernize to async/await and improve naming" > PROMPT.md'));
    console.log(chalk.dim('  2. Run: wiggumize run'));
    console.log(chalk.dim('\nOr use init to create from template:'));
    console.log(chalk.dim('  wiggumize init'));
    console.log(chalk.dim('\nExample PROMPT.md:'));
    console.log(chalk.dim('─'.repeat(50)));
    console.log(chalk.cyan('# Refactor Authentication Module\n'));
    console.log(chalk.dim('Modernize the authentication code:\n'));
    console.log(chalk.dim('- Convert callbacks to async/await'));
    console.log(chalk.dim('- Add proper error handling'));
    console.log(chalk.dim('- Improve variable naming\n'));
    console.log(chalk.dim('Preserve existing functionality.'));
    console.log(chalk.dim('─'.repeat(50)));
    console.log();
    process.exit(1);
  }

  // Read prompt
  const prompt = fs.readFileSync(promptPath, 'utf-8');

  if (!quiet) {
    console.log(chalk.cyan('Provider:') + ` ${config.provider}`);
    console.log(chalk.cyan('Prompt:') + ` ${config.prompt || 'PROMPT.md'}`);
    console.log(chalk.cyan('Max iterations:') + ` ${config.maxIterations}`);
    if (config.convergenceThreshold) {
      console.log(chalk.cyan('Convergence threshold:') + ` ${(config.convergenceThreshold * 100).toFixed(1)}%`);
    }
    console.log();
  }

  // Watch mode
  if (cliOptions.watch) {
    await runWatchMode(promptPath, config, quiet);
    return;
  }

  // Normal run mode
  await runOnce(prompt, config, quiet, resumeState);
}

/**
 * Find the most recent incomplete session to resume
 */
function findPreviousSession(quiet) {
  const sessions = IterationLogger.getSessions();
  
  if (sessions.length === 0) {
    if (!quiet) {
      console.log(chalk.yellow('⚠ No previous sessions found to resume'));
    }
    return null;
  }

  // Find the most recent session
  const mostRecent = sessions[0];
  
  if (!mostRecent.summary) {
    if (!quiet) {
      console.log(chalk.yellow('⚠ Most recent session has no summary, starting fresh'));
    }
    return null;
  }

  // Check if the session was incomplete (didn't converge and didn't hit max iterations)
  const summary = mostRecent.summary;
  
  // Get iteration details
  const iterations = IterationLogger.getIterations(mostRecent.sessionId);
  const lastIteration = iterations.length > 0 ? iterations[iterations.length - 1] : null;

  return {
    sessionId: mostRecent.sessionId,
    sessionDir: mostRecent.path,
    lastIteration: summary.totalIterations || 0,
    filesModified: summary.filesModified || 0,
    converged: summary.converged || false,
    lastIterationData: lastIteration
  };
}

async function runOnce(prompt, config, quiet, resumeState = null) {
  // Adjust starting iteration if resuming
  let startIteration = 1;
  if (resumeState) {
    startIteration = resumeState.lastIteration + 1;
    
    // If previous session converged, no need to continue
    if (resumeState.converged) {
      if (!quiet) {
        console.log(chalk.green('✓ Previous session already converged, nothing to do'));
      }
      return null;
    }
  }

  // Create and run the loop
  const loop = new RalphLoop({
    prompt,
    provider: config.provider,
    maxIterations: config.maxIterations,
    startIteration,
    verbose: config.verbose && !quiet,
    dryRun: config.dryRun,
    autoCommit: config.autoCommit,
    convergenceThreshold: config.convergenceThreshold,
    filePatterns: config.files,
    contextLimits: config.context,
    retry: config.retry,
    rateLimit: config.rateLimit,
    providerConfig: config.providers,
    quiet
  });

  try {
    const result = await loop.run();

    // Generate CHANGELOG.md with summary
    if (result && !config.dryRun) {
      try {
        const summary = SummaryGenerator.generateSummary({
          promptContent: prompt,
          sessionDir: result.sessionDir,
          totalIterations: result.totalIterations,
          filesModified: result.filesModified,
          duration: result.duration,
          converged: result.converged,
          convergenceReason: result.convergenceReason,
          convergenceSummary: result.convergenceSummary
        });

        // Display summary in console (unless quiet)
        if (!quiet) {
          SummaryGenerator.displaySummary(summary);
        }

        // Write SESSION-SUMMARY.md
        const summaryPath = path.join(process.cwd(), 'SESSION-SUMMARY.md');
        SummaryGenerator.writeSessionSummary(summary, summaryPath);

        if (!quiet) {
          console.log(chalk.green('✓ Generated SESSION-SUMMARY.md'));
          console.log(chalk.dim(`  ${summaryPath}`));
          console.log();
          console.log(chalk.dim('  Use this for:'));
          console.log(chalk.dim('  - Commit messages'));
          console.log(chalk.dim('  - Pull request descriptions'));
          console.log(chalk.dim('  - JIRA updates'));
          console.log();
        }
      } catch (summaryError) {
        // Don't fail the whole run if summary generation fails
        if (config.verbose && !quiet) {
          console.error(chalk.yellow('⚠ Failed to generate session summary:'), summaryError.message);
        }
      }
    }

    return result;
  } catch (error) {
    console.error(chalk.red('\n✗ Error:'), error.message);
    if (config.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

async function runWatchMode(promptPath, config, quiet) {
  console.log(chalk.blue('👀 Watch mode enabled'));
  console.log(chalk.dim(`Watching ${promptPath} for changes...`));
  console.log(chalk.dim('Press Ctrl+C to stop\n'));

  let isRunning = false;
  let pendingRun = false;

  const runLoop = async () => {
    if (isRunning) {
      pendingRun = true;
      return;
    }

    isRunning = true;

    try {
      const prompt = fs.readFileSync(promptPath, 'utf-8');
      console.log(chalk.blue('\n─'.repeat(50)));
      console.log(chalk.blue('Starting new loop run...'));
      console.log(chalk.blue('─'.repeat(50) + '\n'));

      await runOnce(prompt, config, quiet);
    } catch (error) {
      console.error(chalk.red('Error in loop:'), error.message);
    } finally {
      isRunning = false;

      if (pendingRun) {
        pendingRun = false;
        console.log(chalk.yellow('\nPrompt changed during run, restarting...'));
        setTimeout(runLoop, 1000);
      } else {
        console.log(chalk.dim('\nWaiting for changes to PROMPT.md...'));
      }
    }
  };

  // Initial run
  await runLoop();

  // Watch for changes
  let debounceTimer = null;
  const lastMtime = fs.statSync(promptPath).mtime.getTime();

  fs.watch(promptPath, (eventType) => {
    if (eventType === 'change') {
      // Debounce rapid changes
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        try {
          const currentMtime = fs.statSync(promptPath).mtime.getTime();
          if (currentMtime > lastMtime) {
            console.log(chalk.yellow('\n📝 PROMPT.md changed, triggering new run...'));
            runLoop();
          }
        } catch (error) {
          // File might be temporarily unavailable during save
        }
      }, 500);
    }
  });

  // Keep the process running
  await new Promise(() => {});
}

module.exports = runCommand;
