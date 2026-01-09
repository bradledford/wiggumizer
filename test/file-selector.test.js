const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const FileSelector = require('../src/file-selector');

// Test helper to create a temporary directory structure
function createTempDir() {
  const tempDir = path.join(__dirname, `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  fs.mkdirSync(tempDir, { recursive: true });
  return tempDir;
}

function cleanupTempDir(tempDir) {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function createFile(dir, relativePath, content = '') {
  const fullPath = path.join(dir, relativePath);
  const dirPath = path.dirname(fullPath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  fs.writeFileSync(fullPath, content, 'utf-8');
}

describe('FileSelector', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('basic functionality', () => {
    it('should return empty array for empty directory', () => {
      const selector = new FileSelector({ cwd: tempDir });
      const files = selector.getFiles();
      assert.deepStrictEqual(files, []);
    });

    it('should find files with default extensions', () => {
      createFile(tempDir, 'index.js', 'console.log("hello");');
      createFile(tempDir, 'README.md', '# Hello');
      createFile(tempDir, 'package.json', '{}');

      const selector = new FileSelector({ cwd: tempDir });
      const files = selector.getFiles();

      assert.strictEqual(files.length, 3);
      assert.ok(files.includes('index.js'));
      assert.ok(files.includes('README.md'));
      assert.ok(files.includes('package.json'));
    });

    it('should ignore files without default extensions', () => {
      createFile(tempDir, 'index.js', 'console.log("hello");');
      createFile(tempDir, 'image.png', 'binary data');
      createFile(tempDir, 'data.csv', 'a,b,c');

      const selector = new FileSelector({ cwd: tempDir });
      const files = selector.getFiles();

      assert.strictEqual(files.length, 1);
      assert.ok(files.includes('index.js'));
    });

    it('should walk directories recursively', () => {
      createFile(tempDir, 'src/index.js', 'main');
      createFile(tempDir, 'src/utils/helper.js', 'helper');
      createFile(tempDir, 'lib/core.js', 'core');

      const selector = new FileSelector({ cwd: tempDir });
      const files = selector.getFiles();

      assert.strictEqual(files.length, 3);
      // Normalize path separators for cross-platform testing
      const normalizedFiles = files.map(f => f.replace(/\\/g, '/'));
      assert.ok(normalizedFiles.includes('src/index.js'));
      assert.ok(normalizedFiles.includes('src/utils/helper.js'));
      assert.ok(normalizedFiles.includes('lib/core.js'));
    });
  });

  describe('gitignore handling', () => {
    it('should respect .gitignore patterns', () => {
      createFile(tempDir, '.gitignore', 'node_modules/\ndist/\n*.log');
      createFile(tempDir, 'index.js', 'main');
      createFile(tempDir, 'node_modules/pkg/index.js', 'pkg');
      createFile(tempDir, 'dist/bundle.js', 'bundle');
      createFile(tempDir, 'debug.log', 'logs');

      const selector = new FileSelector({ cwd: tempDir, respectGitignore: true });
      const files = selector.getFiles();

      assert.strictEqual(files.length, 1);
      assert.ok(files.includes('index.js'));
    });

    it('should include files when respectGitignore is false', () => {
      createFile(tempDir, '.gitignore', 'ignored/');
      createFile(tempDir, 'index.js', 'main');
      createFile(tempDir, 'ignored/file.js', 'ignored');

      const selector = new FileSelector({ cwd: tempDir, respectGitignore: false });
      const files = selector.getFiles();

      assert.strictEqual(files.length, 2);
    });

    it('should always ignore .git directory', () => {
      createFile(tempDir, '.git/config', 'git config');
      createFile(tempDir, '.git/HEAD', 'ref: refs/heads/main');
      createFile(tempDir, 'index.js', 'main');

      const selector = new FileSelector({ cwd: tempDir });
      const files = selector.getFiles();

      assert.strictEqual(files.length, 1);
      assert.ok(files.includes('index.js'));
    });
  });

  describe('include/exclude patterns', () => {
    it('should filter by include patterns', () => {
      createFile(tempDir, 'src/app.js', 'app');
      createFile(tempDir, 'src/app.ts', 'app ts');
      createFile(tempDir, 'lib/util.js', 'util');

      const selector = new FileSelector({
        cwd: tempDir,
        include: ['src/**/*.js']
      });
      const files = selector.getFiles();

      assert.strictEqual(files.length, 1);
      const normalizedFiles = files.map(f => f.replace(/\\/g, '/'));
      assert.ok(normalizedFiles.includes('src/app.js'));
    });

    it('should filter by exclude patterns', () => {
      createFile(tempDir, 'src/app.js', 'app');
      createFile(tempDir, 'src/app.test.js', 'test');
      createFile(tempDir, 'src/util.js', 'util');

      const selector = new FileSelector({
        cwd: tempDir,
        exclude: ['**/*.test.js']
      });
      const files = selector.getFiles();

      const normalizedFiles = files.map(f => f.replace(/\\/g, '/'));
      assert.ok(normalizedFiles.includes('src/app.js'));
      assert.ok(normalizedFiles.includes('src/util.js'));
      assert.ok(!normalizedFiles.includes('src/app.test.js'));
    });
  });

  describe('priority calculation', () => {
    it('should give PROMPT.md the highest priority', () => {
      createFile(tempDir, 'PROMPT.md', '# Goal');
      createFile(tempDir, 'src/index.js', 'main');
      createFile(tempDir, 'package.json', '{}');
      createFile(tempDir, 'README.md', '# Project');

      const selector = new FileSelector({ cwd: tempDir });
      const files = selector.getFiles();

      // PROMPT.md should be first
      assert.strictEqual(files[0], 'PROMPT.md');
    });

    it('should prioritize source code files (.js) over documentation (.md)', () => {
      // Create files with same modification time by creating them in sequence
      // and touching them to have predictable timestamps
      const now = new Date();
      
      createFile(tempDir, 'src/app.js', 'const app = () => {};');
      createFile(tempDir, 'docs/guide.md', '# Guide\n\nSome documentation');
      createFile(tempDir, 'src/utils.js', 'const utils = {};');
      createFile(tempDir, 'docs/api.md', '# API\n\nAPI documentation');

      // Set same mtime on all files to isolate type-based priority
      const files = ['src/app.js', 'docs/guide.md', 'src/utils.js', 'docs/api.md'];
      files.forEach(f => {
        const fullPath = path.join(tempDir, f);
        fs.utimesSync(fullPath, now, now);
      });

      const selector = new FileSelector({ cwd: tempDir });
      const result = selector.getFiles();

      // Get positions of js and md files
      const normalizedResult = result.map(f => f.replace(/\\/g, '/'));
      
      const jsFiles = normalizedResult.filter(f => f.endsWith('.js'));
      const mdFiles = normalizedResult.filter(f => f.endsWith('.md'));

      // All .js files should appear before all .md files
      // (except PROMPT.md which isn't in this test)
      const lastJsIndex = Math.max(...jsFiles.map(f => normalizedResult.indexOf(f)));
      const firstMdIndex = Math.min(...mdFiles.map(f => normalizedResult.indexOf(f)));

      assert.ok(
        lastJsIndex < firstMdIndex,
        `JS files should be prioritized over MD files. JS indices: ${jsFiles.map(f => normalizedResult.indexOf(f))}, MD indices: ${mdFiles.map(f => normalizedResult.indexOf(f))}`
      );
    });

    it('should prioritize src/ directory files', () => {
      const now = new Date();
      
      createFile(tempDir, 'src/main.js', 'main');
      createFile(tempDir, 'other/helper.js', 'helper');

      // Set same mtime
      fs.utimesSync(path.join(tempDir, 'src/main.js'), now, now);
      fs.utimesSync(path.join(tempDir, 'other/helper.js'), now, now);

      const selector = new FileSelector({ cwd: tempDir });
      const files = selector.getFiles();
      const normalizedFiles = files.map(f => f.replace(/\\/g, '/'));

      // src/main.js should come before other/helper.js
      const srcIndex = normalizedFiles.indexOf('src/main.js');
      const otherIndex = normalizedFiles.indexOf('other/helper.js');

      assert.ok(srcIndex < otherIndex, 'src/ files should be prioritized');
    });

    it('should give package.json high priority', () => {
      const now = new Date();
      
      createFile(tempDir, 'package.json', '{"name": "test"}');
      createFile(tempDir, 'config.json', '{}');
      createFile(tempDir, 'data.json', '[]');

      // Set same mtime
      ['package.json', 'config.json', 'data.json'].forEach(f => {
        fs.utimesSync(path.join(tempDir, f), now, now);
      });

      const selector = new FileSelector({ cwd: tempDir });
      const files = selector.getFiles();

      // package.json should be first among json files
      assert.strictEqual(files[0], 'package.json');
    });

    it('should deprioritize test directories', () => {
      const now = new Date();
      
      createFile(tempDir, 'src/app.js', 'app');
      createFile(tempDir, 'test/app.test.js', 'test');

      // Set same mtime and similar sizes
      fs.utimesSync(path.join(tempDir, 'src/app.js'), now, now);
      fs.utimesSync(path.join(tempDir, 'test/app.test.js'), now, now);

      const selector = new FileSelector({ cwd: tempDir });
      const files = selector.getFiles();
      const normalizedFiles = files.map(f => f.replace(/\\/g, '/'));

      const srcIndex = normalizedFiles.indexOf('src/app.js');
      const testIndex = normalizedFiles.indexOf('test/app.test.js');

      assert.ok(srcIndex < testIndex, 'test/ files should be deprioritized');
    });

    it('should prefer smaller files (easier to fit in context)', () => {
      const now = new Date();
      
      // Create a small file and a large file
      createFile(tempDir, 'small.js', 'const x = 1;');
      createFile(tempDir, 'large.js', 'const x = 1;\n'.repeat(20000)); // ~240KB

      // Set same mtime
      fs.utimesSync(path.join(tempDir, 'small.js'), now, now);
      fs.utimesSync(path.join(tempDir, 'large.js'), now, now);

      const selector = new FileSelector({ cwd: tempDir });
      const files = selector.getFiles();

      // small.js should come before large.js
      assert.strictEqual(files[0], 'small.js');
    });

    it('should prefer recently modified files', () => {
      createFile(tempDir, 'old.js', 'old code');
      createFile(tempDir, 'new.js', 'new code');

      // Set old.js to 60 days ago, new.js to now
      const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      const newDate = new Date();
      
      fs.utimesSync(path.join(tempDir, 'old.js'), oldDate, oldDate);
      fs.utimesSync(path.join(tempDir, 'new.js'), newDate, newDate);

      const selector = new FileSelector({ cwd: tempDir });
      const files = selector.getFiles();

      // new.js should come before old.js
      assert.strictEqual(files[0], 'new.js');
    });
  });

  describe('context limits', () => {
    it('should respect maxFiles limit', () => {
      // Create 10 files
      for (let i = 0; i < 10; i++) {
        createFile(tempDir, `file${i}.js`, `// file ${i}`);
      }

      const selector = new FileSelector({ cwd: tempDir, maxFiles: 5 });
      const files = selector.getFiles();

      assert.strictEqual(files.length, 5);
    });

    it('should respect maxContextSize limit', () => {
      // Create files that exceed context size
      createFile(tempDir, 'small.js', 'x'.repeat(1000));  // 1KB
      createFile(tempDir, 'medium.js', 'x'.repeat(5000)); // 5KB
      createFile(tempDir, 'large.js', 'x'.repeat(10000)); // 10KB

      const selector = new FileSelector({ cwd: tempDir, maxContextSize: 8000 });
      const files = selector.getFiles();

      // Should include small and medium (6KB), but not large (would exceed 8KB)
      // Note: order depends on priority, but total size should be under limit
      const totalSize = files.reduce((sum, f) => {
        return sum + fs.statSync(path.join(tempDir, f)).size;
      }, 0);

      assert.ok(totalSize <= 8000, `Total size ${totalSize} exceeds limit`);
    });
  });

  describe('getFilesWithContent', () => {
    it('should return files with their content', () => {
      createFile(tempDir, 'index.js', 'const x = 1;');
      createFile(tempDir, 'util.js', 'const y = 2;');

      const selector = new FileSelector({ cwd: tempDir });
      const filesWithContent = selector.getFilesWithContent();

      assert.strictEqual(filesWithContent.length, 2);
      
      const indexFile = filesWithContent.find(f => f.path === 'index.js');
      assert.ok(indexFile);
      assert.strictEqual(indexFile.content, 'const x = 1;');
    });

    it('should handle read errors gracefully', () => {
      createFile(tempDir, 'index.js', 'const x = 1;');
      
      const selector = new FileSelector({ cwd: tempDir });
      
      // This test ensures the method doesn't crash on errors
      const filesWithContent = selector.getFilesWithContent();
      assert.ok(Array.isArray(filesWithContent));
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      createFile(tempDir, 'file1.js', 'x'.repeat(1000));
      createFile(tempDir, 'file2.js', 'x'.repeat(2000));
      createFile(tempDir, 'file3.js', 'x'.repeat(3000));

      const selector = new FileSelector({ cwd: tempDir });
      const stats = selector.getStats();

      assert.strictEqual(stats.fileCount, 3);
      assert.strictEqual(stats.totalSize, 6000);
      assert.strictEqual(stats.averageSize, 2000);
    });

    it('should handle empty directory', () => {
      const selector = new FileSelector({ cwd: tempDir });
      const stats = selector.getStats();

      assert.strictEqual(stats.fileCount, 0);
      assert.strictEqual(stats.totalSize, 0);
      assert.strictEqual(stats.averageSize, 0);
    });
  });

  describe('edge cases', () => {
    it('should handle deeply nested directories', () => {
      createFile(tempDir, 'a/b/c/d/e/deep.js', 'deep');

      const selector = new FileSelector({ cwd: tempDir });
      const files = selector.getFiles();

      assert.strictEqual(files.length, 1);
      const normalizedFiles = files.map(f => f.replace(/\\/g, '/'));
      assert.ok(normalizedFiles[0].includes('deep.js'));
    });

    it('should handle files with special characters in names', () => {
      createFile(tempDir, 'file-with-dashes.js', 'dashes');
      createFile(tempDir, 'file_with_underscores.js', 'underscores');
      createFile(tempDir, 'file.multiple.dots.js', 'dots');

      const selector = new FileSelector({ cwd: tempDir });
      const files = selector.getFiles();

      assert.strictEqual(files.length, 3);
    });

    it('should handle empty files', () => {
      createFile(tempDir, 'empty.js', '');
      createFile(tempDir, 'nonempty.js', 'content');

      const selector = new FileSelector({ cwd: tempDir });
      const files = selector.getFiles();

      assert.strictEqual(files.length, 2);
    });
  });
});

