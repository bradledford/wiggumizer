const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// We need to test ConfigLoader
const ConfigLoader = require('../src/config');

describe('ConfigLoader', () => {
  let tempDir;
  let originalCwd;
  let originalHome;

  beforeEach(() => {
    // Create temp directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wiggumizer-config-test-'));
    originalCwd = process.cwd();
    originalHome = os.homedir;

    // Override process.cwd() for tests
    process.chdir(tempDir);
  });

  afterEach(() => {
    // Restore original cwd
    process.chdir(originalCwd);

    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('load()', () => {
    it('should return default config when no config files exist', () => {
      const config = ConfigLoader.load({});

      assert.strictEqual(config.provider, 'claude');
      assert.strictEqual(config.maxIterations, 20);
      assert.strictEqual(config.convergenceThreshold, 0.02);
      assert.strictEqual(config.autoCommit, false);
      assert.strictEqual(config.verbose, false);
      assert.strictEqual(config.dryRun, false);
    });

    it('should have correct default context limits', () => {
      const config = ConfigLoader.load({});

      assert.strictEqual(config.context.maxSize, 100000);
      assert.strictEqual(config.context.maxFiles, 50);
    });

    it('should have correct default retry settings', () => {
      const config = ConfigLoader.load({});

      assert.strictEqual(config.retry.maxRetries, 3);
      assert.strictEqual(config.retry.baseDelay, 1000);
      assert.strictEqual(config.retry.maxDelay, 30000);
    });

    it('should have correct default rate limit settings', () => {
      const config = ConfigLoader.load({});

      assert.strictEqual(config.rateLimit.requestsPerMinute, 50);
      assert.strictEqual(config.rateLimit.requestsPerHour, 1000);
    });

    it('should have correct default provider settings', () => {
      const config = ConfigLoader.load({});

      assert.strictEqual(config.providers.claude.model, 'claude-opus-4-5-20251101');
      assert.strictEqual(config.providers.claude.maxTokens, 8192);
      assert.strictEqual(config.providers.openai.model, 'gpt-5');
      assert.strictEqual(config.providers.openai.maxTokens, 8192);
    });

    it('should have correct default file patterns', () => {
      const config = ConfigLoader.load({});

      assert.deepStrictEqual(config.files.include, ['**/*']);
      assert.ok(config.files.exclude.includes('node_modules/**'));
      assert.ok(config.files.exclude.includes('.git/**'));
      assert.ok(config.files.exclude.includes('dist/**'));
    });

    it('should override defaults with CLI options', () => {
      const config = ConfigLoader.load({
        provider: 'openai',
        maxIterations: 50,
        verbose: true,
        dryRun: true
      });

      assert.strictEqual(config.provider, 'openai');
      assert.strictEqual(config.maxIterations, 50);
      assert.strictEqual(config.verbose, true);
      assert.strictEqual(config.dryRun, true);
    });

    it('should not override with null CLI options', () => {
      const config = ConfigLoader.load({
        provider: null,
        maxIterations: undefined
      });

      assert.strictEqual(config.provider, 'claude');
      assert.strictEqual(config.maxIterations, 20);
    });
  });

  describe('loadConfigFile()', () => {
    it('should return empty object for non-existent file', () => {
      const config = ConfigLoader.loadConfigFile('/nonexistent/path/.wiggumizer.yml');
      assert.deepStrictEqual(config, {});
    });

    it('should parse valid YAML config', () => {
      const configPath = path.join(tempDir, 'test-config.yml');
      fs.writeFileSync(configPath, `
provider: openai
maxIterations: 30
context:
  maxSize: 50000
  maxFiles: 25
`, 'utf-8');

      const config = ConfigLoader.loadConfigFile(configPath);

      assert.strictEqual(config.provider, 'openai');
      assert.strictEqual(config.maxIterations, 30);
      assert.strictEqual(config.context.maxSize, 50000);
      assert.strictEqual(config.context.maxFiles, 25);
    });

    it('should handle empty YAML file', () => {
      const configPath = path.join(tempDir, 'empty-config.yml');
      fs.writeFileSync(configPath, '', 'utf-8');

      const config = ConfigLoader.loadConfigFile(configPath);
      assert.deepStrictEqual(config, {});
    });

    it('should handle YAML with only comments', () => {
      const configPath = path.join(tempDir, 'comments-config.yml');
      fs.writeFileSync(configPath, '# This is a comment\n# Another comment\n', 'utf-8');

      const config = ConfigLoader.loadConfigFile(configPath);
      assert.deepStrictEqual(config, {});
    });

    it('should return empty object for invalid YAML', () => {
      const configPath = path.join(tempDir, 'invalid-config.yml');
      fs.writeFileSync(configPath, 'invalid: yaml: content: [broken', 'utf-8');

      // Should not throw, just return empty
      const config = ConfigLoader.loadConfigFile(configPath);
      assert.deepStrictEqual(config, {});
    });
  });

  describe('loadProjectConfig()', () => {
    it('should load .wiggumizer.yml from current directory', () => {
      const configPath = path.join(tempDir, '.wiggumizer.yml');
      fs.writeFileSync(configPath, `
provider: claude
maxIterations: 15
autoCommit: true
`, 'utf-8');

      const config = ConfigLoader.loadProjectConfig();

      assert.strictEqual(config.provider, 'claude');
      assert.strictEqual(config.maxIterations, 15);
      assert.strictEqual(config.autoCommit, true);
    });

    it('should return empty object when no project config exists', () => {
      const config = ConfigLoader.loadProjectConfig();
      assert.deepStrictEqual(config, {});
    });
  });

  describe('mergeConfigs()', () => {
    it('should merge multiple configs with later ones taking precedence', () => {
      const merged = ConfigLoader.mergeConfigs(
        { a: 1, b: 2 },
        { b: 3, c: 4 },
        { c: 5, d: 6 }
      );

      assert.strictEqual(merged.a, 1);
      assert.strictEqual(merged.b, 3);
      assert.strictEqual(merged.c, 5);
      assert.strictEqual(merged.d, 6);
    });

    it('should deep merge nested objects', () => {
      const merged = ConfigLoader.mergeConfigs(
        { context: { maxSize: 100, maxFiles: 50 } },
        { context: { maxSize: 200 } }
      );

      assert.strictEqual(merged.context.maxSize, 200);
      assert.strictEqual(merged.context.maxFiles, 50);
    });

    it('should handle empty configs', () => {
      const merged = ConfigLoader.mergeConfigs(
        { a: 1 },
        {},
        { b: 2 }
      );

      assert.strictEqual(merged.a, 1);
      assert.strictEqual(merged.b, 2);
    });

    it('should skip null values', () => {
      const merged = ConfigLoader.mergeConfigs(
        { a: 1, b: 2 },
        { a: null, b: 3 }
      );

      assert.strictEqual(merged.a, 1);
      assert.strictEqual(merged.b, 3);
    });

    it('should skip undefined values', () => {
      const merged = ConfigLoader.mergeConfigs(
        { a: 1, b: 2 },
        { a: undefined, b: 3 }
      );

      assert.strictEqual(merged.a, 1);
      assert.strictEqual(merged.b, 3);
    });
  });

  describe('deepMerge()', () => {
    it('should recursively merge nested objects', () => {
      const target = {
        level1: {
          level2: {
            a: 1,
            b: 2
          }
        }
      };

      ConfigLoader.deepMerge(target, {
        level1: {
          level2: {
            b: 3,
            c: 4
          }
        }
      });

      assert.strictEqual(target.level1.level2.a, 1);
      assert.strictEqual(target.level1.level2.b, 3);
      assert.strictEqual(target.level1.level2.c, 4);
    });

    it('should replace arrays instead of merging them', () => {
      const target = {
        items: [1, 2, 3]
      };

      ConfigLoader.deepMerge(target, {
        items: [4, 5]
      });

      assert.deepStrictEqual(target.items, [4, 5]);
    });
  });

  describe('generateDefaultConfig()', () => {
    it('should return valid YAML string', () => {
      const yaml = require('yaml');
      const configYaml = ConfigLoader.generateDefaultConfig();

      // Should not throw
      const parsed = yaml.parse(configYaml);

      assert.strictEqual(parsed.provider, 'claude');
      assert.strictEqual(parsed.maxIterations, 20);
    });

    it('should include all major configuration sections', () => {
      const configYaml = ConfigLoader.generateDefaultConfig();

      assert.ok(configYaml.includes('provider:'));
      assert.ok(configYaml.includes('maxIterations:'));
      assert.ok(configYaml.includes('context:'));
      assert.ok(configYaml.includes('files:'));
      assert.ok(configYaml.includes('retry:'));
      assert.ok(configYaml.includes('rateLimit:'));
      assert.ok(configYaml.includes('providers:'));
    });

    it('should include helpful comments', () => {
      const configYaml = ConfigLoader.generateDefaultConfig();

      assert.ok(configYaml.includes('# Wiggumizer Configuration'));
      assert.ok(configYaml.includes('# Default AI provider'));
    });
  });

  describe('createProjectConfig()', () => {
    it('should create .wiggumizer.yml in current directory', () => {
      const configPath = ConfigLoader.createProjectConfig();

      assert.strictEqual(configPath, path.join(tempDir, '.wiggumizer.yml'));
      assert.ok(fs.existsSync(configPath));

      // Verify content is valid YAML
      const content = fs.readFileSync(configPath, 'utf-8');
      const yaml = require('yaml');
      const parsed = yaml.parse(content);

      assert.strictEqual(parsed.provider, 'claude');
    });

    it('should throw if config already exists', () => {
      // Create existing config
      const existingPath = path.join(tempDir, '.wiggumizer.yml');
      fs.writeFileSync(existingPath, 'existing: true', 'utf-8');

      assert.throws(() => {
        ConfigLoader.createProjectConfig();
      }, /already exists/);
    });
  });

  describe('config priority (integration)', () => {
    it('should apply correct priority: defaults < project < CLI', () => {
      // Create project config with some overrides
      const projectConfigPath = path.join(tempDir, '.wiggumizer.yml');
      fs.writeFileSync(projectConfigPath, `
provider: openai
maxIterations: 25
context:
  maxSize: 75000
`, 'utf-8');

      // Load with CLI overrides
      const config = ConfigLoader.load({
        maxIterations: 30,
        verbose: true
      });

      // CLI should override project
      assert.strictEqual(config.maxIterations, 30);
      assert.strictEqual(config.verbose, true);

      // Project should override defaults
      assert.strictEqual(config.provider, 'openai');
      assert.strictEqual(config.context.maxSize, 75000);

      // Defaults should remain where not overridden
      assert.strictEqual(config.context.maxFiles, 50);
      assert.strictEqual(config.autoCommit, false);
    });
  });
});
