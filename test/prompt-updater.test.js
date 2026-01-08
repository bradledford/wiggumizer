const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const PromptUpdater = require('../src/prompt-updater');

describe('PromptUpdater', () => {
  let tempDir;
  let promptPath;

  beforeEach(() => {
    // Create temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-updater-test-'));
    promptPath = path.join(tempDir, 'PROMPT.md');
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Task Parsing', () => {
    it('should parse unchecked tasks', () => {
      const content = `# My Prompt

- [ ] Add unit tests
- [ ] Fix bug in auth
- [ ] Update documentation
`;
      fs.writeFileSync(promptPath, content);

      const updater = new PromptUpdater({ promptPath });
      updater.load();

      assert.strictEqual(updater.tasks.length, 3);
      assert.strictEqual(updater.tasks[0].text, 'Add unit tests');
      assert.strictEqual(updater.tasks[0].completed, false);
    });

    it('should parse checked tasks with various markers', () => {
      const content = `# Tasks

- [x] Completed with x
- [X] Completed with X
- [✓] Completed with checkmark
- [✅] Completed with emoji
- [ ] Not completed
`;
      fs.writeFileSync(promptPath, content);

      const updater = new PromptUpdater({ promptPath });
      updater.load();

      assert.strictEqual(updater.tasks.length, 5);
      assert.strictEqual(updater.tasks[0].completed, true);
      assert.strictEqual(updater.tasks[1].completed, true);
      assert.strictEqual(updater.tasks[2].completed, true);
      assert.strictEqual(updater.tasks[3].completed, true);
      assert.strictEqual(updater.tasks[4].completed, false);
    });

    it('should handle nested tasks with indentation', () => {
      const content = `# Tasks

- [ ] Main task
  - [ ] Subtask 1
  - [ ] Subtask 2
- [ ] Another main task
`;
      fs.writeFileSync(promptPath, content);

      const updater = new PromptUpdater({ promptPath });
      updater.load();

      assert.strictEqual(updater.tasks.length, 4);
      assert.strictEqual(updater.tasks[0].indent, '');
      assert.strictEqual(updater.tasks[1].indent, '  ');
      assert.strictEqual(updater.tasks[2].indent, '  ');
    });

    it('should ignore non-task lines', () => {
      const content = `# My Prompt

Some regular text here.

- Regular bullet point
- [ ] Actual task
* Another bullet
- [x] Another task

Regular paragraph.
`;
      fs.writeFileSync(promptPath, content);

      const updater = new PromptUpdater({ promptPath });
      updater.load();

      assert.strictEqual(updater.tasks.length, 2);
    });
  });

  describe('File Reference Extraction', () => {
    it('should extract file paths from task text', () => {
      const updater = new PromptUpdater({ promptPath });

      const refs = updater.extractFileReferences('Add tests for src/config.js and src/validator.js');
      assert.strictEqual(refs.length, 2);
      assert.ok(refs.includes('src/config.js'));
      assert.ok(refs.includes('src/validator.js'));
    });

    it('should extract backtick-wrapped file paths', () => {
      const updater = new PromptUpdater({ promptPath });

      const refs = updater.extractFileReferences('Update `test/helper.test.js` with new cases');
      assert.ok(refs.includes('test/helper.test.js'));
    });

    it('should handle file paths without directory', () => {
      const updater = new PromptUpdater({ promptPath });

      const refs = updater.extractFileReferences('Fix bug in auth.js');
      assert.ok(refs.includes('auth.js'));
    });
  });

  describe('Keyword Extraction', () => {
    it('should extract meaningful keywords', () => {
      const updater = new PromptUpdater({ promptPath });

      const keywords = updater.extractKeywords('Add error handling for authentication');
      assert.ok(keywords.includes('error'));
      assert.ok(keywords.includes('handling'));
      assert.ok(keywords.includes('authentication'));
    });

    it('should filter out common words', () => {
      const updater = new PromptUpdater({ promptPath });

      const keywords = updater.extractKeywords('Add the error handling for the authentication');
      assert.ok(!keywords.includes('the'));
      assert.ok(!keywords.includes('for'));
      assert.ok(!keywords.includes('add'));
    });

    it('should handle hyphenated terms', () => {
      const updater = new PromptUpdater({ promptPath });

      const keywords = updater.extractKeywords('Implement rate-limiting for API');
      assert.ok(keywords.includes('rate-limiting') || keywords.includes('rate') || keywords.includes('limiting'));
    });
  });

  describe('Test Name Extraction', () => {
    it('should extract test names from various formats', () => {
      const updater = new PromptUpdater({ promptPath });

      assert.strictEqual(
        updater.extractTestName('Add tests for convergence-analyzer'),
        'convergence-analyzer'
      );

      assert.strictEqual(
        updater.extractTestName('Test error-handler retry logic'),
        'error-handler'
      );

      assert.strictEqual(
        updater.extractTestName('Update convergence-analyzer.test.js'),
        'convergence-analyzer'
      );
    });
  });

  describe('Completion Analysis', () => {
    it('should mark task complete when file is modified', () => {
      const content = `# Tasks
- [ ] Add tests for src/config.js
`;
      fs.writeFileSync(promptPath, content);

      const updater = new PromptUpdater({ promptPath });
      updater.load();

      const task = updater.tasks[0];
      const context = {
        filesModified: ['src/config.js', 'test/config.test.js']
      };

      const isComplete = updater.analyzeCompletion(task, context);
      assert.strictEqual(isComplete, true);
    });

    it('should mark task complete when test passes', () => {
      const content = `# Tasks
- [ ] Test convergence-analyzer
`;
      fs.writeFileSync(promptPath, content);

      const updater = new PromptUpdater({ promptPath });
      updater.load();

      const task = updater.tasks[0];
      const context = {
        testResults: 'convergence-analyzer: all tests passed'
      };

      const isComplete = updater.analyzeCompletion(task, context);
      assert.strictEqual(isComplete, true);
    });

    it('should mark task complete with keyword matches in git log', () => {
      const content = `# Tasks
- [ ] Implement error handling
`;
      fs.writeFileSync(promptPath, content);

      const updater = new PromptUpdater({ promptPath });
      updater.load();

      const task = updater.tasks[0];
      const context = {
        gitLog: 'abc123 Add error handling\ndef456 Fix retry logic',
        completedWork: 'Implemented comprehensive error handling with retries'
      };

      const isComplete = updater.analyzeCompletion(task, context);
      assert.strictEqual(isComplete, true);
    });

    it('should not mark task complete with weak signals', () => {
      const content = `# Tasks
- [ ] Add comprehensive testing
`;
      fs.writeFileSync(promptPath, content);

      const updater = new PromptUpdater({ promptPath });
      updater.load();

      const task = updater.tasks[0];
      const context = {
        gitLog: 'abc123 Minor tweak'
      };

      const isComplete = updater.analyzeCompletion(task, context);
      assert.strictEqual(isComplete, false);
    });

    it('should keep already completed tasks as completed', () => {
      const content = `# Tasks
- [x] Already done
`;
      fs.writeFileSync(promptPath, content);

      const updater = new PromptUpdater({ promptPath });
      updater.load();

      const task = updater.tasks[0];
      const context = {};

      const isComplete = updater.analyzeCompletion(task, context);
      assert.strictEqual(isComplete, true);
    });
  });

  describe('Task Status Updates', () => {
    it('should update task status based on context', () => {
      const content = `# Tasks
- [ ] Add tests for src/config.js
- [ ] Fix auth bug
- [ ] Update docs
`;
      fs.writeFileSync(promptPath, content);

      const updater = new PromptUpdater({ promptPath });
      updater.load();

      const context = {
        filesModified: ['src/config.js', 'test/config.test.js']
      };

      const result = updater.updateTaskStatus(context);

      assert.strictEqual(result.updated, true);
      assert.strictEqual(result.count, 1);

      // Check that the content was updated
      const updatedContent = updater.content;
      assert.ok(updatedContent.includes('- [✅] Add tests for src/config.js'));
      assert.ok(updatedContent.includes('- [ ] Fix auth bug'));
    });

    it('should handle multiple task updates', () => {
      const content = `# Tasks
- [ ] Add error handling
- [ ] Add rate limiting
- [ ] Add tests
`;
      fs.writeFileSync(promptPath, content);

      const updater = new PromptUpdater({ promptPath });
      updater.load();

      const context = {
        filesModified: ['src/error-handler.js', 'test/error-handler.test.js'],
        gitLog: 'Added error handling with retry logic\nAdded rate limiting'
      };

      const result = updater.updateTaskStatus(context);

      assert.strictEqual(result.updated, true);
      assert.ok(result.count >= 1);
    });

    it('should not update if no tasks qualify', () => {
      const content = `# Tasks
- [ ] Some task
`;
      fs.writeFileSync(promptPath, content);

      const updater = new PromptUpdater({ promptPath });
      updater.load();

      const context = {
        filesModified: ['unrelated.js']
      };

      const result = updater.updateTaskStatus(context);

      assert.strictEqual(result.updated, false);
      assert.strictEqual(result.count, 0);
    });
  });

  describe('Progress Tracking', () => {
    it('should calculate progress correctly', () => {
      const content = `# Tasks
- [x] Task 1
- [x] Task 2
- [ ] Task 3
- [ ] Task 4
`;
      fs.writeFileSync(promptPath, content);

      const updater = new PromptUpdater({ promptPath });
      updater.load();

      const progress = updater.getProgress();

      assert.strictEqual(progress.total, 4);
      assert.strictEqual(progress.completed, 2);
      assert.strictEqual(progress.percentage, 50);
    });

    it('should handle empty task list', () => {
      const content = `# Tasks\n\nNo tasks here.`;
      fs.writeFileSync(promptPath, content);

      const updater = new PromptUpdater({ promptPath });
      updater.load();

      const progress = updater.getProgress();

      assert.strictEqual(progress.total, 0);
      assert.strictEqual(progress.completed, 0);
      assert.strictEqual(progress.percentage, 0);
    });

    it('should get incomplete tasks', () => {
      const content = `# Tasks
- [x] Done
- [ ] Todo 1
- [ ] Todo 2
`;
      fs.writeFileSync(promptPath, content);

      const updater = new PromptUpdater({ promptPath });
      updater.load();

      const incomplete = updater.getIncompleteTasks();

      assert.strictEqual(incomplete.length, 2);
      assert.strictEqual(incomplete[0].text, 'Todo 1');
      assert.strictEqual(incomplete[1].text, 'Todo 2');
    });
  });

  describe('File Persistence', () => {
    it('should save updated content to file', () => {
      const content = `# Tasks
- [ ] Task 1
`;
      fs.writeFileSync(promptPath, content);

      const updater = new PromptUpdater({ promptPath });
      updater.load();

      const context = {
        filesModified: ['Task'],
        completedWork: 'Task 1 completed'
      };

      updater.updateTaskStatus(context);
      const saved = updater.save();

      assert.strictEqual(saved, true);

      // Read the file and verify
      const savedContent = fs.readFileSync(promptPath, 'utf-8');
      assert.ok(savedContent.includes('- [✅] Task 1'));
    });

    it('should not save in dry run mode', () => {
      const content = `# Tasks
- [ ] Task 1
`;
      fs.writeFileSync(promptPath, content);

      const updater = new PromptUpdater({ promptPath, dryRun: true });
      updater.load();

      const context = {
        filesModified: ['Task'],
        completedWork: 'Task 1 completed'
      };

      updater.updateTaskStatus(context);
      const saved = updater.save();

      assert.strictEqual(saved, false);

      // File should be unchanged
      const savedContent = fs.readFileSync(promptPath, 'utf-8');
      assert.strictEqual(savedContent, content);
    });

    it('should handle missing PROMPT.md gracefully', () => {
      const updater = new PromptUpdater({ promptPath: '/nonexistent/PROMPT.md' });
      const loaded = updater.load();

      assert.strictEqual(loaded, false);
      assert.strictEqual(updater.tasks.length, 0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle tasks with special characters', () => {
      const content = `# Tasks
- [ ] Fix "authentication" bug (priority: high)
- [ ] Update user's profile [API]
`;
      fs.writeFileSync(promptPath, content);

      const updater = new PromptUpdater({ promptPath });
      updater.load();

      assert.strictEqual(updater.tasks.length, 2);
      assert.ok(updater.tasks[0].text.includes('"authentication"'));
    });

    it('should handle empty lines and whitespace', () => {
      const content = `# Tasks

- [ ] Task 1


- [ ] Task 2

`;
      fs.writeFileSync(promptPath, content);

      const updater = new PromptUpdater({ promptPath });
      updater.load();

      assert.strictEqual(updater.tasks.length, 2);
    });

    it('should preserve non-task content when updating', () => {
      const content = `# My Prompt

This is important context.

## Tasks
- [ ] Task 1

More context here.
`;
      fs.writeFileSync(promptPath, content);

      const updater = new PromptUpdater({ promptPath });
      updater.load();

      const context = {
        filesModified: ['Task'],
        completedWork: 'Task 1 done'
      };

      updater.updateTaskStatus(context);

      assert.ok(updater.content.includes('This is important context.'));
      assert.ok(updater.content.includes('More context here.'));
    });
  });
});
