const chalk = require('chalk');

/**
 * AI SDK Provider
 * Uses Vercel's AI SDK for multi-provider support.
 * Supports: OpenAI, Anthropic, Google, Mistral, Cohere, Amazon Bedrock, and more.
 *
 * See: https://ai-sdk.dev/docs/foundations/providers-and-models
 *
 * Usage:
 * - Install the ai package: npm install ai
 * - Install provider packages: npm install @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google etc.
 * - Configure in .wiggumizer.yml:
 *   provider: ai-sdk
 *   providers:
 *     ai-sdk:
 *       provider: openai           # or anthropic, google, mistral, etc.
 *       model: gpt-4o              # model name for the provider
 *       maxTokens: 16384
 */
class AiSdkProvider {
  constructor(config = {}) {
    this.providerName = config.provider || 'openai';
    this.modelName = config.model || 'gpt-4o';
    this.maxTokens = config.maxTokens || 16384;
    this.verbose = config.verbose || false;
    this.fast = config.fast || false;

    // Provider-specific options (passed to the provider factory)
    this.providerOptions = config.providerOptions || {};

    // Lazy-load the AI SDK modules to avoid errors if not installed
    this.ai = null;
    this.provider = null;
    this.model = null;

    if (this.verbose) {
      console.log(chalk.dim(`Initializing AI SDK provider: ${this.providerName} / ${this.modelName}${this.fast ? ' (fast mode)' : ''}`));
    }
  }

  /**
   * Lazily initializes the AI SDK and provider
   * This allows the constructor to succeed even if packages aren't installed yet
   */
  async initialize() {
    if (this.ai && this.model) {
      return; // Already initialized
    }

    try {
      // Load the ai package
      this.ai = require('ai');
    } catch (error) {
      throw new Error(
        'AI SDK not installed. Install with:\n' +
        '  npm install ai\n\n' +
        'Then install your preferred provider:\n' +
        '  npm install @ai-sdk/openai     # OpenAI\n' +
        '  npm install @ai-sdk/anthropic  # Anthropic\n' +
        '  npm install @ai-sdk/google     # Google (Gemini)\n' +
        '  npm install @ai-sdk/mistral    # Mistral\n' +
        '  npm install @ai-sdk/cohere     # Cohere\n' +
        '  npm install @ai-sdk/amazon-bedrock  # Amazon Bedrock\n'
      );
    }

    // Load the appropriate provider
    this.provider = await this.loadProvider();
    this.model = this.provider(this.modelName);

    if (this.verbose) {
      console.log(chalk.dim(`✓ AI SDK initialized: ${this.providerName} / ${this.modelName}`));
    }
  }

