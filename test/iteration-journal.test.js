/**
 * Iteration Journal Tests
 *
 * Tests for the iteration journal - a context system for non-Git repositories.
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const IterationJournal = require('../src/iteration-journal');

describe('IterationJournal', () => {
  let tmpDir;
  let journal;

  beforeEach(() => {
    // Create a temporary directory for testing
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wiggumizer-test-'));
    journal = new IterationJournal({ cwd: tmpDir });
  });

  afterEach(() => {
    // Clean up
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const j = new IterationJournal();
      assert.strictEqual(j.cwd, process.cwd());
      assert.strictEqual(j.verbose, false);
    });

    it('should accept custom cwd', () => {
      const j = new IterationJournal({ cwd: '/custom/path' });
      assert.strictEqual(j.cwd, '/custom/path');
    });

    it('should accept verbose option', () => {
      const j = new IterationJournal({ verbose: true });
      assert.strictEqual(j.verbose, true);
    });
  });

  describe('exists', () => {
    it('should return false when journal does not exist', () => {
      assert.strictEqual(journal.exists(), false);
    });

    it('should return true after append', () => {
      journal.append({
        iteration: 1,
        files: ['test.js'],
        summary: 'Test entry'
      });
      assert.strictEqual(journal.exists(), true);
    });
  });

  describe('append', () => {
    it('should create .wiggumizer directory if it does not exist', () => {
      const wiggumDir = path.join(tmpDir, '.wiggumizer');
      assert.strictEqual(fs.existsSync(wiggumDir), false);

      journal.append({
        iteration: 1,
        files: ['test.js'],
        summary: 'Test entry'
      });

      assert.strictEqual(fs.existsSync(wiggumDir), true);
    });

    it('should create journal file with correct format', () => {
      journal.append({
        iteration: 1,
        files: ['src/auth.js', 'src/config.js'],
        summary: 'Added authentication'
      });

      const content = fs.readFileSync(journal.journalPath, 'utf-8');
      assert.ok(content.includes('Iteration 1'));
      assert.ok(content.includes('Files: src/auth.js, src/config.js'));
      assert.ok(content.includes('Summary: Added authentication'));
      assert.ok(content.includes('---'));
    });

    it('should prepend new entries (most recent first)', () => {
      journal.append({
        iteration: 1,
        files: ['first.js'],
        summary: 'First entry'
      });

      journal.append({
        iteration: 2,
        files: ['second.js'],
        summary: 'Second entry'
      });

      const content = fs.readFileSync(journal.journalPath, 'utf-8');
      const firstIndex = content.indexOf('Iteration 1');
      const secondIndex = content.indexOf('Iteration 2');

      // Second entry should appear before first
      assert.ok(secondIndex < firstIndex, 'Most recent should be at top');
    });

    it('should handle empty files array', () => {
      journal.append({
        iteration: 1,
        files: [],
        summary: 'No files changed'
      });

      const content = fs.readFileSync(journal.journalPath, 'utf-8');
      assert.ok(content.includes('Files: (none)'));
    });

    it('should handle missing summary', () => {
      journal.append({
        iteration: 1,
        files: ['test.js']
      });

      const content = fs.readFileSync(journal.journalPath, 'utf-8');
      assert.ok(content.includes('Summary: No summary available'));
    });
  });

  describe('read', () => {
    it('should return empty array when journal does not exist', () => {
      const entries = journal.read();
      assert.deepStrictEqual(entries, []);
    });

    it('should parse entries correctly', () => {
      journal.append({
        iteration: 1,
        files: ['test.js'],
        summary: 'Test entry'
      });

      const entries = journal.read();
      assert.strictEqual(entries.length, 1);
      assert.strictEqual(entries[0].iteration, 1);
      assert.deepStrictEqual(entries[0].files, ['test.js']);
      assert.strictEqual(entries[0].summary, 'Test entry');
      assert.ok(entries[0].timestamp);
    });

    it('should respect limit parameter', () => {
      for (let i = 1; i <= 5; i++) {
        journal.append({
          iteration: i,
          files: [`file${i}.js`],
          summary: `Entry ${i}`
        });
      }

      const entries = journal.read(3);
      assert.strictEqual(entries.length, 3);
      // Most recent first
      assert.strictEqual(entries[0].iteration, 5);
      assert.strictEqual(entries[2].iteration, 3);
    });

    it('should default to 10 entries', () => {
      for (let i = 1; i <= 15; i++) {
        journal.append({
          iteration: i,
          files: [`file${i}.js`],
          summary: `Entry ${i}`
        });
      }

      const entries = journal.read();
      assert.strictEqual(entries.length, 10);
    });
  });

  describe('format', () => {
    it('should return empty string when no entries', () => {
      const formatted = journal.format();
      assert.strictEqual(formatted, '');
    });

    it('should format entries as git-log-like string', () => {
      journal.append({
        iteration: 1,
        files: ['auth.js'],
        summary: 'Added auth'
      });

      const formatted = journal.format();
      assert.ok(formatted.includes('Iteration 1'));
      assert.ok(formatted.includes('Files: auth.js'));
      assert.ok(formatted.includes('Summary: Added auth'));
    });

    it('should respect limit parameter', () => {
      for (let i = 1; i <= 5; i++) {
        journal.append({
          iteration: i,
          files: [`file${i}.js`],
          summary: `Entry ${i}`
        });
      }

      const formatted = journal.format(2);
      // Should only have 2 entries
      assert.ok(formatted.includes('Iteration 5'));
      assert.ok(formatted.includes('Iteration 4'));
      assert.ok(!formatted.includes('Iteration 3'));
    });
  });

  describe('getIterationCount', () => {
    it('should return 0 when journal is empty', () => {
      assert.strictEqual(journal.getIterationCount(), 0);
    });

    it('should return highest iteration number', () => {
      journal.append({ iteration: 1, files: [], summary: '1' });
      journal.append({ iteration: 2, files: [], summary: '2' });
      journal.append({ iteration: 3, files: [], summary: '3' });

      assert.strictEqual(journal.getIterationCount(), 3);
    });
  });

  describe('clear', () => {
    it('should remove journal file', () => {
      journal.append({
        iteration: 1,
        files: ['test.js'],
        summary: 'Test'
      });

      assert.strictEqual(journal.exists(), true);

      journal.clear();

      assert.strictEqual(journal.exists(), false);
    });

    it('should handle non-existent journal', () => {
      // Should not throw
      journal.clear();
      assert.strictEqual(journal.exists(), false);
    });
  });

  describe('displayNonGitWarning', () => {
    it('should be a static method', () => {
      assert.strictEqual(typeof IterationJournal.displayNonGitWarning, 'function');
    });
  });
});
