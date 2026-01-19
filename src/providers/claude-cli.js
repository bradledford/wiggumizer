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
    this.fast = config.fast || false;  // Fast mode for shorter prompts
    this.cliValidated = false;

    if (this.verbose) {
      console.log(chalk.dim(`Initialized Claude CLI provider with model: ${this.model}${this.fast ? ' (fast mode)' : ''}`));
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
   * @param {Object} options - Execution options
   * @param {Function} options.onOutput - Callback for streaming output
   * @returns {Promise<string>} The CLI output (full text content)
   */
  async executeClaudeCommand(systemPrompt, userMessage, options = {}) {
    const useStreaming = !!options.onOutput;

    const args = [
      '-p',
      '--model', this.model,
      '--system-prompt', systemPrompt,
      // Enable file editing and tool permissions - without this, Claude CLI cannot modify files
      '--allowedTools', 'Edit,Write,Read,Glob,Grep,Bash'
    ];

    // Enable streaming JSON output if callback provided
    // Per docs: --include-partial-messages requires --output-format stream-json
    // IMPORTANT: stream-json also requires --verbose in print mode
    if (useStreaming) {
      args.push('--output-format', 'stream-json');
      args.push('--include-partial-messages');
      args.push('--verbose');
    }

    // Don't pass user message as arg - use stdin instead to avoid command length limits
    // args.push(userMessage);

    if (this.verbose) {
      console.log(chalk.dim(`\nExecuting: claude -p --model ${this.model} --allowedTools Edit,Write,Read,Glob,Grep,Bash --output-format stream-json --include-partial-messages --verbose`));
      console.log(chalk.dim(`User message length: ${userMessage.length} chars (via stdin)`));
    }

    return new Promise((resolve, reject) => {
      const child = spawn('claude', args);

      // Write user message to stdin instead of command arg
      child.stdin.write(userMessage);
      child.stdin.end();

      let stdout = '';
      let stderr = '';
      let fullContent = '';
      let lineBuffer = '';

      child.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;

        // Debug: log raw data received
        if (this.verbose) {
          console.log(chalk.cyan(`[STDOUT] Received ${text.length} bytes`));
        }

        // Parse streaming JSON events if streaming is enabled
        if (useStreaming && options.onOutput) {
          lineBuffer += text;
          const lines = lineBuffer.split('\n');

          // Keep the last incomplete line in buffer
          lineBuffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;

            try {
              const event = JSON.parse(line);

              // Debug: log event type
              if (this.verbose) {
                console.log(chalk.green(`[EVENT] type=${event.type}`));
              }

              // Handle stream_event wrapper (with --verbose flag)
              if (event.type === 'stream_event' && event.event) {
                const innerEvent = event.event;

                // Handle content_block_delta events with text chunks
                if (innerEvent.type === 'content_block_delta' && innerEvent.delta?.text) {
                  const textChunk = innerEvent.delta.text;
                  fullContent += textChunk;
                  if (this.verbose) {
                    console.log(chalk.magenta(`[TEXT] "${textChunk}"`));
                  }
                  options.onOutput(textChunk);
                }
              }
              // Handle direct assistant message with final content
              else if (event.type === 'assistant' && event.message?.content) {
                // Final content is in the message
                for (const block of event.message.content) {
                  if (block.type === 'text') {
                    fullContent = block.text;
                  }
                }
              }
            } catch (parseError) {
              // Ignore JSON parse errors - might be partial line or non-JSON output
              if (this.verbose) {
                console.warn(chalk.yellow(`[PARSE ERROR] ${parseError.message}: ${line.substring(0, 50)}...`));
              }
            }
          }
        }
      });

      child.stderr.on('data', (data) => {
        const text = data.toString();
        stderr += text;

        // Stream stderr warnings if present (but filter out progress indicators)
        if (this.verbose && text.trim() && !text.includes('\r')) {
          console.warn(chalk.yellow(`[Claude CLI stderr]: ${text.trim()}`));
        }
      });

      child.on('close', (code) => {
        if (code !== 0) {
          // Check for authentication errors
          if (stderr.includes('authentication') ||
              stderr.includes('unauthorized') ||
              stderr.includes('api key')) {
            reject(new Error(
              'Claude CLI authentication failed.\n' +
              'Run: claude (to authenticate interactively)\n' +
              'Or set provider to "claude" to use the Anthropic API instead.'
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

        // Return accumulated content if streaming, otherwise return stdout
        resolve(useStreaming ? fullContent : stdout);
      });

      child.on('error', (error) => {
        if (error.code === 'ENOENT') {
          reject(new Error(
            'Claude CLI not found. Install from: https://claude.ai/download\n' +
            'Or set provider to "claude" to use the Anthropic API instead.'
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
   * @param {Function} params.onOutput - Optional callback for streaming output
   * @returns {Promise<Object>} Response with hasChanges, changes, summary, reasoning, raw
   */
  async iterate({ prompt, context, iteration, onOutput }) {
    try {
      // Validate CLI is installed (only check once, cache result)
      if (!this.cliValidated) {
        this.validateCliInstalled();
        this.cliValidated = true;
      }

      // Build prompts
      const systemPrompt = this.buildSystemPrompt();
      const userMessage = this.buildUserMessage(prompt, context, iteration);

      // Execute CLI with streaming output
      const response = await this.executeClaudeCommand(systemPrompt, userMessage, {
        onOutput
      });

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
    // Fast mode: condensed system prompt for quicker responses
    if (this.fast) {
      return `You are an autonomous code improvement agent in a Ralph loop.

FAST MODE - Be concise:
Each iteration: use tools to examine codebase → identify what's needed → make substantial progress.
The prompt repeats until work is complete. Discover progress by reading files.

TOOLS (you MUST use these):
- **Glob**: Find files by pattern (e.g., Glob "src/**/*.js")
- **Grep**: Search code (e.g., Grep "function.*export")
- **Read**: Read files (e.g., Read src/index.js)
- **Edit**: Modify files with precise string replacement
- **Write**: Create new files
- **Bash**: Run commands (git, npm test, etc.)

OUTPUT FORMAT:
## Reasoning:
[Brief analysis of current state and what needs to be done]

## Summary:
[One line: what you're implementing/fixing]

## File: path/to/file.js
\`\`\`javascript
complete file contents here
\`\`\`

RULES:
- Include COMPLETE file contents (not diffs)
- Output "NO CHANGES NEEDED" if goal achieved
- Make substantial progress each iteration
- ALWAYS start by using tools (Glob/Grep/Read)

Read the codebase carefully. Build on your previous work.`;
    }

    return `You are an autonomous code improvement agent in a Ralph loop - a self-directed iterative development system.

THE RALPH PHILOSOPHY:
This is not a conversation. This is a loop. You will see the same prompt repeatedly until the work is complete.
Each iteration, you must:
1. Use your tools to discover and examine the codebase
2. Identify what remains to achieve the goal
3. Make substantial progress toward completion
4. Leave evidence of your work for your future self

YOU ARE YOUR OWN TEACHER:
- The prompt won't change. The codebase will.
- You won't be told what you did before. You must discover it by reading files.
- Previous failures are valuable data - learn from error messages, test failures, and broken code.
- Your past self left clues: code structure, comments, TODOs, commit messages, test names.

TOOL-BASED DISCOVERY (you MUST use your tools):
You have access to local filesystem tools. The codebase is NOT pre-loaded - you must discover it:
1. **Glob**: Find files by pattern (e.g., Glob "src/**/*.js" to find all JS files)
2. **Grep**: Search for code patterns (e.g., Grep "export.*function" to find exports)
3. **Read**: Read file contents (e.g., Read src/index.js)
4. **Edit**: Modify files with precise string replacement
5. **Write**: Create new files
6. **Bash**: Run commands (git, npm test, etc.)

SELF-DISCOVERY PROTOCOL (follow this every iteration):
1. **INVESTIGATE**: Use Glob/Grep to find relevant files, then Read to examine them
2. **RECALL**: What evidence suggests previous work? Look for:
   - Git history (provided in prompt)
   - Partially implemented features (use Grep to search)
   - TODO comments or FIXME markers (use Grep "TODO|FIXME")
   - Test files (use Glob "**/*.test.js")
   - Code structure (use Read on key files)
3. **ANALYZE**: Compare current state against the goal. What's missing? What's broken?
4. **DECIDE**: What is the MOST impactful change you can make right now?
5. **IMPLEMENT**: Use Edit/Write to make substantial, meaningful changes
6. **VALIDATE**: Run tests with Bash if available

DEPTH OVER BREADTH:
- One well-implemented feature beats three half-done ones
- Fix root causes, not symptoms
- If you see a test failure pattern, fix the underlying issue
- Complete what you start before moving to new areas

SELF-BREADCRUMBS (leave clues for your next iteration):
- Use meaningful test names that document intent
- Add brief comments explaining "why" for non-obvious decisions
- Update .wiggumizer/ralph-notes.md with insights for your future self
- Structure code to reveal your thinking

AUTONOMOUS VERIFICATION:
- After changes, mentally trace execution paths
- Consider edge cases and error scenarios
- Think: "Would this pass code review? Would tests pass?"
- Run tests with Bash if available

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
- ALWAYS start by using tools to discover the codebase (Glob/Grep/Read)

REMEMBER: The codebase is NOT in this prompt. You MUST use your tools to discover and read files.`;
  }

  /**
   * Builds the user message with prompt and codebase context
   * For Claude CLI: Sends minimal context, leverages local filesystem tools
   * @param {string} prompt - The task prompt
   * @param {Object} context - Codebase context
   * @param {number} iteration - Current iteration number
   * @returns {string} The formatted user message
   */
  buildUserMessage(prompt, context, iteration) {
    // In fast mode, use condensed prompts for quicker responses
    if (this.fast) {
      return this.buildFastUserMessage(prompt, context, iteration);
    }

    // Build a clean, minimal prompt (leverage Claude CLI's local tools)
    let message = `# Goal (Iteration ${iteration}):\n${prompt}\n\n`;

    // Add iteration context - works for both Git and non-Git repos
    // Check for gitLog first (backward compatible) - if gitLog exists, use it
    // Only fall back to iterationHistory when gitLog is explicitly null/undefined
    // and iterationHistory is available
    if (context.gitLog) {
      // Git-based history (preferred, also backward compatible)
      message += `# Your Work History (git log):\n`;
      message += `You can see what you've done in previous iterations:\n\n`;
      message += `\`\`\`\n${context.gitLog}\n\`\`\`\n\n`;
    } else if (context.iterationHistory) {
      // Journal-based history (fallback for non-Git repos)
      message += `# Your Work History (previous iterations):\n`;
      message += `You can see what you've done in previous iterations:\n\n`;
      message += `\`\`\`\n${context.iterationHistory}\n\`\`\`\n\n`;
    }

    if (context.gitStatus) {
      message += `# Git Status:\n\`\`\`\n${context.gitStatus}\n\`\`\`\n\n`;
    }

    // Add breadcrumbs if available
    if (context.breadcrumbs) {
      message += `# Notes from Your Previous Self:\n`;
      message += `Your past iterations left these breadcrumbs in .wiggumizer/ralph-notes.md:\n\n`;
      message += `${context.breadcrumbs}\n\n`;
    }

    // Add test results if available (feedback loop for TDD)
    if (context.testResults) {
      message += `# Recent Test Results:\n`;
      message += `Use this feedback to guide your next changes:\n\n`;
      message += `\`\`\`\n${context.testResults}\n\`\`\`\n\n`;
    }

    // Instructions for using local filesystem tools
    message += `# Codebase Access:\n`;
    message += `You have full access to the local filesystem via your built-in tools:\n`;
    message += `- **Read**: Read any file (e.g., Read src/index.js)\n`;
    message += `- **Grep**: Search for patterns (e.g., Grep "function.*export")\n`;
    message += `- **Glob**: Find files by pattern (e.g., Glob "src/**/*.js")\n`;
    message += `- **Bash**: Run commands (e.g., git log, npm test)\n`;
    message += `- **Edit**: Modify files with precise string replacement\n`;
    message += `- **Write**: Create new files\n\n`;

    message += `**IMPORTANT**: You MUST use these tools to discover and read files as needed.\n`;
    message += `The codebase is NOT pre-loaded. You need to:\n`;
    message += `1. Use Glob/Grep to find relevant files\n`;
    message += `2. Use Read to examine their contents\n`;
    message += `3. Use Edit to make changes\n\n`;

    // Handle multi-repo workspace context
    if (context.isMultiRepo) {
      message += `# Workspace Configuration:\n`;
      message += `You are working across ${context.workspaces.length} repositories:\n\n`;

      for (const ws of context.workspaces) {
        message += `## Workspace: ${ws.name}\n`;
        message += `Path: ${ws.path}\n`;

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
      message += `# Working Directory:\n`;
      message += `${process.cwd()}\n\n`;
    }

    // Simple, constant instructions (no variation by iteration)
    message += `\n---\n\n`;
    message += `Use your tools to explore the codebase and make substantial progress toward the goal.\n`;
    message += `Remember: You are building on your own prior work. Use git history and breadcrumbs to understand context.\n`;
    message += `Start by using Glob/Grep to find relevant files, then Read to examine them.`;

    return message;
  }

  /**
   * Builds a condensed user message for fast mode
   * @param {string} prompt - The task prompt
   * @param {Object} context - Codebase context
   * @param {number} iteration - Current iteration number
   * @returns {string} The formatted user message
   */
  buildFastUserMessage(prompt, context, iteration) {
    let message = `# Goal (Iteration ${iteration}):\n${prompt}\n\n`;

    // Condensed context for fast mode - support both Git and non-Git repos
    // Prefer gitLog if available, fall back to iterationHistory
    const historySource = context.gitLog || context.iterationHistory;
    if (historySource) {
      const historyLines = historySource.split('\n').slice(0, 5).join('\n');
      message += `# Recent History:\n\`\`\`\n${historyLines}\n\`\`\`\n\n`;
    }

    if (context.gitStatus) {
      message += `# Status:\n\`\`\`\n${context.gitStatus}\n\`\`\`\n\n`;
    }

    // Truncate breadcrumbs in fast mode
    if (context.breadcrumbs) {
      const truncatedBreadcrumbs = context.breadcrumbs.length > 300
        ? context.breadcrumbs.substring(0, 300) + '...'
        : context.breadcrumbs;
      message += `# Notes:\n${truncatedBreadcrumbs}\n\n`;
    }

    // Working directory
    message += `# Working Directory:\n${process.cwd()}\n\n`;

    // Concise instructions
    message += `Use Glob/Grep/Read tools to explore. Make substantial progress. Output complete files.`;

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

    // Check if response contains file changes (## File: pattern)
    // If it has file changes, it's definitely not "no changes"
    if (/##\s*File:/i.test(content)) {
      return false;
    }

    // Check for various "no changes" patterns in the content
    // Look for these patterns particularly in Summary or Reasoning sections
    const noChangePatterns = [
      /no changes needed/i,
      /no modifications needed/i,
      /nothing to change/i,
      /no improvements needed/i,
      /no further changes/i,
      /work (?:is )?complete/i,
      /goal (?:is )?(?:fully )?(?:achieved|reached|accomplished)/i,
      /all (?:features?|requirements?|tasks?) (?:are )?(?:implemented|complete|done)/i,
      /everything (?:is )?(?:implemented|complete|working)/i
    ];

    // Check patterns, but only if there are no file changes present
    // (we already checked for file changes above, so at this point we know there are none)
    for (const pattern of noChangePatterns) {
      if (pattern.test(content)) {
        return true;
      }
    }

    // If response is very short and doesn't have file changes, likely no changes
    if (trimmed.length < 100) {
      return true;
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
