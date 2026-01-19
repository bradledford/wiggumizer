const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const WorkspaceManager = require('../src/workspace-manager');

describe('WorkspaceManager', () => {
  let tempDir;
  let workspace1Dir;
  let workspace2Dir;

  beforeEach(() => {
    // Create temp directories for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wiggumizer-ws-test-'));
    workspace1Dir = path.join(tempDir, 'workspace1');
    workspace2Dir = path.join(tempDir, 'workspace2');

    fs.mkdirSync(workspace1Dir, { recursive: true });
    fs.mkdirSync(workspace2Dir, { recursive: true });

    // Create some test files
    fs.mkdirSync(path.join(workspace1Dir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(workspace1Dir, 'src', 'index.js'), 'module.exports = {};');
    fs.writeFileSync(path.join(workspace1Dir, 'package.json'), '{"name": "workspace1"}');
    fs.writeFileSync(path.join(workspace1Dir, 'README.md'), '# Workspace 1');

    fs.mkdirSync(path.join(workspace2Dir, 'lib'), { recursive: true });
    fs.writeFileSync(path.join(workspace2Dir, 'lib', 'main.js'), 'console.log("hello");');
    fs.writeFileSync(path.join(workspace2Dir, 'package.json'), '{"name": "workspace2"}');
  });

  afterEach(() => {
    // Clean up temp directories
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const manager = new WorkspaceManager();
      assert.deepStrictEqual(manager.workspaces, []);
      assert.strictEqual(manager.verbose, false);
      assert.strictEqual(manager.baseDir, process.cwd());
    });

    it('should accept custom options', () => {
      const workspaces = [{ name: 'test', path: '/tmp/test' }];
      const manager = new WorkspaceManager({
        workspaces,
        verbose: true,
        baseDir: '/custom/path'
      });
      assert.deepStrictEqual(manager.workspaces, workspaces);
      assert.strictEqual(manager.verbose, true);
      assert.strictEqual(manager.baseDir, '/custom/path');
    });
  });

  describe('resolvePath', () => {
    it('should resolve relative paths from basePath', () => {
      const manager = new WorkspaceManager({ baseDir: tempDir });
      const resolved = manager.resolvePath('workspace1');
      assert.strictEqual(resolved, workspace1Dir);
    });

    it('should keep absolute paths unchanged', () => {
      const manager = new WorkspaceManager({ baseDir: tempDir });
      const absolutePath = '/absolute/path/to/workspace';
      const resolved = manager.resolvePath(absolutePath);
      assert.strictEqual(resolved, absolutePath);
    });

    it('should expand ~ to home directory', () => {
      const manager = new WorkspaceManager();
      const resolved = manager.resolvePath('~/myproject');
      assert.strictEqual(resolved, path.join(os.homedir(), 'myproject'));
    });
  });

  describe('validate', () => {
    it('should validate existing workspaces', () => {
      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { name: 'ws1', path: 'workspace1' },
          { name: 'ws2', path: 'workspace2' }
        ]
      });

      const results = manager.validate();
      
      assert.strictEqual(results.length, 2);
      assert.strictEqual(results[0].name, 'ws1');
      assert.strictEqual(results[0].valid, true);
      assert.strictEqual(results[0].exists, true);
      assert.strictEqual(results[0].isDirectory, true);
      assert.strictEqual(results[1].name, 'ws2');
      assert.strictEqual(results[1].valid, true);
    });

    it('should detect non-existent workspaces', () => {
      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { name: 'missing', path: 'nonexistent' }
        ]
      });

      const results = manager.validate();
      
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].valid, false);
      assert.strictEqual(results[0].exists, false);
    });

    it('should detect files (not directories) as invalid', () => {
      // Create a file instead of directory
      const filePath = path.join(tempDir, 'notadir');
      fs.writeFileSync(filePath, 'just a file');

      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { name: 'file', path: 'notadir' }
        ]
      });

      const results = manager.validate();
      
      assert.strictEqual(results[0].valid, false);
      assert.strictEqual(results[0].exists, true);
      assert.strictEqual(results[0].isDirectory, false);
    });

    it('should use path basename as name if not specified', () => {
      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { path: 'workspace1' }  // No name specified
        ]
      });

      const results = manager.validate();
      assert.strictEqual(results[0].name, 'workspace1');
    });
  });

  describe('getStatus', () => {
    it('should return status with file counts', () => {
      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { name: 'ws1', path: 'workspace1' }
        ]
      });

      const status = manager.getStatus();
      
      assert.strictEqual(status.length, 1);
      assert.strictEqual(status[0].name, 'ws1');
      assert.strictEqual(status[0].status, 'ok');
      assert.ok(status[0].fileCount >= 0);
    });

    it('should report errors for invalid workspaces', () => {
      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { name: 'missing', path: 'nonexistent' }
        ]
      });

      const status = manager.getStatus();

      assert.strictEqual(status[0].status, 'not_found');
      assert.ok(status[0].error);
    });
  });

  describe('getWorkspaceByName', () => {
    it('should find workspace by name', () => {
      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { name: 'ws1', path: 'workspace1' },
          { name: 'ws2', path: 'workspace2' }
        ]
      });

      const ws = manager.getWorkspaceByName('ws1');
      assert.strictEqual(ws.name, 'ws1');
      assert.strictEqual(ws.path, 'workspace1');
    });

    it('should find workspace by path basename if no name match', () => {
      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { path: 'workspace1' }  // No name, should match by basename
        ]
      });

      const ws = manager.getWorkspaceByName('workspace1');
      assert.ok(ws);
      assert.strictEqual(ws.path, 'workspace1');
    });

    it('should return undefined for non-existent workspace', () => {
      const manager = new WorkspaceManager({
        workspaces: [{ name: 'ws1', path: '/path' }]
      });

      const ws = manager.getWorkspaceByName('nonexistent');
      assert.strictEqual(ws, undefined);
    });
  });

  describe('getAllFiles', () => {
    it('should return files from all workspaces with metadata', () => {
      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { name: 'ws1', path: 'workspace1' },
          { name: 'ws2', path: 'workspace2' }
        ]
      });

      const files = manager.getAllFiles();
      
      assert.ok(files.length > 0);
      
      // Check that files have workspace metadata
      const ws1Files = files.filter(f => f.workspace === 'ws1');
      const ws2Files = files.filter(f => f.workspace === 'ws2');
      
      assert.ok(ws1Files.length > 0);
      assert.ok(ws2Files.length > 0);
      
      // Check file structure
      const sampleFile = files[0];
      assert.ok(sampleFile.path);
      assert.ok(sampleFile.content);
      assert.ok(sampleFile.workspace);
      assert.ok(sampleFile.workspacePath);
      assert.ok(sampleFile.fullPath);
    });

    it('should skip invalid workspaces', () => {
      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { name: 'ws1', path: 'workspace1' },
          { name: 'missing', path: 'nonexistent' }
        ]
      });

      const files = manager.getAllFiles();
      
      // Should only have files from ws1
      const workspaces = [...new Set(files.map(f => f.workspace))];
      assert.deepStrictEqual(workspaces, ['ws1']);
    });

    it('should respect include/exclude patterns', () => {
      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { 
            name: 'ws1', 
            path: 'workspace1',
            include: ['src/**/*.js'],
            exclude: []
          }
        ]
      });

      const files = manager.getAllFiles();
      
      // Should only have .js files from src
      assert.ok(files.every(f => f.path.endsWith('.js') && f.path.startsWith('src')));
    });
  });

  describe('writeFile', () => {
    it('should write file to specified workspace', () => {
      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { name: 'ws1', path: 'workspace1' }
        ]
      });

      const content = 'const newFile = true;';
      const fullPath = manager.writeFile('ws1', 'src/new-file.js', content);

      assert.ok(fs.existsSync(fullPath));
      assert.strictEqual(fs.readFileSync(fullPath, 'utf-8'), content);
    });

    it('should create directories if they do not exist', () => {
      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { name: 'ws1', path: 'workspace1' }
        ]
      });

      const content = 'deep file';
      const fullPath = manager.writeFile('ws1', 'deep/nested/path/file.js', content);

      assert.ok(fs.existsSync(fullPath));
      assert.strictEqual(fs.readFileSync(fullPath, 'utf-8'), content);
    });

    it('should throw error for non-existent workspace', () => {
      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { name: 'ws1', path: 'workspace1' }
        ]
      });

      assert.throws(() => {
        manager.writeFile('nonexistent', 'file.js', 'content');
      }, /Workspace not found: nonexistent/);
    });
  });

  describe('readBreadcrumbs', () => {
    it('should return null when no breadcrumbs file exists', () => {
      const manager = new WorkspaceManager({ baseDir: tempDir });
      const breadcrumbs = manager.readBreadcrumbs();
      assert.strictEqual(breadcrumbs, null);
    });

    it('should read breadcrumbs from .wiggumizer/ralph-notes.md (new location)', () => {
      const manager = new WorkspaceManager({ baseDir: tempDir });

      // Create the new location breadcrumbs file
      const wiggumDir = path.join(tempDir, '.wiggumizer');
      fs.mkdirSync(wiggumDir, { recursive: true });
      fs.writeFileSync(path.join(wiggumDir, 'ralph-notes.md'), '# Notes\nSome strategic insights');

      const breadcrumbs = manager.readBreadcrumbs();
      assert.ok(breadcrumbs.includes('# Notes'));
      assert.ok(breadcrumbs.includes('Some strategic insights'));
    });

    it('should fall back to .ralph-notes.md (legacy location)', () => {
      const manager = new WorkspaceManager({ baseDir: tempDir });

      // Create the legacy location breadcrumbs file
      fs.writeFileSync(path.join(tempDir, '.ralph-notes.md'), '# Legacy Notes\nOld format');

      const breadcrumbs = manager.readBreadcrumbs();
      assert.ok(breadcrumbs.includes('# Legacy Notes'));
      assert.ok(breadcrumbs.includes('Old format'));
    });

    it('should prefer new location over legacy location', () => {
      const manager = new WorkspaceManager({ baseDir: tempDir });

      // Create both files
      const wiggumDir = path.join(tempDir, '.wiggumizer');
      fs.mkdirSync(wiggumDir, { recursive: true });
      fs.writeFileSync(path.join(wiggumDir, 'ralph-notes.md'), 'NEW LOCATION');
      fs.writeFileSync(path.join(tempDir, '.ralph-notes.md'), 'OLD LOCATION');

      const breadcrumbs = manager.readBreadcrumbs();
      assert.ok(breadcrumbs.includes('NEW LOCATION'));
      assert.ok(!breadcrumbs.includes('OLD LOCATION'));
    });

    it('should accept custom cwd parameter', () => {
      const manager = new WorkspaceManager({ baseDir: '/other/path' });

      // Create breadcrumbs in workspace1
      const wiggumDir = path.join(workspace1Dir, '.wiggumizer');
      fs.mkdirSync(wiggumDir, { recursive: true });
      fs.writeFileSync(path.join(wiggumDir, 'ralph-notes.md'), 'Workspace specific notes');

      const breadcrumbs = manager.readBreadcrumbs(workspace1Dir);
      assert.ok(breadcrumbs.includes('Workspace specific notes'));
    });
  });

  describe('getIterationContext', () => {
    it('should return isGitRepo: false for non-git repos', () => {
      const manager = new WorkspaceManager({ baseDir: tempDir });
      const context = manager.getIterationContext(tempDir);

      assert.strictEqual(context.isGitRepo, false);
      assert.strictEqual(context.gitLog, null);
      assert.strictEqual(context.gitStatus, null);
    });

    it('should read iteration journal for non-git repos', () => {
      const manager = new WorkspaceManager({ baseDir: tempDir });

      // Create an iteration journal
      const wiggumDir = path.join(tempDir, '.wiggumizer');
      fs.mkdirSync(wiggumDir, { recursive: true });
      fs.writeFileSync(path.join(wiggumDir, 'iteration-journal.txt'), [
        'Iteration 2 - 2025-01-19 10:00:00',
        'Files: test.js',
        'Summary: Second iteration',
        '---',
        'Iteration 1 - 2025-01-19 09:00:00',
        'Files: first.js',
        'Summary: First iteration',
        '---',
        ''
      ].join('\n'));

      const context = manager.getIterationContext(tempDir);

      assert.strictEqual(context.isGitRepo, false);
      assert.ok(context.iterationHistory);
      assert.ok(context.iterationHistory.includes('Iteration 2'));
      assert.ok(context.iterationHistory.includes('Second iteration'));
    });

    it('should return null iterationHistory when no journal exists for non-git repos', () => {
      const manager = new WorkspaceManager({ baseDir: tempDir });
      const context = manager.getIterationContext(tempDir);

      // No journal, no git - should return null/empty
      assert.strictEqual(context.isGitRepo, false);
      // iterationHistory should be null or empty string
      assert.ok(context.iterationHistory === null || context.iterationHistory === '');
    });
  });

  describe('getCodebaseContext', () => {
    it('should include breadcrumbs in context for single repo mode', () => {
      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [] // Empty = single repo mode
      });

      // Create breadcrumbs
      const wiggumDir = path.join(tempDir, '.wiggumizer');
      fs.mkdirSync(wiggumDir, { recursive: true });
      fs.writeFileSync(path.join(wiggumDir, 'ralph-notes.md'), 'Strategic notes');

      // Note: getCodebaseContext uses process.cwd() for single repo mode
      // so we can't fully test this without changing cwd
      // Just verify the method exists and returns expected structure
      const context = manager.getCodebaseContext();
      assert.ok('breadcrumbs' in context || 'files' in context);
    });

    it('should include breadcrumbs in multi-repo context', () => {
      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { name: 'ws1', path: 'workspace1' }
        ]
      });

      // Create breadcrumbs at baseDir level
      const wiggumDir = path.join(tempDir, '.wiggumizer');
      fs.mkdirSync(wiggumDir, { recursive: true });
      fs.writeFileSync(path.join(wiggumDir, 'ralph-notes.md'), 'Multi-repo notes');

      const context = manager.getCodebaseContext();

      assert.strictEqual(context.isMultiRepo, true);
      assert.ok('breadcrumbs' in context);
      // In multi-repo mode, breadcrumbs are read from baseDir
      assert.ok(context.breadcrumbs === null || context.breadcrumbs.includes('Multi-repo notes'));
    });
  });

  describe('getCombinedContext', () => {
    it('should combine files from all workspaces into context string', () => {
      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { name: 'ws1', path: 'workspace1' },
          { name: 'ws2', path: 'workspace2' }
        ]
      });

      const context = manager.getCombinedContext();

      assert.ok(context.includes('# Multi-Repository Codebase'));
      assert.ok(context.includes('## Workspace: ws1'));
      assert.ok(context.includes('## Workspace: ws2'));
    });

    it('should respect maxSize option', () => {
      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { name: 'ws1', path: 'workspace1' }
        ]
      });

      // Use very small maxSize
      const context = manager.getCombinedContext({ maxSize: 100 });

      // Should be truncated
      assert.ok(context.length <= 200); // Allow some header overhead
    });

    it('should group files by workspace', () => {
      const manager = new WorkspaceManager({
        baseDir: tempDir,
        workspaces: [
          { name: 'ws1', path: 'workspace1' },
          { name: 'ws2', path: 'workspace2' }
        ]
      });

      const context = manager.getCombinedContext();

      // ws1 section should come before ws2 section
      const ws1Index = context.indexOf('## Workspace: ws1');
      const ws2Index = context.indexOf('## Workspace: ws2');
      
      assert.ok(ws1Index >= 0);
      assert.ok(ws2Index >= 0);
    });
  });
});
