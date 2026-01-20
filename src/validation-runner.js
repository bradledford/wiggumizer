const { execSync } = require('child_process');
const chalk = require('chalk');
const ProjectDetector = require('./project-detector');

/**
 * Runs validation commands to determine if work is actually complete
 * Supports tests, builds, type checking, and custom validation commands
 * Auto-detects project type (Node.js, Python, Java, Go, Rust, etc.)
 */
class ValidationRunner {
  constructor(config = {}) {
    this.config = config;
    this.verbose = config.verbose || false;
    this.timeout = config.timeout || 300000; // 5 minutes default
    this.autoDetect = config.autoDetect !== false; // Default to true
    this.detectedProject = null;

    // Auto-detect project type and commands if enabled
    if (this.autoDetect) {
      const detector = new ProjectDetector();
      this.detectedProject = detector.detect();

      if (this.detectedProject.detected && this.verbose) {
        const description = detector.getDescription(this.detectedProject);
        console.log(chalk.blue('  Detected:') + chalk.dim(` ${description}`));
      }
    }
  }

  /**
   * Run all configured validations
   * @returns {Object} { passed: boolean, results: Array, failureReason: string }
   */
  async runAll() {
    if (!this.hasValidation()) {
      return { passed: true, results: [], skipped: true };
    }

    const results = [];
    let allPassed = true;
    let failureReason = '';

    // Run tests if configured
    if (this.config.runTests) {
      const testResult = await this.runTests();
      results.push(testResult);
      if (!testResult.passed && this.config.requireTestPass) {
        allPassed = false;
        failureReason = 'Tests failed';
      }
    }

    // Run build if configured
    if (this.config.runBuild) {
      const buildResult = await this.runBuild();
      results.push(buildResult);
      if (!buildResult.passed && this.config.requireBuildSuccess) {
        allPassed = false;
        failureReason = failureReason || 'Build failed';
      }
    }

    // Run custom checks
    if (this.config.customChecks && Array.isArray(this.config.customChecks)) {
      for (const check of this.config.customChecks) {
        const checkResult = await this.runCustomCheck(check);
        results.push(checkResult);
        if (!checkResult.passed && check.required) {
          allPassed = false;
          failureReason = failureReason || `Custom check failed: ${check.name}`;
        }
      }
    }

    return {
      passed: allPassed,
      results,
      failureReason
    };
  }

  /**
   * Check if any validation is configured
   */
  hasValidation() {
    return this.config.runTests ||
           this.config.runBuild ||
           (this.config.customChecks && this.config.customChecks.length > 0);
  }

  /**
   * Run test command
   */
  async runTests() {
    // Use explicitly configured command, or auto-detected command, or skip
    const command = this.config.testCommand ||
                    (this.detectedProject && this.detectedProject.testCommand);

    if (!command) {
      if (this.verbose) {
        console.log(chalk.yellow('  ⚠ No test command configured or detected - skipping tests'));
      }
      return {
        name: 'Tests',
        skipped: true,
        passed: true, // Don't fail if no tests configured
        required: false
      };
    }

    if (this.verbose) {
      const source = this.config.testCommand ? 'configured' : 'detected';
      console.log(chalk.blue(`  Running tests (${source}):`) + chalk.dim(` ${command}`));
    }

    return this.runCommand({
      name: 'Tests',
      command,
      required: this.config.requireTestPass !== false
    });
  }

  /**
   * Run build command
   */
  async runBuild() {
    // Use explicitly configured command, or auto-detected command, or skip
    const command = this.config.buildCommand ||
                    (this.detectedProject && this.detectedProject.buildCommand);

    if (!command) {
      if (this.verbose) {
        console.log(chalk.yellow('  ⚠ No build command configured or detected - skipping build'));
      }
      return {
        name: 'Build',
        skipped: true,
        passed: true, // Don't fail if no build configured
        required: false
      };
    }

    if (this.verbose) {
      const source = this.config.buildCommand ? 'configured' : 'detected';
      console.log(chalk.blue(`  Running build (${source}):`) + chalk.dim(` ${command}`));
    }

    return this.runCommand({
      name: 'Build',
      command,
      required: this.config.requireBuildSuccess !== false
    });
  }

  /**
   * Run a custom validation check
   */
  async runCustomCheck(check) {
    if (this.verbose) {
      console.log(chalk.blue(`  Running ${check.name}:`) + chalk.dim(` ${check.command}`));
    }

    return this.runCommand(check);
  }

  /**
   * Execute a command and capture result
   */
  async runCommand(check) {
    const startTime = Date.now();

    try {
      const output = execSync(check.command, {
        encoding: 'utf-8',
        timeout: this.timeout,
        stdio: this.verbose ? 'inherit' : 'pipe',
        cwd: process.cwd()
      });

      const duration = Date.now() - startTime;

      if (this.verbose) {
        console.log(chalk.green(`  ✓ ${check.name} passed`) + chalk.dim(` (${duration}ms)`));
      }

      return {
        name: check.name,
        command: check.command,
        passed: true,
        duration,
        output: this.verbose ? null : output,
        required: check.required !== false
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      if (this.verbose) {
        console.log(chalk.red(`  ✗ ${check.name} failed`) + chalk.dim(` (${duration}ms)`));
        if (error.stdout) {
          console.log(chalk.dim(error.stdout));
        }
        if (error.stderr) {
          console.log(chalk.red(error.stderr));
        }
      }

      return {
        name: check.name,
        command: check.command,
        passed: false,
        duration,
        exitCode: error.status,
        error: error.message,
        stdout: error.stdout,
        stderr: error.stderr,
        required: check.required !== false
      };
    }
  }

  /**
   * Format validation results for display
   */
  formatResults(results) {
    if (!results || results.length === 0) {
      return '';
    }

    const lines = [];

    for (const result of results) {
      const status = result.passed ? chalk.green('✓') : chalk.red('✗');
      const duration = chalk.dim(`(${result.duration}ms)`);
      const required = result.required ? '' : chalk.dim(' [optional]');

      lines.push(`  ${status} ${result.name} ${duration}${required}`);

      // Show error details for failed required checks
      if (!result.passed && result.required && result.stderr) {
        const errorLines = result.stderr.split('\n').slice(0, 5);
        errorLines.forEach(line => {
          lines.push(chalk.dim(`    ${line}`));
        });
        if (result.stderr.split('\n').length > 5) {
          lines.push(chalk.dim('    ...'));
        }
      }
    }

    return lines.join('\n');
  }
}

module.exports = ValidationRunner;
