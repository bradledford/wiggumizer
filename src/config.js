const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const os = require('os');

class ConfigLoader {
  /**
   * Load configuration from .wiggumizer.yml files
   * Priority: CLI options > project config > user config > defaults
   */
  static load(cliOptions = {}) {
    // Default configuration
    const defaults = {
      provider: 'claude',
      maxIterations: 20,
      convergenceThreshold: 0.02,
      autoCommit: false,
      verbose: false,
      dryRun: false,
      files: {
        include: ['**/*.js', '**/*.ts', '**/*.py', '**/*.md', '**/*.json', '**/*.yml', '**/*.yaml'],
        exclude: [
          'node_modules/**',
          '.git/**',
          'dist/**',
          'build/**',
          '.wiggumizer/**',
          'coverage/**',
          '*.min.js',
          'package-lock.json'
        ]
      },
      providers: {
        claude: {
          model: 'claude-sonnet-4-20250514',
          maxTokens: 4096
        },
        openai: {
          model: 'gpt-4-turbo',
          maxTokens: 4096
        }
      }
    };

    // Load user config from home directory
    const userConfig = ConfigLoader.loadUserConfig();

    // Load project config from current directory
    const projectConfig = ConfigLoader.loadProjectConfig();

    // Merge configs: defaults < user < project < CLI
    const merged = ConfigLoader.mergeConfigs(
      defaults,
      userConfig,
      projectConfig,
      cliOptions
    );

    return merged;
  }

  /**
   * Load user config from ~/.wiggumizer.yml
   */
  static loadUserConfig() {
    const userConfigPath = path.join(os.homedir(), '.wiggumizer.yml');
    return ConfigLoader.loadConfigFile(userConfigPath);
  }

  /**
   * Load project config from .wiggumizer.yml in current directory
   */
  static loadProjectConfig() {
    const projectConfigPath = path.join(process.cwd(), '.wiggumizer.yml');
    return ConfigLoader.loadConfigFile(projectConfigPath);
  }

  /**
   * Load and parse a YAML config file
   */
  static loadConfigFile(filePath) {
    if (!fs.existsSync(filePath)) {
      return {};
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return yaml.parse(content) || {};
    } catch (error) {
      console.warn(`Warning: Failed to parse config file ${filePath}: ${error.message}`);
      return {};
    }
  }

  /**
   * Deep merge configuration objects
   * Later configs override earlier ones
   */
  static mergeConfigs(...configs) {
    const result = {};

    for (const config of configs) {
      ConfigLoader.deepMerge(result, config);
    }

    return result;
  }

  /**
   * Deep merge helper
   */
  static deepMerge(target, source) {
    for (const key in source) {
      if (source[key] === undefined || source[key] === null) {
        continue; // Skip null/undefined values
      }

      if (source[key] instanceof Object && key in target && target[key] instanceof Object) {
        // Recursively merge objects
        ConfigLoader.deepMerge(target[key], source[key]);
      } else {
        // Override value
        target[key] = source[key];
      }
    }
  }

  /**
   * Generate a default config file
   */
  static generateDefaultConfig() {
    return `# Wiggumizer Configuration
# See: https://github.com/bradledford/wiggumizer#configuration

# Default AI provider
provider: claude

# Maximum iterations before stopping
maxIterations: 20

# Convergence threshold (0.0 to 1.0)
# Lower = more strict convergence detection
convergenceThreshold: 0.02

# Automatically commit changes after each iteration
autoCommit: false

# File patterns
files:
  include:
    - "src/**/*.js"
    - "src/**/*.ts"
    - "*.md"
  exclude:
    - "node_modules/**"
    - ".git/**"
    - "dist/**"
    - "build/**"
    - "*.test.js"
    - "*.min.js"

# Provider-specific configuration
providers:
  claude:
    model: claude-sonnet-4-20250514
    maxTokens: 4096

  openai:
    model: gpt-4-turbo
    maxTokens: 4096
`;
  }

  /**
   * Create .wiggumizer.yml in current directory
   */
  static createProjectConfig() {
    const configPath = path.join(process.cwd(), '.wiggumizer.yml');

    if (fs.existsSync(configPath)) {
      throw new Error('.wiggumizer.yml already exists');
    }

    fs.writeFileSync(configPath, ConfigLoader.generateDefaultConfig(), 'utf-8');
    return configPath;
  }
}

module.exports = ConfigLoader;
