const fs = require('fs');
const path = require('path');
const ignore = require('ignore');
const micromatch = require('micromatch');

class FileSelector {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.includePatterns = options.include || ['**/*'];
    this.excludePatterns = options.exclude || [];
    this.respectGitignore = options.respectGitignore !== false; // Default true
    this.maxContextSize = options.maxContextSize || 100000; // 100KB default
    this.maxFiles = options.maxFiles || 50; // Max 50 files by default
    this.verbose = options.verbose || false;

    // Initialize gitignore matcher
    this.gitignore = null;
    if (this.respectGitignore) {
      this.gitignore = this.loadGitignore();
    }

    // Default file extensions to include
    this.defaultExtensions = ['.js', '.ts', '.py', '.md', '.json', '.yml', '.yaml', '.jsx', '.tsx'];
  }

  /**
   * Load and parse .gitignore file
   */
  loadGitignore() {
    const gitignorePath = path.join(this.cwd, '.gitignore');

    if (!fs.existsSync(gitignorePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(gitignorePath, 'utf-8');
      const ig = ignore();
      ig.add(content);

      // Always ignore .git directory
      ig.add('.git');
      ig.add('.git/**');

      return ig;
    } catch (error) {
      if (this.verbose) {
        console.warn(`Warning: Failed to load .gitignore: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * Get all relevant files for the codebase context
   */
  getFiles() {
    const allFiles = this.walkDirectory(this.cwd);
    let relevantFiles = this.filterFiles(allFiles);

    // Calculate file sizes and priorities
    const filesWithMeta = relevantFiles.map(file => {
      const fullPath = path.join(this.cwd, file);
      const stats = fs.statSync(fullPath);

      return {
        path: file,
        size: stats.size,
        mtime: stats.mtime,
        priority: this.calculatePriority(file, stats)
      };
    });

    // Sort by priority (higher first)
    filesWithMeta.sort((a, b) => b.priority - a.priority);

    // Apply limits
    const limited = this.applyLimits(filesWithMeta);

    return limited.map(f => f.path);
  }

  /**
   * Walk directory recursively
   */
  walkDirectory(dir, basePath = '') {
    let files = [];

    try {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const relativePath = path.join(basePath, item);

        // Check gitignore first (most efficient)
        if (this.gitignore && this.gitignore.ignores(relativePath)) {
          continue;
        }

        // Check if it's a directory or file
        let stat;
        try {
          stat = fs.statSync(fullPath);
        } catch (error) {
          // Skip files we can't stat (permission issues, etc.)
          continue;
        }

        if (stat.isDirectory()) {
          // Recursively walk subdirectories
          files = files.concat(this.walkDirectory(fullPath, relativePath));
        } else if (stat.isFile()) {
          files.push(relativePath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
      if (this.verbose) {
        console.warn(`Warning: Cannot read directory ${dir}: ${error.message}`);
      }
    }

    return files;
  }

  /**
   * Filter files based on include/exclude patterns
   */
  filterFiles(files) {
    // Apply exclude patterns first
    let filtered = files;

    if (this.excludePatterns.length > 0) {
      filtered = filtered.filter(file => {
        return !micromatch.isMatch(file, this.excludePatterns);
      });
    }

    // Apply include patterns
    if (this.includePatterns.length > 0 && this.includePatterns[0] !== '**/*') {
      filtered = filtered.filter(file => {
        return micromatch.isMatch(file, this.includePatterns);
      });
    }

    // Filter by file extension (unless user specified explicit patterns)
    if (this.includePatterns[0] === '**/*') {
      filtered = filtered.filter(file => {
        const ext = path.extname(file);
        return this.defaultExtensions.includes(ext);
      });
    }

    return filtered;
  }

  /**
   * Calculate priority score for a file
   * Higher score = more important
   * 
   * Priority tiers (designed so code ALWAYS beats docs):
   * - PROMPT.md: 300 (absolute highest - Ralph loop essential)
   * - Source code (.js, .ts, .py) in src/: 200-250
   * - Source code elsewhere: 180-230
   * - Config files (package.json, etc): 150-180
   * - Documentation (.md): 100-140
   * 
   * The key insight: We use TIER-BASED scoring where the base tier
   * for code is HIGHER than the max possible score for docs.
   */
  calculatePriority(file, stats) {
    const ext = path.extname(file);
    const basename = path.basename(file);
    
    // PROMPT.md is ALWAYS first - essential for Ralph loop
    if (basename === 'PROMPT.md') {
      return 300;
    }
    
    // Determine base tier by file type
    // This ensures code files ALWAYS outrank documentation
    let baseTier;
    const isSourceCode = ['.js', '.ts', '.py', '.jsx', '.tsx'].includes(ext);
    const isConfig = ['.json', '.yml', '.yaml'].includes(ext);
    const isDoc = ['.md'].includes(ext);
    
    if (isSourceCode) {
      baseTier = 180; // Source code base: 180-250 range
    } else if (isConfig) {
      baseTier = 140; // Config base: 140-180 range
    } else if (isDoc) {
      baseTier = 100; // Docs base: 100-140 range (can NEVER reach 180)
    } else {
      baseTier = 80; // Other files: 80-120 range
    }
    
    let score = baseTier;
    
    // Size bonus (max +15)
    if (stats.size < 10000) score += 15;       // < 10KB
    else if (stats.size < 50000) score += 8;   // < 50KB
    else if (stats.size > 200000) score -= 20; // > 200KB (penalty)

    // Recency bonus (max +20)
    const age = Date.now() - stats.mtime.getTime();
    const daysOld = age / (1000 * 60 * 60 * 24);

    if (daysOld < 1) score += 20;       // Modified today
    else if (daysOld < 7) score += 12;  // Modified this week
    else if (daysOld < 30) score += 5;  // Modified this month

    // Directory bonuses for source code (max +20)
    if (isSourceCode) {
      if (file.startsWith('src/') || file.startsWith('src\\')) {
        score += 20; // Main source directory
      } else if (file.startsWith('lib/') || file.startsWith('lib\\')) {
        score += 15;
      } else if (file.startsWith('test/') || file.startsWith('tests/') || 
               file.startsWith('test\\') || file.startsWith('tests\\')) {
        score -= 15; // Tests are lower priority than production code
      }
    }

    // Special file bonuses (within their tier)
    if (basename === 'package.json') {
      score += 25; // Critical for understanding project
    } else if (basename === 'README.md') {
      score += 10; // Important doc, but still in docs tier
    } else if (basename === 'index.js' || basename === 'index.ts') {
      score += 10; // Entry points are important
    } else if (basename.includes('.test.') || basename.includes('.spec.')) {
      score -= 10; // Test files lower priority
    }

    return score;
  }

  /**
   * Apply context size and file count limits
   */
  applyLimits(filesWithMeta) {
    const selected = [];
    let totalSize = 0;

    for (const file of filesWithMeta) {
      // Check file count limit
      if (selected.length >= this.maxFiles) {
        if (this.verbose) {
          console.warn(`Reached max file limit (${this.maxFiles}). Skipping remaining files.`);
        }
        break;
      }

      // Check context size limit
      if (totalSize + file.size > this.maxContextSize) {
        if (this.verbose) {
          console.warn(`Reached max context size (${this.maxContextSize} bytes). Skipping remaining files.`);
        }
        break;
      }

      selected.push(file);
      totalSize += file.size;
    }

    return selected;
  }

  /**
   * Get file contents with metadata
   */
  getFilesWithContent() {
    const files = this.getFiles();

    return files.map(file => {
      const fullPath = path.join(this.cwd, file);
      let content;

      try {
        content = fs.readFileSync(fullPath, 'utf-8');
      } catch (error) {
        content = `[Error reading file: ${error.message}]`;
      }

      return {
        path: file,
        content
      };
    });
  }

  /**
   * Get summary statistics
   */
  getStats() {
    const files = this.getFiles();
    const totalSize = files.reduce((sum, file) => {
      const fullPath = path.join(this.cwd, file);
      try {
        const stats = fs.statSync(fullPath);
        return sum + stats.size;
      } catch {
        return sum;
      }
    }, 0);

    return {
      fileCount: files.length,
      totalSize,
      averageSize: files.length > 0 ? Math.round(totalSize / files.length) : 0
    };
  }
}

module.exports = FileSelector;
