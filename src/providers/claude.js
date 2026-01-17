const Anthropic = require('@anthropic-ai/sdk');
const chalk = require('chalk');
const { ErrorHandler, RateLimiter } = require('../error-handler');

class ClaudeProvider {
  constructor(config = {}) {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.error(chalk.red('\n✗ ANTHROPIC_API_KEY environment variable not set'));
      console.log(chalk.yellow('\nSet your API key:'));
      console.log(chalk.dim('  export ANTHROPIC_API_KEY=your-key-here\n'));
      process.exit(1);
    }

    this.client = new Anthropic({ apiKey });
    this.model = config.model || 'claude-opus-4-5-20251101';
    this.maxTokens = config.maxTokens || 16384; // Claude Opus 4.5 supports up to 32K

    // Initialize error handler
    this.errorHandler = new ErrorHandler({
      maxRetries: config.maxRetries || 3,
      baseDelay: 1000,
      maxDelay: 30000,
      verbose: config.verbose || false
    });

    // Initialize rate limiter
    this.rateLimiter = new RateLimiter({
      requestsPerMinute: config.requestsPerMinute || 50,
      requestsPerHour: config.requestsPerHour || 1000,
      verbose: config.verbose || false
    });
  }

  async iterate({ prompt, context, iteration, onOutput }) {
    // Build the message for Claude
    const systemPrompt = this.buildSystemPrompt();
    const userMessage = this.buildUserMessage(prompt, context, iteration);

    // Apply rate limiting and retry logic
    return await this.errorHandler.executeWithRetry(async () => {
      // Wait for rate limit if needed
      await this.rateLimiter.waitIfNeeded();

      // Use streaming API if onOutput callback provided
      if (onOutput) {
        let fullContent = '';

        const stream = await this.client.messages.stream({
          model: this.model,
          max_tokens: this.maxTokens,
          system: systemPrompt,
          messages: [{
            role: 'user',
            content: userMessage
          }]
        });

        // Process stream and call onOutput for each chunk
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
            const text = chunk.delta.text;
            fullContent += text;

            // Stream each line to the callback
            const lines = text.split('\n');
            for (const line of lines) {
              if (line.trim()) {
                onOutput(line);
              }
            }
          }
        }

        // Simple convergence detection
        const hasChanges = !this.detectNoChanges(fullContent);

        return {
          hasChanges,
          changes: fullContent,
          summary: this.extractSummary(fullContent),
          reasoning: this.extractReasoning(fullContent),
          raw: fullContent
        };
      } else {
        // Non-streaming API call (original behavior)
        const response = await this.client.messages.create({
          model: this.model,
          max_tokens: this.maxTokens,
          system: systemPrompt,
          messages: [{
            role: 'user',
            content: userMessage
          }]
        });

        // Parse response
        const content = response.content[0].text;

        // Simple convergence detection: if Claude says "no changes" or similar
        const hasChanges = !this.detectNoChanges(content);

        return {
          hasChanges,
          changes: content,
          summary: this.extractSummary(content),
          reasoning: this.extractReasoning(content),
          raw: content
        };
      }
    }, `Claude API call (iteration ${iteration})`);
  }

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

## Changes:
\`\`\`diff
--- a/path/to/file.js
+++ b/path/to/file.js
@@ -10,7 +10,7 @@
 context line
 context line
-old line to remove
+new line to add
 context line
 context line
\`\`\`

DIFF FORMAT RULES (CRITICAL):
- Output unified diff format (standard diff -u format)
- Start each file with: --- a/path/to/file.ext and +++ b/path/to/file.ext
- Include @@ line numbers with context
- Lines starting with - are removed
- Lines starting with + are added
- Include 3 lines of context before and after changes
- For new files, use: --- /dev/null and +++ b/path/to/file.ext
- For deleted files, use: --- a/path/to/file.ext and +++ /dev/null
- If goal is fully achieved, respond with only: "NO CHANGES NEEDED"
- NEVER output complete file contents - ONLY diffs
- Make each iteration count - substantial progress, not trivial tweaks

WHY DIFFS:
- Diffs only touch what needs changing - prevents accidental deletion of code
- Can review exactly what's being changed
- Safe even with large files or token limits

REMEMBER: You are building on your own work. The codebase is your memory. Read it carefully.`;
  }

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

      message += `**IMPORTANT**: When outputting diffs, include the workspace name in the path:\n`;
      message += `--- a/[workspace-name]/path/to/file.js\n`;
      message += `+++ b/[workspace-name]/path/to/file.js\n`;
      message += `Example: --- a/[backend]/src/api/users.js\n\n`;
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

    // Add file contents with line numbers (for diff generation)
    for (const file of context.files) {
      const lines = file.content.split('\n');
      const numberedContent = lines.map((line, idx) => `${idx + 1}│${line}`).join('\n');

      if (context.isMultiRepo) {
        // Multi-repo: include workspace tag
        message += `## File: [${file.workspace}] ${file.path}\n\`\`\`\n${numberedContent}\n\`\`\`\n\n`;
      } else {
        // Single-repo: original format
        message += `## File: ${file.path}\n\`\`\`\n${numberedContent}\n\`\`\`\n\n`;
      }
    }

    // Simple, constant instructions (no variation by iteration)
    message += `\n---\n\n`;
    message += `Examine the codebase above (line numbers provided). Make substantial progress toward the goal.\n`;
    message += `Output your changes as unified diffs - only touch what needs changing.\n`;
    if (context.isMultiRepo) {
      message += `Remember: Changes may span multiple repositories. Include workspace name in diff paths.\n`;
    }
    message += `Remember: You are building on your own prior work. The files show your progress.`;

    return message;
  }

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

    // Check if response contains diff changes (--- a/ and +++ b/ pattern)
    // If it has diffs, it's definitely not "no changes"
    if (/^---\s+a\//m.test(content) && /^\+\+\+\s+b\//m.test(content)) {
      return false;
    }

    return false;
  }

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

module.exports = ClaudeProvider;
