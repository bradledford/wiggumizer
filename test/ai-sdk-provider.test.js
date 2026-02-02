const { describe, it, mock, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

// Mock the ai module before importing the provider
const mockAi = {
  generateText: mock.fn(async () => ({
    text: '## Reasoning:\nTest reasoning\n\n## Summary:\nTest summary\n\n## Changes:\n```diff\n--- a/test.js\n+++ b/test.js\n@@ -1,1 +1,1 @@\n-old\n+new\n```'
  })),
  streamText: mock.fn(async function* () {
    yield '## Reasoning:\n';
    yield 'Test reasoning\n\n';
    yield '## Summary:\n';
    yield 'Test summary\n\n';
    yield '## Changes:\n';
    yield '```diff\n--- a/test.js\n+++ b/test.js\n@@ -1,1 +1,1 @@\n-old\n+new\n```';
  })
};

// Mock provider factory
const mockProviderFactory = mock.fn((modelName) => ({
  modelId: modelName,
  provider: 'mock'
}));

describe('AiSdkProvider', () => {
  let AiSdkProvider;
  let originalRequire;

  beforeEach(() => {
    // Store original require
    originalRequire = module.constructor.prototype.require;

    // Mock require for ai and provider packages
    module.constructor.prototype.require = function(id) {
      if (id === 'ai') {
        return mockAi;
      }
      if (id.startsWith('@ai-sdk/')) {
        return mockProviderFactory;
      }
      return originalRequire.apply(this, arguments);
    };

    // Clear cache and load provider fresh
    delete require.cache[require.resolve('../src/providers/ai-sdk')];
    AiSdkProvider = require('../src/providers/ai-sdk');

    // Reset mocks
    mockAi.generateText.mock.resetCalls();
  });

  afterEach(() => {
    // Restore original require
    module.constructor.prototype.require = originalRequire;
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const provider = new AiSdkProvider();
      assert.strictEqual(provider.providerName, 'openai');
      assert.strictEqual(provider.modelName, 'gpt-4o');
      assert.strictEqual(provider.maxTokens, 16384);
      assert.strictEqual(provider.fast, false);
    });

    it('should accept custom config', () => {
      const provider = new AiSdkProvider({
        provider: 'anthropic',
        model: 'claude-3-opus',
        maxTokens: 8192,
        fast: true
      });
      assert.strictEqual(provider.providerName, 'anthropic');
      assert.strictEqual(provider.modelName, 'claude-3-opus');
      assert.strictEqual(provider.maxTokens, 8192);
      assert.strictEqual(provider.fast, true);
    });
  });

  describe('detectNoChanges', () => {
    it('should detect NO CHANGES NEEDED', () => {
      const provider = new AiSdkProvider();
      assert.strictEqual(provider.detectNoChanges('NO CHANGES NEEDED'), true);
      assert.strictEqual(provider.detectNoChanges('no changes needed'), true);
    });

    it('should detect when diffs are present', () => {
      const provider = new AiSdkProvider();
      const diffContent = '--- a/file.js\n+++ b/file.js\n@@ -1 +1 @@\n-old\n+new';
      assert.strictEqual(provider.detectNoChanges(diffContent), false);
    });

    it('should detect work complete patterns', () => {
      const provider = new AiSdkProvider();
      assert.strictEqual(provider.detectNoChanges('Goal achieved'), true);
      assert.strictEqual(provider.detectNoChanges('All tasks completed'), true);
      assert.strictEqual(provider.detectNoChanges('Work is complete'), true);
    });

    it('should not detect changes from empty content', () => {
      const provider = new AiSdkProvider();
      assert.strictEqual(provider.detectNoChanges(''), false);
    });
  });

  describe('extractSummary', () => {
    it('should extract summary from ## Summary: section', () => {
      const provider = new AiSdkProvider();
      const content = '## Reasoning:\nSome reasoning\n\n## Summary:\nThis is the summary\n\n## Changes:';
      assert.strictEqual(provider.extractSummary(content), 'This is the summary');
    });

    it('should fall back to first line', () => {
      const provider = new AiSdkProvider();
      const content = 'First line of content\nSecond line';
      assert.strictEqual(provider.extractSummary(content), 'First line of content');
    });
  });

  describe('extractReasoning', () => {
    it('should extract reasoning from ## Reasoning: section', () => {
      const provider = new AiSdkProvider();
      const content = '## Reasoning:\nThis is the reasoning text.\n\n## Summary:\nSummary text';
      const reasoning = provider.extractReasoning(content);
      assert.ok(reasoning.includes('This is the reasoning text'));
    });

    it('should return null if no reasoning section', () => {
      const provider = new AiSdkProvider();
      const content = 'Some content without reasoning';
      assert.strictEqual(provider.extractReasoning(content), null);
    });
  });

  describe('buildSystemPrompt', () => {
    it('should return condensed prompt in fast mode', () => {
      const provider = new AiSdkProvider({ fast: true });
      const prompt = provider.buildSystemPrompt();
      assert.ok(prompt.includes('FAST MODE'));
      assert.ok(prompt.length < 1500); // Fast mode should be shorter
    });

    it('should return full prompt in normal mode', () => {
      const provider = new AiSdkProvider({ fast: false });
      const prompt = provider.buildSystemPrompt();
      assert.ok(prompt.includes('THE RALPH PHILOSOPHY'));
      assert.ok(prompt.includes('SELF-DISCOVERY PROTOCOL'));
    });
  });

  describe('buildUserMessage', () => {
    const mockContext = {
      files: [
        { path: 'test.js', content: 'console.log("test");' }
      ],
      gitLog: 'abc123 Previous commit',
      gitStatus: 'M test.js'
    };

    it('should include goal and iteration', () => {
      const provider = new AiSdkProvider();
      const message = provider.buildUserMessage('Fix bug', mockContext, 1);
      assert.ok(message.includes('# Goal (Iteration 1):'));
      assert.ok(message.includes('Fix bug'));
    });

    it('should include git context', () => {
      const provider = new AiSdkProvider();
      const message = provider.buildUserMessage('Fix bug', mockContext, 1);
      assert.ok(message.includes('abc123 Previous commit'));
      assert.ok(message.includes('M test.js'));
    });

    it('should include file contents with line numbers', () => {
      const provider = new AiSdkProvider();
      const message = provider.buildUserMessage('Fix bug', mockContext, 1);
      assert.ok(message.includes('## File: test.js'));
      assert.ok(message.includes('1│console.log("test");'));
    });

    it('should truncate files in fast mode', () => {
      const provider = new AiSdkProvider({ fast: true });
      const longContent = Array(100).fill('line').join('\n');
      const context = {
        files: [{ path: 'long.js', content: longContent }]
      };
      const message = provider.buildUserMessage('Fix bug', context, 1);
      assert.ok(message.includes('[... 50 more lines]'));
    });
  });

  describe('supported providers', () => {
    it('should support all major AI SDK providers', () => {
      const supportedProviders = [
        'openai',
        'anthropic',
        'google',
        'google-vertex',
        'mistral',
        'cohere',
        'amazon-bedrock',
        'azure',
        'groq',
        'perplexity',
        'xai',
        'deepseek',
        'togetherai',
        'fireworks',
        'cerebras'
      ];

      for (const providerName of supportedProviders) {
        const provider = new AiSdkProvider({ provider: providerName });
        assert.strictEqual(provider.providerName, providerName);
      }
    });
  });
});
