const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const PromptUpdater = require('../src/prompt-updater');

describe('PROMPT.md Workflow Integration', () => {
  let tempDir;
  let promptPath;

  beforeEach(() => {
    // Create temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-workflow-test-'));
    promptPath = path.join(tempDir, 'PROMPT.md');
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Multi-iteration workflow', () => {
    it('should track progress across multiple iterations', () => {
      // Initial PROMPT.md with work plan
      const initialPrompt = `# Add Error Handling to API

## Work Plan

- [ ] Add error handling to src/error-handler.js
- [ ] Create tests in test/error-handler.test.js
- [ ] Update documentation
- [ ] Add rate limiting

## Implementation Notes

Implement comprehensive error handling with retries and circuit breaker pattern.
`;
      fs.writeFileSync(promptPath, initialPrompt);

      const updater = new PromptUpdater({ promptPath });

      // === ITERATION 1: Create error handler ===
      updater.load();
      let progress = updater.getProgress();
      assert.strictEqual(progress.completed, 0);
      assert.strictEqual(progress.total, 4);

      const iter1Context = {
        filesModified: ['src/error-handler.js'],
        completedWork: 'Implemented error handler with retry logic and exponential backoff',
        gitLog: 'abc123 Add error handler module'
      };

      let result = updater.updateTaskStatus(iter1Context);
      assert.strictEqual(result.updated, true);
      assert.strictEqual(result.count, 1);

      updater.save();

      // === ITERATION 2: Add tests ===
      updater.load(); // Reload to simulate next iteration
      progress = updater.getProgress();
      assert.strictEqual(progress.completed, 1);

      const iter2Context = {
        filesModified: ['test/error-handler.test.js'],
        completedWork: 'Added comprehensive tests for error handler',
        gitLog: 'def456 Add error handler tests\nabc123 Add error handler module'
      };

      result = updater.updateTaskStatus(iter2Context);
      assert.strictEqual(result.updated, true);
      assert.strictEqual(result.count, 1);

      updater.save();

      // === ITERATION 3: Update documentation and add rate limiting ===
      updater.load();
      progress = updater.getProgress();
      assert.strictEqual(progress.completed, 2);

      const iter3Context = {
        filesModified: ['README.md', 'src/rate-limiter.js'],
        completedWork: 'Updated documentation with error handling examples and added rate limiting',
        gitLog: 'ghi789 Add rate limiting\ndef456 Add error handler tests\nabc123 Add error handler module'
      };

      result = updater.updateTaskStatus(iter3Context);
      assert.strictEqual(result.updated, true);
      // Should update both "Update documentation" and "Add rate limiting"
      assert.ok(result.count >= 1);

      updater.save();

      // === FINAL CHECK ===
      updater.load();
      progress = updater.getProgress();
      assert.ok(progress.completed >= 3, `Expected at least 3 completed, got ${progress.completed}`);
      assert.strictEqual(progress.total, 4);

      // Verify PROMPT.md was actually updated
      const finalContent = fs.readFileSync(promptPath, 'utf-8');
      assert.ok(finalContent.includes('[✅]'), 'Should have at least one completed task');
    });

    it('should handle tasks without explicit file references', () => {
      const prompt = `# Refactor Project

## Tasks

- [ ] Improve error handling
- [ ] Add comprehensive tests
- [ ] Refactor authentication
`;
      fs.writeFileSync(promptPath, prompt);

      const updater = new PromptUpdater({ promptPath });
      updater.load();

      // Iteration with generic improvements
      const context = {
        filesModified: ['src/error-handler.js', 'src/retry-logic.js'],
        completedWork: 'Implemented improved error handling with better retry mechanisms and circuit breaker',
        gitLog: 'Improve error handling with circuit breaker'
      };

      const result = updater.updateTaskStatus(context);

      // Should detect "Improve error handling" is complete based on keywords
      assert.strictEqual(result.updated, true);
      assert.ok(result.count >= 1);
    });

    it('should preserve already completed tasks', () => {
      const prompt = `# Tasks

- [x] Already done
- [ ] Todo item
- [✅] Also done
`;
      fs.writeFileSync(promptPath, prompt);

      const updater = new PromptUpdater({ promptPath });
      updater.load();

      const context = {
        filesModified: ['something.js'],
        completedWork: 'Did some work',
        gitLog: 'Made changes'
      };

      updater.updateTaskStatus(context);
      updater.save();

      // Reload and verify completed tasks are still marked
      updater.load();
      const progress = updater.getProgress();
      assert.strictEqual(progress.completed, 2);

      const content = fs.readFileSync(promptPath, 'utf-8');
      assert.ok(content.includes('[x] Already done'));
      assert.ok(content.includes('[✅] Also done'));
    });

    it('should not modify PROMPT.md in dry-run mode', () => {
      const prompt = `# Tasks
- [ ] Task 1
`;
      fs.writeFileSync(promptPath, prompt);

      const updater = new PromptUpdater({ promptPath, dryRun: true });
      updater.load();

      const context = {
        filesModified: ['Task'],
        completedWork: 'Task 1 completed'
      };

      const result = updater.updateTaskStatus(context);
      assert.strictEqual(result.updated, true);

      const saved = updater.save();
      assert.strictEqual(saved, false);

      // File should be unchanged
      const content = fs.readFileSync(promptPath, 'utf-8');
      assert.strictEqual(content, prompt);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle Wiggumizer v0.2 work plan', () => {
      const prompt = `# Wiggumizer v0.2

## Goals for v0.2

### 1. Add Unit Tests

- [ ] Test convergence-analyzer.js
- [ ] Test error-handler.js
- [ ] Test file-selector.js

### 2. Improve Error Messages

- [ ] Better API key missing message
- [ ] Better PROMPT.md missing message

### 3. Add Multi-Provider Support

- [ ] Create src/providers/openai.js
- [ ] Support GPT-4
`;
      fs.writeFileSync(promptPath, prompt);

      const updater = new PromptUpdater({ promptPath });
      updater.load();

      const progress = updater.getProgress();
      assert.strictEqual(progress.total, 7);
      assert.strictEqual(progress.completed, 0);

      // Iteration 1: Add tests
      const iter1 = {
        filesModified: [
          'test/convergence-analyzer.test.js',
          'test/error-handler.test.js',
          'test/file-selector.test.js'
        ],
        completedWork: 'Added comprehensive unit tests for convergence analyzer, error handler, and file selector',
        gitLog: 'Add unit tests for core modules'
      };

      let result = updater.updateTaskStatus(iter1);
      assert.strictEqual(result.updated, true);
      assert.strictEqual(result.count, 3);

      updater.save();

      // Verify progress
      updater.load();
      let newProgress = updater.getProgress();
      assert.strictEqual(newProgress.completed, 3);
      assert.strictEqual(newProgress.percentage, Math.round((3 / 7) * 100));
    });

    it('should handle complex nested task structure', () => {
      const prompt = `# Multi-Repo Support

## Phase 1: Core Implementation

- [ ] Add workspace-manager.js
  - [ ] Parse workspace config
  - [ ] Handle multi-repo context
- [ ] Update loop.js
  - [ ] Integrate workspace manager
  - [ ] Handle workspace-aware changes

## Phase 2: Testing

- [ ] Test workspace manager
- [ ] Test multi-repo workflow
`;
      fs.writeFileSync(promptPath, prompt);

      const updater = new PromptUpdater({ promptPath });
      updater.load();

      // All nested tasks should be counted (2+2+2 from Phase 1, 2 from Phase 2 = 8 total)
      const progress = updater.getProgress();
      assert.strictEqual(progress.total, 8);

      const context = {
        filesModified: ['src/workspace-manager.js'],
        completedWork: 'Implemented workspace manager with config parsing and multi-repo context handling',
        gitLog: 'Add workspace manager'
      };

      const result = updater.updateTaskStatus(context);
      assert.strictEqual(result.updated, true);
      // Should match main task and potentially subtasks
      assert.ok(result.count >= 1);
    });

    it('should handle edge case: all tasks already complete', () => {
      const prompt = `# Complete Project

- [x] Task 1
- [x] Task 2
- [x] Task 3
`;
      fs.writeFileSync(promptPath, prompt);

      const updater = new PromptUpdater({ promptPath });
      updater.load();

      const progress = updater.getProgress();
      assert.strictEqual(progress.total, 3);
      assert.strictEqual(progress.completed, 3);
      assert.strictEqual(progress.percentage, 100);

      const context = {
        filesModified: ['anything.js'],
        completedWork: 'Made more changes'
      };

      const result = updater.updateTaskStatus(context);
      assert.strictEqual(result.updated, false);
      assert.strictEqual(result.count, 0);
    });

    it('should handle edge case: no tasks in PROMPT.md', () => {
      const prompt = `# Simple Prompt

Just refactor the code to use async/await.
No tasks list needed.
`;
      fs.writeFileSync(promptPath, prompt);

      const updater = new PromptUpdater({ promptPath });
      updater.load();

      const progress = updater.getProgress();
      assert.strictEqual(progress.total, 0);
      assert.strictEqual(progress.completed, 0);
      assert.strictEqual(progress.percentage, 0);

      const context = {
        filesModified: ['src/api.js'],
        completedWork: 'Refactored to async/await'
      };

      const result = updater.updateTaskStatus(context);
      assert.strictEqual(result.updated, false);
    });
  });

  describe('Progress reporting', () => {
    it('should report accurate progress percentages', () => {
      const prompt = `# Tasks
- [ ] Add authentication
- [ ] Add error handling
- [ ] Add logging
- [ ] Add monitoring
- [ ] Add documentation
`;
      fs.writeFileSync(promptPath, prompt);

      const updater = new PromptUpdater({ promptPath });
      updater.load();

      // Complete 2 out of 5 tasks with specific file matches
      const context = {
        filesModified: ['src/authentication.js', 'src/error-handler.js'],
        completedWork: 'Implemented authentication and error handling modules',
        gitLog: 'abc123 Add authentication\ndef456 Add error handling'
      };

      updater.updateTaskStatus(context);
      updater.save();

      updater.load();
      const progress = updater.getProgress();
      assert.strictEqual(progress.completed, 2);
      assert.strictEqual(progress.percentage, 40);
    });

    it('should correctly identify incomplete tasks', () => {
      const prompt = `# Tasks
- [x] Done
- [ ] Todo 1
- [ ] Todo 2
- [x] Also done
`;
      fs.writeFileSync(promptPath, prompt);

      const updater = new PromptUpdater({ promptPath });
      updater.load();

      const incomplete = updater.getIncompleteTasks();
      assert.strictEqual(incomplete.length, 2);
      assert.strictEqual(incomplete[0].text, 'Todo 1');
      assert.strictEqual(incomplete[1].text, 'Todo 2');

      const completed = updater.getCompletedTasks();
      assert.strictEqual(completed.length, 2);
      assert.strictEqual(completed[0].text, 'Done');
      assert.strictEqual(completed[1].text, 'Also done');
    });
  });
});
