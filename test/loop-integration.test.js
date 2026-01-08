const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Import modules
const RalphLoop = require('../src/loop');
const WorkspaceManager = require('../src/workspace-manager');

describe('RalphLoop Integration with WorkspaceManager', () => {
  let tempDir;
  let originalCwd;
  let originalApiKey;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wiggumizer-loop-test-'));
    originalCwd = process.cwd();
    originalApiKey = process.env.ANTHROPIC_API_KEY;

    // Set a fake API key for testing
    process.env.ANTHROPIC_API_KEY = 'test-api-key-for-unit-tests';

    process.chdir(tempDir);

    // Create a simple test file
    fs.writeFileSync(path.join(tempDir, 'test.js'), 'console.log("test");');
  });

  afterEach(() => {
    process.chdir(originalCwd);

    // Restore original API key
    if (originalApiKey) {
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }

    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('WorkspaceManager method availability', () => {
    it('should have getWorkspaces method', () => {
      const manager = new WorkspaceManager();
      assert.strictEqual(typeof manager.getWorkspaces, 'function');

      const result = manager.getWorkspaces();
      assert.ok(Array.isArray(result));
    });

    it('should have isMultiRepo method', () => {
      const manager = new WorkspaceManager();
      assert.strictEqual(typeof manager.isMultiRepo, 'function');

      const result = manager.isMultiRepo();
      assert.strictEqual(typeof result, 'boolean');
    });

    it('should have getCodebaseContext method', () => {
      const manager = new WorkspaceManager();
      assert.strictEqual(typeof manager.getCodebaseContext, 'function');

      const context = manager.getCodebaseContext();
      assert.ok(context);
      assert.ok('files' in context);
      assert.ok('isMultiRepo' in context);
    });

    it('should have applyChanges method', () => {
      const manager = new WorkspaceManager();
      assert.strictEqual(typeof manager.applyChanges, 'function');

      // Test basic invocation
      const result = manager.applyChanges('no changes', () => ({ count: 0, files: [] }));
      assert.ok(result);
      assert.strictEqual(result.count, 0);
    });
  });

  describe('RalphLoop instantiation', () => {
    it('should create loop with WorkspaceManager that has all required methods', () => {
      const loop = new RalphLoop({
        prompt: 'test prompt',
        provider: 'claude',
        apiKey: 'test-key',
        maxIterations: 1
      });

      // Verify WorkspaceManager is created and has required methods
      assert.ok(loop.workspaceManager);
      assert.strictEqual(typeof loop.workspaceManager.getWorkspaces, 'function');
      assert.strictEqual(typeof loop.workspaceManager.isMultiRepo, 'function');
      assert.strictEqual(typeof loop.workspaceManager.getCodebaseContext, 'function');
      assert.strictEqual(typeof loop.workspaceManager.applyChanges, 'function');
    });

    it('should call getCodebaseContext without errors', () => {
      const loop = new RalphLoop({
        prompt: 'test prompt',
        provider: 'claude',
        apiKey: 'test-key',
        maxIterations: 1
      });

      // This should not throw
      assert.doesNotThrow(() => {
        const context = loop.getCodebaseContext();
        assert.ok(context);
        assert.ok(Array.isArray(context.files));
      });
    });

    it('should handle multi-repo workspace manager', () => {
      const workspaceDir = path.join(tempDir, 'workspace1');
      fs.mkdirSync(workspaceDir);
      fs.writeFileSync(path.join(workspaceDir, 'file1.js'), 'console.log("ws1");');

      const loop = new RalphLoop({
        prompt: 'test prompt',
        provider: 'claude',
        apiKey: 'test-key',
        maxIterations: 1,
        workspaces: [
          { path: workspaceDir, name: 'Workspace1' }
        ]
      });

      // Verify multi-repo mode is detected
      assert.strictEqual(loop.workspaceManager.isMultiRepo(), true);

      const workspaces = loop.workspaceManager.getWorkspaces();
      assert.strictEqual(workspaces.length, 1);
      assert.strictEqual(workspaces[0].name, 'Workspace1');
    });
  });

  describe('Method signatures match usage in loop.js', () => {
    it('getWorkspaces should return array that can be iterated', () => {
      const loop = new RalphLoop({
        prompt: 'test',
        provider: 'claude',
        apiKey: 'test-key',
        maxIterations: 1,
        workspaces: [{ path: tempDir, name: 'Test' }]
      });

      const workspaces = loop.workspaceManager.getWorkspaces();

      // Verify it can be used as in loop.js:76-79
      assert.ok(Array.isArray(workspaces));
      assert.strictEqual(workspaces.length, 1);

      // Verify properties exist as used in loop
      for (const ws of workspaces) {
        assert.ok(ws.name || ws.path);
        assert.ok(ws.path);
      }
    });

    it('isMultiRepo should work as boolean check', () => {
      const loop = new RalphLoop({
        prompt: 'test',
        provider: 'claude',
        apiKey: 'test-key',
        maxIterations: 1,
        workspaces: [{ path: tempDir, name: 'Test' }]
      });

      // Verify it can be used as in loop.js:75
      if (loop.workspaceManager.isMultiRepo()) {
        assert.ok(true, 'isMultiRepo should return truthy value');
      } else {
        assert.fail('isMultiRepo should return true for workspaces');
      }
    });

    it('getCodebaseContext should return object with expected structure', () => {
      const loop = new RalphLoop({
        prompt: 'test',
        provider: 'claude',
        apiKey: 'test-key',
        maxIterations: 1
      });

      const context = loop.workspaceManager.getCodebaseContext();

      // Verify structure as used in loop.js
      assert.ok(context);
      assert.ok(Array.isArray(context.files));
      assert.strictEqual(typeof context.isMultiRepo, 'boolean');

      // Verify files can be reduced as in loop.js:355
      const totalSize = context.files.reduce((sum, f) => sum + (f.content?.length || 0), 0);
      assert.strictEqual(typeof totalSize, 'number');
    });

    it('applyChanges should accept callback and return count/files', () => {
      const loop = new RalphLoop({
        prompt: 'test',
        provider: 'claude',
        apiKey: 'test-key',
        maxIterations: 1
      });

      const changesText = `## File: test.js
\`\`\`javascript
console.log("changed");
\`\`\``;

      // Verify signature as used in loop.js:370
      const result = loop.workspaceManager.applyChanges(changesText, (workspace, changes) => {
        assert.ok(workspace);
        assert.ok(Array.isArray(changes));
        return { count: changes.length, files: changes.map(c => c.filePath) };
      });

      assert.ok(result);
      assert.strictEqual(typeof result.count, 'number');
      assert.ok(Array.isArray(result.files));
    });
  });
});
