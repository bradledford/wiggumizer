const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * Parse and apply unified diff format changes
 * Language-agnostic diff handler
 */
class DiffApplier {
  /**
   * Parse unified diff text into structured changes
   * @param {string} diffText - Raw diff output from AI
   * @returns {Array} Array of { filePath, hunks: [{oldStart, oldLines, newStart, newLines, lines}] }
   */
  static parseDiff(diffText) {
    const files = [];
    let currentFile = null;
    let currentHunk = null;

    const lines = diffText.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match: --- a/path/to/file or --- /dev/null
      if (line.startsWith('--- ')) {
        // Push current hunk if exists
        if (currentHunk && currentFile) {
          currentFile.hunks.push(currentHunk);
          currentHunk = null;
        }

        // Push current file if exists
        if (currentFile && currentFile.hunks.length > 0) {
          files.push(currentFile);
        }

        const oldPath = line.substring(4).trim();
        currentFile = {
          oldPath: oldPath === '/dev/null' ? null : oldPath.replace(/^a\//, ''),
          newPath: null,
          hunks: [],
          isNew: oldPath === '/dev/null',
          isDeleted: false
        };
        continue;
      }

      // Match: +++ b/path/to/file or +++ /dev/null
      if (line.startsWith('+++ ')) {
        if (!currentFile) {
          console.warn('Found +++ without preceding ---');
          continue;
        }
        const newPath = line.substring(4).trim();
        currentFile.newPath = newPath === '/dev/null' ? null : newPath.replace(/^b\//, '');
        currentFile.isDeleted = newPath === '/dev/null';
        continue;
      }

      // Match: @@ -10,7 +10,8 @@ optional context
      const hunkMatch = line.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/);
      if (hunkMatch) {
        if (!currentFile) {
          console.warn('Found @@ without file header');
          continue;
        }

        if (currentHunk) {
          currentFile.hunks.push(currentHunk);
        }

        currentHunk = {
          oldStart: parseInt(hunkMatch[1], 10),
          oldLines: hunkMatch[2] ? parseInt(hunkMatch[2], 10) : 1,
          newStart: parseInt(hunkMatch[3], 10),
          newLines: hunkMatch[4] ? parseInt(hunkMatch[4], 10) : 1,
          lines: []
        };
        continue;
      }

      // Hunk content lines
      if (currentHunk) {
        // Lines starting with space, +, or - are part of the hunk
        if (line.startsWith(' ') || line.startsWith('+') || line.startsWith('-')) {
          currentHunk.lines.push(line);
        }
        // Empty lines are ignored (end of hunk)
      }
    }

    // Push last hunk and file
    if (currentHunk && currentFile) {
      currentFile.hunks.push(currentHunk);
    }
    if (currentFile && currentFile.hunks.length > 0) {
      files.push(currentFile);
    }

    return files;
  }

  /**
   * Apply a single hunk to file content
   * @param {Array<string>} fileLines - Original file lines
   * @param {Object} hunk - Hunk object from parseDiff
   * @returns {Array<string>} Modified file lines
   */
  static applyHunk(fileLines, hunk) {
    const result = [...fileLines];
    const { oldStart, lines } = hunk;

    // oldStart is 1-indexed, convert to 0-indexed
    let pos = oldStart - 1; // Current position in result array

    for (const diffLine of lines) {
      const op = diffLine[0];
      const content = diffLine.substring(1);

      if (op === ' ') {
        // Context line - verify it matches
        if (result[pos] !== content) {
          // Fuzzy match - try to find nearby
          const searchStart = Math.max(0, pos - 3);
          const searchEnd = Math.min(result.length, pos + 3);
          let found = false;

          for (let i = searchStart; i < searchEnd; i++) {
            if (result[i] === content) {
              pos = i;
              found = true;
              break;
            }
          }

          if (!found) {
            throw new Error(`Context mismatch at line ${pos + 1}. Expected: "${content}", got: "${result[pos]}"`);
          }
        }
        pos++; // Move to next line
      } else if (op === '-') {
        // Remove line
        if (result[pos] !== content) {
          throw new Error(`Cannot remove line ${pos + 1}. Expected: "${content}", got: "${result[pos]}"`);
        }
        result.splice(pos, 1);
        // Don't increment pos - the next line is now at this position
      } else if (op === '+') {
        // Add line - insert at current position
        result.splice(pos, 0, content);
        pos++; // Move past the inserted line
      }
    }

    return result;
  }