  /**
   * Load the appropriate AI SDK provider package
   */
  async loadProvider() {
    const providerPackages = {
      'openai': '@ai-sdk/openai',
      'anthropic': '@ai-sdk/anthropic',
      'google': '@ai-sdk/google',
      'google-vertex': '@ai-sdk/google-vertex',
      'mistral': '@ai-sdk/mistral',
      'cohere': '@ai-sdk/cohere',
      'amazon-bedrock': '@ai-sdk/amazon-bedrock',
      'azure': '@ai-sdk/azure',
      'groq': '@ai-sdk/groq',
      'perplexity': '@ai-sdk/perplexity',
      'xai': '@ai-sdk/xai',
      'deepseek': '@ai-sdk/deepseek',
      'togetherai': '@ai-sdk/togetherai',
      'fireworks': '@ai-sdk/fireworks',
      'cerebras': '@ai-sdk/cerebras'
    };

    const packageName = providerPackages[this.providerName];

    if (!packageName) {
      throw new Error(
        `Unknown AI SDK provider: ${this.providerName}\n\n` +
        `Supported providers:\n` +
        Object.keys(providerPackages).map(p => `  - ${p}`).join('\n') +
        `\n\nOr specify a custom package via providerOptions.package`
      );
    }

    // Allow custom package override
    const actualPackage = this.providerOptions.package || packageName;

    try {
      const providerModule = require(actualPackage);

      // Most AI SDK providers export the provider factory as the default export
      // or as a named export matching the provider name
      const providerFactory = providerModule.default ||
                             providerModule[this.providerName] ||
                             providerModule.createProvider ||
                             providerModule;

      // If the factory is callable (like openai, anthropic), call it with options
      if (typeof providerFactory === 'function') {
        // Check if it needs to be called with options
        try {
          // Try calling with API key from environment if needed
          const apiKeyEnvVars = {
            'openai': 'OPENAI_API_KEY',
            'anthropic': 'ANTHROPIC_API_KEY',
            'google': 'GOOGLE_GENERATIVE_AI_API_KEY',
            'google-vertex': 'GOOGLE_VERTEX_API_KEY',
            'mistral': 'MISTRAL_API_KEY',
            'cohere': 'COHERE_API_KEY',
            'groq': 'GROQ_API_KEY',
            'perplexity': 'PERPLEXITY_API_KEY',
            'xai': 'XAI_API_KEY',
            'deepseek': 'DEEPSEEK_API_KEY',
            'togetherai': 'TOGETHER_API_KEY',
            'fireworks': 'FIREWORKS_API_KEY',
            'cerebras': 'CEREBRAS_API_KEY'
          };

          const envVar = apiKeyEnvVars[this.providerName];
          const apiKey = envVar ? process.env[envVar] : undefined;

          if (envVar && !apiKey) {
            console.warn(chalk.yellow(`⚠ ${envVar} environment variable not set - provider may fail`));
          }

          // Create provider instance with options if provided
          const options = { ...this.providerOptions };
          if (apiKey && !options.apiKey) {
            options.apiKey = apiKey;
          }

          // Return the factory - it will be called with model name later
          return providerFactory;
        } catch (e) {
          // Factory doesn't need options, just return it
          return providerFactory;
        }
      }

      return providerFactory;
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error(
          `AI SDK provider package not installed: ${actualPackage}\n` +
          `Install with: npm install ${actualPackage}`
        );
      }
      throw error;
    }
  }

  /**
   * Main iteration method - sends prompt to AI SDK and returns response
   */
  async iterate({ prompt, context, iteration, onOutput }) {
    // Ensure initialized
    await this.initialize();

    // Build the messages
    const systemPrompt = this.buildSystemPrompt();
    const userMessage = this.buildUserMessage(prompt, context, iteration);

    try {
      // Use streaming if onOutput callback provided
      if (onOutput) {
        return await this.iterateWithStreaming(systemPrompt, userMessage, onOutput);
      } else {
        return await this.iterateWithoutStreaming(systemPrompt, userMessage);
      }
    } catch (error) {
      throw new Error(`AI SDK provider (${this.providerName}) failed: ${error.message}`);
    }
  }

  /**
   * Iterate with streaming output
   */
  async iterateWithStreaming(systemPrompt, userMessage, onOutput) {
    const { streamText } = this.ai;

    let fullContent = '';

    const result = await streamText({
      model: this.model,
      system: systemPrompt,
      maxTokens: this.maxTokens,
      messages: [
        { role: 'user', content: userMessage }
      ]
    });

    // Process the stream
    for await (const chunk of result.textStream) {
      fullContent += chunk;

      // Stream each chunk to the callback
      if (chunk.trim()) {
        onOutput(chunk);
      }
    }

    // Parse and return
    const hasChanges = !this.detectNoChanges(fullContent);

    return {
      hasChanges,
      changes: fullContent,
      summary: this.extractSummary(fullContent),
      reasoning: this.extractReasoning(fullContent),
      raw: fullContent
    };
  }

  /**
   * Iterate without streaming
   */
  async iterateWithoutStreaming(systemPrompt, userMessage) {
    const { generateText } = this.ai;

    const result = await generateText({
      model: this.model,
      system: systemPrompt,
      maxTokens: this.maxTokens,
      messages: [
        { role: 'user', content: userMessage }
      ]
    });

    const content = result.text;
    const hasChanges = !this.detectNoChanges(content);

    return {
      hasChanges,
      changes: content,
      summary: this.extractSummary(content),
      reasoning: this.extractReasoning(content),
      raw: content
    };
  }

  /**
   * Build the system prompt (same as other providers for consistency)
   */
  buildSystemPrompt() {
    if (this.fast) {
      return `You are an autonomous code improvement agent in a Ralph loop.

FAST MODE - Be concise:
Each iteration: examine codebase → identify what's needed → make substantial progress.
The prompt repeats until work is complete. Discover progress by reading files.

OUTPUT FORMAT:
## Reasoning:
[Brief analysis of current state and what needs to be done]

## Summary:
[One line: what you're implementing/fixing]

## Changes:
\`\`\`diff
--- a/path/to/file.js
+++ b/path/to/file.js
@@ -10,7 +10,7 @@
 context
-old line
+new line
 context
\`\`\`

RULES:
- Use unified diff format (standard diff -u)
- Include 3 lines context before/after changes
- Output "NO CHANGES NEEDED" if goal achieved
- Make substantial progress each iteration

Read the codebase carefully. Build on your previous work.`;
    }

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

REMEMBER: You are building on your own work. The codebase is your memory. Read it carefully.`;
  }

  /**
   * Build the user message (same as ClaudeProvider for consistency)
   */
  buildUserMessage(prompt, context, iteration) {
    if (this.fast) {
      return this.buildFastUserMessage(prompt, context, iteration);
    }

    let message = `# Goal (Iteration ${iteration}):\n${prompt}\n\n`;

    // Handle multi-repo workspace context
    if (context.isMultiRepo) {
      message += `# Workspace Configuration:\n`;
      message += `You are working across ${context.workspaces.length} repositories:\n\n`;

      for (const ws of context.workspaces) {
        message += `## Workspace: ${ws.name}\n`;
        message += `Path: ${ws.path}\n`;
        message += `Files: ${ws.fileCount}\n`;

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
      // Add breadcrumbs
      if (context.breadcrumbs) {
        message += `# Notes from Your Previous Self:\n`;
        message += `Your past iterations left these breadcrumbs in .wiggumizer/ralph-notes.md:\n\n`;
        message += `${context.breadcrumbs}\n\n`;
      } else {
        message += `# Breadcrumbs:\n`;
        message += `You can create a file called .wiggumizer/ralph-notes.md to leave notes for your future iterations.\n\n`;
      }

      // Git history
      if (context.gitLog) {
        message += `# Your Work History (git log):\n`;
        message += `You can see what you've done in previous iterations:\n\n`;
        message += `\`\`\`\n${context.gitLog}\n\`\`\`\n\n`;
      } else if (context.iterationHistory) {
        message += `# Your Work History (previous iterations):\n`;
        message += `\`\`\`\n${context.iterationHistory}\n\`\`\`\n\n`;
      }

      if (context.gitStatus) {
        message += `# Git Status:\n\`\`\`\n${context.gitStatus}\n\`\`\`\n\n`;
      }
    }

    // Test results
    if (context.testResults) {
      message += `# Recent Test Results:\n`;
      message += `\`\`\`\n${context.testResults}\n\`\`\`\n\n`;
    }

    message += `# Current Codebase:\n\n`;

    // File contents with line numbers
    for (const file of context.files) {
      const lines = file.content.split('\n');
      const numberedContent = lines.map((line, idx) => `${idx + 1}│${line}`).join('\n');

      if (context.isMultiRepo) {
        message += `## File: [${file.workspace}] ${file.path}\n\`\`\`\n${numberedContent}\n\`\`\`\n\n`;
      } else {
        message += `## File: ${file.path}\n\`\`\`\n${numberedContent}\n\`\`\`\n\n`;
      }
    }

    message += `\n---\n\n`;
    message += `Examine the codebase above. Make substantial progress toward the goal.\n`;
    message += `Output your changes as unified diffs - only touch what needs changing.\n`;
    if (context.isMultiRepo) {
      message += `Remember: Changes may span multiple repositories. Include workspace name in diff paths.\n`;
    }
    message += `Remember: You are building on your own prior work. The files show your progress.`;

    return message;
  }

  buildFastUserMessage(prompt, context, iteration) {
    let message = `# Goal (Iteration ${iteration}):\n${prompt}\n\n`;

    const historySource = context.gitLog || context.iterationHistory;
    if (historySource) {
      const historyLines = historySource.split('\n').slice(0, 5).join('\n');
      message += `# Recent History:\n\`\`\`\n${historyLines}\n\`\`\`\n\n`;
    }

    if (context.gitStatus) {
      message += `# Status:\n\`\`\`\n${context.gitStatus}\n\`\`\`\n\n`;
    }

    if (context.breadcrumbs) {
      const truncated = context.breadcrumbs.length > 300
        ? context.breadcrumbs.substring(0, 300) + '...'
        : context.breadcrumbs;
      message += `# Notes:\n${truncated}\n\n`;
    }

    message += `# Codebase:\n\n`;

    const maxFiles = Math.min(context.files.length, 10);
    for (let i = 0; i < maxFiles; i++) {
      const file = context.files[i];
      const lines = file.content.split('\n');
      const truncatedLines = lines.slice(0, 50);
      const numberedContent = truncatedLines.map((line, idx) => `${idx + 1}│${line}`).join('\n');

      if (context.isMultiRepo) {
        message += `## File: [${file.workspace}] ${file.path}\n\`\`\`\n${numberedContent}\n\`\`\`\n`;
      } else {
        message += `## File: ${file.path}\n\`\`\`\n${numberedContent}\n\`\`\`\n`;
      }
      if (lines.length > 50) {
        message += `[... ${lines.length - 50} more lines]\n`;
      }
      message += `\n`;
    }

    if (context.files.length > maxFiles) {
      message += `[... ${context.files.length - maxFiles} more files not shown in fast mode]\n\n`;
    }

    message += `Examine the codebase. Make substantial progress. Output unified diffs only.`;

    return message;
  }

  /**
   * Detect if response indicates no changes needed
   */
  detectNoChanges(content) {
    const trimmed = content.trim();

    if (trimmed.length === 0) {
      return false;
    }

    if (/^NO\s+CHANGES\s+NEEDED/i.test(trimmed)) {
      return true;
    }

    if (/^---\s+a\//m.test(content) && /^\+\+\+\s+b\//m.test(content)) {
      return false;
    }

    if (/##\s*File:/i.test(content)) {
      return false;
    }

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

    for (const pattern of noChangePatterns) {
      if (pattern.test(content)) {
        return true;
      }
    }

    if (trimmed.length < 100 && !/##\s*(?:Reasoning|Summary):/i.test(content)) {
      return true;
    }

    return false;
  }

  extractSummary(content) {
    const summaryMatch = content.match(/##\s*Summary:\s*([^\n]+)/i);
    if (summaryMatch) {
      return summaryMatch[1].trim();
    }

    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length > 0) {
      return lines[0].substring(0, 100) + (lines[0].length > 100 ? '...' : '');
    }

    return 'No summary available';
  }

  extractReasoning(content) {
    const reasoningMatch = content.match(/##\s*Reasoning:\s*\n([\s\S]*?)(?=##|$)/i);
    if (reasoningMatch) {
      const reasoning = reasoningMatch[1].trim();
      return reasoning.substring(0, 200) + (reasoning.length > 200 ? '...' : '');
    }

    return null;
  }
}

module.exports = AiSdkProvider;
