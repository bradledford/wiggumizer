const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('assert');
const GitHelper = require('../src/git-helper');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

describe('GitHelper', () => {
  let testDir;

  beforeEach(() => {
    // Create a temporary directory for tests
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wiggumize-git-test-'));

    // Initialize a git repo in the test directory
    execSync('git init', { cwd: testDir, stdio: 'pipe' });
    execSync('git config user.email "test@test.com"', { cwd: testDir, stdio: 'pipe' });
    execSync('git config user.name "Test User"', { cwd: testDir, stdio: 'pipe' });

    // Create an initial commit so we have a clean state
    fs.writeFileSync(path.join(testDir, 'initial.txt'), 'initial content', 'utf-8');
    execSync('git add .', { cwd: testDir, stdio: 'pipe' });
    execSync('git commit -m "Initial commit"', { cwd: testDir, stdio: 'pipe' });
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('getModifiedFiles', () => {
    it('should return empty array when no files are modified', () => {
      const files = GitHelper.getModifiedFiles(testDir);
      assert.deepStrictEqual(files, []);
    });

    it('should detect modified tracked files (staged)', () => {
      // Modify and stage a tracked file (git status shows 'M ' for staged modifications)
      fs.writeFileSync(path.join(testDir, 'initial.txt'), 'modified content', 'utf-8');
      execSync('git add initial.txt', { cwd: testDir, stdio: 'pipe' });

      const files = GitHelper.getModifiedFiles(testDir);
      assert.deepStrictEqual(files, ['initial.txt']);
    });

    it('should detect new untracked files', () => {
      // Create a new file
      fs.writeFileSync(path.join(testDir, 'newfile.txt'), 'new content', 'utf-8');

      const files = GitHelper.getModifiedFiles(testDir);
      assert.deepStrictEqual(files, ['newfile.txt']);
    });

    it('should detect staged files', () => {
      // Create and stage a new file
      fs.writeFileSync(path.join(testDir, 'staged.txt'), 'staged content', 'utf-8');
      execSync('git add staged.txt', { cwd: testDir, stdio: 'pipe' });

      const files = GitHelper.getModifiedFiles(testDir);
      assert.deepStrictEqual(files, ['staged.txt']);
    });

    it('should detect multiple modified files (staged and untracked)', () => {
      // Modify and stage existing file
      fs.writeFileSync(path.join(testDir, 'initial.txt'), 'modified', 'utf-8');
      execSync('git add initial.txt', { cwd: testDir, stdio: 'pipe' });
      // Create new untracked files
      fs.writeFileSync(path.join(testDir, 'new1.txt'), 'new1', 'utf-8');
      fs.writeFileSync(path.join(testDir, 'new2.txt'), 'new2', 'utf-8');

      const files = GitHelper.getModifiedFiles(testDir);
      assert.strictEqual(files.length, 3);
      assert.ok(files.includes('initial.txt'));
      assert.ok(files.includes('new1.txt'));
      assert.ok(files.includes('new2.txt'));
    });

    it('should detect deleted tracked files (staged)', () => {
      // Delete and stage a tracked file
      fs.unlinkSync(path.join(testDir, 'initial.txt'));
      execSync('git add initial.txt', { cwd: testDir, stdio: 'pipe' });

      const files = GitHelper.getModifiedFiles(testDir);
      assert.deepStrictEqual(files, ['initial.txt']);
    });

    it('should handle files in tracked subdirectories', () => {
      // Create a subdirectory with a file and track it
      fs.mkdirSync(path.join(testDir, 'subdir'));
      fs.writeFileSync(path.join(testDir, 'subdir', 'nested.txt'), 'nested content', 'utf-8');
      execSync('git add subdir/nested.txt', { cwd: testDir, stdio: 'pipe' });

      const files = GitHelper.getModifiedFiles(testDir);
      assert.deepStrictEqual(files, ['subdir/nested.txt']);
    });

    it('should detect untracked directories as directory entries', () => {
      // Create an untracked subdirectory
      // Note: git status --porcelain shows untracked dirs as "?? dirname/" not individual files
      fs.mkdirSync(path.join(testDir, 'newdir'));
      fs.writeFileSync(path.join(testDir, 'newdir', 'file.txt'), 'content', 'utf-8');

      const files = GitHelper.getModifiedFiles(testDir);
      // Git shows untracked dirs as "newdir/" not "newdir/file.txt"
      assert.deepStrictEqual(files, ['newdir/']);
    });
  });

  describe('getFileSnapshot', () => {
    it('should return empty map when no files modified', () => {
      const snapshot = GitHelper.getFileSnapshot(testDir);
      assert.strictEqual(snapshot.size, 0);
    });

    it('should return map with file mtimes for modified files', () => {
      // Create a new file
      fs.writeFileSync(path.join(testDir, 'newfile.txt'), 'content', 'utf-8');

      const snapshot = GitHelper.getFileSnapshot(testDir);
      assert.strictEqual(snapshot.size, 1);
      assert.ok(snapshot.has('newfile.txt'));
      assert.ok(typeof snapshot.get('newfile.txt') === 'number');
      assert.ok(snapshot.get('newfile.txt') > 0);
    });

    it('should return 0 mtime for deleted files (staged)', () => {
      // Delete and stage a tracked file
      fs.unlinkSync(path.join(testDir, 'initial.txt'));
      execSync('git add initial.txt', { cwd: testDir, stdio: 'pipe' });

      const snapshot = GitHelper.getFileSnapshot(testDir);
      assert.strictEqual(snapshot.size, 1);
      assert.ok(snapshot.has('initial.txt'));
      assert.strictEqual(snapshot.get('initial.txt'), 0);
    });
  });

  describe('compareSnapshots', () => {
    it('should return empty array when snapshots are identical', () => {
      const before = new Map([['file.txt', 12345]]);
      const after = new Map([['file.txt', 12345]]);

      const changed = GitHelper.compareSnapshots(before, after);
      assert.deepStrictEqual(changed, []);
    });

    it('should detect new files', () => {
      const before = new Map();
      const after = new Map([['newfile.txt', 12345]]);

      const changed = GitHelper.compareSnapshots(before, after);
      assert.deepStrictEqual(changed, ['newfile.txt']);
    });

    it('should detect modified files (different mtime)', () => {
      const before = new Map([['file.txt', 12345]]);
      const after = new Map([['file.txt', 67890]]);

      const changed = GitHelper.compareSnapshots(before, after);
      assert.deepStrictEqual(changed, ['file.txt']);
    });

    it('should detect deleted files', () => {
      const before = new Map([['file.txt', 12345]]);
      const after = new Map();

      const changed = GitHelper.compareSnapshots(before, after);
      assert.deepStrictEqual(changed, ['file.txt']);
    });

    it('should detect multiple changes', () => {
      const before = new Map([
        ['unchanged.txt', 11111],
        ['modified.txt', 22222],
        ['deleted.txt', 33333]
      ]);
      const after = new Map([
        ['unchanged.txt', 11111],
        ['modified.txt', 44444],
        ['newfile.txt', 55555]
      ]);

      const changed = GitHelper.compareSnapshots(before, after);
      assert.strictEqual(changed.length, 3);
      assert.ok(changed.includes('modified.txt'));
      assert.ok(changed.includes('deleted.txt'));
      assert.ok(changed.includes('newfile.txt'));
      assert.ok(!changed.includes('unchanged.txt'));
    });
  });

  describe('integration: tracking file changes across operations', () => {
    it('should accurately track files modified between two points in time', () => {
      // Get initial state (should be clean)
      const filesBefore = GitHelper.getModifiedFiles(testDir);
      assert.deepStrictEqual(filesBefore, []);

      // Simulate Claude CLI making changes - create dir first, then files
      fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(testDir, 'src/cli.js'), 'cli code', 'utf-8');
      fs.writeFileSync(path.join(testDir, 'src/config.js'), 'config code', 'utf-8');
      // Stage them so they show as individual files, not as "src/"
      execSync('git add src/', { cwd: testDir, stdio: 'pipe' });
      // Also modify a tracked file and stage it
      fs.writeFileSync(path.join(testDir, 'initial.txt'), 'updated content', 'utf-8');
      execSync('git add initial.txt', { cwd: testDir, stdio: 'pipe' });

      // Get state after changes
      const filesAfter = GitHelper.getModifiedFiles(testDir);

      // Files that are newly modified (in after but not in before)
      const newlyModified = filesAfter.filter(f => !filesBefore.includes(f));

      assert.strictEqual(newlyModified.length, 3);
      assert.ok(newlyModified.includes('src/cli.js'));
      assert.ok(newlyModified.includes('src/config.js'));
      assert.ok(newlyModified.includes('initial.txt'));
    });

    it('should distinguish between pre-existing changes and new changes', () => {
      // Create an initial modified file (simulating dirty working directory)
      fs.writeFileSync(path.join(testDir, 'preexisting.txt'), 'preexisting', 'utf-8');

      // Get state before iteration
      const filesBefore = GitHelper.getModifiedFiles(testDir);
      assert.deepStrictEqual(filesBefore, ['preexisting.txt']);

      // Simulate Claude CLI making additional changes
      fs.writeFileSync(path.join(testDir, 'newchange.txt'), 'new', 'utf-8');
      // Modify tracked file and stage it
      fs.writeFileSync(path.join(testDir, 'initial.txt'), 'modified', 'utf-8');
      execSync('git add initial.txt', { cwd: testDir, stdio: 'pipe' });

      // Get state after changes
      const filesAfter = GitHelper.getModifiedFiles(testDir);

      // Only newly modified files (not the preexisting one)
      const newlyModified = filesAfter.filter(f => !filesBefore.includes(f));

      assert.strictEqual(newlyModified.length, 2);
      assert.ok(newlyModified.includes('newchange.txt'));
      assert.ok(newlyModified.includes('initial.txt'));
      assert.ok(!newlyModified.includes('preexisting.txt'));
    });
  });
});
