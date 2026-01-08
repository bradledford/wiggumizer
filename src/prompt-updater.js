const fs = require('fs');
const path = require('path');

/**
 * Manages progress tracking and updates to PROMPT.md work plans
 * Parses checkbox-style task lists and updates completion status
 */
class PromptUpdater {
  constructor(options = {}) {
    this.promptPath = options.promptPath || path.join(process.cwd(), 'PROMPT.md');
    this.verbose = options.verbose || false;
    this.dryRun = options.dryRun || false;

    this.content = '';
    this.tasks = [];
    this.loaded = false;
  }

  /**
   * Load and parse PROMPT.md
   */
  load() {
    if (!fs.existsSync(this.promptPath)) {
      if (this.verbose) {
        console.log('PROMPT.md not found, skipping progress tracking');
      }
      return false;
    }

    try {
      this.content = fs.readFileSync(this.promptPath, 'utf-8');
      this.tasks = this.parseTasks(this.content);
      this.loaded = true;
      return true;
    } catch (error) {
      if (this.verbose) {
        console.error(`Failed to load PROMPT.md: ${error.message}`);
      }
      return false;
    }
  }

  /**
   * Parse checkbox tasks from markdown content
   * Supports both - [ ] and - [x] or - [✓] syntax
   */
  parseTasks(content) {
    const tasks = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match checkbox patterns: - [ ], - [x], - [X], - [✓], - [✅]
      const match = line.match(/^(\s*)-\s*\[([ xX✓✅])\]\s*(.+)$/);

      if (match) {
        const indent = match[1];
        const status = match[2];
        const text = match[3].trim();

        // Determine if completed
        const completed = status !== ' ';

        tasks.push({
          lineNumber: i,
          indent,
          text,
          completed,
          originalLine: line
        });
      }
    }

    return tasks;
  }

  /**
   * Check if a task should be marked as completed based on various signals
   */
  analyzeCompletion(task, context = {}) {
    // If already completed, keep it that way
    if (task.completed) {
      return true;
    }

    const signals = {
      fileExists: false,
      testsPass: false,
      keywordMatch: false,
      gitCommit: false
    };

    // Signal 1: Check if mentioned files exist
    if (context.filesModified) {
      const mentionedFiles = this.extractFileReferences(task.text);
      if (mentionedFiles.length > 0) {
        signals.fileExists = mentionedFiles.some(file =>
          context.filesModified.includes(file)
        );
      } else {
        // If no explicit file references, check keyword matching in file paths
        const keywords = this.extractKeywords(task.text);
        signals.fileExists = keywords.some(keyword =>
          context.filesModified.some(file =>
            file.toLowerCase().includes(keyword.toLowerCase())
          )
        );
      }
    }

    // Signal 2: Check test results
    if (context.testResults) {
      const testName = this.extractTestName(task.text);
      if (testName && context.testResults.includes(testName)) {
        signals.testsPass = true;
      }
    }

    // Signal 3: Keyword matching in completed work
    if (context.completedWork) {
      const keywords = this.extractKeywords(task.text);
      if (keywords.length > 0) {
        const matchCount = keywords.filter(keyword =>
          context.completedWork.toLowerCase().includes(keyword.toLowerCase())
        ).length;
        // Require at least 30% of keywords to match
        signals.keywordMatch = matchCount >= Math.max(1, Math.ceil(keywords.length * 0.3));
      }
    }

    // Signal 4: Check git commits
    if (context.gitLog) {
      const keywords = this.extractKeywords(task.text);
      if (keywords.length > 0) {
        const matchCount = keywords.filter(keyword =>
          context.gitLog.toLowerCase().includes(keyword.toLowerCase())
        ).length;
        // Require at least 30% of keywords to match
        signals.gitCommit = matchCount >= Math.max(1, Math.ceil(keywords.length * 0.3));
      }
    }

    // Task is complete if we have strong signals
    const strongSignals = [signals.fileExists, signals.testsPass].filter(Boolean).length;
    const weakSignals = [signals.keywordMatch, signals.gitCommit].filter(Boolean).length;

    // Require at least 1 strong signal or 2 weak signals
    return strongSignals >= 1 || weakSignals >= 2;
  }

  /**
   * Extract file references from task text
   * Looks for patterns like "src/file.js", "test/something.test.js"
   */
  extractFileReferences(text) {
    const files = [];

    // Match file paths with extensions
    const filePattern = /\b[\w/-]+\.[\w]+\b/g;
    const matches = text.match(filePattern);

    if (matches) {
      files.push(...matches);
    }

    // Also look for backtick-wrapped paths
    const backtickPattern = /`([^`]+\.\w+)`/g;
    let match;
    while ((match = backtickPattern.exec(text)) !== null) {
      files.push(match[1]);
    }

    return files;
  }

  /**
   * Extract test name from task text
   */
  extractTestName(text) {
    // Look for test-related keywords
    const testPatterns = [
      /test[s]?\s+for\s+([a-zA-Z0-9-_]+)/i,
      /test[s]?\s+([a-zA-Z0-9-_]+)/i,
      /([a-zA-Z0-9-_]+)\.test\./i
    ];

    for (const pattern of testPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Extract keywords from task text for matching
   */
  extractKeywords(text) {
    // Remove common words and extract meaningful terms
    const commonWords = new Set(['add', 'create', 'update', 'fix', 'improve', 'implement', 'the', 'a', 'an', 'and', 'or', 'for', 'to', 'with', 'in', 'on']);

    const words = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word));

    return [...new Set(words)]; // Remove duplicates
  }

  /**
   * Update task completion status
   */
  updateTaskStatus(context = {}) {
    if (!this.loaded) {
      return { updated: false, count: 0 };
    }

    let updatedCount = 0;
    const lines = this.content.split('\n');

    for (const task of this.tasks) {
      const shouldBeComplete = this.analyzeCompletion(task, context);

      if (shouldBeComplete && !task.completed) {
        // Mark as complete
        const newLine = lines[task.lineNumber].replace(/\[([ ])\]/, '[✅]');
        lines[task.lineNumber] = newLine;
        task.completed = true;
        updatedCount++;

        if (this.verbose) {
          console.log(`  ✓ Marked complete: ${task.text}`);
        }
      }
    }

    if (updatedCount > 0) {
      this.content = lines.join('\n');
      return { updated: true, count: updatedCount };
    }

    return { updated: false, count: 0 };
  }

  /**
   * Save updated PROMPT.md
   */
  save() {
    if (!this.loaded || this.dryRun) {
      return false;
    }

    try {
      fs.writeFileSync(this.promptPath, this.content, 'utf-8');
      return true;
    } catch (error) {
      if (this.verbose) {
        console.error(`Failed to save PROMPT.md: ${error.message}`);
      }
      return false;
    }
  }

  /**
   * Get progress summary
   */
  getProgress() {
    if (!this.loaded) {
      return { total: 0, completed: 0, percentage: 0 };
    }

    const total = this.tasks.length;
    const completed = this.tasks.filter(t => t.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, percentage };
  }

  /**
   * Get incomplete tasks
   */
  getIncompleteTasks() {
    return this.tasks.filter(t => !t.completed);
  }

  /**
   * Get completed tasks
   */
  getCompletedTasks() {
    return this.tasks.filter(t => t.completed);
  }
}

module.exports = PromptUpdater;