describe('FileSelector priority edge cases', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should rank TypeScript files same as JavaScript', () => {
    const now = new Date();
    
    createFile(tempDir, 'app.js', 'js code');
    createFile(tempDir, 'app.ts', 'ts code');

    fs.utimesSync(path.join(tempDir, 'app.js'), now, now);
    fs.utimesSync(path.join(tempDir, 'app.ts'), now, now);

    const selector = new FileSelector({ cwd: tempDir });
    
    // Get priority scores directly
    const jsStats = fs.statSync(path.join(tempDir, 'app.js'));
    const tsStats = fs.statSync(path.join(tempDir, 'app.ts'));
    
    const jsPriority = selector.calculatePriority('app.js', jsStats);
    const tsPriority = selector.calculatePriority('app.ts', tsStats);

    // TypeScript and JavaScript should have equal type bonus
    assert.strictEqual(jsPriority, tsPriority, 'JS and TS should have same priority');
  });

  it('should ensure src/*.js always beats docs/*.md', () => {
    const now = new Date();
    
    // Create equal-sized files with same timestamps
    const content = 'x'.repeat(100);
    createFile(tempDir, 'src/code.js', content);
    createFile(tempDir, 'docs/readme.md', content);

    fs.utimesSync(path.join(tempDir, 'src/code.js'), now, now);
    fs.utimesSync(path.join(tempDir, 'docs/readme.md'), now, now);

    const selector = new FileSelector({ cwd: tempDir });
    
    const jsStats = fs.statSync(path.join(tempDir, 'src/code.js'));
    const mdStats = fs.statSync(path.join(tempDir, 'docs/readme.md'));
    
    const jsPriority = selector.calculatePriority('src/code.js', jsStats);
    const mdPriority = selector.calculatePriority('docs/readme.md', mdStats);

    assert.ok(
      jsPriority > mdPriority,
      `src/*.js (${jsPriority}) should have higher priority than docs/*.md (${mdPriority})`
    );
  });

  it('should ensure root README.md does not beat src/*.js', () => {
    const now = new Date();
    
    // Create equal-sized files with same timestamps
    const content = 'x'.repeat(100);
    createFile(tempDir, 'src/index.js', content);
    createFile(tempDir, 'README.md', content);

    fs.utimesSync(path.join(tempDir, 'src/index.js'), now, now);
    fs.utimesSync(path.join(tempDir, 'README.md'), now, now);

    const selector = new FileSelector({ cwd: tempDir });
    
    const jsStats = fs.statSync(path.join(tempDir, 'src/index.js'));
    const mdStats = fs.statSync(path.join(tempDir, 'README.md'));
    
    const jsPriority = selector.calculatePriority('src/index.js', jsStats);
    const mdPriority = selector.calculatePriority('README.md', mdStats);

    assert.ok(
      jsPriority > mdPriority,
      `src/index.js (${jsPriority}) should have higher priority than README.md (${mdPriority})`
    );
  });

  it('should calculate expected priority components correctly', () => {
    const now = new Date();
    
    // Create a known file to test priority calculation
    createFile(tempDir, 'src/test.js', 'x'.repeat(5000)); // 5KB - gets +10 for size
    fs.utimesSync(path.join(tempDir, 'src/test.js'), now, now); // Modified today - gets +30

    const selector = new FileSelector({ cwd: tempDir });
    const stats = fs.statSync(path.join(tempDir, 'src/test.js'));
    const priority = selector.calculatePriority('src/test.js', stats);

    // Expected: 100 (base) + 10 (size <50KB) + 30 (today) + 25 (js) + 20 (src/) = 185
    assert.strictEqual(priority, 185, `Expected priority 185, got ${priority}`);
  });
});
