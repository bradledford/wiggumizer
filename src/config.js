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
      autoCommit: false,
      verbose: false,
      dryRun: false,
      fast: false, // Fast mode: use quicker model with shorter responses
      context: {
        maxSize: 100000, // 100KB max context size
        maxFiles: 50     // Max 50 files
      },
      // Validation configuration - runs before convergence
      validation: {
        runTests: false,           // Run tests before declaring convergence
        testCommand: null,         // Auto-detected based on project type (or specify manually)
        requireTestPass: true,     // Require tests to pass for convergence
        runBuild: false,           // Run build before declaring convergence
        buildCommand: null,        // Auto-detected based on project type (or specify manually)
        requireBuildSuccess: true, // Require build to succeed for convergence
        timeout: 300000,           // 5 minutes timeout for validation commands
        autoDetect: true,          // Automatically detect project type and commands
        customChecks: []           // Custom validation commands
        // Example customChecks:
        // [
        //   { name: 'Type Check', command: 'tsc --noEmit', required: true },
        //   { name: 'Lint', command: 'eslint src/', required: false }
        // ]
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
      workspaces: null, // Multi-repo support: array of workspace configs
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
          maxTokens: 16384  // Claude Opus 4.5 supports up to 32K, using 16K as conservative default
        },
        'claude-cli': {
          model: 'claude-opus-4-5-20251101',
          maxTokens: 16384  // Uses claude CLI instead of API - leverages Claude Pro/Max subscription
        },
        openai: {
          model: 'gpt-5',
          maxTokens: 16384  // Increased from 8K to allow larger responses
        },
        // AI SDK providers - use Vercel AI SDK for multi-provider support
        // Requires: npm install ai @ai-sdk/<provider-name>
        'ai-sdk': {
          provider: 'openai',   // AI SDK provider: openai, anthropic, google, mistral, cohere, etc.
          model: 'gpt-5',      // Model name for the chosen provider
          maxTokens: 16384
        }
      },
      // Fast mode overrides - used when --fast flag is enabled
      fastMode: {
        maxIterations: 10, // Fewer iterations in fast mode
        providers: {
          claude: {
            model: 'claude-sonnet-4-5-20250929',  // Sonnet is faster than Opus
            maxTokens: 8192  // Shorter responses for speed
          },
          'claude-cli': {
            model: 'claude-sonnet-4-5-20250929',  // Sonnet for faster CLI responses
            maxTokens: 8192
          },
          openai: {
            model: 'gpt-4o-mini',  // Faster OpenAI model
            maxTokens: 8192
          },
          'ai-sdk': {
            provider: 'openai',
            model: 'gpt-4o-mini',  // Faster model for AI SDK
            maxTokens: 8192
          }
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
      if (source[key] === undefined) {
        continue; // Skip undefined values
      }

      // Skip null values if key already exists in target (don't override with null)
      // But set null if key doesn't exist (preserve defaults with null values)
      if (source[key] === null) {
        if (!(key in target)) {
          target[key] = null;
        }
        continue;
      }

      // Arrays should be replaced, not merged
      if (Array.isArray(source[key])) {
        target[key] = source[key];
        continue;
      }

      if (source[key] instanceof Object && key in target && target[key] instanceof Object && target[key] !== null && !Array.isArray(target[key])) {
        // Recursively merge objects (but not null or arrays)
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

# Maximum iterations before stopping (safety limit)
# Work continues until PROMPT.md tasks are complete OR this limit is reached
maxIterations: 20

# Automatically commit changes after each iteration
autoCommit: false

# Fast mode: use quicker model (Sonnet) with shorter responses
# Can also be enabled with --fast flag
fast: false

# Validation - runs before declaring convergence
# Ensures work is actually complete and functional
validation:
  # Auto-detection (enabled by default)
  # Automatically detects project type and appropriate commands
  # Supports: Node.js, Python, Java, Go, Rust, Ruby, PHP, .NET, C/C++, Swift, and more
  autoDetect: true             # Auto-detect test/build commands from project type

  runTests: false              # Set to true to run tests before converging
  # testCommand: null          # Auto-detected (or specify manually: "npm test", "pytest", "go test", etc.)
  requireTestPass: true        # Require tests to pass for convergence

  runBuild: false              # Set to true to run build before converging
  # buildCommand: null         # Auto-detected (or specify manually: "npm run build", "cargo build", etc.)
  requireBuildSuccess: true    # Require build to succeed for convergence

  timeout: 300000              # 5 minute timeout for validation commands

  # Custom validation checks (optional)
  # Language-agnostic examples:
  # customChecks:
  #   # Node.js / TypeScript
  #   - name: "Type Check"
  #     command: "tsc --noEmit"
  #     required: true
  #   - name: "Lint"
  #     command: "eslint src/"
  #     required: false
  #
  #   # Python
  #   - name: "Type Check"
  #     command: "mypy src/"
  #     required: true
  #   - name: "Lint"
  #     command: "ruff check src/"
  #     required: false
  #
  #   # Rust
  #   - name: "Clippy"
  #     command: "cargo clippy -- -D warnings"
  #     required: true
  #   - name: "Format Check"
  #     command: "cargo fmt --check"
  #     required: false
  #
  #   # Go
  #   - name: "Vet"
  #     command: "go vet ./..."
  #     required: true
  #   - name: "Format Check"
  #     command: "gofmt -l ."
  #     required: false

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

# Multi-repo workspace support
# Uncomment to work across multiple repositories
# workspaces:
#   - name: backend          # Optional: friendly name for logging
#     path: ../my-backend    # Relative or absolute path
#     include:               # Optional: override file patterns
#       - "src/**/*.js"
#     exclude:
#       - "test/**"
#   - name: frontend
#     path: ../my-frontend
#     include:
#       - "src/**/*.tsx"
#       - "src/**/*.ts"

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
    maxTokens: 16384  # Claude Opus 4.5 supports up to 32K output tokens

  openai:
    model: gpt-5
    maxTokens: 16384  # Increased from 8K to allow larger responses

  # AI SDK - Use Vercel AI SDK for multi-provider support
  # Supports: OpenAI, Anthropic, Google, Mistral, Cohere, Amazon Bedrock, and more
  # See: https://ai-sdk.dev/docs/foundations/providers-and-models
  #
  # Installation:
  #   npm install ai                  # Core AI SDK
  #   npm install @ai-sdk/openai      # For OpenAI
  #   npm install @ai-sdk/anthropic   # For Anthropic
  #   npm install @ai-sdk/google      # For Google (Gemini)
  #   npm install @ai-sdk/mistral     # For Mistral
  #
  # Example configuration:
  # provider: ai-sdk
  # providers:
  #   ai-sdk:
  #     provider: openai              # AI SDK provider name
  #     model: gpt-4o                 # Model for that provider
  #     maxTokens: 16384

# Chat service notifications
# Send notifications to Slack/WhatsApp on completion or errors
# Requires CLI tools to be installed:
#   Slack: https://api.slack.com/automation/cli/install
#   WhatsApp: npm install -g mudslide
#
# chatProvider: slack          # Chat service (slack, whatsapp)
# channel: "#wiggumizer"       # Slack channel for notifications
# contact: "+1234567890"       # WhatsApp contact number
# group: "Dev Team"            # WhatsApp group name
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
