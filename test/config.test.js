const { describe, it, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// We need to test ConfigLoader, but it uses process.cwd() and os.homedir()
// We'll mock the file system operations

describe('ConfigLoader', () => {
  let ConfigLoader;
  let originalCwd;
  let tempDir;

  beforeEach(() => {
    // Create a temp directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wiggumizer-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    // Clear require cache to get fresh module
    delete require.cache[require.resolve('../src/config')];
    ConfigLoader = require('../src/config');
  });

  afterEach(() => {
    process.chdir(originalCwd);
    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('load()', () => {
    it('returns defaults when no config files exist', () => {
      const config = ConfigLoader.load();

      assert.strictEqual(config.provider, 'claude');
      assert.strictEqual(config.maxIterations, 20);
      assert.strictEqual(config.convergenceThreshold, 0.02);
      assert.strictEqual(config.autoCommit, false);
      assert.strictEqual(config.verbose, false);
      assert.strictEqual(config.dryRun, false);
    });

    it('includes default context limits', () => {
      const config = ConfigLoader.load();

      assert.strictEqual(config.context.maxSize, 100000);
      assert.strictEqual(config.context.maxFiles, 50);
    });

    it('includes default file patterns', () => {
      const config = ConfigLoader.load();

      assert.ok(Array.isArray(config.files.include));
      assert.ok(Array.isArray(config.files.exclude));
      assert.ok(config.files.include.includes('**/*'));
      assert.ok(config.files.exclude.includes('node_modules/**'));
    });

    it('includes default retry settings', () => {
      const config = ConfigLoader.load();

      assert.strictEqual(config.retry.maxRetries, 3);
      assert.strictEqual(config.retry.baseDelay, 1000);
      assert.strictEqual(config.retry.maxDelay, 30000);
    });

    it('includes default rate limit settings', () => {
      const config = ConfigLoader.load();

      assert.strictEqual(config.rateLimit.requestsPerMinute, 50);
      assert.strictEqual(config.rateLimit.requestsPerHour, 1000);
    });

    it('includes default provider configurations', () => {
      const config = ConfigLoader.load();

      assert.ok(config.providers.claude);
      assert.strictEqual(config.providers.claude.model, 'claude-opus-4-5-20251101');
      assert.strictEqual(config.providers.claude.maxTokens, 8192);
    });

    it('merges project config with defaults', () => {
      // Create project config
      fs.writeFileSync(
        path.join(tempDir, '.wiggumizer.yml'),
        'provider: openai\nmaxIterations: 10\n'
      );

      const config = ConfigLoader.load();

      assert.strictEqual(config.provider, 'openai');
      assert.strictEqual(config.maxIterations, 10);
      // Defaults should still be present
      assert.strictEqual(config.convergenceThreshold, 0.02);
    });

    it('CLI options override project config', () => {
      // Create project config
      fs.writeFileSync(
        path.join(tempDir, '.wiggumizer.yml'),
        'provider: openai\nmaxIterations: 10\n'
      );

      const config = ConfigLoader.load({
        provider: 'claude',
        verbose: true
      });

      assert.strictEqual(config.provider, 'claude');
      assert.strictEqual(config.maxIterations, 10);
      assert.strictEqual(config.verbose, true);
    });

    it('handles nested config merging', () => {
      // Create project config with nested values
      fs.writeFileSync(
        path.join(tempDir, '.wiggumizer.yml'),
        `context:
  maxSize: 50000
retry:
  maxRetries: 5
`
      );

      const config = ConfigLoader.load();

      // Overridden values
      assert.strictEqual(config.context.maxSize, 50000);
      assert.strictEqual(config.retry.maxRetries, 5);
      // Defaults should still be present
      assert.strictEqual(config.context.maxFiles, 50);
      assert.strictEqual(config.retry.baseDelay, 1000);
    });

    it('ignores null and undefined CLI options', () => {
      const config = ConfigLoader.load({
        provider: null,
        maxIterations: undefined
      });

      assert.strictEqual(config.provider, 'claude');
      assert.strictEqual(config.maxIterations, 20);
    });
  });

  describe('loadConfigFile()', () => {
    it('returns empty object for non-existent file', () => {
      const result = ConfigLoader.loadConfigFile('/nonexistent/path.yml');
      assert.deepStrictEqual(result, {});
    });

    it('parses valid YAML file', () => {
      const configPath = path.join(tempDir, 'test-config.yml');
      fs.writeFileSync(configPath, 'provider: claude\nmaxIterations: 15\n');

      const result = ConfigLoader.loadConfigFile(configPath);

      assert.strictEqual(result.provider, 'claude');
      assert.strictEqual(result.maxIterations, 15);
    });

    it('handles complex YAML structures', () => {
      const configPath = path.join(tempDir, 'complex-config.yml');
      fs.writeFileSync(configPath, `
provider: claude
files:
  include:
    - "src/**/*.js"
    - "lib/**/*.ts"
  exclude:
    - "**/*.test.js"
providers:
  claude:
    model: claude-3-opus
    maxTokens: 4096
`);

      const result = ConfigLoader.loadConfigFile(configPath);

      assert.strictEqual(result.provider, 'claude');
      assert.deepStrictEqual(result.files.include, ['src/**/*.js', 'lib/**/*.ts']);
      assert.deepStrictEqual(result.files.exclude, ['**/*.test.js']);
      assert.strictEqual(result.providers.claude.model, 'claude-3-opus');
    });

    it('returns empty object for invalid YAML', () => {
      const configPath = path.join(tempDir, 'invalid.yml');
      fs.writeFileSync(configPath, '{ invalid yaml: [');

      // Should not throw, just return empty object
      const result = ConfigLoader.loadConfigFile(configPath);
      assert.deepStrictEqual(result, {});
    });

    it('returns empty object for empty file', () => {
      const configPath = path.join(tempDir, 'empty.yml');
      fs.writeFileSync(configPath, '');

      const result = ConfigLoader.loadConfigFile(configPath);
      assert.deepStrictEqual(result, {});
    });
  });

  describe('mergeConfigs()', () => {
    it('merges multiple configs in order', () => {
      const config1 = { a: 1, b: 2 };
      const config2 = { b: 3, c: 4 };
      const config3 = { c: 5, d: 6 };

      const result = ConfigLoader.mergeConfigs(config1, config2, config3);

      assert.strictEqual(result.a, 1);
      assert.strictEqual(result.b, 3);
      assert.strictEqual(result.c, 5);
      assert.strictEqual(result.d, 6);
    });

    it('deep merges nested objects', () => {
      const config1 = {
        outer: {
          a: 1,
          b: 2,
          inner: { x: 10 }
        }
      };
      const config2 = {
        outer: {
          b: 3,
          c: 4,
          inner: { y: 20 }
        }
      };

      const result = ConfigLoader.mergeConfigs(config1, config2);

      assert.strictEqual(result.outer.a, 1);
      assert.strictEqual(result.outer.b, 3);
      assert.strictEqual(result.outer.c, 4);
      assert.strictEqual(result.outer.inner.x, 10);
      assert.strictEqual(result.outer.inner.y, 20);
    });

    it('overwrites arrays instead of merging them', () => {
      const config1 = { items: [1, 2, 3] };
      const config2 = { items: [4, 5] };

      const result = ConfigLoader.mergeConfigs(config1, config2);

      assert.deepStrictEqual(result.items, [4, 5]);
    });

    it('skips null and undefined values', () => {
      const config1 = { a: 1, b: 2, c: 3 };
      const config2 = { a: null, b: undefined, c: 4 };

      const result = ConfigLoader.mergeConfigs(config1, config2);

      assert.strictEqual(result.a, 1);
      assert.strictEqual(result.b, 2);
      assert.strictEqual(result.c, 4);
    });

    it('handles empty configs', () => {
      const config1 = { a: 1 };

      const result = ConfigLoader.mergeConfigs({}, config1, {});

      assert.strictEqual(result.a, 1);
    });
  });

  describe('deepMerge()', () => {
    it('modifies target in place', () => {
      const target = { a: 1 };
      const source = { b: 2 };

      ConfigLoader.deepMerge(target, source);

      assert.strictEqual(target.a, 1);
      assert.strictEqual(target.b, 2);
    });

    it('handles deeply nested objects', () => {
      const target = {
        level1: {
          level2: {
            level3: { a: 1 }
          }
        }
      };
      const source = {
        level1: {
          level2: {
            level3: { b: 2 }
          }
        }
      };

      ConfigLoader.deepMerge(target, source);

      assert.strictEqual(target.level1.level2.level3.a, 1);
      assert.strictEqual(target.level1.level2.level3.b, 2);
    });
  });

  describe('generateDefaultConfig()', () => {
    it('returns a valid YAML string', () => {
      const configString = ConfigLoader.generateDefaultConfig();

      assert.ok(typeof configString === 'string');
      assert.ok(configString.length > 100);
    });

    it('contains expected configuration keys', () => {
      const configString = ConfigLoader.generateDefaultConfig();

      assert.ok(configString.includes('provider:'));
      assert.ok(configString.includes('maxIterations:'));
      assert.ok(configString.includes('convergenceThreshold:'));
      assert.ok(configString.includes('autoCommit:'));
      assert.ok(configString.includes('context:'));
      assert.ok(configString.includes('files:'));
      assert.ok(configString.includes('retry:'));
      assert.ok(configString.includes('rateLimit:'));
      assert.ok(configString.includes('providers:'));
    });

    it('contains helpful comments', () => {
      const configString = ConfigLoader.generateDefaultConfig();

      assert.ok(configString.includes('#'));
      assert.ok(configString.includes('Wiggumizer Configuration'));
    });

    it('can be parsed as valid YAML', () => {
      const yaml = require('yaml');
      const configString = ConfigLoader.generateDefaultConfig();

      const parsed = yaml.parse(configString);

      assert.ok(parsed);
      assert.strictEqual(parsed.provider, 'claude');
      assert.strictEqual(parsed.maxIterations, 20);
    });
  });

  describe('createProjectConfig()', () => {
    it('creates .wiggumizer.yml in current directory', () => {
      const configPath = ConfigLoader.createProjectConfig();

      assert.ok(fs.existsSync(configPath));
      assert.ok(configPath.endsWith('.wiggumizer.yml'));
    });

    it('returns the path to created config', () => {
      const configPath = ConfigLoader.createProjectConfig();

      assert.strictEqual(
        configPath,
        path.join(tempDir, '.wiggumizer.yml')
      );
    });

    it('throws if config already exists', () => {
      // Create existing config
      fs.writeFileSync(
        path.join(tempDir, '.wiggumizer.yml'),
        'provider: claude\n'
      );

      assert.throws(
        () => ConfigLoader.createProjectConfig(),
        /already exists/
      );
    });

    it('creates valid YAML content', () => {
      const yaml = require('yaml');

      ConfigLoader.createProjectConfig();

      const content = fs.readFileSync(
        path.join(tempDir, '.wiggumizer.yml'),
        'utf-8'
      );
      const parsed = yaml.parse(content);

      assert.ok(parsed);
      assert.strictEqual(parsed.provider, 'claude');
    });
  });

  describe('loadUserConfig()', () => {
    it('returns empty object if no user config exists', () => {
      const result = ConfigLoader.loadUserConfig();
      // May or may not exist depending on test environment
      assert.ok(typeof result === 'object');
    });
  });

  describe('loadProjectConfig()', () => {
    it('returns empty object if no project config exists', () => {
      const result = ConfigLoader.loadProjectConfig();
      assert.deepStrictEqual(result, {});
    });

    it('loads project config from current directory', () => {
      fs.writeFileSync(
        path.join(tempDir, '.wiggumizer.yml'),
        'provider: openai\nmaxIterations: 30\n'
      );

      const result = ConfigLoader.loadProjectConfig();

      assert.strictEqual(result.provider, 'openai');
      assert.strictEqual(result.maxIterations, 30);
    });
  });

  describe('workspaces configuration', () => {
    it('defaults to null workspaces', () => {
      const config = ConfigLoader.load();
      assert.strictEqual(config.workspaces, null);
    });

    it('loads workspace configuration from project config', () => {
      fs.writeFileSync(
        path.join(tempDir, '.wiggumizer.yml'),
        `workspaces:
  - name: backend
    path: ../backend
  - name: frontend
    path: ../frontend
`
      );

      const config = ConfigLoader.load();

      assert.ok(Array.isArray(config.workspaces));
      assert.strictEqual(config.workspaces.length, 2);
      assert.strictEqual(config.workspaces[0].name, 'backend');
      assert.strictEqual(config.workspaces[1].name, 'frontend');
    });
  });
});
