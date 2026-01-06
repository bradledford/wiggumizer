const chalk = require('chalk');
const IterationLogger = require('../iteration-logger');

async function logsCommand(options) {
  const sessions = IterationLogger.getSessions();

  if (sessions.length === 0) {
    console.log(chalk.yellow('No iteration logs found'));
    console.log(chalk.dim('Logs are created when you run: wiggumize run\n'));
    return;
  }

  // If specific session requested
  if (options.session) {
    displaySession(options.session, options.iteration);
    return;
  }

  // Otherwise list all sessions
  console.log(chalk.bold('Wiggumizer Session Logs\n'));

  for (const session of sessions) {
    const summary = session.summary;

    if (summary) {
      const status = summary.converged
        ? chalk.green('✓ Converged')
        : chalk.yellow('⚠ Max iterations');

      console.log(chalk.blue(session.sessionId));
      console.log(chalk.dim(`  ${summary.totalIterations} iterations • ${summary.filesModified || 0} files modified • ${summary.duration}s • ${status}`));
      console.log(chalk.dim(`  ${summary.timestamp}`));
    } else {
      console.log(chalk.blue(session.sessionId));
      console.log(chalk.dim('  (No summary available)'));
    }
    console.log();
  }

  console.log(chalk.dim('View session details: wiggumize logs --session <session-id>'));
  console.log(chalk.dim('View specific iteration: wiggumize logs --session <session-id> --iteration <num>\n'));
}

function displaySession(sessionId, iterationNum) {
  const sessions = IterationLogger.getSessions();
  const session = sessions.find(s => s.sessionId === sessionId || s.sessionId.startsWith(sessionId));

  if (!session) {
    console.log(chalk.red(`✗ Session not found: ${sessionId}`));
    console.log(chalk.dim('\nAvailable sessions:'));
    sessions.forEach(s => console.log(chalk.dim(`  ${s.sessionId}`)));
    console.log();
    return;
  }

  // If specific iteration requested
  if (iterationNum) {
    displayIteration(session.sessionId, iterationNum);
    return;
  }

  // Display full session
  console.log(chalk.bold(`Session: ${session.sessionId}\n`));

  const summary = session.summary;
  if (summary) {
    console.log(chalk.blue('Summary:'));
    console.log(chalk.dim(`  Provider: ${summary.config?.provider || 'unknown'}`));
    console.log(chalk.dim(`  Iterations: ${summary.totalIterations}`));
    console.log(chalk.dim(`  Files Modified: ${summary.filesModified || 0}`));
    console.log(chalk.dim(`  Duration: ${summary.duration}s`));
    console.log(chalk.dim(`  Converged: ${summary.converged ? 'Yes' : 'No'}`));
    console.log(chalk.dim(`  Timestamp: ${summary.timestamp}`));
    console.log();
  }

  const iterations = IterationLogger.getIterations(session.sessionId);

  if (iterations.length === 0) {
    console.log(chalk.yellow('No iterations found for this session\n'));
    return;
  }

  console.log(chalk.blue('Iterations:'));
  for (const iter of iterations) {
    const status = iter.convergence
      ? chalk.green('✓ Converged')
      : iter.error
      ? chalk.red('✗ Error')
      : chalk.dim(`${iter.filesModified || 0} files modified`);

    console.log(chalk.dim(`  ${iter.iteration}. ${status}`));

    if (iter.response?.summary) {
      console.log(chalk.dim(`     ${iter.response.summary.substring(0, 80)}${iter.response.summary.length > 80 ? '...' : ''}`));
    }

    if (iter.error) {
      console.log(chalk.red(`     Error: ${iter.error}`));
    }
  }

  console.log();
  console.log(chalk.dim('View iteration details: wiggumize logs --session ' + session.sessionId + ' --iteration <num>\n'));
}

function displayIteration(sessionId, iterationNum) {
  const iteration = IterationLogger.getIteration(sessionId, iterationNum);

  if (!iteration) {
    console.log(chalk.red(`✗ Iteration ${iterationNum} not found for session ${sessionId}\n`));
    return;
  }

  console.log(chalk.bold(`Iteration ${iteration.iteration} - ${sessionId}\n`));

  console.log(chalk.blue('Timestamp:'));
  console.log(chalk.dim(`  ${iteration.timestamp}\n`));

  console.log(chalk.blue('Prompt:'));
  console.log(chalk.dim(indent(iteration.prompt || 'N/A', 2)));
  console.log();

  if (iteration.response) {
    console.log(chalk.blue('Response Summary:'));
    console.log(chalk.dim(indent(iteration.response.summary || 'N/A', 2)));
    console.log();

    console.log(chalk.blue('Changes:'));
    console.log(chalk.dim(`  Has changes: ${iteration.response.hasChanges ? 'Yes' : 'No'}`));
    console.log(chalk.dim(`  Files modified: ${iteration.filesModified || 0}`));

    if (iteration.files && iteration.files.length > 0) {
      console.log(chalk.dim('  Modified files:'));
      iteration.files.forEach(f => console.log(chalk.dim(`    - ${f}`)));
    }
    console.log();

    if (iteration.response.raw && iteration.response.raw.length < 2000) {
      console.log(chalk.blue('Full Response:'));
      console.log(chalk.dim(indent(iteration.response.raw, 2)));
      console.log();
    }
  }

  if (iteration.convergence) {
    console.log(chalk.green('✓ Convergence detected in this iteration\n'));
  }

  if (iteration.error) {
    console.log(chalk.red('Error:'));
    console.log(chalk.red(indent(iteration.error, 2)));
    console.log();
  }
}

function indent(text, spaces) {
  const prefix = ' '.repeat(spaces);
  return text.split('\n').map(line => prefix + line).join('\n');
}

module.exports = logsCommand;
