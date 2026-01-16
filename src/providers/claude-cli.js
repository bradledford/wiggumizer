const { spawn, execSync } = require('child_process');
const chalk = require('chalk');

/**
 * Claude CLI Provider
 * Uses the `claude` CLI command instead of the Anthropic API.
 * Allows users to leverage their Claude Pro/Max subscription.
 */
class ClaudeCliProvider {
  constructor(config = {}) {
    this.model = config.model || 'claude-opus-4-5-20251101';
    this.maxTokens = config.maxTokens || 16384;
    this.verbose = config.verbose || false;
    this.cliValidated = false;

    if (this.verbose) {
      console.log(chalk.dim(`Initialized Claude CLI provider with model: ${this.model}`));
    }
  }

  /**
   * Validates that the claude CLI is installed and accessible
   * @throws {Error} If CLI is not found
   */
  validateCliInstalled() {
    try {
      const isWindows = process.platform === 'win32';
      const command = isWindows ? 'where claude' : 'which claude';
      execSync(command, { stdio: 'pipe' });

      if (this.verbose) {
        console.log(chalk.dim('✓ Claude CLI found'));
      }
    } catch (error) {
      throw new Error(
        'Claude CLI not found. Install with: npm install -g @anthropic-ai/claude-cli\n' +
        'Or set provider to "claude" to use the API instead.'
      );
    }
  }

  /**
   * Executes the claude CLI command with the given prompts
   * @param {string} systemPrompt - The system prompt for Claude
   * @param {string} userMessage - The user message/prompt
   * @returns {Promise<string>} The CLI output
   */
  async executeClaudeCommand(systemPrompt, userMessage) {
    const args = [
      '-p',
      '--model', this.model,
      '--max-tokens', this.maxTokens.toString(),
      '--system-prompt', systemPrompt,
      userMessage
    ];

    if (this.verbose) {
      console.log(chalk.dim(`\nExecuting: claude ${args.slice(0, 6).join(' ')} [user message]`));
    }

    return new Promise((resolve, reject) => {
      const child = spawn('claude', args);

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          // Check for authentication errors
          if (stderr.includes('authentication') ||
              stderr.includes('unauthorized') ||
              stderr.includes('api key')) {
            reject(new Error(
              'Claude CLI authentication failed.\n' +
              'Set ANTHROPIC_API_KEY environment variable or run: claude\n' +
              'Then use /login to authenticate with your Claude account.'
            ));
            return;
          }

          reject(new Error(
            `Claude CLI exited with code ${code}\n` +
            `Error: ${stderr || 'Unknown error'}`
          ));
          return;
        }

        if (this.verbose && stderr) {
          console.warn(chalk.yellow(`Claude CLI stderr: ${stderr}`));
        }

        resolve(stdout);
      });

