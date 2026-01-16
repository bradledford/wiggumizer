/**
 * Summary Generator - Creates documentation for changes made by Wiggumizer
 * Generates session summaries, commit messages, PR descriptions, and JIRA updates
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class SummaryGenerator {
  /**
   * Parse metadata from PROMPT.md
   * Supports YAML frontmatter or structured comments
   *
   * Example:
   * ---
   * issue: PROJ-123
   * ticket: https://jira.company.com/browse/PROJ-123
   * type: refactor
   * ---
   */
  static parsePromptMetadata(promptContent) {
    const metadata = {
      issue: null,
      ticket: null,
      type: null,
      description: null
    };

    // Try to extract YAML frontmatter
    const frontmatterMatch = promptContent.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      const lines = frontmatter.split('\n');

      lines.forEach(line => {
        const match = line.match(/^\s*(\w+):\s*(.+)$/);
        if (match) {
          const key = match[1].toLowerCase();
          const value = match[2].trim();
          if (metadata.hasOwnProperty(key)) {
            metadata[key] = value;
          }
        }
      });

      // Remove frontmatter from description
      metadata.description = promptContent.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '').trim();
    } else {
      // No frontmatter, use full content as description
      metadata.description = promptContent.trim();
    }

    // Extract first heading as title if no description
    if (!metadata.description) {
      const headingMatch = promptContent.match(/^#\s+(.+)$/m);
      if (headingMatch) {
        metadata.description = headingMatch[1];
      }
    }

    return metadata;
  }

  /**
   * Generate a comprehensive summary of changes
   */
  static generateSummary(options = {}) {
    const {
      promptContent,
      sessionDir,
      totalIterations,
      filesModified,
      duration,
      converged,
      convergenceReason,
      convergenceSummary
    } = options;

    // Parse prompt metadata
    const metadata = this.parsePromptMetadata(promptContent);

    // Read iteration logs for detailed changes
    const iterationDetails = this.readIterationLogs(sessionDir, totalIterations);

    // Build summary sections
    const summary = {
      metadata,
      overview: this.buildOverview(metadata, totalIterations, filesModified, duration, converged, convergenceReason),
      changes: this.buildChangesSection(iterationDetails),
      files: this.buildFilesSection(iterationDetails),
      convergence: convergenceSummary,
      commitMessage: this.buildCommitMessage(metadata, filesModified),
      prDescription: this.buildPRDescription(metadata, iterationDetails, filesModified, totalIterations)
    };

    return summary;
  }

  /**
   * Read iteration logs for details
   */
  static readIterationLogs(sessionDir, totalIterations) {
    const iterations = [];

    if (!sessionDir || !fs.existsSync(sessionDir)) {
      return iterations;
    }

    for (let i = 1; i <= totalIterations; i++) {
      const logPath = path.join(sessionDir, `iteration-${i}.json`);
      if (fs.existsSync(logPath)) {
        try {
          const log = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
          iterations.push(log);
        } catch (error) {
          // Skip invalid logs
        }
      }
    }

    return iterations;
  }

  /**
   * Build overview section
   */
  static buildOverview(metadata, totalIterations, filesModified, duration, converged, convergenceReason) {
    const parts = [];

    if (metadata.issue) {
      parts.push(`**Issue**: ${metadata.issue}`);
    }
    if (metadata.ticket) {
      parts.push(`**Ticket**: ${metadata.ticket}`);
    }
    if (metadata.type) {
      parts.push(`**Type**: ${metadata.type}`);
    }

    parts.push(`**Iterations**: ${totalIterations}`);
    parts.push(`**Files Modified**: ${filesModified}`);
    parts.push(`**Duration**: ${duration}s`);

    if (converged) {
      parts.push(`**Status**: Converged (${convergenceReason})`);
    }

    return parts.join('\n');
  }

  /**
   * Build changes section from iteration logs
   */
  static buildChangesSection(iterations) {
    const fileChanges = new Map();

    iterations.forEach((iteration, index) => {
      if (iteration.filesModified > 0 && iteration.response?.summary) {
        // Track which files were modified in which iterations
        const iterNum = index + 1;
        if (!fileChanges.has(iterNum)) {
          fileChanges.set(iterNum, {
            summary: iteration.response.summary,
            files: iteration.filesModified
          });
        }
      }
    });

    const changes = [];
    fileChanges.forEach((change, iterNum) => {
      changes.push(`- **Iteration ${iterNum}**: ${change.summary} (${change.files} file${change.files !== 1 ? 's' : ''})`);
    });

    return changes.length > 0 ? changes.join('\n') : 'No specific changes documented';
  }

  /**
   * Build files section - unique files modified
   */
  static buildFilesSection(iterations) {
    const uniqueFiles = new Set();

    iterations.forEach(iteration => {
      // This would need to be enhanced when we track individual file names
      // For now, just count
      if (iteration.filesModified > 0) {
        uniqueFiles.add(`${iteration.filesModified} files in iteration ${iteration.iteration}`);
      }
    });

    return Array.from(uniqueFiles).sort();
  }

  /**
   * Build a git commit message
   */
  static buildCommitMessage(metadata, filesModified) {
    const lines = [];

    // Subject line
    let subject = '';
    if (metadata.type) {
      subject += `${metadata.type}: `;
    }
    if (metadata.issue) {
      subject += `[${metadata.issue}] `;
    }

    // Extract first line of description or use default
    const firstLine = metadata.description?.split('\n')[0]?.replace(/^#+\s*/, '') || 'Update codebase';
    subject += firstLine.substring(0, 72 - subject.length); // Keep under 72 chars

    lines.push(subject);
    lines.push(''); // Blank line

    // Body
    if (metadata.description) {
      const descLines = metadata.description.split('\n').slice(0, 5); // First 5 lines
      lines.push(...descLines);
      lines.push('');
    }

    lines.push(`Modified ${filesModified} file${filesModified !== 1 ? 's' : ''} through iterative refinement.`);

    if (metadata.ticket) {
      lines.push('');
      lines.push(`See: ${metadata.ticket}`);
    }

    return lines.join('\n');
  }

  /**
   * Build a PR description
   */
  static buildPRDescription(metadata, iterations, filesModified, totalIterations) {
    const lines = [];

    // Title
    lines.push('## Summary');
    lines.push('');
    if (metadata.description) {
      lines.push(metadata.description.split('\n').slice(0, 3).join('\n'));
    }
    lines.push('');

    // Metadata
    if (metadata.issue || metadata.ticket) {
      lines.push('## References');
      lines.push('');
      if (metadata.issue) {
        lines.push(`- Issue: ${metadata.issue}`);
      }
      if (metadata.ticket) {
        lines.push(`- Ticket: ${metadata.ticket}`);
      }
      lines.push('');
    }

    // Changes
    lines.push('## Changes Made');
    lines.push('');
    lines.push(`This PR contains changes generated through ${totalIterations} iteration${totalIterations !== 1 ? 's' : ''} of automated refinement, modifying ${filesModified} file${filesModified !== 1 ? 's' : ''}.`);
    lines.push('');

    // Build change list from iterations
    const changes = [];
    iterations.forEach((iteration, index) => {
      if (iteration.filesModified > 0 && iteration.response?.summary) {
        changes.push(`- ${iteration.response.summary}`);
      }
    });

    if (changes.length > 0) {
      lines.push('**Key changes:**');
      lines.push(...changes);
      lines.push('');
    }

    // Test plan
    lines.push('## Test Plan');
    lines.push('');
    lines.push('- [ ] Code builds successfully');
    lines.push('- [ ] All existing tests pass');
    lines.push('- [ ] Manual testing completed');
    lines.push('');

    // Footer
    lines.push('---');
    lines.push('*Generated with [Wiggumizer](https://github.com/bradledford/wiggumizer) - Ralph Wiggum style iterative development*');

    return lines.join('\n');
  }

  /**
   * Write SESSION-SUMMARY.md to the project root
   */
  static writeSessionSummary(summary, outputPath) {
    const lines = [];

    // Header
    lines.push('# Wiggumizer Session Summary');
    lines.push('');
    lines.push(`*Generated on ${new Date().toISOString()}*`);
    lines.push('');

    // Overview
    lines.push('## Overview');
    lines.push('');
    lines.push(summary.overview);
    lines.push('');

    // Original Request
    if (summary.metadata.description) {
      lines.push('## Original Request');
      lines.push('');
      lines.push(summary.metadata.description);
      lines.push('');
    }

    // Changes
    lines.push('## Changes Applied');
    lines.push('');
    lines.push(summary.changes);
    lines.push('');

    // Convergence info
    if (summary.convergence) {
      lines.push('## Convergence Analysis');
      lines.push('');
      lines.push(`**Status**: ${summary.convergence.converged ? 'Converged' : 'Not converged'}`);
      if (summary.convergence.reason) {
        lines.push(`**Reason**: ${summary.convergence.reason}`);
      }
      if (summary.convergence.confidence) {
        lines.push(`**Confidence**: ${(summary.convergence.confidence * 100).toFixed(0)}%`);
      }
      lines.push('');
    }

    // Suggested commit message
    lines.push('## Suggested Commit Message');
    lines.push('');
    lines.push('```');
    lines.push(summary.commitMessage);
    lines.push('```');
    lines.push('');

    // PR description
    lines.push('## Suggested PR Description');
    lines.push('');
    lines.push('```markdown');
    lines.push(summary.prDescription);
    lines.push('```');
    lines.push('');

    // Write to file
    const content = lines.join('\n');
    fs.writeFileSync(outputPath, content, 'utf-8');

    return outputPath;
  }

  /**
   * Display summary in console
   */
  static displaySummary(summary) {
    console.log();
    console.log(chalk.bold.cyan('📝 Change Summary'));
    console.log(chalk.dim('─'.repeat(50)));
    console.log();

    // Metadata
    if (summary.metadata.issue || summary.metadata.ticket) {
      if (summary.metadata.issue) {
        console.log(chalk.cyan('Issue:'), summary.metadata.issue);
      }
      if (summary.metadata.ticket) {
        console.log(chalk.cyan('Ticket:'), summary.metadata.ticket);
      }
      console.log();
    }

    // Quick stats
    const overviewLines = summary.overview.split('\n');
    overviewLines.forEach(line => {
      if (line.includes('**')) {
        const cleaned = line.replace(/\*\*/g, '');
        console.log(chalk.dim(cleaned));
      }
    });
    console.log();

    // Commit message preview
    console.log(chalk.cyan('Suggested commit message:'));
    console.log(chalk.dim('─'.repeat(50)));
    const commitLines = summary.commitMessage.split('\n').slice(0, 5);
    commitLines.forEach(line => console.log(chalk.dim(line)));
    if (summary.commitMessage.split('\n').length > 5) {
      console.log(chalk.dim('...'));
    }
    console.log();
  }
}

module.exports = SummaryGenerator;
