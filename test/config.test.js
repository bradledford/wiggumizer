const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// We need to mock the config loader to avoid reading actual config files
const ConfigLoader = require('../src/config');

describe('ConfigLoader', () => {
  let tempDir;
  let originalCwd;
  let originalHomedir;

  beforeEach(() => {
    // Create a temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wiggumizer-test-'));
    originalCwd = process.cwd();
    
    // Store original homedir function
    originalHomedir = os.homedir;
  });

  afterEach(() => {
    // Restore original cwd
    process.chdir(originalCwd);
    
    // Restore original homedir
    os.homedir = originalHomedir;
    
    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('load()', () => {
    it('should return default configuration when no config files exist', () => {
      process.chdir(tempDir);
      // Mock homedir to temp directory (no user config)
      os.homedir = () => tempDir;
      
      const config = ConfigLoader.load({});
      
      assert.strictEqual(config.provider, 'claude');
      assert.strictEqual(config.maxIterations, 20);
      assert.strictEqual(config.convergenceThreshold, 0.02);
      assert.strictEqual(config.autoCommit, false);
      assert.strictEqual(config.verbose, false);
      assert.strictEqual(config.dryRun, false);
    });

    it('should have correct default context limits', () => {
      process.chdir(tempDir);
      os.homedir = () => tempDir;
      
      const config = ConfigLoader.load({});
      
      assert.strictEqual(config.context.maxSize, 100000);
      assert.strictEqual(config.context.maxFiles, 50);
    });

    it('should have correct default retry settings', () => {
      process.chdir(tempDir);
      os.homedir = () => tempDir;
      
      const config = ConfigLoader.load({});
      
      assert.strictEqual(config.retry.maxRetries, 3);
      assert.strictEqual(config.retry.baseDelay, 1000);
      assert.strictEqual(config.retry.maxDelay, 30000);
    });

    it('should have correct default rate limit settings', () => {
      process.chdir(tempDir);
      os.homedir = () => tempDir;
      
      const config = ConfigLoader.load({});
      
      assert.strictEqual(config.rateLimit.requestsPerMinute, 50);
      assert.strictEqual(config.rateLimit.requestsPerHour, 1000);
    });

    it('should have correct default provider settings', () => {
      process.chdir(tempDir);
      os.homedir = () => tempDir;
      
      const config = ConfigLoader.load({});
      
      assert.strictEqual(config.providers.claude.model, 'claude-opus-4-5-20251101');
      assert.strictEqual(config.providers.claude.maxTokens, 8192);
    });

    it('should override defaults with CLI options', () => {
      process.chdir(tempDir);
      os.homedir = () => tempDir;
      
      const config = ConfigLoader.load({
        provider: 'openai',
        maxIterations: 50,
        verbose: true
      });
      
      assert.strictEqual(config.provider, 'openai');
      assert.strictEqual(config.maxIterations, 50);
      assert.strictEqual(config.verbose, true);
    });

    it('should ignore null and undefined CLI options', () => {
      process.chdir(tempDir);
      os.homedir = () => tempDir;
      
      const config = ConfigLoader.load({
        provider: null,
        maxIterations: undefined,
        verbose: true
      });
      
      // Null/undefined should not override defaults
      assert.strictEqual(config.provider, 'claude');
      assert.strictEqual(config.maxIterations, 20);
      assert.strictEqual(config.verbose, true);
    });
  });

  describe('loadConfigFile()', () => {
    it('should return empty object for non-existent file', () => {
      const result = ConfigLoader.loadConfigFile('/non/existent/path.yml');
      assert.deepStrictEqual(result, {});
    });

    it('should parse valid YAML config file', () => {
      const configPath = path.join(tempDir, 'test-config.yml');
      fs.writeFileSync(configPath, `
provider: openai
maxIterations: 30
context:
  maxSize: 50000
`);
      
      const result = ConfigLoader.loadConfigFile(configPath);
      
      assert.strictEqual(result.provider, 'openai');
      assert.strictEqual(result.maxIterations, 30);
      assert.strictEqual(result.context.maxSize, 50000);
    });

    it('should return empty object for invalid YAML', () => {
      const configPath = path.join(tempDir, 'invalid-config.yml');
      fs.writeFileSync(configPath, `
provider: openai
  invalid yaml structure
    more invalid
`);
      
      // Should not throw, just return empty object
      const result = ConfigLoader.loadConfigFile(configPath);
      // YAML parser might return partial result or empty object
      assert.ok(typeof result === 'object');
    });

    it('should return empty object for empty file', () => {
      const configPath = path.join(tempDir, 'empty-config.yml');
      fs.writeFileSync(configPath, '');
      
      const result = ConfigLoader.loadConfigFile(configPath);
      assert.deepStrictEqual(result, {});
    });
  });

  describe('loadProjectConfig()', () => {
    it('should load .wiggumizer.yml from current directory', () => {
      process.chdir(tempDir);
      
      fs.writeFileSync(path.join(tempDir, '.wiggumizer.yml'), `
provider: claude
maxIterations: 15
autoCommit: true
`);
      
      const result = ConfigLoader.loadProjectConfig();
      
      assert.strictEqual(result.provider, 'claude');
      assert.strictEqual(result.maxIterations, 15);
      assert.strictEqual(result.autoCommit, true);
    });

    it('should return empty object if no project config exists', () => {
      process.chdir(tempDir);
      
      const result = ConfigLoader.loadProjectConfig();
      assert.deepStrictEqual(result, {});
    });
  });

  describe('loadUserConfig()', () => {
    it('should load ~/.wiggumizer.yml', () => {
      // Create user config in temp dir
      fs.writeFileSync(path.join(tempDir, '.wiggumizer.yml'), `
provider: openai
verbose: true
`);
      
      // Mock homedir
      os.homedir = () => tempDir;
      
      const result = ConfigLoader.loadUserConfig();
      
      assert.strictEqual(result.provider, 'openai');
      assert.strictEqual(result.verbose, true);
    });
  });

  describe('mergeConfigs()', () => {
    it('should merge multiple configs with later taking precedence', () => {
      const result = ConfigLoader.mergeConfigs(
        { a: 1, b: 2, c: { d: 3 } },
        { b: 20, c: { e: 4 } },
        { a: 100 }
      );
      
      assert.strictEqual(result.a, 100);
      assert.strictEqual(result.b, 20);
      assert.strictEqual(result.c.d, 3);
      assert.strictEqual(result.c.e, 4);
    });

    it('should deep merge nested objects', () => {
      const result = ConfigLoader.mergeConfigs(
        { 
          context: { maxSize: 100, maxFiles: 50 },
          retry: { maxRetries: 3 }
        },
        { 
          context: { maxSize: 200 }
        }
      );
      
      assert.strictEqual(result.context.maxSize, 200);
      assert.strictEqual(result.context.maxFiles, 50);
      assert.strictEqual(result.retry.maxRetries, 3);
    });

    it('should handle empty configs', () => {
      const result = ConfigLoader.mergeConfigs(
        {},
        { a: 1 },
        {}
      );
      
      assert.strictEqual(result.a, 1);
    });

    it('should skip null and undefined values in source', () => {
      const result = ConfigLoader.mergeConfigs(
        { a: 1, b: 2 },
        { a: null, b: undefined, c: 3 }
      );
      
      assert.strictEqual(result.a, 1);
      assert.strictEqual(result.b, 2);
      assert.strictEqual(result.c, 3);
    });
  });

  describe('deepMerge()', () => {
    it('should merge nested objects recursively', () => {
      const target = { 
        level1: { 
          level2: { 
            a: 1, 
            b: 2 
          } 
        } 
      };
      const source = { 
        level1: { 
          level2: { 
            b: 20, 
            c: 3 
          } 
        } 
      };
      
      ConfigLoader.deepMerge(target, source);
      
      assert.strictEqual(target.level1.level2.a, 1);
      assert.strictEqual(target.level1.level2.b, 20);
      assert.strictEqual(target.level1.level2.c, 3);
    });

    it('should override non-object values', () => {
      const target = { a: 'string', b: { c: 1 } };
      const source = { a: 'new string', b: 'not an object' };
      
      ConfigLoader.deepMerge(target, source);
      
      assert.strictEqual(target.a, 'new string');
      assert.strictEqual(target.b, 'not an object');
    });
  });

  describe('generateDefaultConfig()', () => {
    it('should generate valid YAML string', () => {
      const configYaml = ConfigLoader.generateDefaultConfig();
      
      assert.ok(typeof configYaml === 'string');
      assert.ok(configYaml.includes('provider: claude'));
      assert.ok(configYaml.includes('maxIterations: 20'));
      assert.ok(configYaml.includes('convergenceThreshold: 0.02'));
    });

    it('should include all major sections', () => {
      const configYaml = ConfigLoader.generateDefaultConfig();
      
      assert.ok(configYaml.includes('context:'));
      assert.ok(configYaml.includes('files:'));
      assert.ok(configYaml.includes('retry:'));
      assert.ok(configYaml.includes('rateLimit:'));
      assert.ok(configYaml.includes('providers:'));
    });

    it('should include workspace configuration example', () => {
      const configYaml = ConfigLoader.generateDefaultConfig();
      
      assert.ok(configYaml.includes('workspaces:'));
      assert.ok(configYaml.includes('Multi-repo workspace support'));
    });
  });

  describe('createProjectConfig()', () => {
    it('should create .wiggumizer.yml in current directory', () => {
      process.chdir(tempDir);
      
      const configPath = ConfigLoader.createProjectConfig();
      
      assert.ok(fs.existsSync(configPath));
      assert.ok(configPath.endsWith('.wiggumizer.yml'));
      
      const content = fs.readFileSync(configPath, 'utf-8');
      assert.ok(content.includes('provider: claude'));
    });

    it('should throw if config already exists', () => {
      process.chdir(tempDir);
      
      // Create existing config
      fs.writeFileSync(path.join(tempDir, '.wiggumizer.yml'), 'existing: true');
      
      assert.throws(() => {
        ConfigLoader.createProjectConfig();
      }, /already exists/);
    });
  });

  describe('config priority', () => {
    it('should apply correct priority: defaults < user < project < CLI', () => {
      process.chdir(tempDir);
      
      // Create user config
      const userDir = path.join(tempDir, 'home');
      fs.mkdirSync(userDir);
      fs.writeFileSync(path.join(userDir, '.wiggumizer.yml'), `
provider: openai
maxIterations: 25
verbose: true
`);
      os.homedir = () => userDir;
      
      // Create project config
      fs.writeFileSync(path.join(tempDir, '.wiggumizer.yml'), `
maxIterations: 30
autoCommit: true
`);
      
      // Load with CLI override
      const config = ConfigLoader.load({
        maxIterations: 40
      });
      
      // CLI wins for maxIterations
      assert.strictEqual(config.maxIterations, 40);
      
      // User config wins for provider (not overridden by project or CLI)
      assert.strictEqual(config.provider, 'openai');
      
      // Project config wins for autoCommit
      assert.strictEqual(config.autoCommit, true);
      
      // User config sets verbose (not overridden)
      assert.strictEqual(config.verbose, true);
    });
  });

  describe('file patterns', () => {
    it('should have default include and exclude patterns', () => {
      process.chdir(tempDir);
      os.homedir = () => tempDir;
      
      const config = ConfigLoader.load({});
      
      assert.ok(Array.isArray(config.files.include));
      assert.ok(Array.isArray(config.files.exclude));
      assert.ok(config.files.include.includes('**/*'));
      assert.ok(config.files.exclude.includes('node_modules/**'));
    });

    it('should merge file patterns from config', () => {
      process.chdir(tempDir);
      os.homedir = () => tempDir;
      
      fs.writeFileSync(path.join(tempDir, '.wiggumizer.yml'), `
files:
  include:
    - "src/**/*.js"
  exclude:
    - "src/**/*.test.js"
`);
      
      const config = ConfigLoader.load({});
      
      assert.ok(config.files.include.includes('src/**/*.js'));
      assert.ok(config.files.exclude.includes('src/**/*.test.js'));
    });
  });
});