      child.on('error', (error) => {
        if (error.code === 'ENOENT') {
          reject(new Error(
            'Claude CLI not found. Install with: npm install -g @anthropic-ai/claude-cli\n' +
            'Or set provider to "claude" to use the API instead.'
          ));
        } else {
          reject(new Error(`Failed to execute claude CLI: ${error.message}`));
        }
      });
    });
  }

  /**
   * Main iteration method - sends prompt to Claude CLI and returns response
   * @param {Object} params
   * @param {string} params.prompt - The task prompt
   * @param {Object} params.context - Codebase context (files, git, etc.)
   * @param {number} params.iteration - Current iteration number
   * @returns {Promise<Object>} Response with hasChanges, changes, summary, reasoning, raw
   */
  async iterate({ prompt, context, iteration }) {
    try {
      // Validate CLI is installed (only check once, cache result)
      if (!this.cliValidated) {
        this.validateCliInstalled();
        this.cliValidated = true;
      }

      // Build prompts
      const systemPrompt = this.buildSystemPrompt();
      const userMessage = this.buildUserMessage(prompt, context, iteration);

      // Execute CLI
      const response = await this.executeClaudeCommand(systemPrompt, userMessage);

      // Parse response
      const hasChanges = !this.detectNoChanges(response);

      return {
        hasChanges,
        changes: response,
        summary: this.extractSummary(response),
        reasoning: this.extractReasoning(response),
        raw: response
      };
    } catch (error) {
      // Re-throw with context
      throw new Error(`Claude CLI provider failed: ${error.message}`);
    }
  }

  /**
   * Builds the system prompt for Claude
   * This contains the "Ralph Philosophy" instructions for autonomous iteration
   * @returns {string} The system prompt
   */
  buildSystemPrompt() {
    return `You are an autonomous code improvement agent in a Ralph loop - a self-directed iterative development system.

THE RALPH PHILOSOPHY:
This is not a conversation. This is a loop. You will see the same prompt repeatedly until the work is complete.
Each iteration, you must:
1. Examine the codebase to understand what you've already done
2. Identify what remains to achieve the goal
3. Make substantial progress toward completion
4. Leave evidence of your work for your future self

YOU ARE YOUR OWN TEACHER:
- The prompt won't change. The codebase will.
- You won't be told what you did before. You must discover it by reading files.
- Previous failures are valuable data - learn from error messages, test failures, and broken code.
- Your past self left clues: code structure, comments, TODOs, commit messages, test names.

SELF-DISCOVERY PROTOCOL (follow this every iteration):
1. **INVESTIGATE**: Read the files carefully. What's the current state? What patterns exist?
2. **RECALL**: What evidence suggests previous work? Look for:
   - Partially implemented features
   - TODO comments or FIXME markers
   - Test files that hint at intended behavior
   - Code structure that reveals architectural decisions
3. **ANALYZE**: Compare current state against the goal. What's missing? What's broken?
4. **DECIDE**: What is the MOST impactful change you can make right now?
5. **IMPLEMENT**: Make substantial, meaningful changes (not cosmetic tweaks)
6. **VALIDATE**: Would tests pass? Is the code better than before?

DEPTH OVER BREADTH:
- One well-implemented feature beats three half-done ones
- Fix root causes, not symptoms
- If you see a test failure pattern, fix the underlying issue
- Complete what you start before moving to new areas

SELF-BREADCRUMBS (leave clues for your next iteration):
- Use meaningful test names that document intent
- Add brief comments explaining "why" for non-obvious decisions
- Structure code to reveal your thinking
- If blocked, document the blocker clearly

AUTONOMOUS VERIFICATION:
- After changes, mentally trace execution paths
- Consider edge cases and error scenarios
- Think: "Would this pass code review? Would tests pass?"
- If uncertain, prefer conservative approaches

OUTPUT FORMAT (CRITICAL - follow exactly):

## Reasoning:
[Your deep analysis: What did you find? What needs to be done? Why this approach?]

## Summary:
[One line: what you're implementing/fixing]

## File: path/to/file.js
\`\`\`javascript
complete file contents here
\`\`\`

RULES:
- Include COMPLETE file contents (not diffs)
- Use correct language identifier (javascript, python, etc.)
- If goal is fully achieved, respond with only: "NO CHANGES NEEDED"
- Make each iteration count - substantial progress, not trivial tweaks

REMEMBER: You are building on your own work. The codebase is your memory. Read it carefully.`;
  }

  /**
   * Builds the user message with prompt and codebase context
   * @param {string} prompt - The task prompt
   * @param {Object} context - Codebase context
   * @param {number} iteration - Current iteration number
   * @returns {string} The formatted user message
   */
  buildUserMessage(prompt, context, iteration) {
    // Build a clean, constant prompt structure (true Ralph style)
    let message = `# Goal (Iteration ${iteration}):\n${prompt}\n\n`;

    // Handle multi-repo workspace context
    if (context.isMultiRepo) {
      message += `# Workspace Configuration:\n`;
      message += `You are working across ${context.workspaces.length} repositories:\n\n`;

      for (const ws of context.workspaces) {
        message += `## Workspace: ${ws.name}\n`;
        message += `Path: ${ws.path}\n`;
        message += `Files: ${ws.fileCount}\n`;

        // Add git context per workspace
        if (ws.gitContext?.gitLog) {
          message += `Git History:\n\`\`\`\n${ws.gitContext.gitLog}\n\`\`\`\n`;
        }
        if (ws.gitContext?.gitStatus) {
          message += `Git Status:\n\`\`\`\n${ws.gitContext.gitStatus}\n\`\`\`\n`;
        }
        message += `\n`;
      }

      message += `**IMPORTANT**: When outputting file changes, prefix the file path with the workspace name:\n`;
      message += `## File: [workspace-name] path/to/file.js\n`;
      message += `Example: ## File: [backend] src/api/users.js\n\n`;
    } else {
      // Single-repo mode - original behavior

      // Add breadcrumbs if your past self left notes (UNIQUE FEATURE!)
      if (context.breadcrumbs) {
        message += `# Notes from Your Previous Self:\n`;
        message += `Your past iterations left these breadcrumbs in .ralph-notes.md:\n\n`;
        message += `${context.breadcrumbs}\n\n`;
        message += `You can update .ralph-notes.md with new insights for your future self.\n\n`;
      } else {
        message += `# Breadcrumbs:\n`;
        message += `You can create a file called .ralph-notes.md to leave notes for your future iterations.\n`;
        message += `Use it to track progress, document blockers, or remind yourself of the plan.\n\n`;
      }

      // Add git context if available (KEY for self-discovery)
      if (context.gitLog) {
        message += `# Your Work History (git log):\n`;
        message += `You can see what you've done in previous iterations:\n\n`;
        message += `\`\`\`\n${context.gitLog}\n\`\`\`\n\n`;
      }

      if (context.gitStatus) {
        message += `# Git Status:\n\`\`\`\n${context.gitStatus}\n\`\`\`\n\n`;
      }
    }

    // Add test results if available (feedback loop for TDD)
    if (context.testResults) {
      message += `# Recent Test Results:\n`;
      message += `Use this feedback to guide your next changes:\n\n`;
      message += `\`\`\`\n${context.testResults}\n\`\`\`\n\n`;
    }

    message += `# Current Codebase:\n\n`;

    // Add file contents
    for (const file of context.files) {
      if (context.isMultiRepo) {
        // Multi-repo: include workspace tag
        message += `## File: [${file.workspace}] ${file.path}\n\`\`\`\n${file.content}\n\`\`\`\n\n`;
      } else {
        // Single-repo: original format
        message += `## File: ${file.path}\n\`\`\`\n${file.content}\n\`\`\`\n\n`;
      }
    }

    // Simple, constant instructions (no variation by iteration)
    message += `\n---\n\n`;
    message += `Examine the codebase above. Make substantial progress toward the goal.\n`;
    if (context.isMultiRepo) {
      message += `Remember: Changes may span multiple repositories. Tag each file with its workspace.\n`;
    }
    message += `Remember: You are building on your own prior work. The files show your progress.`;

    return message;
  }

  /**
   * Detects if the response indicates no changes are needed
   * @param {string} content - The response content
   * @returns {boolean} True if no changes are needed
   */
  detectNoChanges(content) {
    // Check if response is explicitly stating no changes (must be short and clear)
    const trimmed = content.trim();

    // Explicit "NO CHANGES NEEDED" response (as instructed in system prompt)
    if (/^NO\s+CHANGES\s+NEEDED/i.test(trimmed)) {
      return true;
    }

    // Only detect "no changes" in SHORT responses (< 200 chars)
    // This prevents false positives when Claude mentions "already implemented" in analysis
    // but then provides actual file changes
    if (trimmed.length < 200) {
      const noChangePatterns = [
        /no changes needed/i,
        /no modifications needed/i,
        /nothing to change/i,
        /no improvements needed/i
      ];

      if (noChangePatterns.some(pattern => pattern.test(content))) {
        return true;
      }
    }

    // Check if response contains file changes (## File: pattern)
    // If it has file changes, it's definitely not "no changes"
    if (/##\s*File:/i.test(content)) {
      return false;
    }

    return false;
  }

  /**
   * Extracts the summary from the response
   * @param {string} content - The response content
   * @returns {string} The extracted summary
   */
  extractSummary(content) {
    // Look for ## Summary: section
    const summaryMatch = content.match(/##\s*Summary:\s*([^\n]+)/i);
    if (summaryMatch) {
      return summaryMatch[1].trim();
    }

    // Fallback: extract first line or first paragraph as summary
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length > 0) {
      return lines[0].substring(0, 100) + (lines[0].length > 100 ? '...' : '');
    }

    return 'No summary available';
  }

  /**
   * Extracts the reasoning from the response
   * @param {string} content - The response content
   * @returns {string|null} The extracted reasoning (first 200 chars)
   */
  extractReasoning(content) {
    // Look for ## Reasoning: section
    const reasoningMatch = content.match(/##\s*Reasoning:\s*\n([\s\S]*?)(?=##|$)/i);
    if (reasoningMatch) {
      // Extract and clean up the reasoning text
      const reasoning = reasoningMatch[1].trim();
      // Take first 200 chars for storage
      return reasoning.substring(0, 200) + (reasoning.length > 200 ? '...' : '');
    }

    return null;
  }
}

module.exports = ClaudeCliProvider;
