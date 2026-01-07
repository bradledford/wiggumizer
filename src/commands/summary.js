const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const SummaryGenerator = require('../summary-generator');

async function summaryCommand(options) {
  console.log(chalk.bold.blue('\n📝 Generating Change Summary\n'));
  console.log(chalk.dim('Note: CHANGELOG.md is auto-generated after "wiggumize run"'));
  console.log(chalk.dim('Use this command to regenerate from a previous session.\n'));

  // Find session directory
  let sessionDir;
  const logsDir = path.join(process.cwd(), '.wiggumizer', 'iterations');

  if (options.session) {
    // Use specified session
    sessionDir = path.join(logsDir, options.session);
  } else {
    // Use most recent session
    if (!fs.existsSync(logsDir)) {
      console.error(chalk.red('✗ No .wiggumizer/iterations directory found'));
      console.log(chalk.dim('Run "wiggumize run" first to generate logs'));
      process.exit(1);
    }

    // Find most recent session
    const sessions = fs.readdirSync(logsDir)
      .filter(f => fs.statSync(path.join(logsDir, f)).isDirectory())
      .sort()
      .reverse();

    if (sessions.length === 0) {
      console.error(chalk.red('✗ No session logs found'));
      console.log(chalk.dim('Run "wiggumize run" first to generate logs'));
      process.exit(1);
    }

    sessionDir = path.join(logsDir, sessions[0]);
  }

  // Verify session directory exists
  if (!fs.existsSync(sessionDir)) {
    console.error(chalk.red(`✗ Session directory not found: ${sessionDir}`));
    process.exit(1);
  }

  console.log(chalk.cyan('Session:') + ` ${path.basename(sessionDir)}`);
  console.log(chalk.dim(`  ${sessionDir}\n`));

  // Read summary.json
  const summaryPath = path.join(sessionDir, 'summary.json');
  if (!fs.existsSync(summaryPath)) {
    console.error(chalk.red('✗ summary.json not found in session directory'));
    console.log(chalk.dim('This session may be incomplete or corrupted'));
    process.exit(1);
  }

  let sessionSummary;
  try {
    sessionSummary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
  } catch (error) {
    console.error(chalk.red('✗ Failed to read summary.json:'), error.message);
    process.exit(1);
  }

  // Read original PROMPT.md if available
  let promptContent = '';
  const promptPath = path.join(process.cwd(), 'PROMPT.md');
  if (fs.existsSync(promptPath)) {
    promptContent = fs.readFileSync(promptPath, 'utf-8');
  } else {
    console.log(chalk.yellow('⚠ PROMPT.md not found, using limited information'));
  }

  // Generate summary
  try {
    const summary = SummaryGenerator.generateSummary({
      promptContent,
      sessionDir,
      totalIterations: sessionSummary.totalIterations,
      filesModified: sessionSummary.filesModified,
      duration: sessionSummary.duration,
      converged: sessionSummary.converged,
      convergenceReason: sessionSummary.convergenceReason,
      convergenceSummary: sessionSummary.convergenceSummary
    });

    // Display summary
    SummaryGenerator.displaySummary(summary);

    // Write CHANGELOG.md
    const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
    SummaryGenerator.writeChangelog(summary, changelogPath);

    console.log(chalk.green('✓ Generated CHANGELOG.md'));
    console.log(chalk.dim(`  ${changelogPath}`));
    console.log();

    // Show specific outputs
    if (options.commit) {
      console.log(chalk.blue('Suggested commit message:'));
      console.log(chalk.dim('─'.repeat(50)));
      console.log(summary.commitMessage);
      console.log(chalk.dim('─'.repeat(50)));
    }

    if (options.pr) {
      console.log(chalk.blue('Suggested PR description:'));
      console.log(chalk.dim('─'.repeat(50)));
      console.log(summary.prDescription);
      console.log(chalk.dim('─'.repeat(50)));
    }

    console.log();
  } catch (error) {
    console.error(chalk.red('✗ Failed to generate summary:'), error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

module.exports = summaryCommand;
