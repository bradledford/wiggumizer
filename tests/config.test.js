const fs = require('fs');
const path = require('path');
const os = require('os');
const ConfigLoader = require('../src/config');

describe('ConfigLoader', () => {
  const originalCwd = process.cwd();
  const testDir = path.join(os.tmpdir(), 'wiggumizer-config-test-' + Date.now());
  
  beforeAll(() => {
    // Create test directory
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    // Cleanup
    process.chdir(originalCwd);
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    process.chdir(testDir);
    // Clean up any config files from previous tests
    const configPath = path.join(testDir, '.wiggumizer.yml');
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
  });

  describe('load()', () => {
    test('returns default config when no config files exist', () => {
      const config = ConfigLoader.load();

      expect(config.provider).toBe('claude');
      expect(config.maxIterations).toBe(20);
      expect(config.convergenceThreshold).toBe(0.02);
      expect(config.autoCommit).toBe(false);
      expect(config.verbose).toBe(false);
      expect(config.dryRun).toBe(false);
    });

    test('default config has correct context limits', () => {
      const config = ConfigLoader.load();

      expect(config.context).toBeDefined();
      expect(config.context.maxSize).toBe(100000);
      expect(config.context.maxFiles).toBe(50);
    });

    test('default config has correct file patterns', () => {
      const config = ConfigLoader.load();

      expect(config.files).toBeDefined();
      expect(config.files.include).toContain('**/*');
      expect(config.files.exclude).toContain('node_modules/**');
      expect(config.files.exclude).toContain('.git/**');
    });

    test('default config has correct retry settings', () => {
      const config = ConfigLoader.load();

      expect(config.retry).toBeDefined();
      expect(config.retry.maxRetries).toBe(3);
      expect(config.retry.baseDelay).toBe(1000);
      expect(config.retry.maxDelay).toBe(30000);
    });

    test('default config has correct rate limit settings', () => {
      const config = ConfigLoader.load();

      expect(config.rateLimit).toBeDefined();
      expect(config.rateLimit.requestsPerMinute).toBe(50);
      expect(config.rateLimit.requestsPerHour).toBe(1000);
    });

    test('default config has provider settings', () => {
      const config = ConfigLoader.load();

      expect(config.providers).toBeDefined();
      expect(config.providers.claude).toBeDefined();
      expect(config.providers.claude.model).toBe('claude-opus-4-5-20251101');
      expect(config.providers.claude.maxTokens).toBe(8192);
    });

    test('CLI options override defaults', () => {
      const config = ConfigLoader.load({
        provider: 'openai',
        maxIterations: 10,
        verbose: true,
        autoCommit: true
      });

      expect(config.provider).toBe('openai');
      expect(config.maxIterations).toBe(10);
      expect(config.verbose).toBe(true);
      expect(config.autoCommit).toBe(true);
    });

    test('CLI options can set dryRun', () => {
      const config = ConfigLoader.load({ dryRun: true });
      expect(config.dryRun).toBe(true);
    });

    test('null CLI options do not override defaults', () => {
      const config = ConfigLoader.load({
        provider: null,
        maxIterations: undefined
      });

      expect(config.provider).toBe('claude');
      expect(config.maxIterations).toBe(20);
    });
  });

  describe('loadProjectConfig()', () => {
    test('returns empty object when no project config exists', () => {
      const config = ConfigLoader.loadProjectConfig();
      expect(config).toEqual({});
    });

    test('loads project config from .wiggumizer.yml', () => {
      const configContent = `
provider: openai
maxIterations: 15
autoCommit: true
`;
      fs.writeFileSync(path.join(testDir, '.wiggumizer.yml'), configContent);

      const config = ConfigLoader.loadProjectConfig();

      expect(config.provider).toBe('openai');
      expect(config.maxIterations).toBe(15);
      expect(config.autoCommit).toBe(true);
    });

    test('parses nested YAML correctly', () => {
      const configContent = `
context:
  maxSize: 50000
  maxFiles: 25
retry:
  maxRetries: 5
  baseDelay: 2000
`;
      fs.writeFileSync(path.join(testDir, '.wiggumizer.yml'), configContent);

      const config = ConfigLoader.loadProjectConfig();

      expect(config.context.maxSize).toBe(50000);
      expect(config.context.maxFiles).toBe(25);
      expect(config.retry.maxRetries).toBe(5);
      expect(config.retry.baseDelay).toBe(2000);
    });

    test('handles invalid YAML gracefully', () => {
      const invalidYaml = `
provider: claude
  this: is
    invalid: yaml
`;
      fs.writeFileSync(path.join(testDir, '.wiggumizer.yml'), invalidYaml);

      // Should not throw, returns empty object
      const config = ConfigLoader.loadProjectConfig();
      expect(config).toEqual({});
    });

    test('handles empty YAML file', () => {
      fs.writeFileSync(path.join(testDir, '.wiggumizer.yml'), '');
      const config = ConfigLoader.loadProjectConfig();
      expect(config).toEqual({});
    });
  });

  describe('loadConfigFile()', () => {
    test('returns empty object for non-existent file', () => {
      const config = ConfigLoader.loadConfigFile('/nonexistent/path.yml');
      expect(config).toEqual({});
    });

    test('loads valid YAML file', () => {
      const configPath = path.join(testDir, 'test-config.yml');
      fs.writeFileSync(configPath, 'key: value\nnumber: 42');

      const config = ConfigLoader.loadConfigFile(configPath);

      expect(config.key).toBe('value');
      expect(config.number).toBe(42);
    });

    test('handles arrays in YAML', () => {
      const configPath = path.join(testDir, 'array-config.yml');
      fs.writeFileSync(configPath, `
files:
  include:
    - "src/**/*.js"
    - "lib/**/*.js"
  exclude:
    - "node_modules/**"
`);

      const config = ConfigLoader.loadConfigFile(configPath);

      expect(config.files.include).toEqual(['src/**/*.js', 'lib/**/*.js']);
      expect(config.files.exclude).toEqual(['node_modules/**']);
    });
  });

  describe('mergeConfigs()', () => {
    test('later configs override earlier configs', () => {
      const config1 = { a: 1, b: 2 };
      const config2 = { b: 3, c: 4 };

      const merged = ConfigLoader.mergeConfigs(config1, config2);

      expect(merged.a).toBe(1);
      expect(merged.b).toBe(3);
      expect(merged.c).toBe(4);
    });

    test('deep merges nested objects', () => {
      const config1 = {
        context: { maxSize: 100000, maxFiles: 50 },
        retry: { maxRetries: 3 }
      };
      const config2 = {
        context: { maxSize: 50000 },
        retry: { baseDelay: 2000 }
      };

      const merged = ConfigLoader.mergeConfigs(config1, config2);

      expect(merged.context.maxSize).toBe(50000);
      expect(merged.context.maxFiles).toBe(50); // Preserved from config1
      expect(merged.retry.maxRetries).toBe(3); // Preserved from config1
      expect(merged.retry.baseDelay).toBe(2000);
    });

    test('handles three or more configs', () => {
      const config1 = { a: 1 };
      const config2 = { b: 2 };
      const config3 = { c: 3 };

      const merged = ConfigLoader.mergeConfigs(config1, config2, config3);

      expect(merged).toEqual({ a: 1, b: 2, c: 3 });
    });

    test('ignores null and undefined values in source', () => {
      const config1 = { a: 1, b: 2 };
      const config2 = { a: null, b: undefined, c: 3 };

      const merged = ConfigLoader.mergeConfigs(config1, config2);

      expect(merged.a).toBe(1); // Not overwritten by null
      expect(merged.b).toBe(2); // Not overwritten by undefined
      expect(merged.c).toBe(3);
    });

    test('overwrites arrays (does not merge them)', () => {
      const config1 = { items: [1, 2, 3] };
      const config2 = { items: [4, 5] };

      const merged = ConfigLoader.mergeConfigs(config1, config2);

      expect(merged.items).toEqual([4, 5]);
    });
  });

  describe('deepMerge()', () => {
    test('mutates target object', () => {
      const target = { a: 1 };
      const source = { b: 2 };

      ConfigLoader.deepMerge(target, source);

      expect(target.a).toBe(1);
      expect(target.b).toBe(2);
    });

    test('handles deeply nested objects', () => {
      const target = {
        level1: {
          level2: {
            level3: { value: 'original' }
          }
        }
      };
      const source = {
        level1: {
          level2: {
            level3: { newValue: 'added' }
          }
        }
      };

      ConfigLoader.deepMerge(target, source);

      expect(target.level1.level2.level3.value).toBe('original');
      expect(target.level1.level2.level3.newValue).toBe('added');
    });
  });

  describe('generateDefaultConfig()', () => {
    test('returns valid YAML string', () => {
      const yaml = require('yaml');
      const configString = ConfigLoader.generateDefaultConfig();

      // Should be parseable
      const parsed = yaml.parse(configString);

      expect(parsed).toBeDefined();
      expect(typeof parsed).toBe('object');
    });

    test('includes all important settings', () => {
      const configString = ConfigLoader.generateDefaultConfig();

      expect(configString).toContain('provider:');
      expect(configString).toContain('maxIterations:');
      expect(configString).toContain('convergenceThreshold:');
      expect(configString).toContain('autoCommit:');
      expect(configString).toContain('context:');
      expect(configString).toContain('maxSize:');
      expect(configString).toContain('maxFiles:');
      expect(configString).toContain('files:');
      expect(configString).toContain('include:');
      expect(configString).toContain('exclude:');
      expect(configString).toContain('retry:');
      expect(configString).toContain('rateLimit:');
      expect(configString).toContain('providers:');
    });

    test('includes comments for documentation', () => {
      const configString = ConfigLoader.generateDefaultConfig();

      expect(configString).toContain('#');
      expect(configString).toContain('Wiggumizer Configuration');
    });

    test('includes workspace example (commented out)', () => {
      const configString = ConfigLoader.generateDefaultConfig();

      expect(configString).toContain('workspaces:');
      expect(configString).toContain('# workspaces:'); // Should be commented
    });
  });

  describe('createProjectConfig()', () => {
    test('creates .wiggumizer.yml in current directory', () => {
      const configPath = ConfigLoader.createProjectConfig();

      expect(fs.existsSync(configPath)).toBe(true);
      expect(configPath).toBe(path.join(testDir, '.wiggumizer.yml'));
    });

    test('throws error if config already exists', () => {
      // Create config first
      ConfigLoader.createProjectConfig();

      // Should throw on second attempt
      expect(() => ConfigLoader.createProjectConfig()).toThrow('.wiggumizer.yml already exists');
    });

    test('created config is valid YAML', () => {
      const yaml = require('yaml');
      const configPath = ConfigLoader.createProjectConfig();

      const content = fs.readFileSync(configPath, 'utf-8');
      const parsed = yaml.parse(content);

      expect(parsed.provider).toBeDefined();
      expect(parsed.maxIterations).toBeDefined();
    });
  });

  describe('full config load with project config', () => {
    test('project config overrides defaults', () => {
      const configContent = `
provider: openai
maxIterations: 5
context:
  maxSize: 25000
`;
      fs.writeFileSync(path.join(testDir, '.wiggumizer.yml'), configContent);

      const config = ConfigLoader.load();

      expect(config.provider).toBe('openai');
      expect(config.maxIterations).toBe(5);
      expect(config.context.maxSize).toBe(25000);
      // Defaults still present for unspecified values
      expect(config.context.maxFiles).toBe(50);
      expect(config.autoCommit).toBe(false);
    });

    test('CLI options override project config', () => {
      const configContent = `
provider: openai
maxIterations: 5
`;
      fs.writeFileSync(path.join(testDir, '.wiggumizer.yml'), configContent);

      const config = ConfigLoader.load({
        provider: 'claude',
        verbose: true
      });

      expect(config.provider).toBe('claude'); // CLI wins
      expect(config.maxIterations).toBe(5); // From project config
      expect(config.verbose).toBe(true); // From CLI
    });

    test('workspace config is loaded correctly', () => {
      const configContent = `
workspaces:
  - name: backend
    path: ../backend
    include:
      - "src/**/*.js"
  - name: frontend
    path: ../frontend
`;
      fs.writeFileSync(path.join(testDir, '.wiggumizer.yml'), configContent);

      const config = ConfigLoader.load();

      expect(config.workspaces).toBeDefined();
      expect(config.workspaces).toHaveLength(2);
      expect(config.workspaces[0].name).toBe('backend');
      expect(config.workspaces[0].path).toBe('../backend');
      expect(config.workspaces[0].include).toEqual(['src/**/*.js']);
      expect(config.workspaces[1].name).toBe('frontend');
    });

    test('provider-specific config is loaded correctly', () => {
      const configContent = `
providers:
  claude:
    model: claude-3-5-sonnet-20241022
    maxTokens: 4096
  openai:
    model: gpt-4-turbo
`;
      fs.writeFileSync(path.join(testDir, '.wiggumizer.yml'), configContent);

      const config = ConfigLoader.load();

      expect(config.providers.claude.model).toBe('claude-3-5-sonnet-20241022');
      expect(config.providers.claude.maxTokens).toBe(4096);
      expect(config.providers.openai.model).toBe('gpt-4-turbo');
      // Default values for unspecified
      expect(config.providers.openai.maxTokens).toBe(8192);
    });
  });

  describe('edge cases', () => {
    test('handles boolean values correctly', () => {
      const configContent = `
autoCommit: true
verbose: false
dryRun: true
`;
      fs.writeFileSync(path.join(testDir, '.wiggumizer.yml'), configContent);

      const config = ConfigLoader.load();

      expect(config.autoCommit).toBe(true);
      expect(config.verbose).toBe(false);
      expect(config.dryRun).toBe(true);
    });

    test('handles numeric string values', () => {
      const configContent = `
maxIterations: "30"
convergenceThreshold: "0.05"
`;
      fs.writeFileSync(path.join(testDir, '.wiggumizer.yml'), configContent);

      const config = ConfigLoader.load();

      // YAML parser may convert these to numbers or keep as strings
      // depending on the yaml library behavior
      expect(Number(config.maxIterations)).toBe(30);
      expect(Number(config.convergenceThreshold)).toBe(0.05);
    });

    test('handles empty nested objects', () => {
      const configContent = `
context: {}
retry: {}
`;
      fs.writeFileSync(path.join(testDir, '.wiggumizer.yml'), configContent);

      const config = ConfigLoader.load();

      // Should still have default values merged in
      expect(config.context.maxSize).toBe(100000);
      expect(config.retry.maxRetries).toBe(3);
    });
  });
});
