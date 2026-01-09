const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ConfigLoader = require('../src/config');

describe('ConfigLoader', () => {
  let tempDir;
  let originalCwd;
  let originalHome;

  beforeEach(() => {
    // Create a temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wiggumizer-config-test-'));
    originalCwd = process.cwd();
    originalHome = os.homedir;
    
    // Change to temp directory for tests
    process.chdir(tempDir);
  });

  afterEach(() => {
    // Restore original directory
    process.chdir(originalCwd);
    
    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('load()', () => {
    it('should return default configuration when no config files exist', () => {
      const config = ConfigLoader.load();

      assert.strictEqual(config.provider, 'claude');
      assert.strictEqual(config.maxIterations, 20);
      assert.strictEqual(config.convergenceThreshold, 0.02);
      assert.strictEqual(config.autoCommit, false);
      assert.strictEqual(config.verbose, false);
      assert.strictEqual(config.dryRun, false);
    });

    it('should have default context limits', () => {
      const config = ConfigLoader.load();

      assert.strictEqual(config.context.maxSize, 100000);
      assert.strictEqual(config.context.maxFiles, 50);
    });

    it('should have default file patterns', () => {
      const config = ConfigLoader.load();

      assert.ok(Array.isArray(config.files.include));
      assert.ok(Array.isArray(config.files.exclude));
      assert.ok(config.files.exclude.includes('node_modules/**'));
      assert.ok(config.files.exclude.includes('.git/**'));
    });

    it('should have default retry configuration', () => {
      const config = ConfigLoader.load();

      assert.strictEqual(config.retry.maxRetries, 3);
      assert.strictEqual(config.retry.baseDelay, 1000);
      assert.strictEqual(config.retry.maxDelay, 30000);
    });

    it('should have default rate limit configuration', () => {
      const config = ConfigLoader.load();

      assert.strictEqual(config.rateLimit.requestsPerMinute, 50);
      assert.strictEqual(config.rateLimit.requestsPerHour, 1000);
    });

    it('should have default provider configurations', () => {
      const config = ConfigLoader.load();

      assert.ok(config.providers.claude);
      assert.strictEqual(config.providers.claude.model, 'claude-opus-4-5-20251101');
      assert.strictEqual(config.providers.claude.maxTokens, 8192);

      assert.ok(config.providers.openai);
      assert.strictEqual(config.providers.openai.model, 'gpt-5');
    });

    it('should merge CLI options over defaults', () => {
      const config = ConfigLoader.load({
        provider: 'openai',
        maxIterations: 50,
        verbose: true
      });

      assert.strictEqual(config.provider, 'openai');
      assert.strictEqual(config.maxIterations, 50);
      assert.strictEqual(config.verbose, true);
      // Other defaults should remain
      assert.strictEqual(config.autoCommit, false);
    });
  });

  describe('loadProjectConfig()', () => {
    it('should load project config from .wiggumizer.yml', () => {
      const projectConfig = `
provider: openai
maxIterations: 30
autoCommit: true
context:
  maxSize: 50000
`;
      fs.writeFileSync(path.join(tempDir, '.wiggumizer.yml'), projectConfig);

      const config = ConfigLoader.load();

      assert.strictEqual(config.provider, 'openai');
      assert.strictEqual(config.maxIterations, 30);
      assert.strictEqual(config.autoCommit, true);
      assert.strictEqual(config.context.maxSize, 50000);
    });

    it('should return empty object when project config does not exist', () => {
      const projectConfig = ConfigLoader.loadProjectConfig();
      assert.deepStrictEqual(projectConfig, {});
    });

    it('should handle malformed YAML gracefully', () => {
      fs.writeFileSync(path.join(tempDir, '.wiggumizer.yml'), 'invalid: yaml: content:');
      
      // Should not throw, just return empty or partial config
      const projectConfig = ConfigLoader.loadProjectConfig();
      assert.ok(typeof projectConfig === 'object');
    });
  });

  describe('loadConfigFile()', () => {
    it('should parse valid YAML config file', () => {
      const configContent = `
provider: claude
maxIterations: 15
files:
  include:
    - "src/**/*.js"
  exclude:
    - "test/**"
`;
      const configPath = path.join(tempDir, 'test-config.yml');
      fs.writeFileSync(configPath, configContent);

      const config = ConfigLoader.loadConfigFile(configPath);

      assert.strictEqual(config.provider, 'claude');
      assert.strictEqual(config.maxIterations, 15);
      assert.deepStrictEqual(config.files.include, ['src/**/*.js']);
      assert.deepStrictEqual(config.files.exclude, ['test/**']);
    });

    it('should return empty object for non-existent file', () => {
      const config = ConfigLoader.loadConfigFile('/nonexistent/path.yml');
      assert.deepStrictEqual(config, {});
    });
  });

  describe('mergeConfigs()', () => {
    it('should merge multiple config objects', () => {
      const defaults = { a: 1, b: 2, nested: { x: 10 } };
      const override = { b: 3, c: 4, nested: { y: 20 } };

      const merged = ConfigLoader.mergeConfigs(defaults, override);

      assert.strictEqual(merged.a, 1);
      assert.strictEqual(merged.b, 3);
      assert.strictEqual(merged.c, 4);
      assert.strictEqual(merged.nested.x, 10);
      assert.strictEqual(merged.nested.y, 20);
    });

    it('should handle deep nesting', () => {
      const defaults = {
        level1: {
          level2: {
            level3: { value: 'original' }
          }
        }
      };
      const override = {
        level1: {
          level2: {
            level3: { value: 'overridden', newKey: 'added' }
          }
        }
      };

      const merged = ConfigLoader.mergeConfigs(defaults, override);

      assert.strictEqual(merged.level1.level2.level3.value, 'overridden');
      assert.strictEqual(merged.level1.level2.level3.newKey, 'added');
    });

    it('should skip null and undefined values', () => {
      const defaults = { a: 1, b: 2 };
      const override = { a: null, b: undefined, c: 3 };

      const merged = ConfigLoader.mergeConfigs(defaults, override);

      assert.strictEqual(merged.a, 1); // Not overridden by null
      assert.strictEqual(merged.b, 2); // Not overridden by undefined
      assert.strictEqual(merged.c, 3);
    });

    it('should merge arrays by replacement, not concatenation', () => {
      const defaults = { items: [1, 2, 3] };
      const override = { items: [4, 5] };

      const merged = ConfigLoader.mergeConfigs(defaults, override);

      assert.deepStrictEqual(merged.items, [4, 5]);
    });
  });

  describe('deepMerge()', () => {
    it('should modify target object in place', () => {
      const target = { a: 1 };
      const source = { b: 2 };

      ConfigLoader.deepMerge(target, source);

      assert.strictEqual(target.a, 1);
      assert.strictEqual(target.b, 2);
    });

    it('should recursively merge nested objects', () => {
      const target = { nested: { a: 1 } };
      const source = { nested: { b: 2 } };

      ConfigLoader.deepMerge(target, source);

      assert.strictEqual(target.nested.a, 1);
      assert.strictEqual(target.nested.b, 2);
    });
  });

  describe('generateDefaultConfig()', () => {
    it('should generate valid YAML string', () => {
      const configYaml = ConfigLoader.generateDefaultConfig();

      assert.ok(typeof configYaml === 'string');
      assert.ok(configYaml.length > 0);
      assert.ok(configYaml.includes('provider:'));
      assert.ok(configYaml.includes('maxIterations:'));
    });

    it('should contain all important configuration sections', () => {
      const configYaml = ConfigLoader.generateDefaultConfig();

      assert.ok(configYaml.includes('provider:'));
      assert.ok(configYaml.includes('maxIterations:'));
      assert.ok(configYaml.includes('context:'));
      assert.ok(configYaml.includes('files:'));
      assert.ok(configYaml.includes('retry:'));
      assert.ok(configYaml.includes('rateLimit:'));
      assert.ok(configYaml.includes('providers:'));
    });

    it('should include workspace configuration comments', () => {
      const configYaml = ConfigLoader.generateDefaultConfig();

      assert.ok(configYaml.includes('workspaces:'));
      assert.ok(configYaml.includes('Multi-repo'));
    });
  });

  describe('createProjectConfig()', () => {
    it('should create .wiggumizer.yml in current directory', () => {
      const configPath = ConfigLoader.createProjectConfig();

      assert.ok(fs.existsSync(configPath));
      assert.strictEqual(path.basename(configPath), '.wiggumizer.yml');
    });

    it('should throw error if config already exists', () => {
      fs.writeFileSync(path.join(tempDir, '.wiggumizer.yml'), 'existing: config');

      assert.throws(() => {
        ConfigLoader.createProjectConfig();
      }, /already exists/);
    });

    it('should create config with valid YAML content', () => {
      const configPath = ConfigLoader.createProjectConfig();
      const content = fs.readFileSync(configPath, 'utf-8');

      // Should be parseable
      const yaml = require('yaml');
      const parsed = yaml.parse(content);

      assert.ok(parsed.provider);
      assert.ok(parsed.maxIterations);
    });
  });

  describe('config priority order', () => {
    it('should respect priority: CLI > project > defaults', () => {
      // Create project config
      const projectConfig = `
provider: openai
maxIterations: 25
verbose: true
`;
      fs.writeFileSync(path.join(tempDir, '.wiggumizer.yml'), projectConfig);

      // CLI options override project config
      const config = ConfigLoader.load({
        maxIterations: 100  // This should override project's 25
      });

      assert.strictEqual(config.provider, 'openai'); // From project config
      assert.strictEqual(config.maxIterations, 100); // From CLI
      assert.strictEqual(config.verbose, true); // From project config
      assert.strictEqual(config.autoCommit, false); // From defaults
    });
  });

  describe('workspaces configuration', () => {
    it('should default to null (single repo mode)', () => {
      const config = ConfigLoader.load();
      assert.strictEqual(config.workspaces, null);
    });

    it('should load workspaces from project config', () => {
      const projectConfig = `
workspaces:
  - name: backend
    path: ../backend
  - name: frontend
    path: ../frontend
`;
      fs.writeFileSync(path.join(tempDir, '.wiggumizer.yml'), projectConfig);

      const config = ConfigLoader.load();

      assert.ok(Array.isArray(config.workspaces));
      assert.strictEqual(config.workspaces.length, 2);
      assert.strictEqual(config.workspaces[0].name, 'backend');
      assert.strictEqual(config.workspaces[1].name, 'frontend');
    });
  });
});
