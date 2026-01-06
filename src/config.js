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
      context: {
        maxSize: 100000, // 100KB max context size
        maxFiles: 50     // Max 50 files
      },
      files: {
        include: ['**/*'], // Include all files, filter by extension in FileSelector
        exclude: [
          'node_modules/**',
          '.git/**',
          'dist/**',
          'build/**',
          '.wiggumizer/**',
          '.claude/**',
          'docs/**',
          'coverage/**',
          '*.min.js',
          'package-lock.json',
          'yarn.lock',
          '*.log'
        ]
      },
      retry: {
        maxRetries: 3,
        baseDelay: 1000,  // 1 second
        maxDelay: 30000   // 30 seconds
      },
      rateLimit: {
        requestsPerMinute: 50,
        requestsPerHour: 1000
      },
      providers: {
        claude: {
          model: 'claude-opus-4-5-20251101',
          maxTokens: 8192
        },
        openai: {
          model: 'gpt-5',
          maxTokens: 8192
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

# Context limits
context:
  maxSize: 100000  # Maximum context size in bytes (100KB)
  maxFiles: 50     # Maximum number of files to include

# File patterns
# Note: .gitignore is automatically respected
files:
  include:
    - "**/*"  # Include all files (filtered by default extensions)
    # Or specify exact patterns:
    # - "src/**/*.js"
    # - "src/**/*.ts"
    # - "*.md"
  exclude:
    - "node_modules/**"
    - ".git/**"
    - "dist/**"
    - "build/**"
    - ".wiggumizer/**"
    - ".claude/**"
    - "docs/**"
    - "coverage/**"
    - "*.test.js"
    - "*.min.js"
    - "package-lock.json"
    - "yarn.lock"
    - "*.log"

# Retry configuration for API calls
retry:
  maxRetries: 3        # Maximum number of retries
  baseDelay: 1000      # Base delay in milliseconds (1 second)
  maxDelay: 30000      # Maximum delay in milliseconds (30 seconds)

# Rate limiting configuration
rateLimit:
  requestsPerMinute: 50    # Maximum requests per minute
  requestsPerHour: 1000    # Maximum requests per hour

# Provider-specific configuration
providers:
  claude:
    model: claude-opus-4-5-20251101
    maxTokens: 8192

  openai:
    model: gpt-5
    maxTokens: 8192
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
