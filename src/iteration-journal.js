/**
 * Iteration Journal
 *
 * Provides iteration context for non-Git repositories.
 * Mimics git log format but works without version control.
 *
 * This is a fallback mechanism - Git is always preferred when available.
 * The journal provides the same contextual information that would come
 * from git log in a Git repository.
 *
 * File format (.wiggumizer/iteration-journal.txt):
 * ```
 * Iteration 5 - 2025-01-19 14:32:15
 * Files: src/auth.js, src/config.js
 * Summary: Added JWT token validation and updated config schema
 * ---
 * ```
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class IterationJournal {
  /**
   * Create a new IterationJournal
   * @param {Object} options - Configuration options
   * @param {string} options.cwd - Working directory (default: process.cwd())
   * @param {boolean} options.verbose - Enable verbose logging
   */
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.verbose = options.verbose || false;
    this.wiggumDir = path.join(this.cwd, '.wiggumizer');
    this.journalPath = path.join(this.wiggumDir, 'iteration-journal.txt');
  }

  /**
   * Ensure the .wiggumizer directory exists
   */
  ensureDirectory() {
    if (!fs.existsSync(this.wiggumDir)) {
      fs.mkdirSync(this.wiggumDir, { recursive: true });
      if (this.verbose) {
        console.log(chalk.dim(`Created .wiggumizer directory`));
      }
    }
  }

  /**
   * Check if the journal file exists
   * @returns {boolean}
   */
  exists() {
    return fs.existsSync(this.journalPath);
  }

  /**
   * Append an entry to the iteration journal
   * @param {Object} entry - Journal entry data
   * @param {number} entry.iteration - Iteration number
   * @param {string[]} entry.files - List of files modified
   * @param {string} entry.summary - Summary of changes
   */
  append(entry) {
    this.ensureDirectory();

    const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0];
    const filesStr = entry.files && entry.files.length > 0
      ? entry.files.join(', ')
      : '(none)';

    const entryText = [
      `Iteration ${entry.iteration} - ${timestamp}`,
      `Files: ${filesStr}`,
      `Summary: ${entry.summary || 'No summary available'}`,
      '---',
      '' // Empty line for separation
    ].join('\n');

    // Read existing content (if any) and prepend new entry
    // This puts most recent entries at the top, like git log
    let existingContent = '';
    if (fs.existsSync(this.journalPath)) {
      existingContent = fs.readFileSync(this.journalPath, 'utf-8');
    }

    fs.writeFileSync(this.journalPath, entryText + existingContent, 'utf-8');

    if (this.verbose) {
      console.log(chalk.dim(`Appended iteration ${entry.iteration} to journal`));
    }
  }

  /**
   * Read the most recent entries from the journal
   * @param {number} limit - Maximum number of entries to return (default: 10)
   * @returns {Object[]} Array of parsed entries
   */
  read(limit = 10) {
    if (!fs.existsSync(this.journalPath)) {
      return [];
    }

    const content = fs.readFileSync(this.journalPath, 'utf-8');
    return this.parse(content, limit);
  }

  /**
   * Parse journal content into structured entries
   * @param {string} content - Raw journal content
   * @param {number} limit - Maximum entries to return
   * @returns {Object[]} Parsed entries
   */
  parse(content, limit = 10) {
    const entries = [];
    const blocks = content.split('---\n').filter(block => block.trim());

    for (const block of blocks.slice(0, limit)) {
      const lines = block.trim().split('\n');
      if (lines.length < 3) continue;

      // Parse first line: "Iteration N - YYYY-MM-DD HH:MM:SS"
      const headerMatch = lines[0].match(/Iteration\s+(\d+)\s+-\s+(.+)/);
      if (!headerMatch) continue;

      // Parse files line: "Files: file1, file2, file3"
      const filesMatch = lines[1].match(/Files:\s*(.+)/);
      const files = filesMatch
        ? filesMatch[1].split(',').map(f => f.trim()).filter(f => f && f !== '(none)')
        : [];

      // Parse summary line: "Summary: description"
      const summaryMatch = lines[2].match(/Summary:\s*(.+)/);
      const summary = summaryMatch ? summaryMatch[1].trim() : '';

      entries.push({
        iteration: parseInt(headerMatch[1], 10),
        timestamp: headerMatch[2],
        files,
        summary
      });
    }

    return entries;
  }

  /**
   * Format entries as a git-log-like string
   * This is the format used in context messages to Claude
   * @param {number} limit - Maximum entries to include
   * @returns {string} Formatted string
   */
  format(limit = 10) {
    const entries = this.read(limit);

    if (entries.length === 0) {
      return '';
    }

    return entries.map(entry => {
      return `Iteration ${entry.iteration} - ${entry.timestamp}\nFiles: ${entry.files.length > 0 ? entry.files.join(', ') : '(none)'}\nSummary: ${entry.summary}`;
    }).join('\n\n');
  }

  /**
   * Get the iteration count from the journal
   * @returns {number} Number of iterations recorded
   */
  getIterationCount() {
    const entries = this.read(1);
    if (entries.length === 0) return 0;
    return entries[0].iteration;
  }

  /**
   * Clear the journal (useful for testing or reset)
   */
  clear() {
    if (fs.existsSync(this.journalPath)) {
      fs.unlinkSync(this.journalPath);
      if (this.verbose) {
        console.log(chalk.dim('Cleared iteration journal'));
      }
    }
  }

  /**
   * Display a warning when using journal instead of Git
   */
  static displayNonGitWarning() {
    console.log(chalk.yellow('\n⚠ Not a Git repository'));
    console.log(chalk.dim('→ Using iteration journal for context (.wiggumizer/iteration-journal.txt)'));
    console.log(chalk.dim('→ For best results, consider: git init\n'));
  }
}

module.exports = IterationJournal;
