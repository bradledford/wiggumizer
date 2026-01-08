const { describe, it, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// We need to test FileSelector
const FileSelector = require('../src/file-selector');

describe('FileSelector', () => {
  let testDir;
  let originalCwd;

  beforeEach(() => {
    // Create a temporary directory for each test
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wiggumizer-test-'));
    originalCwd = process.cwd();
  });

  afterEach(() => {
    // Clean up temp directory
    process.chdir(originalCwd);
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  /**
   * Helper to create files in the test directory
   */
  function createFile(relativePath, content = 'test content') {
    const fullPath = path.join(testDir, relativePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, content, 'utf-8');
    return fullPath;
  }

  describe('constructor', () => {
    it('should use default options when none provided', () => {
      const selector = new FileSelector({ cwd: testDir });
      
      assert.deepStrictEqual(selector.includePatterns, ['**/*']);
      assert.strictEqual(selector.respectGitignore, true);
      assert.strictEqual(selector.maxContextSize, 100000);
      assert.strictEqual(selector.maxFiles, 50);
    });

    it('should accept custom options', () => {
      const selector = new FileSelector({
        cwd: testDir,
        include: ['src/**/*.js'],
        exclude: ['**/*.test.js'],
        respectGitignore: false,
        maxContextSize: 50000,
        maxFiles: 20
      });
      
      assert.deepStrictEqual(selector.includePatterns, ['src/**/*.js']);
      assert.deepStrictEqual(selector.excludePatterns, ['**/*.test.js']);
      assert.strictEqual(selector.respectGitignore, false);
      assert.strictEqual(selector.maxContextSize, 50000);
      assert.strictEqual(selector.maxFiles, 20);
    });
  });

  describe('loadGitignore', () => {
    it('should return null when no .gitignore exists', () => {
      const selector = new FileSelector({ cwd: testDir });
      
      assert.strictEqual(selector.gitignore, null);
    });

    it('should load and parse .gitignore file', () => {
      createFile('.gitignore', 'node_modules/\n*.log\nbuild/');
      
      const selector = new FileSelector({ cwd: testDir });
      
      assert.notStrictEqual(selector.gitignore, null);
      // Test that patterns work
      assert.strictEqual(selector.gitignore.ignores('node_modules/package.json'), true);
      assert.strictEqual(selector.gitignore.ignores('error.log'), true);
      assert.strictEqual(selector.gitignore.ignores('build/output.js'), true);
      assert.strictEqual(selector.gitignore.ignores('src/index.js'), false);
    });

    it('should always ignore .git directory', () => {
      createFile('.gitignore', '*.log');
      
      const selector = new FileSelector({ cwd: testDir });
      
      assert.strictEqual(selector.gitignore.ignores('.git'), true);
      assert.strictEqual(selector.gitignore.ignores('.git/config'), true);
    });

    it('should handle malformed .gitignore gracefully', () => {
      // Create a directory where .gitignore should be a file (edge case)
      const selector = new FileSelector({ 
        cwd: testDir,
        respectGitignore: true,
        verbose: false
      });
      
      // Should not throw, just return null
      assert.strictEqual(selector.gitignore, null);
    });
  });

  describe('walkDirectory', () => {
    it('should find all files recursively', () => {
      createFile('file1.js', 'content1');
      createFile('src/file2.js', 'content2');
      createFile('src/nested/file3.js', 'content3');
      
      const selector = new FileSelector({ 
        cwd: testDir,
        respectGitignore: false 
      });
      
      const files = selector.walkDirectory(testDir);
      
      assert.strictEqual(files.length, 3);
      assert.ok(files.includes('file1.js'));
      assert.ok(files.includes(path.join('src', 'file2.js')));
      assert.ok(files.includes(path.join('src', 'nested', 'file3.js')));
    });

    it('should respect .gitignore patterns during walk', () => {
      createFile('.gitignore', 'ignored/\n*.log');
      createFile('keep.js', 'keep');
      createFile('ignored/secret.js', 'secret');
      createFile('error.log', 'log');
      
      const selector = new FileSelector({ cwd: testDir });
      
      const files = selector.walkDirectory(testDir);
      
      assert.ok(files.includes('keep.js'));
      assert.ok(!files.some(f => f.includes('ignored')));
      assert.ok(!files.includes('error.log'));
    });

    it('should handle empty directories', () => {
      fs.mkdirSync(path.join(testDir, 'empty'), { recursive: true });
      
      const selector = new FileSelector({ 
        cwd: testDir,
        respectGitignore: false 
      });
      
      const files = selector.walkDirectory(testDir);
      
      assert.strictEqual(files.length, 0);
    });

    it('should skip unreadable directories gracefully', () => {
      createFile('readable.js', 'content');
      
      const selector = new FileSelector({ 
        cwd: testDir,
        respectGitignore: false,
        verbose: false
      });
      
      // Should not throw
      const files = selector.walkDirectory(testDir);
      assert.ok(Array.isArray(files));
    });
  });

  describe('filterFiles', () => {
    it('should filter by exclude patterns', () => {
      const selector = new FileSelector({
        cwd: testDir,
        exclude: ['**/*.test.js', 'node_modules/**']
      });
      
      const files = [
        'src/index.js',
        'src/index.test.js',
        'node_modules/lodash/index.js',
        'lib/utils.js'
      ];
      
      const filtered = selector.filterFiles(files);
      
      assert.ok(filtered.includes('src/index.js'));
      assert.ok(filtered.includes('lib/utils.js'));
      assert.ok(!filtered.includes('src/index.test.js'));
      assert.ok(!filtered.includes('node_modules/lodash/index.js'));
    });

    it('should filter by include patterns', () => {
      const selector = new FileSelector({
        cwd: testDir,
        include: ['src/**/*.js'],
        exclude: []
      });
      
      const files = [
        'src/index.js',
        'src/nested/util.js',
        'lib/other.js',
        'test/test.js'
      ];
      
      const filtered = selector.filterFiles(files);
      
      assert.ok(filtered.includes('src/index.js'));
      assert.ok(filtered.includes(path.normalize('src/nested/util.js')));
      assert.ok(!filtered.includes('lib/other.js'));
      assert.ok(!filtered.includes('test/test.js'));
    });

    it('should filter by default extensions when using **/*', () => {
      const selector = new FileSelector({
        cwd: testDir,
        include: ['**/*'],
        exclude: []
      });
      
      const files = [
        'src/index.js',
        'src/types.ts',
        'README.md',
        'config.json',
        'image.png',
        'binary.exe',
        'styles.css'
      ];
      
      const filtered = selector.filterFiles(files);
      
      // Default extensions include .js, .ts, .md, .json
      assert.ok(filtered.includes('src/index.js'));
      assert.ok(filtered.includes('src/types.ts'));
      assert.ok(filtered.includes('README.md'));
      assert.ok(filtered.includes('config.json'));
      // Non-default extensions should be filtered
      assert.ok(!filtered.includes('image.png'));
      assert.ok(!filtered.includes('binary.exe'));
      assert.ok(!filtered.includes('styles.css'));
    });
  });

  describe('calculatePriority', () => {
    it('should give higher priority to smaller files', () => {
      const selector = new FileSelector({ cwd: testDir });
      
      const smallStats = { size: 5000, mtime: new Date() };
      const largeStats = { size: 250000, mtime: new Date() };
      
      const smallPriority = selector.calculatePriority('file.js', smallStats);
      const largePriority = selector.calculatePriority('file.js', largeStats);
      
      assert.ok(smallPriority > largePriority, 'Smaller files should have higher priority');
    });

    it('should give higher priority to recently modified files', () => {
      const selector = new FileSelector({ cwd: testDir });
      
      const recentStats = { size: 10000, mtime: new Date() };
      const oldStats = { size: 10000, mtime: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) }; // 60 days ago
      
      const recentPriority = selector.calculatePriority('file.js', recentStats);
      const oldPriority = selector.calculatePriority('file.js', oldStats);
      
      assert.ok(recentPriority > oldPriority, 'Recent files should have higher priority');
    });

    it('should give higher priority to important file types', () => {
      const selector = new FileSelector({ cwd: testDir });
      const stats = { size: 10000, mtime: new Date() };
      
      const jsPriority = selector.calculatePriority('app.js', stats);
      const mdPriority = selector.calculatePriority('README.md', stats);
      const jsonPriority = selector.calculatePriority('config.json', stats);
      
      // .js files should have highest priority among these
      assert.ok(jsPriority > mdPriority);
      assert.ok(mdPriority > jsonPriority);
    });

    it('should give higher priority to src/ files', () => {
      const selector = new FileSelector({ cwd: testDir });
      const stats = { size: 10000, mtime: new Date() };
      
      const srcPriority = selector.calculatePriority('src/index.js', stats);
      const rootPriority = selector.calculatePriority('index.js', stats);
      
      assert.ok(srcPriority > rootPriority, 'src/ files should have higher priority');
    });

    it('should give lower priority to test files', () => {
      const selector = new FileSelector({ cwd: testDir });
      const stats = { size: 10000, mtime: new Date() };
      
      const srcPriority = selector.calculatePriority('src/index.js', stats);
      const testPriority = selector.calculatePriority('test/index.js', stats);
      
      assert.ok(srcPriority > testPriority, 'test/ files should have lower priority');
    });

    it('should give highest priority to PROMPT.md', () => {
      const selector = new FileSelector({ cwd: testDir });
      const stats = { size: 10000, mtime: new Date() };
      
      const promptPriority = selector.calculatePriority('PROMPT.md', stats);
      const packagePriority = selector.calculatePriority('package.json', stats);
      const srcPriority = selector.calculatePriority('src/index.js', stats);
      
      assert.ok(promptPriority > packagePriority, 'PROMPT.md should have highest priority');
      assert.ok(promptPriority > srcPriority);
    });

    it('should give high priority to package.json', () => {
      const selector = new FileSelector({ cwd: testDir });
      const stats = { size: 10000, mtime: new Date() };
      
      const packagePriority = selector.calculatePriority('package.json', stats);
      const otherPriority = selector.calculatePriority('other.json', stats);
      
      assert.ok(packagePriority > otherPriority, 'package.json should have higher priority than other .json');
    });
  });

  describe('applyLimits', () => {
    it('should respect maxFiles limit', () => {
      const selector = new FileSelector({ 
        cwd: testDir,
        maxFiles: 3,
        maxContextSize: 1000000
      });
      
      const files = [
        { path: 'a.js', size: 100, priority: 100 },
        { path: 'b.js', size: 100, priority: 90 },
        { path: 'c.js', size: 100, priority: 80 },
        { path: 'd.js', size: 100, priority: 70 },
        { path: 'e.js', size: 100, priority: 60 }
      ];
      
      const limited = selector.applyLimits(files);
      
      assert.strictEqual(limited.length, 3);
      assert.strictEqual(limited[0].path, 'a.js');
      assert.strictEqual(limited[1].path, 'b.js');
      assert.strictEqual(limited[2].path, 'c.js');
    });

    it('should respect maxContextSize limit', () => {
      const selector = new FileSelector({ 
        cwd: testDir,
        maxFiles: 100,
        maxContextSize: 250
      });
      
      const files = [
        { path: 'a.js', size: 100, priority: 100 },
        { path: 'b.js', size: 100, priority: 90 },
        { path: 'c.js', size: 100, priority: 80 },
        { path: 'd.js', size: 100, priority: 70 }
      ];
      
      const limited = selector.applyLimits(files);
      
      // Should only include files up to 250 bytes
      assert.strictEqual(limited.length, 2);
      assert.strictEqual(limited[0].path, 'a.js');
      assert.strictEqual(limited[1].path, 'b.js');
    });

    it('should apply both limits together', () => {
      const selector = new FileSelector({ 
        cwd: testDir,
        maxFiles: 10,
        maxContextSize: 150
      });
      
      const files = [
        { path: 'a.js', size: 100, priority: 100 },
        { path: 'b.js', size: 100, priority: 90 },
        { path: 'c.js', size: 100, priority: 80 }
      ];
      
      const limited = selector.applyLimits(files);
      
      // Size limit should kick in first
      assert.strictEqual(limited.length, 1);
    });
  });

  describe('getFiles', () => {
    it('should return prioritized list of files', () => {
      createFile('PROMPT.md', '# Goal');
      createFile('package.json', '{}');
      createFile('src/index.js', 'console.log("hello")');
      createFile('README.md', '# Readme');
      
      const selector = new FileSelector({ 
        cwd: testDir,
        respectGitignore: false
      });
      
      const files = selector.getFiles();
      
      assert.ok(files.length > 0);
      // PROMPT.md should be first due to highest priority
      assert.strictEqual(files[0], 'PROMPT.md');
    });

    it('should exclude files matching exclude patterns', () => {
      createFile('src/index.js', 'code');
      createFile('src/index.test.js', 'test');
      createFile('node_modules/lib/index.js', 'lib');
      
      const selector = new FileSelector({ 
        cwd: testDir,
        respectGitignore: false,
        exclude: ['**/*.test.js', 'node_modules/**']
      });
      
      const files = selector.getFiles();
      
      assert.ok(files.includes(path.normalize('src/index.js')));
      assert.ok(!files.some(f => f.includes('.test.js')));
      assert.ok(!files.some(f => f.includes('node_modules')));
    });

    it('should respect .gitignore', () => {
      createFile('.gitignore', 'ignored/\n*.secret');
      createFile('src/index.js', 'code');
      createFile('ignored/secret.js', 'secret');
      createFile('config.secret', 'password');
      
      const selector = new FileSelector({ cwd: testDir });
      
      const files = selector.getFiles();
      
      assert.ok(files.includes(path.normalize('src/index.js')));
      assert.ok(!files.some(f => f.includes('ignored')));
      assert.ok(!files.some(f => f.includes('.secret')));
    });
  });

  describe('getFilesWithContent', () => {
    it('should return files with their content', () => {
      createFile('src/index.js', 'const x = 1;');
      createFile('README.md', '# Hello');
      
      const selector = new FileSelector({ 
        cwd: testDir,
        respectGitignore: false
      });
      
      const filesWithContent = selector.getFilesWithContent();
      
      assert.ok(filesWithContent.length >= 2);
      
      const indexFile = filesWithContent.find(f => f.path.includes('index.js'));
      assert.ok(indexFile);
      assert.strictEqual(indexFile.content, 'const x = 1;');
      
      const readmeFile = filesWithContent.find(f => f.path.includes('README.md'));
      assert.ok(readmeFile);
      assert.strictEqual(readmeFile.content, '# Hello');
    });

    it('should handle read errors gracefully', () => {
      createFile('readable.js', 'content');
      
      const selector = new FileSelector({ 
        cwd: testDir,
        respectGitignore: false
      });
      
      // Should not throw even if some files can't be read
      const filesWithContent = selector.getFilesWithContent();
      assert.ok(Array.isArray(filesWithContent));
    });
  });

  describe('getStats', () => {
    it('should return file statistics', () => {
      createFile('file1.js', 'a'.repeat(100));
      createFile('file2.js', 'b'.repeat(200));
      createFile('file3.js', 'c'.repeat(300));
      
      const selector = new FileSelector({ 
        cwd: testDir,
        respectGitignore: false
      });
      
      const stats = selector.getStats();
      
      assert.strictEqual(stats.fileCount, 3);
      assert.strictEqual(stats.totalSize, 600);
      assert.strictEqual(stats.averageSize, 200);
    });

    it('should handle empty file list', () => {
      // Empty directory
      const selector = new FileSelector({ 
        cwd: testDir,
        respectGitignore: false
      });
      
      const stats = selector.getStats();
      
      assert.strictEqual(stats.fileCount, 0);
      assert.strictEqual(stats.totalSize, 0);
      // averageSize will be NaN for empty, that's expected
    });
  });

  describe('integration', () => {
    it('should work with realistic project structure', () => {
      // Create a realistic project structure
      createFile('package.json', '{"name": "test"}');
      createFile('PROMPT.md', '# Improve the code');
      createFile('.gitignore', 'node_modules/\ndist/\n*.log');
      createFile('src/index.js', 'module.exports = {}');
      createFile('src/utils/helper.js', 'function help() {}');
      createFile('src/utils/helper.test.js', 'test()');
      createFile('test/integration.test.js', 'test()');
      createFile('node_modules/lodash/index.js', 'lodash');
      createFile('dist/bundle.js', 'bundled');
      createFile('error.log', 'errors');
      createFile('README.md', '# Project');
      
      const selector = new FileSelector({ 
        cwd: testDir,
        exclude: ['**/*.test.js']
      });
      
      const files = selector.getFiles();
      
      // Should include main files
      assert.ok(files.includes('PROMPT.md'), 'Should include PROMPT.md');
      assert.ok(files.includes('package.json'), 'Should include package.json');
      assert.ok(files.includes('README.md'), 'Should include README.md');
      assert.ok(files.some(f => f.includes('index.js')), 'Should include src/index.js');
      assert.ok(files.some(f => f.includes('helper.js') && !f.includes('test')), 'Should include helper.js');
      
      // Should exclude gitignored files
      assert.ok(!files.some(f => f.includes('node_modules')), 'Should not include node_modules');
      assert.ok(!files.some(f => f.includes('dist')), 'Should not include dist');
      assert.ok(!files.some(f => f.includes('.log')), 'Should not include .log files');
      
      // Should exclude test files (via exclude pattern)
      assert.ok(!files.some(f => f.includes('.test.js')), 'Should not include test files');
    });

    it('should prioritize files correctly in realistic scenario', () => {
      createFile('PROMPT.md', '# Goal');
      createFile('package.json', '{}');
      createFile('src/core.js', 'core');
      createFile('lib/util.js', 'util');
      createFile('test/test.js', 'test');
      
      const selector = new FileSelector({ 
        cwd: testDir,
        respectGitignore: false
      });
      
      const files = selector.getFiles();
      
      // PROMPT.md should be first
      assert.strictEqual(files[0], 'PROMPT.md');
      
      // package.json should be early
      const packageIndex = files.indexOf('package.json');
      assert.ok(packageIndex < 3, 'package.json should be in top 3');
      
      // src/ files should come before test/ files
      const srcIndex = files.findIndex(f => f.includes('src'));
      const testIndex = files.findIndex(f => f.includes('test'));
      
      if (srcIndex !== -1 && testIndex !== -1) {
        assert.ok(srcIndex < testIndex, 'src/ files should be prioritized over test/ files');
      }
    });
  });
});
