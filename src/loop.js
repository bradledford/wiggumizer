const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const ClaudeProvider = require('./providers/claude');

class RalphLoop {
  constructor(options) {
    this.prompt = options.prompt;
    this.maxIterations = options.maxIterations || 20;
    this.verbose = options.verbose || false;
    this.dryRun = options.dryRun || false;
    this.iteration = 0;

    // Initialize provider
    const providerName = options.provider || 'claude';
    if (providerName === 'claude') {
      this.provider = new ClaudeProvider();
    } else {
      throw new Error(`Provider ${providerName} not yet implemented. Coming soon!`);
    }
  }

  async run() {
    console.log(chalk.bold('Starting Ralph loop...\n'));

    while (this.iteration < this.maxIterations) {
      this.iteration++;

      const spinner = ora(`Iteration ${this.iteration}/${this.maxIterations}`).start();

      try {
        // Get current codebase state
        const codebaseContext = this.getCodebaseContext();

        // Send to AI provider
        const response = await this.provider.iterate({
          prompt: this.prompt,
          context: codebaseContext,
          iteration: this.iteration
        });

        spinner.succeed(`Iteration ${this.iteration}/${this.maxIterations}`);

        // Check if there are changes
        if (!response.hasChanges) {
          console.log(chalk.green('\n✓ Convergence detected!'));
          console.log(chalk.dim(`No changes after ${this.iteration} iterations.\n`));
          break;
        }

        // Display changes
        if (this.verbose) {
          console.log(chalk.dim('\n  Changes:'));
          console.log(chalk.dim(`  ${response.summary}`));
        }

        // Apply changes (if not dry run)
        if (!this.dryRun && response.changes) {
          this.applyChanges(response.changes);
          console.log(chalk.green(`  ✓ Applied changes`));
        } else if (this.dryRun) {
          console.log(chalk.yellow(`  ⚠ Dry run - changes not applied`));
          console.log(chalk.dim(`\n${response.changes}\n`));
        }

        console.log();

      } catch (error) {
        spinner.fail(`Iteration ${this.iteration} failed`);
        throw error;
      }
    }

    if (this.iteration >= this.maxIterations) {
      console.log(chalk.yellow('⚠ Max iterations reached without full convergence.'));
      console.log(chalk.dim('You may want to refine your prompt and try again.\n'));
    }

    console.log(chalk.bold.green('Ralph loop complete!'));
    console.log(chalk.dim(`Total iterations: ${this.iteration}\n`));
  }

  getCodebaseContext() {
    // For now, just get the current directory listing
    // In a full implementation, this would be more sophisticated
    const cwd = process.cwd();
    const files = this.getRelevantFiles(cwd);

    const context = {
      cwd,
      files: files.map(f => ({
        path: f,
        content: fs.readFileSync(path.join(cwd, f), 'utf-8')
      }))
    };

    return context;
  }

  getRelevantFiles(dir, basePath = '') {
    // Simple file gathering - exclude common directories
    const exclude = [
      'node_modules',
      '.git',
      'dist',
      'build',
      '.wiggumizer',
      'docs'
    ];

    let files = [];
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const relativePath = path.join(basePath, item);

      if (exclude.includes(item)) continue;

      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files = files.concat(this.getRelevantFiles(fullPath, relativePath));
      } else if (stat.isFile()) {
        // Only include source files
        const ext = path.extname(item);
        if (['.js', '.ts', '.py', '.md', '.json', '.yml', '.yaml'].includes(ext)) {
          files.push(relativePath);
        }
      }
    }

    return files;
  }

  applyChanges(changesText) {
    // This is a simplified version
    // A full implementation would parse the AI's response and apply diffs
    // For now, we'll just log that changes would be applied

    if (this.verbose) {
      console.log(chalk.dim('\n  Changes to apply:'));
      console.log(chalk.dim(changesText));
    }

    // TODO: Implement actual file modifications
    // This will be filled in by Wiggumizer itself!
  }
}

module.exports = RalphLoop;
