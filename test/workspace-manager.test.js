const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Import the module to test
const WorkspaceManager = require('../src/workspace-manager');

describe('WorkspaceManager', () => {
  let tempDir;
  let originalCwd;

  beforeEach(() => {
    // Create temp directory for test workspaces
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wiggumizer-workspace-test-'));
    originalCwd = process.cwd();
  });

  afterEach(() => {
    // Clean up temp directory
    process.chdir(originalCwd);
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create with default options', () => {
      const manager = new WorkspaceManager();
      
      assert.deepStrictEqual(manager.workspaces, []);
      assert.strictEqual(manager.baseDir, process.cwd());
      assert.strictEqual(manager.verbose, false);
    });

    it('should accept custom options', () => {
      const workspaces = [{ path: '/some/path', name: 'test' }];
      const manager = new WorkspaceManager({
        workspaces,
        baseDir: '/custom/base',
        verbose: true
      });
      
      assert.deepStrictEqual(manager.workspaces, workspaces);
      assert.strictEqual(manager.baseDir, '/custom/base');
      assert.strictEqual(manager.verbose, true);
    });
  });

  describe('fromConfig', () => {
    it('should return null if config has no workspaces', () => {
      const result = WorkspaceManager.fromConfig({});
      assert.strictEqual(result, null);
    });

    it('should return null if workspaces is not an array', () => {
      const result = WorkspaceManager.fromConfig({ workspaces: 'not-array' });
      assert.strictEqual(result, null);
    });

    it('should create manager from valid config', () => {
      const config = {
        workspaces: [
          { path: './repo1', name: 'Repo 1' },
          { path: './repo2', name: 'Repo 2' }
        ],
        verbose: true
      };
      
      const manager = WorkspaceManager.fromConfig(config);
      
      assert.ok(manager instanceof WorkspaceManager);
      assert.strictEqual(manager.workspaces.length, 2);
      assert.strictEqual(manager.verbose, true);
    });
  });

  describe('resolvePath', () => {
    it('should return absolute paths unchanged', () => {
      const manager = new WorkspaceManager({ baseDir: '/base/dir' });
      const result = manager.resolvePath('/absolute/path');
      
      assert.strictEqual(result, '/absolute/path');
    });

    it('should resolve relative paths against baseDir', () => {
      const manager = new WorkspaceManager({ baseDir: '/base/dir' });
      const result = manager.resolvePath('./relative/path');
      
      assert.strictEqual(result, path.resolve('/base/dir', './relative/path'));
    });

    it('should handle paths without leading ./', () => {
      const manager = new WorkspaceManager({ baseDir: '/base/dir' });
      const result = manager.resolvePath('simple/path');
      
      assert.strictEqual(result, path.resolve('/base/dir', 'simple/path'));
    });
  });

  describe('validate', () => {
    it('should validate existing workspace paths', () => {
      // Create test workspace directories
      const workspace1 = path.join(tempDir, 'workspace1');
      const workspace2 = path.join(tempDir, 'workspace2');
      fs.mkdirSync(workspace1);
      fs.mkdirSync(workspace2);

      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { path: 'workspace1', name: 'WS1' },
          { path: 'workspace2', name: 'WS2' }
        ]
      });

      const results = manager.validate();
      
      assert.strictEqual(results.length, 2);
      assert.strictEqual(results[0].name, 'WS1');
      assert.strictEqual(results[0].valid, true);
      assert.strictEqual(results[0].exists, true);
      assert.strictEqual(results[0].isDirectory, true);
      assert.strictEqual(results[1].name, 'WS2');
      assert.strictEqual(results[1].valid, true);
    });

    it('should detect non-existent workspace paths', () => {
      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { path: 'nonexistent', name: 'Missing' }
        ]
      });

      const results = manager.validate();
      
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].name, 'Missing');
      assert.strictEqual(results[0].valid, false);
      assert.strictEqual(results[0].exists, false);
    });

    it('should detect file paths (not directories)', () => {
      // Create a file instead of directory
      const filePath = path.join(tempDir, 'afile.txt');
      fs.writeFileSync(filePath, 'content');

      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { path: 'afile.txt', name: 'File' }
        ]
      });

      const results = manager.validate();
      
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].valid, false);
      assert.strictEqual(results[0].exists, true);
      assert.strictEqual(results[0].isDirectory, false);
    });

    it('should use path as name if name not provided', () => {
      const workspace = path.join(tempDir, 'myworkspace');
      fs.mkdirSync(workspace);

      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { path: 'myworkspace' } // No name provided
        ]
      });

      const results = manager.validate();
      
      assert.strictEqual(results[0].name, 'myworkspace');
    });
  });

  describe('getValidWorkspaces', () => {
    it('should return only valid workspaces', () => {
      const workspace1 = path.join(tempDir, 'valid1');
      const workspace2 = path.join(tempDir, 'valid2');
      fs.mkdirSync(workspace1);
      fs.mkdirSync(workspace2);

      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { path: 'valid1', name: 'Valid1' },
          { path: 'invalid', name: 'Invalid' },
          { path: 'valid2', name: 'Valid2' }
        ]
      });

      const valid = manager.getValidWorkspaces();
      
      assert.strictEqual(valid.length, 2);
      assert.strictEqual(valid[0].name, 'Valid1');
      assert.strictEqual(valid[1].name, 'Valid2');
    });

    it('should return empty array if no valid workspaces', () => {
      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { path: 'nonexistent1' },
          { path: 'nonexistent2' }
        ]
      });

      const valid = manager.getValidWorkspaces();
      
      assert.strictEqual(valid.length, 0);
    });
  });

  describe('getStatus', () => {
    it('should return status for valid workspaces', () => {
      const workspace = path.join(tempDir, 'statustest');
      fs.mkdirSync(workspace);
      fs.writeFileSync(path.join(workspace, 'test.js'), 'console.log("test");');

      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { path: 'statustest', name: 'StatusTest' }
        ]
      });

      const status = manager.getStatus();
      
      assert.strictEqual(status.length, 1);
      assert.strictEqual(status[0].name, 'StatusTest');
      assert.strictEqual(status[0].status, 'ok');
      assert.strictEqual(status[0].isGitRepo, false);
      assert.strictEqual(status[0].hasPrompt, false);
      assert.ok(typeof status[0].fileCount === 'number');
    });

    it('should detect PROMPT.md presence', () => {
      const workspace = path.join(tempDir, 'withprompt');
      fs.mkdirSync(workspace);
      fs.writeFileSync(path.join(workspace, 'PROMPT.md'), '# Test prompt');

      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { path: 'withprompt', name: 'WithPrompt' }
        ]
      });

      const status = manager.getStatus();
      
      assert.strictEqual(status[0].hasPrompt, true);
    });

    it('should return not_found status for missing paths', () => {
      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { path: 'doesnotexist', name: 'Missing' }
        ]
      });

      const status = manager.getStatus();
      
      assert.strictEqual(status.length, 1);
      assert.strictEqual(status[0].status, 'not_found');
      assert.ok(status[0].error.includes('exist'));
    });
  });

  describe('getAllFiles', () => {
    it('should get files from all workspaces', () => {
      // Create two workspaces with files
      const ws1 = path.join(tempDir, 'ws1');
      const ws2 = path.join(tempDir, 'ws2');
      fs.mkdirSync(ws1);
      fs.mkdirSync(ws2);
      fs.writeFileSync(path.join(ws1, 'file1.js'), 'const a = 1;');
      fs.writeFileSync(path.join(ws2, 'file2.js'), 'const b = 2;');

      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { path: 'ws1', name: 'Workspace1' },
          { path: 'ws2', name: 'Workspace2' }
        ]
      });

      const files = manager.getAllFiles();
      
      assert.strictEqual(files.length, 2);
      
      const ws1File = files.find(f => f.workspace === 'Workspace1');
      const ws2File = files.find(f => f.workspace === 'Workspace2');
      
      assert.ok(ws1File);
      assert.strictEqual(ws1File.path, 'file1.js');
      assert.strictEqual(ws1File.content, 'const a = 1;');
      
      assert.ok(ws2File);
      assert.strictEqual(ws2File.path, 'file2.js');
      assert.strictEqual(ws2File.content, 'const b = 2;');
    });

    it('should skip non-existent workspaces', () => {
      const ws1 = path.join(tempDir, 'existing');
      fs.mkdirSync(ws1);
      fs.writeFileSync(path.join(ws1, 'file.js'), 'code');

      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { path: 'existing', name: 'Existing' },
          { path: 'nonexistent', name: 'Missing' }
        ]
      });

      const files = manager.getAllFiles();
      
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0].workspace, 'Existing');
    });

    it('should include full path and workspace path', () => {
      const ws = path.join(tempDir, 'fullpath');
      fs.mkdirSync(ws);
      fs.writeFileSync(path.join(ws, 'test.js'), 'test');

      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { path: 'fullpath', name: 'FullPath' }
        ]
      });

      const files = manager.getAllFiles();
      
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0].workspacePath, ws);
      assert.strictEqual(files[0].fullPath, path.join(ws, 'test.js'));
    });

    it('should respect workspace-specific include/exclude patterns', () => {
      const ws = path.join(tempDir, 'patterns');
      fs.mkdirSync(ws);
      fs.writeFileSync(path.join(ws, 'include.js'), 'include');
      fs.writeFileSync(path.join(ws, 'exclude.test.js'), 'exclude');

      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { 
            path: 'patterns', 
            name: 'Patterns',
            include: ['**/*.js'],
            exclude: ['**/*.test.js']
          }
        ]
      });

      const files = manager.getAllFiles();
      
      // Should include .js but exclude .test.js
      const jsFiles = files.filter(f => f.path.endsWith('.js'));
      const testFiles = files.filter(f => f.path.includes('.test.'));
      
      assert.ok(jsFiles.length >= 1);
      assert.strictEqual(testFiles.length, 0);
    });
  });

  describe('writeFile', () => {
    it('should write file to specified workspace', () => {
      const ws = path.join(tempDir, 'writews');
      fs.mkdirSync(ws);

      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { path: 'writews', name: 'WriteWS' }
        ]
      });

      const result = manager.writeFile('WriteWS', 'newfile.js', 'const x = 1;');
      
      assert.strictEqual(result, path.join(ws, 'newfile.js'));
      assert.ok(fs.existsSync(result));
      assert.strictEqual(fs.readFileSync(result, 'utf-8'), 'const x = 1;');
    });

    it('should create nested directories if needed', () => {
      const ws = path.join(tempDir, 'nestedws');
      fs.mkdirSync(ws);

      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { path: 'nestedws', name: 'NestedWS' }
        ]
      });

      const result = manager.writeFile('NestedWS', 'deep/nested/file.js', 'code');
      
      assert.ok(fs.existsSync(result));
      assert.strictEqual(fs.readFileSync(result, 'utf-8'), 'code');
    });

    it('should throw error for unknown workspace', () => {
      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { path: 'known', name: 'Known' }
        ]
      });

      assert.throws(() => {
        manager.writeFile('Unknown', 'file.js', 'content');
      }, /Workspace not found/);
    });

    it('should find workspace by path if name not provided', () => {
      const ws = path.join(tempDir, 'bypath');
      fs.mkdirSync(ws);

      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { path: 'bypath' } // No name, should use path
        ]
      });

      const result = manager.writeFile('bypath', 'file.js', 'content');
      
      assert.ok(fs.existsSync(result));
    });
  });

  describe('displayStatus', () => {
    it('should not throw when displaying status', () => {
      const ws = path.join(tempDir, 'displayws');
      fs.mkdirSync(ws);
      fs.writeFileSync(path.join(ws, 'test.js'), 'code');

      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { path: 'displayws', name: 'DisplayWS' },
          { path: 'missing', name: 'Missing' }
        ]
      });

      // Should not throw
      assert.doesNotThrow(() => {
        // Capture console output to prevent noise in test output
        const originalLog = console.log;
        console.log = () => {};
        try {
          manager.displayStatus();
        } finally {
          console.log = originalLog;
        }
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty workspaces array', () => {
      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: []
      });

      assert.deepStrictEqual(manager.validate(), []);
      assert.deepStrictEqual(manager.getValidWorkspaces(), []);
      assert.deepStrictEqual(manager.getStatus(), []);
      assert.deepStrictEqual(manager.getAllFiles(), []);
    });

    it('should handle workspace with special characters in name', () => {
      const ws = path.join(tempDir, 'special-ws_123');
      fs.mkdirSync(ws);

      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { path: 'special-ws_123', name: 'Special WS #1 (test)' }
        ]
      });

      const results = manager.validate();
      
      assert.strictEqual(results[0].name, 'Special WS #1 (test)');
      assert.strictEqual(results[0].valid, true);
    });

    it('should handle deeply nested workspace paths', () => {
      const deepPath = path.join(tempDir, 'level1', 'level2', 'level3');
      fs.mkdirSync(deepPath, { recursive: true });

      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { path: 'level1/level2/level3', name: 'Deep' }
        ]
      });

      const results = manager.validate();
      
      assert.strictEqual(results[0].valid, true);
    });
  });

  describe('getWorkspaces', () => {
    it('should return all workspaces', () => {
      const workspaces = [
        { path: '/path1', name: 'Workspace1' },
        { path: '/path2', name: 'Workspace2' }
      ];
      const manager = new WorkspaceManager({ workspaces });

      const result = manager.getWorkspaces();

      assert.deepStrictEqual(result, workspaces);
    });

    it('should return empty array if no workspaces', () => {
      const manager = new WorkspaceManager();

      const result = manager.getWorkspaces();

      assert.deepStrictEqual(result, []);
    });
  });

  describe('isMultiRepo', () => {
    it('should return true if workspaces exist', () => {
      const manager = new WorkspaceManager({
        workspaces: [{ path: '/path1' }]
      });

      assert.strictEqual(manager.isMultiRepo(), true);
    });

    it('should return false if no workspaces', () => {
      const manager = new WorkspaceManager();

      assert.strictEqual(manager.isMultiRepo(), false);
    });

    it('should return false if workspaces array is empty', () => {
      const manager = new WorkspaceManager({ workspaces: [] });

      assert.strictEqual(manager.isMultiRepo(), false);
    });
  });

  describe('getCodebaseContext', () => {
    it('should return single-repo context when no workspaces', () => {
      const manager = new WorkspaceManager();

      const context = manager.getCodebaseContext();

      assert.strictEqual(context.isMultiRepo, false);
      assert.ok(Array.isArray(context.files));
      assert.ok(context.cwd);
    });

    it('should return multi-repo context when workspaces exist', () => {
      const workspace1 = path.join(tempDir, 'ws1');
      const workspace2 = path.join(tempDir, 'ws2');

      fs.mkdirSync(workspace1);
      fs.mkdirSync(workspace2);

      // Create test files
      fs.writeFileSync(path.join(workspace1, 'test1.js'), 'console.log("test1");');
      fs.writeFileSync(path.join(workspace2, 'test2.js'), 'console.log("test2");');

      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { path: 'ws1', name: 'Workspace1' },
          { path: 'ws2', name: 'Workspace2' }
        ]
      });

      const context = manager.getCodebaseContext();

      assert.strictEqual(context.isMultiRepo, true);
      assert.ok(Array.isArray(context.files));
      assert.ok(Array.isArray(context.workspaces));
      assert.strictEqual(context.workspaces.length, 2);
    });
  });

  describe('applyChanges', () => {
    it('should parse and apply changes for single repo', () => {
      const manager = new WorkspaceManager();
      const changesText = `## File: test.js
\`\`\`javascript
console.log("hello");
\`\`\``;

      let callbackCalled = false;
      const callback = (_workspace, changes) => {
        callbackCalled = true;
        assert.strictEqual(changes.length, 1);
        assert.strictEqual(changes[0].filePath, 'test.js');
        assert.strictEqual(changes[0].fileContent, 'console.log("hello");\n');
        return { count: 1, files: ['test.js'] };
      };

      const result = manager.applyChanges(changesText, callback);

      assert.strictEqual(callbackCalled, true);
      assert.strictEqual(result.count, 1);
      assert.deepStrictEqual(result.files, ['test.js']);
    });

    it('should parse and apply changes for multi-repo with workspace prefix', () => {
      const manager = new WorkspaceManager({
        workspaces: [
          { path: '/path1', name: 'Workspace1' },
          { path: '/path2', name: 'Workspace2' }
        ]
      });

      const changesText = `## File: [Workspace1] test1.js
\`\`\`javascript
console.log("ws1");
\`\`\`

## File: [Workspace2] test2.js
\`\`\`javascript
console.log("ws2");
\`\`\``;

      const callbackResults = [];
      const callback = (workspace, changes) => {
        callbackResults.push({ workspace, changes });
        return { count: changes.length, files: changes.map(c => c.filePath) };
      };

      const result = manager.applyChanges(changesText, callback);

      assert.strictEqual(callbackResults.length, 2);
      assert.strictEqual(result.count, 2);
      assert.strictEqual(result.files.length, 2);
    });

    it('should skip files without workspace prefix in multi-repo mode', () => {
      const manager = new WorkspaceManager({
        workspaces: [{ path: '/path1', name: 'Workspace1' }]
      });

      const changesText = `## File: test.js
\`\`\`javascript
console.log("no prefix");
\`\`\``;

      const callback = () => {
        assert.fail('Callback should not be called for invalid files');
      };

      const result = manager.applyChanges(changesText, callback);

      assert.strictEqual(result.count, 0);
      assert.strictEqual(result.files.length, 0);
    });

    it('should handle multiple files in same workspace', () => {
      const manager = new WorkspaceManager({
        workspaces: [{ path: '/path1', name: 'Workspace1' }]
      });

      const changesText = `## File: [Workspace1] file1.js
\`\`\`javascript
console.log("1");
\`\`\`

## File: [Workspace1] file2.js
\`\`\`javascript
console.log("2");
\`\`\``;

      let callbackCount = 0;
      const callback = (_workspace, changes) => {
        callbackCount++;
        assert.strictEqual(changes.length, 2);
        return { count: changes.length, files: changes.map(c => c.filePath) };
      };

      const result = manager.applyChanges(changesText, callback);

      assert.strictEqual(callbackCount, 1); // Only called once for the workspace
      assert.strictEqual(result.count, 2);
    });
  });
});
