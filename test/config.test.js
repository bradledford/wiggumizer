const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Mock fs and path for testing
const ConfigLoader = require('../src/config');

describe('ConfigLoader', () => {
  // Store original process.cwd
  const originalCwd = process.cwd();
  let tempDir;

  beforeEach(() => {
    // Create a temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wiggumizer-test-'));
    process.chdir(tempDir);
  });

  afterEach(() => {
    // Restore original cwd and clean up
    process.chdir(originalCwd);
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

    it('should have correct default context limits', () => {
      const config = ConfigLoader.load();

      assert.strictEqual(config.context.maxSize, 100000);
      assert.strictEqual(config.context.maxFiles, 50);
    });

    it('should have correct default file patterns', () => {
      const config = ConfigLoader.load();

      assert.ok(Array.isArray(config.files.include));
      assert.ok(Array.isArray(config.files.exclude));
      assert.ok(config.files.include.includes('**/*'));
      assert.ok(config.files.exclude.includes('node_modules/**'));
      assert.ok(config.files.exclude.includes('.git/**'));
    });

    it('should have correct default retry configuration', () => {
      const config = ConfigLoader.load();

      assert.strictEqual(config.retry.maxRetries, 3);
      assert.strictEqual(config.retry.baseDelay, 1000);
      assert.strictEqual(config.retry.maxDelay, 30000);
    });

    it('should have correct default rate limit configuration', () => {
      const config = ConfigLoader.load();

      assert.strictEqual(config.rateLimit.requestsPerMinute, 50);
      assert.strictEqual(config.rateLimit.requestsPerHour, 1000);
    });

    it('should have correct default provider configurations', () => {
      const config = ConfigLoader.load();

      assert.strictEqual(config.providers.claude.model, 'claude-opus-4-5-20251101');
      assert.strictEqual(config.providers.claude.maxTokens, 16384);
      assert.strictEqual(config.providers.openai.model, 'gpt-5');
      assert.strictEqual(config.providers.openai.maxTokens, 16384);
    });

    it('should have null workspaces by default', () => {
      const config = ConfigLoader.load();

      assert.strictEqual(config.workspaces, null);
    });
  });

  describe('loadProjectConfig()', () => {
    it('should load configuration from .wiggumizer.yml', () => {
      const projectConfig = `
provider: openai
maxIterations: 10
autoCommit: true
`;
      fs.writeFileSync('.wiggumizer.yml', projectConfig);

      const config = ConfigLoader.load();

      assert.strictEqual(config.provider, 'openai');
      assert.strictEqual(config.maxIterations, 10);
      assert.strictEqual(config.autoCommit, true);
    });

    it('should merge project config with defaults', () => {
      const projectConfig = `
maxIterations: 5
`;
      fs.writeFileSync('.wiggumizer.yml', projectConfig);

      const config = ConfigLoader.load();

      // Overridden value
      assert.strictEqual(config.maxIterations, 5);
      // Default values preserved
      assert.strictEqual(config.provider, 'claude');
      assert.strictEqual(config.convergenceThreshold, 0.02);
    });

    it('should handle nested configuration', () => {
      const projectConfig = `
context:
  maxSize: 50000
  maxFiles: 25
retry:
  maxRetries: 5
`;
      fs.writeFileSync('.wiggumizer.yml', projectConfig);

      const config = ConfigLoader.load();

      assert.strictEqual(config.context.maxSize, 50000);
      assert.strictEqual(config.context.maxFiles, 25);
      assert.strictEqual(config.retry.maxRetries, 5);
      // Default preserved
      assert.strictEqual(config.retry.baseDelay, 1000);
    });

    it('should load workspace configuration', () => {
      const projectConfig = `
workspaces:
  - name: backend
    path: ../backend
  - name: frontend
    path: ../frontend
`;
      fs.writeFileSync('.wiggumizer.yml', projectConfig);

      const config = ConfigLoader.load();

      assert.ok(Array.isArray(config.workspaces));
      assert.strictEqual(config.workspaces.length, 2);
      assert.strictEqual(config.workspaces[0].name, 'backend');
      assert.strictEqual(config.workspaces[1].name, 'frontend');
    });

    it('should return empty object if config file does not exist', () => {
      const projectConfig = ConfigLoader.loadProjectConfig();

      assert.deepStrictEqual(projectConfig, {});
    });

    it('should handle invalid YAML gracefully', () => {
      fs.writeFileSync('.wiggumizer.yml', '  invalid: yaml: content:');

      // Should not throw, returns empty object
      const projectConfig = ConfigLoader.loadProjectConfig();
      assert.ok(typeof projectConfig === 'object');
    });
  });

  describe('CLI options override', () => {
    it('should override project config with CLI options', () => {
      const projectConfig = `
provider: openai
maxIterations: 10
`;
      fs.writeFileSync('.wiggumizer.yml', projectConfig);

      const cliOptions = {
        provider: 'claude',
        maxIterations: 30
      };

      const config = ConfigLoader.load(cliOptions);

      // CLI options should win
      assert.strictEqual(config.provider, 'claude');
      assert.strictEqual(config.maxIterations, 30);
    });

    it('should not override with null/undefined CLI options', () => {
      const projectConfig = `
provider: openai
maxIterations: 10
`;
      fs.writeFileSync('.wiggumizer.yml', projectConfig);

      const cliOptions = {
        provider: null,
        maxIterations: undefined,
        verbose: true
      };

      const config = ConfigLoader.load(cliOptions);

      // null/undefined should not override
      assert.strictEqual(config.provider, 'openai');
      assert.strictEqual(config.maxIterations, 10);
      // But defined values should
      assert.strictEqual(config.verbose, true);
    });
  });

  describe('mergeConfigs()', () => {
    it('should merge multiple config objects', () => {
      const config1 = { a: 1, b: 2 };
      const config2 = { b: 3, c: 4 };
      const config3 = { c: 5, d: 6 };

      const merged = ConfigLoader.mergeConfigs(config1, config2, config3);

      assert.strictEqual(merged.a, 1);
      assert.strictEqual(merged.b, 3);
      assert.strictEqual(merged.c, 5);
      assert.strictEqual(merged.d, 6);
    });

    it('should deep merge nested objects', () => {
      const config1 = {
        outer: {
          inner1: 'a',
          inner2: 'b'
        }
      };
      const config2 = {
        outer: {
          inner2: 'c',
          inner3: 'd'
        }
      };

      const merged = ConfigLoader.mergeConfigs(config1, config2);

      assert.strictEqual(merged.outer.inner1, 'a');
      assert.strictEqual(merged.outer.inner2, 'c');
      assert.strictEqual(merged.outer.inner3, 'd');
    });

    it('should handle arrays (replace, not merge)', () => {
      const config1 = { arr: [1, 2, 3] };
      const config2 = { arr: [4, 5] };

      const merged = ConfigLoader.mergeConfigs(config1, config2);

      assert.deepStrictEqual(merged.arr, [4, 5]);
    });
  });

  describe('deepMerge()', () => {
    it('should skip null values', () => {
      const target = { a: 1, b: 2 };
      const source = { a: null, b: 3 };

      ConfigLoader.deepMerge(target, source);

      assert.strictEqual(target.a, 1); // Not overwritten
      assert.strictEqual(target.b, 3); // Overwritten
    });

    it('should skip undefined values', () => {
      const target = { a: 1, b: 2 };
      const source = { a: undefined, c: 3 };

      ConfigLoader.deepMerge(target, source);

      assert.strictEqual(target.a, 1); // Not overwritten
      assert.strictEqual(target.c, 3); // Added
    });

    it('should handle deeply nested objects', () => {
      const target = {
        level1: {
          level2: {
            level3: {
              value: 'original'
            }
          }
        }
      };
      const source = {
        level1: {
          level2: {
            level3: {
              value: 'updated',
              newKey: 'added'
            }
          }
        }
      };

      ConfigLoader.deepMerge(target, source);

      assert.strictEqual(target.level1.level2.level3.value, 'updated');
      assert.strictEqual(target.level1.level2.level3.newKey, 'added');
    });
  });

  describe('generateDefaultConfig()', () => {
    it('should return a valid YAML string', () => {
      const configYaml = ConfigLoader.generateDefaultConfig();

      assert.ok(typeof configYaml === 'string');
      assert.ok(configYaml.length > 0);
      assert.ok(configYaml.includes('provider:'));
      assert.ok(configYaml.includes('maxIterations:'));
    });

    it('should include all major configuration sections', () => {
      const configYaml = ConfigLoader.generateDefaultConfig();

      assert.ok(configYaml.includes('context:'));
      assert.ok(configYaml.includes('files:'));
      assert.ok(configYaml.includes('retry:'));
      assert.ok(configYaml.includes('rateLimit:'));
      assert.ok(configYaml.includes('providers:'));
    });

    it('should include workspace configuration example (commented)', () => {
      const configYaml = ConfigLoader.generateDefaultConfig();

      assert.ok(configYaml.includes('workspaces:'));
      assert.ok(configYaml.includes('# workspaces:') || configYaml.includes('workspace'));
    });
  });

  describe('createProjectConfig()', () => {
    it('should create .wiggumizer.yml file', () => {
      ConfigLoader.createProjectConfig();

      assert.ok(fs.existsSync('.wiggumizer.yml'));
    });

    it('should throw if .wiggumizer.yml already exists', () => {
      fs.writeFileSync('.wiggumizer.yml', 'existing: config');

      assert.throws(() => {
        ConfigLoader.createProjectConfig();
      }, /already exists/);
    });

    it('should return the config file path', () => {
      const configPath = ConfigLoader.createProjectConfig();

      assert.ok(configPath.endsWith('.wiggumizer.yml'));
    });

    it('should create parseable YAML', () => {
      ConfigLoader.createProjectConfig();

      const content = fs.readFileSync('.wiggumizer.yml', 'utf-8');
      const yaml = require('yaml');
      const parsed = yaml.parse(content);

      assert.ok(typeof parsed === 'object');
      assert.strictEqual(parsed.provider, 'claude');
    });
  });

  describe('loadUserConfig()', () => {
    // Note: We can't easily test user config without mocking os.homedir()
    // This test verifies the method exists and returns an object

    it('should return an object (possibly empty)', () => {
      const userConfig = ConfigLoader.loadUserConfig();

      assert.ok(typeof userConfig === 'object');
    });
  });

  describe('loadConfigFile()', () => {
    it('should load and parse a valid YAML file', () => {
      const testConfig = `
key1: value1
key2: 42
nested:
  key3: true
`;
      fs.writeFileSync('test-config.yml', testConfig);

      const config = ConfigLoader.loadConfigFile(path.join(tempDir, 'test-config.yml'));

      assert.strictEqual(config.key1, 'value1');
      assert.strictEqual(config.key2, 42);
      assert.strictEqual(config.nested.key3, true);
    });

    it('should return empty object for non-existent file', () => {
      const config = ConfigLoader.loadConfigFile('/non/existent/path.yml');

      assert.deepStrictEqual(config, {});
    });

    it('should handle empty YAML file', () => {
      fs.writeFileSync('empty.yml', '');

      const config = ConfigLoader.loadConfigFile(path.join(tempDir, 'empty.yml'));

      assert.deepStrictEqual(config, {});
    });
  });

  describe('Configuration priority', () => {
    it('should apply correct priority: defaults < project < CLI', () => {
      // Create project config
      const projectConfig = `
provider: openai
maxIterations: 15
verbose: true
`;
      fs.writeFileSync('.wiggumizer.yml', projectConfig);

      // CLI options override
      const cliOptions = {
        maxIterations: 25
      };

      const config = ConfigLoader.load(cliOptions);

      // Default value (not overridden)
      assert.strictEqual(config.convergenceThreshold, 0.02);
      // Project config value
      assert.strictEqual(config.provider, 'openai');
      assert.strictEqual(config.verbose, true);
      // CLI override
      assert.strictEqual(config.maxIterations, 25);
    });
  });

  describe('Files configuration', () => {
    it('should merge file include/exclude patterns', () => {
      const projectConfig = `
files:
  include:
    - "src/**/*.ts"
    - "lib/**/*.ts"
  exclude:
    - "**/*.test.ts"
`;
      fs.writeFileSync('.wiggumizer.yml', projectConfig);

      const config = ConfigLoader.load();

      assert.ok(config.files.include.includes('src/**/*.ts'));
      assert.ok(config.files.include.includes('lib/**/*.ts'));
      assert.ok(config.files.exclude.includes('**/*.test.ts'));
    });
  });

  describe('Provider-specific configuration', () => {
    it('should allow overriding provider model', () => {
      const projectConfig = `
providers:
  claude:
    model: claude-3-5-sonnet-20241022
    maxTokens: 4096
`;
      fs.writeFileSync('.wiggumizer.yml', projectConfig);

      const config = ConfigLoader.load();

      assert.strictEqual(config.providers.claude.model, 'claude-3-5-sonnet-20241022');
      assert.strictEqual(config.providers.claude.maxTokens, 4096);
      // OpenAI defaults preserved
      assert.strictEqual(config.providers.openai.model, 'gpt-5');
    });
  });

  describe('Fast mode configuration', () => {
    it('should have fast mode disabled by default', () => {
      const config = ConfigLoader.load();

      assert.strictEqual(config.fast, false);
    });

    it('should have fast mode provider configurations', () => {
      const config = ConfigLoader.load();

      assert.ok(config.fastMode);
      assert.ok(config.fastMode.providers);
      assert.ok(config.fastMode.providers.claude);
      assert.ok(config.fastMode.providers['claude-cli']);
      assert.ok(config.fastMode.providers.openai);
    });

    it('should have correct fast mode model defaults', () => {
      const config = ConfigLoader.load();

      // Fast mode should use Sonnet for Claude
      assert.ok(config.fastMode.providers.claude.model.includes('sonnet'));
      assert.ok(config.fastMode.providers['claude-cli'].model.includes('sonnet'));
    });

    it('should have reduced maxTokens in fast mode', () => {
      const config = ConfigLoader.load();

      // Fast mode should use 8192 tokens (half of normal)
      assert.strictEqual(config.fastMode.providers.claude.maxTokens, 8192);
      assert.strictEqual(config.fastMode.providers['claude-cli'].maxTokens, 8192);
      assert.strictEqual(config.fastMode.providers.openai.maxTokens, 8192);
    });

    it('should have reduced maxIterations in fast mode', () => {
      const config = ConfigLoader.load();

      // Fast mode should default to 10 iterations (half of normal)
      assert.strictEqual(config.fastMode.maxIterations, 10);
    });

    it('should include fast option in generated config', () => {
      const configYaml = ConfigLoader.generateDefaultConfig();

      assert.ok(configYaml.includes('fast:'));
      assert.ok(configYaml.includes('--fast'));
    });
  });
});
