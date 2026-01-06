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
    this.maxTokens = config.maxTokens || 8192;

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

  async iterate({ prompt, context, iteration }) {
    // Build the message for Claude
    const systemPrompt = this.buildSystemPrompt();
    const userMessage = this.buildUserMessage(prompt, context, iteration);

    // Apply rate limiting and retry logic
    return await this.errorHandler.executeWithRetry(async () => {
      // Wait for rate limit if needed
      await this.rateLimiter.waitIfNeeded();

      // Make API call
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
        raw: content
      };
    }, `Claude API call (iteration ${iteration})`);
  }

  buildSystemPrompt() {
    return `You are an expert code refactoring assistant in a Ralph loop - an iterative code improvement system.

Your role:
- Read the user's prompt describing desired changes
- Examine the current codebase
- Make incremental improvements toward the goal
- If the code already satisfies the prompt, respond with "NO CHANGES NEEDED"

Guidelines:
- Make focused, incremental changes (don't try to do everything at once)
- Preserve existing functionality unless explicitly asked to change it
- Follow the existing code style and patterns
- Be conservative - prefer small improvements that accumulate

CRITICAL - Output format (you MUST follow this exactly):
1. Start with a brief summary of what you're changing
2. For each file you're modifying, use this EXACT format:

## File: path/to/file.js
\`\`\`javascript
complete file contents here
\`\`\`

3. Include the COMPLETE file contents, not just the changes
4. Use the correct language identifier in the code fence (javascript, python, etc.)
5. If no changes are needed, respond with only "NO CHANGES NEEDED"

Example response:
Improving error handling in authentication module.

## File: src/auth.js
\`\`\`javascript
const bcrypt = require('bcrypt');

async function authenticate(username, password) {
  // Complete file contents...
}

module.exports = { authenticate };
\`\`\``;
  }

  buildUserMessage(prompt, context, iteration) {
    let message = `# Iteration ${iteration}\n\n`;
    message += `# User Prompt:\n${prompt}\n\n`;
    message += `# Current Codebase:\n\n`;

    // Add file contents
    for (const file of context.files) {
      message += `## File: ${file.path}\n\`\`\`\n${file.content}\n\`\`\`\n\n`;
    }

    message += `\nPlease make incremental improvements based on the prompt above.`;

    return message;
  }

  detectNoChanges(content) {
    const noChangePatterns = [
      /no changes needed/i,
      /no modifications needed/i,
      /already satisfies/i,
      /code is already/i,
      /no improvements needed/i
    ];

    return noChangePatterns.some(pattern => pattern.test(content));
  }

  extractSummary(content) {
    // Extract first line or first paragraph as summary
    const lines = content.split('\n');
    return lines[0].substring(0, 100) + (lines[0].length > 100 ? '...' : '');
  }
}

module.exports = ClaudeProvider;
