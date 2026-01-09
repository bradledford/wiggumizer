const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const ClaudeProvider = require('../src/providers/claude');

describe('ClaudeProvider', () => {
  let provider;

  beforeEach(() => {
    // Create provider without API key for unit tests (won't make actual API calls)
    process.env.ANTHROPIC_API_KEY = 'test-key';
    provider = new ClaudeProvider();
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
});
