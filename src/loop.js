const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const ClaudeProvider = require('./providers/claude');
const FileValidator = require('./validator');
const GitHelper = require('./git-helper');

class RalphLoop {
  constructor(options) {
    this.prompt = options.prompt;
    this.maxIterations = options.maxIterations || 20;
    this.verbose = options.verbose || false;
    this.dryRun = options.dryRun || false;
    this.autoCommit = options.autoCommit || false;
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

    // Warn if git repo is dirty
    GitHelper.warnIfDirty();

    // Store initial commit for rollback
    const initialCommit = GitHelper.getCurrentCommit();

    // Show auto-commit status
    if (this.autoCommit) {
      console.log(chalk.blue('ℹ Auto-commit enabled') + chalk.dim(' - Changes will be committed after each iteration'));
    } else {
      console.log(chalk.dim('ℹ Auto-commit disabled - Review changes with: git diff'));
    }
    console.log();

    let noChangeIterations = 0;

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

        // Display changes summary
        console.log(chalk.dim(`  ${response.summary}`));

        // Apply changes (if not dry run)
        let filesModified = 0;
        if (!this.dryRun && response.changes) {
          filesModified = this.applyChanges(response.changes);
          if (filesModified > 0) {
            console.log(chalk.green(`  ✓ Applied changes to ${filesModified} file(s)`));
            noChangeIterations = 0;
          } else {
            console.log(chalk.yellow(`  ⚠ No files were modified`));
            noChangeIterations++;
          }
        } else if (this.dryRun) {
          console.log(chalk.yellow(`  ⚠ Dry run - changes not applied`));
          if (this.verbose) {
            console.log(chalk.dim(`\n${response.changes}\n`));
          }
        }

        // Check for convergence based on no file modifications
        if (noChangeIterations >= 2) {
          console.log(chalk.green('\n✓ Convergence detected!'));
          console.log(chalk.dim(`No file modifications for ${noChangeIterations} iterations.\n`));
          break;
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
    console.log(chalk.dim(`Total iterations: ${this.iteration}`));

    // Remind user to review changes if not auto-committing
    if (!this.autoCommit && GitHelper.isGitRepo() && GitHelper.hasUncommittedChanges()) {
      console.log();
      console.log(chalk.blue('Next steps:'));
      console.log(chalk.dim('  git diff          # Review changes'));
      console.log(chalk.dim('  git add .         # Stage changes'));
      console.log(chalk.dim('  git commit -m "Your message"'));
    }
    console.log();
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
    // Parse Claude's response to extract file modifications
    // Look for patterns like:
    // ## File: path/to/file.js
    // ```javascript
    // file contents
    // ```

    const filePattern = /##\s*File:\s*([^\n]+)\n```[^\n]*\n([\s\S]*?)```/g;
    let match;
    let filesModified = 0;
    const backups = new Map(); // Store backups in case we need to rollback

    while ((match = filePattern.exec(changesText)) !== null) {
      const filePath = match[1].trim();
      const fileContent = match[2];

      try {
        const fullPath = path.join(process.cwd(), filePath);

        // Validate file content before writing
        const validation = FileValidator.validate(filePath, fileContent);
        if (!validation.valid) {
          console.error(chalk.red(`    ✗ Validation failed for ${filePath}`));
          console.error(chalk.dim(`      ${validation.details}`));
          console.log(chalk.yellow('      Skipping this file to prevent breaking changes'));
          continue; // Skip this file
        }

        // Backup existing file
        if (fs.existsSync(fullPath)) {
          const backup = fs.readFileSync(fullPath, 'utf-8');
          backups.set(fullPath, backup);
        }

        // Ensure directory exists
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Write the file
        fs.writeFileSync(fullPath, fileContent, 'utf-8');

        if (this.verbose) {
          console.log(chalk.dim(`    Modified: ${filePath}`));
        }

        filesModified++;
      } catch (error) {
        console.error(chalk.red(`    ✗ Failed to write ${filePath}: ${error.message}`));

        // Rollback any files we've modified so far
        console.log(chalk.yellow('    Rolling back changes...'));
        for (const [backupPath, backupContent] of backups) {
          fs.writeFileSync(backupPath, backupContent, 'utf-8');
        }
        filesModified = 0;
        break;
      }
    }

    if (filesModified === 0 && this.verbose) {
      console.log(chalk.yellow('    ⚠ No file modifications detected in response'));
      console.log(chalk.dim('\n  Raw response:'));
      console.log(chalk.dim(changesText.substring(0, 500) + '...'));
    }

    // Create git backup if in a repo and files were modified (only if auto-commit is enabled)
    if (filesModified > 0 && this.autoCommit && GitHelper.isGitRepo()) {
      const committed = GitHelper.createBackupCommit(this.iteration);
      if (committed && this.verbose) {
        console.log(chalk.dim(`    Git: Auto-committed iteration ${this.iteration}`));
      }
    }

    return filesModified;
  }
}

module.exports = RalphLoop;
