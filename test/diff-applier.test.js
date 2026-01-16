const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('assert');
const DiffApplier = require('../src/diff-applier');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('DiffApplier', () => {
  let testDir;

  beforeEach(() => {
    // Create a temporary directory for tests
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wiggumize-test-'));
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('parseDiff', () => {
    it('should parse a simple diff', () => {
      const diffText = `--- a/test.js
+++ b/test.js
@@ -1,3 +1,3 @@
 function hello() {
-  console.log('old');
+  console.log('new');
 }`;

      const result = DiffApplier.parseDiff(diffText);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].oldPath, 'test.js');
      assert.strictEqual(result[0].newPath, 'test.js');
      assert.strictEqual(result[0].hunks.length, 1);
      assert.strictEqual(result[0].hunks[0].oldStart, 1);
      assert.strictEqual(result[0].hunks[0].newStart, 1);
    });

    it('should parse new file diff', () => {
      const diffText = `--- /dev/null
+++ b/newfile.js
@@ -0,0 +1,3 @@
+function newFunc() {
+  return 42;
+}`;

      const result = DiffApplier.parseDiff(diffText);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].isNew, true);
      assert.strictEqual(result[0].newPath, 'newfile.js');
    });

    it('should parse deleted file diff', () => {
      const diffText = `--- a/oldfile.js
+++ /dev/null
@@ -1,3 +0,0 @@
-function oldFunc() {
-  return 42;
-}`;

      const result = DiffApplier.parseDiff(diffText);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].isDeleted, true);
      assert.strictEqual(result[0].oldPath, 'oldfile.js');
    });
  });

  describe('applyDiffs', () => {
    it('should modify an existing file', () => {
      // Create a test file
      const testFile = path.join(testDir, 'test.js');
      fs.writeFileSync(testFile, `function hello() {
  console.log('old');
}`, 'utf-8');

      const diffText = `\`\`\`diff
--- a/test.js
+++ b/test.js
@@ -1,3 +1,3 @@
 function hello() {
-  console.log('old');
+  console.log('new');
 }
\`\`\``;

      const result = DiffApplier.applyDiffs(diffText, testDir, false);

      assert.deepStrictEqual(result.filesModified, ['test.js']);
      assert.deepStrictEqual(result.errors, []);

      const newContent = fs.readFileSync(testFile, 'utf-8');
      assert.ok(newContent.includes("console.log('new')"));
      assert.ok(!newContent.includes("console.log('old')"));
    });

    it('should create a new file', () => {
      const diffText = `\`\`\`diff
--- /dev/null
+++ b/newfile.js
@@ -0,0 +1,3 @@
+function newFunc() {
+  return 42;
+}
\`\`\``;

      const result = DiffApplier.applyDiffs(diffText, testDir, false);

      assert.deepStrictEqual(result.filesModified, ['newfile.js']);
      assert.deepStrictEqual(result.errors, []);

      const testFile = path.join(testDir, 'newfile.js');
      assert.strictEqual(fs.existsSync(testFile), true);

      const content = fs.readFileSync(testFile, 'utf-8');
      assert.ok(content.includes('function newFunc()'));
    });

    it('should delete a file', () => {
      // Create a test file
      const testFile = path.join(testDir, 'oldfile.js');
      fs.writeFileSync(testFile, 'function oldFunc() { return 42; }', 'utf-8');

      const diffText = `\`\`\`diff
--- a/oldfile.js
+++ /dev/null
@@ -1,1 +0,0 @@
-function oldFunc() { return 42; }
\`\`\``;

      const result = DiffApplier.applyDiffs(diffText, testDir, false);

      assert.deepStrictEqual(result.filesModified, ['oldfile.js']);
      assert.deepStrictEqual(result.errors, []);
      assert.strictEqual(fs.existsSync(testFile), false);
    });

    it('should handle multiple files in one response', () => {
      // Create test files
      const file1 = path.join(testDir, 'file1.js');
      const file2 = path.join(testDir, 'file2.js');
      fs.writeFileSync(file1, 'old content 1', 'utf-8');
      fs.writeFileSync(file2, 'old content 2', 'utf-8');

      const diffText = `\`\`\`diff
--- a/file1.js
+++ b/file1.js
@@ -1,1 +1,1 @@
-old content 1
+new content 1
--- a/file2.js
+++ b/file2.js
@@ -1,1 +1,1 @@
-old content 2
+new content 2
\`\`\``;

      const result = DiffApplier.applyDiffs(diffText, testDir, false);

      assert.strictEqual(result.filesModified.length, 2);
      assert.ok(result.filesModified.includes('file1.js'));
      assert.ok(result.filesModified.includes('file2.js'));
      assert.deepStrictEqual(result.errors, []);

      assert.strictEqual(fs.readFileSync(file1, 'utf-8'), 'new content 1');
      assert.strictEqual(fs.readFileSync(file2, 'utf-8'), 'new content 2');
    });

    it('should report errors for non-existent files', () => {
      const diffText = `\`\`\`diff
--- a/nonexistent.js
+++ b/nonexistent.js
@@ -1,1 +1,1 @@
-old line
+new line
\`\`\``;

      const result = DiffApplier.applyDiffs(diffText, testDir, false);

      assert.deepStrictEqual(result.filesModified, []);
      assert.ok(result.errors.length > 0);
      assert.ok(result.errors[0].includes('nonexistent.js'));
    });
  });
});
