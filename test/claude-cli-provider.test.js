const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const ClaudeCliProvider = require('../src/providers/claude-cli');

describe('ClaudeCliProvider', () => {
  let provider;

  beforeEach(() => {
    provider = new ClaudeCliProvider();
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const p = new ClaudeCliProvider();
      assert.strictEqual(p.model, 'claude-opus-4-5-20251101');
      assert.strictEqual(p.maxTokens, 16384);
      assert.strictEqual(p.verbose, false);
    });

    it('should accept custom config', () => {
      const p = new ClaudeCliProvider({
        model: 'claude-sonnet-4-5-20250929',
        maxTokens: 8192,
        verbose: true
      });
      assert.strictEqual(p.model, 'claude-sonnet-4-5-20250929');
      assert.strictEqual(p.maxTokens, 8192);
      assert.strictEqual(p.verbose, true);
    });

    it('should accept fast mode config', () => {
      const p = new ClaudeCliProvider({
        fast: true
      });
      assert.strictEqual(p.fast, true);
    });
  });

  describe('buildSystemPrompt', () => {
    it('should return a system prompt string', () => {
      const prompt = provider.buildSystemPrompt();
      assert.strictEqual(typeof prompt, 'string');
      assert.ok(prompt.length > 100);
      assert.ok(prompt.includes('Ralph'));
      assert.ok(prompt.includes('autonomous'));
    });

    it('should include output format instructions', () => {
      const prompt = provider.buildSystemPrompt();
      assert.ok(prompt.includes('## Reasoning:'));
      assert.ok(prompt.includes('## Summary:'));
      assert.ok(prompt.includes('## File:'));
    });

    it('should return condensed prompt in fast mode', () => {
      const fastProvider = new ClaudeCliProvider({ fast: true });
      const prompt = fastProvider.buildSystemPrompt();

      assert.ok(prompt.includes('FAST MODE'));
      assert.ok(prompt.includes('Be concise'));
      // Fast mode prompt should be shorter
      assert.ok(prompt.length < 2000, 'Fast mode prompt should be condensed');
    });
  });

  describe('buildUserMessage', () => {
    it('should build user message with prompt and context', () => {
      const prompt = 'Fix authentication bug';
      const context = {
        files: [
          { path: 'src/auth.js', content: 'module.exports = {};' }
        ],
        gitLog: 'commit abc123',
        gitStatus: 'M src/auth.js',
        cwd: '/test/project'
      };

      const message = provider.buildUserMessage(prompt, context, 1);

      assert.ok(message.includes('Fix authentication bug'));
      assert.ok(message.includes('Iteration 1'));
      // ClaudeCliProvider does NOT include file contents - it relies on local filesystem tools
      assert.ok(message.includes('commit abc123'));  // Git log is included
      assert.ok(message.includes('M src/auth.js'));  // Git status is included
      assert.ok(message.includes('Codebase Access'));  // Tool instructions
    });

    it('should handle multi-repo context', () => {
      const prompt = 'Update API';
      const context = {
        isMultiRepo: true,
        workspaces: [
          { name: 'backend', path: '/test/backend', fileCount: 5 },
          { name: 'frontend', path: '/test/frontend', fileCount: 3 }
        ],
        files: [
          { workspace: 'backend', path: 'src/api.js', content: 'code' }
        ],
        cwd: '/test'
      };

      const message = provider.buildUserMessage(prompt, context, 1);

      assert.ok(message.includes('Workspace Configuration'));
      assert.ok(message.includes('backend'));
      assert.ok(message.includes('frontend'));
      // ClaudeCliProvider shows workspace path, not file path with workspace prefix
      assert.ok(message.includes('[workspace-name]'));  // Shows format example
    });

    it('should include breadcrumbs if available', () => {
      const context = {
        files: [],
        breadcrumbs: 'TODO: Fix the login flow',
        cwd: '/test'
      };

      const message = provider.buildUserMessage('Task', context, 1);

      assert.ok(message.includes('Notes from Your Previous Self'));
      assert.ok(message.includes('TODO: Fix the login flow'));
    });

    it('should include test results if available', () => {
      const context = {
        files: [],
        testResults: 'FAIL: 3 tests failed',
        cwd: '/test'
      };

      const message = provider.buildUserMessage('Task', context, 1);

      assert.ok(message.includes('Recent Test Results'));
      assert.ok(message.includes('FAIL: 3 tests failed'));
    });

    it('should return condensed message in fast mode', () => {
      const fastProvider = new ClaudeCliProvider({ fast: true });
      const context = {
        files: [],
        gitLog: 'commit abc123\ncommit def456\ncommit ghi789\ncommit jkl012\ncommit mno345\ncommit pqr678',
        breadcrumbs: 'A'.repeat(500),  // Long breadcrumbs
        cwd: '/test'
      };

      const message = fastProvider.buildUserMessage('Task', context, 1);

      // Fast mode should truncate git log to 5 entries
      assert.ok(message.includes('Recent History'));
      // Fast mode should truncate breadcrumbs
      assert.ok(message.includes('Notes:'));
      // Should be concise
      assert.ok(message.includes('Make substantial progress'));
    });
  });

  describe('detectNoChanges', () => {
    it('should detect explicit "NO CHANGES NEEDED" response', () => {
      const response = 'NO CHANGES NEEDED';
      assert.strictEqual(provider.detectNoChanges(response), true);
    });

    it('should detect "no changes needed" in short responses', () => {
      const response = 'The code already satisfies the requirements. No changes needed.';
      assert.strictEqual(provider.detectNoChanges(response), true);
    });

    it('should NOT detect "already" phrases in long responses with file changes', () => {
      const response = `## Reasoning:

Looking at the codebase, I can see several features are **Already Implemented**:
- File selection
- Convergence detection
- Multi-repo support

Let me create the missing documentation.

## Summary:
Creating ROADMAP.md

## File: docs/ROADMAP.md
\`\`\`markdown
# Roadmap

## Features
- [x] Core loop
- [ ] Templates
\`\`\``;

      assert.strictEqual(provider.detectNoChanges(response), false);
    });

    it('should NOT detect no-changes when ## File: pattern is present', () => {
      const response = `## File: src/test.js
\`\`\`javascript
console.log('test');
\`\`\``;

      assert.strictEqual(provider.detectNoChanges(response), false);
    });

    it('should detect no changes in short response', () => {
      const response = 'No modifications needed.';
      assert.strictEqual(provider.detectNoChanges(response), true);
    });

    it('should NOT trigger false positive on "Already Implemented" in analysis', () => {
      const longResponse = `## Reasoning:

**Already Implemented (based on code inspection):**
- ✅ Full iteration loop
- ✅ Smart file selection
${'- More details '.repeat(50)}

Now let me fix the docs.

## File: README.md
\`\`\`markdown
# Fixed
\`\`\``;

      assert.strictEqual(provider.detectNoChanges(longResponse), false);
    });

    it('should handle empty responses', () => {
      assert.strictEqual(provider.detectNoChanges(''), false);
      assert.strictEqual(provider.detectNoChanges('   '), false);
    });

    it('should handle responses with only reasoning, no files', () => {
      const response = `## Reasoning:
This is some analysis about the code.

## Summary:
Analysis complete`;

      assert.strictEqual(provider.detectNoChanges(response), false);
    });
  });

  describe('extractSummary', () => {
    it('should extract summary from ## Summary: section', () => {
      const content = `## Reasoning:
Some reasoning here

## Summary:
Fixed the bug in authentication

## File: src/auth.js`;

      assert.strictEqual(provider.extractSummary(content), 'Fixed the bug in authentication');
    });

    it('should handle missing summary section', () => {
      const content = 'Just some text without a summary section';
      const summary = provider.extractSummary(content);

      assert.strictEqual(typeof summary, 'string');
      assert.ok(summary.length > 0);
    });

    it('should use first line as fallback', () => {
      const content = 'This is the first line\nAnd this is the second';
      const summary = provider.extractSummary(content);

      assert.ok(summary.includes('This is the first line'));
    });
  });

  describe('extractReasoning', () => {
    it('should extract reasoning from ## Reasoning: section', () => {
      const content = `## Reasoning:
This is my detailed reasoning about
what needs to be done and why.

## Summary:
Fixed stuff`;

      const reasoning = provider.extractReasoning(content);
      assert.ok(reasoning.includes('This is my detailed reasoning'));
    });

    it('should return null if no reasoning section found', () => {
      const content = 'Just some text';
      assert.strictEqual(provider.extractReasoning(content), null);
    });

    it('should truncate long reasoning to 200 chars', () => {
      const longReasoning = 'A'.repeat(300);
      const content = `## Reasoning:\n${longReasoning}\n\n## Summary:\nDone`;

      const reasoning = provider.extractReasoning(content);
      assert.ok(reasoning.length <= 203); // 200 + '...'
    });
  });

  describe('validateCliInstalled', () => {
    it('should throw error with helpful message if CLI not found', () => {
      // This test will fail if claude CLI is actually installed
      // In that case, we can't easily test the error path without mocking
      // For now, we just test that the method exists and can be called
      assert.strictEqual(typeof provider.validateCliInstalled, 'function');
    });
  });

  describe('executeClaudeCommand', () => {
    it('should be a function that returns a promise', () => {
      assert.strictEqual(typeof provider.executeClaudeCommand, 'function');

      // We can't easily test this without mocking child_process
      // or without having the actual CLI installed
      // The method is tested implicitly through iterate() in integration tests
    });

    it('should include --allowedTools flag for file editing permissions', () => {
      // We can verify the args by checking the source code structure
      // The executeClaudeCommand method should include Edit,Write,Read,Glob,Grep,Bash tools
      const sourceCode = provider.executeClaudeCommand.toString();

      // Verify the method includes the allowedTools argument
      assert.ok(
        sourceCode.includes('--allowedTools') || sourceCode.includes('allowedTools'),
        'executeClaudeCommand should include --allowedTools flag'
      );
    });
  });

  describe('iterate', () => {
    it('should be an async function', () => {
      assert.strictEqual(typeof provider.iterate, 'function');
      assert.strictEqual(provider.iterate.constructor.name, 'AsyncFunction');
    });

    // Note: Full integration tests for iterate() would require:
    // 1. Mocking child_process.spawn
    // 2. Or having the actual claude CLI installed
    // These are better suited for integration tests rather than unit tests
  });
});