  /**
   * Apply all hunks in a diff to a file
   * @param {string} filePath - Full path to file
   * @param {Object} fileDiff - File diff object from parseDiff
   * @returns {string} New file content
   */
  static applyFileDiff(filePath, fileDiff) {
    // Handle new files
    if (fileDiff.isNew) {
      const lines = [];
      for (const hunk of fileDiff.hunks) {
        for (const line of hunk.lines) {
          if (line[0] === '+') {
            lines.push(line.substring(1));
          }
        }
      }
      return lines.join('\n');
    }

    // Handle deleted files
    if (fileDiff.isDeleted) {
      return null; // Signal to delete the file
    }

    // Read existing file
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    let content = fs.readFileSync(filePath, 'utf-8');
    let lines = content.split('\n');

    // Apply each hunk in order
    for (const hunk of fileDiff.hunks) {
      lines = DiffApplier.applyHunk(lines, hunk);
    }

    return lines.join('\n');
  }

  /**
   * Extract and apply diffs from AI response
   * @param {string} responseText - Raw AI response containing diffs
   * @param {string} workspaceDir - Base directory for file paths
   * @param {boolean} verbose - Enable verbose logging
   * @returns {Object} { filesModified: Array<string>, errors: Array<string> }
   */
  static applyDiffs(responseText, workspaceDir, verbose = false) {
    const filesModified = [];
    const errors = [];

    // Extract diff blocks from response
    // Look for: ```diff ... ```
    const diffBlockRegex = /```diff\s*\n([\s\S]*?)```/g;
    let match;
    let allDiffText = '';

    while ((match = diffBlockRegex.exec(responseText)) !== null) {
      allDiffText += match[1] + '\n';
    }

    if (!allDiffText.trim()) {
      if (verbose) {
        console.log(chalk.yellow('    ⚠ No diff blocks found in response'));
      }
      return { filesModified, errors };
    }

    // Parse the diffs
    const fileDiffs = DiffApplier.parseDiff(allDiffText);

    if (fileDiffs.length === 0) {
      if (verbose) {
        console.log(chalk.yellow('    ⚠ No valid diffs parsed from response'));
      }
      return { filesModified, errors };
    }

    // Apply each file diff
    for (const fileDiff of fileDiffs) {
      const relativePath = fileDiff.newPath || fileDiff.oldPath;
      if (!relativePath) {
        errors.push('Diff missing file path');
        continue;
      }

      const fullPath = path.join(workspaceDir, relativePath);

      try {
        if (fileDiff.isNew) {
          // Create new file
          const newContent = DiffApplier.applyFileDiff(fullPath, fileDiff);
          const dir = path.dirname(fullPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(fullPath, newContent, 'utf-8');
          filesModified.push(relativePath);

          if (verbose) {
            console.log(chalk.green(`    ✓ Created: ${relativePath}`));
          }
        } else if (fileDiff.isDeleted) {
          // Delete file
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            filesModified.push(relativePath);

            if (verbose) {
              console.log(chalk.red(`    ✓ Deleted: ${relativePath}`));
            }
          }
        } else {
          // Modify existing file
          const newContent = DiffApplier.applyFileDiff(fullPath, fileDiff);
          fs.writeFileSync(fullPath, newContent, 'utf-8');
          filesModified.push(relativePath);

          if (verbose) {
            console.log(chalk.blue(`    ✓ Modified: ${relativePath}`));
          }
        }
      } catch (error) {
        const errorMsg = `Failed to apply diff to ${relativePath}: ${error.message}`;
        errors.push(errorMsg);

        if (verbose) {
          console.log(chalk.red(`    ✗ ${errorMsg}`));
        }
      }
    }

    return { filesModified, errors };
  }
}

module.exports = DiffApplier;
