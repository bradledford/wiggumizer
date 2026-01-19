/**
 * Chat Notifier Tests
 *
 * Tests for the chat service integration system including:
 * - Base provider interface
 * - ChatNotifier service
 * - Message formatting
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

// Import the modules to test
const BaseChatProvider = require('../src/chat/base-provider');
const { ChatNotifier } = require('../src/chat');

describe('BaseChatProvider', () => {
  describe('constructor', () => {
    it('should initialize with default config', () => {
      const provider = new BaseChatProvider();
      assert.deepStrictEqual(provider.config, {});
      assert.strictEqual(provider.verbose, false);
      assert.strictEqual(provider.connected, false);
    });

    it('should accept custom config', () => {
      const config = { channel: '#test', verbose: true };
      const provider = new BaseChatProvider(config);
      assert.strictEqual(provider.config.channel, '#test');
      assert.strictEqual(provider.verbose, true);
    });
  });

  describe('interface methods', () => {
    it('should throw error for unimplemented name getter', () => {
      const provider = new BaseChatProvider();
      assert.throws(() => provider.name, /Provider must implement name getter/);
    });

    it('should throw error for unimplemented checkCliInstalled', async () => {
      const provider = new BaseChatProvider();
      await assert.rejects(() => provider.checkCliInstalled(), /Provider must implement checkCliInstalled/);
    });

    it('should throw error for unimplemented connect', async () => {
      const provider = new BaseChatProvider();
      await assert.rejects(() => provider.connect(), /Provider must implement connect/);
    });

    it('should throw error for unimplemented sendMessage', async () => {
      const provider = new BaseChatProvider();
      await assert.rejects(() => provider.sendMessage({}), /Provider must implement sendMessage/);
    });

    it('should throw error for unimplemented listen', async () => {
      const provider = new BaseChatProvider();
      await assert.rejects(() => provider.listen({}), /Provider must implement listen/);
    });

    it('should throw error for unimplemented stopListening', async () => {
      const provider = new BaseChatProvider();
      await assert.rejects(() => provider.stopListening(), /Provider must implement stopListening/);
    });
  });

  describe('disconnect', () => {
    it('should set connected to false', async () => {
      const provider = new BaseChatProvider();
      provider.connected = true;
      await provider.disconnect();
      assert.strictEqual(provider.connected, false);
    });
  });

  describe('formatSuccessMessage', () => {
    it('should format a success message with all fields', () => {
      const provider = new BaseChatProvider();
      const result = {
        totalIterations: 5,
        filesModified: 3,
        duration: 120,
        converged: true,
        convergenceReason: 'No more changes detected'
      };

      const message = provider.formatSuccessMessage(result);

      assert.ok(message.includes('Wiggumizer Run Complete'));
      assert.ok(message.includes('Iterations: 5'));
      assert.ok(message.includes('Files modified: 3'));
      assert.ok(message.includes('Duration: 120s'));
      assert.ok(message.includes('Converged'));
      assert.ok(message.includes('No more changes detected'));
    });

    it('should handle non-converged result', () => {
      const provider = new BaseChatProvider();
      const result = {
        totalIterations: 20,
        filesModified: 10,
        duration: 300,
        converged: false
      };

      const message = provider.formatSuccessMessage(result);

      assert.ok(message.includes('Max iterations reached'));
    });
  });

  describe('formatErrorMessage', () => {
    it('should format an error message with all fields', () => {
      const provider = new BaseChatProvider();
      const error = {
        message: 'Rate limit exceeded',
        iteration: 7,
        reason: 'Rate limit hit',
        filesModifiedBeforeError: 5
      };

      const message = provider.formatErrorMessage(error);

      assert.ok(message.includes('Wiggumizer Run Stopped'));
      assert.ok(message.includes('Rate limit exceeded'));
      assert.ok(message.includes('Iteration: 7'));
      assert.ok(message.includes('Rate limit hit'));
      assert.ok(message.includes('Files modified before error: 5'));
    });

    it('should handle minimal error info', () => {
      const provider = new BaseChatProvider();
      const error = {};

      const message = provider.formatErrorMessage(error);

      assert.ok(message.includes('Wiggumizer Run Stopped'));
      assert.ok(message.includes('Unknown error'));
      assert.ok(message.includes('N/A'));
    });
  });

  describe('log', () => {
    it('should not log when verbose is false', () => {
      const provider = new BaseChatProvider({ verbose: false });
      // Should not throw
      provider.log('test message');
    });
  });
});

describe('ChatNotifier', () => {
  describe('constructor', () => {
    it('should initialize as disabled without provider', () => {
      const notifier = new ChatNotifier({});
      assert.strictEqual(notifier.enabled, false);
      assert.strictEqual(notifier.provider, null);
    });

    it('should initialize with slack provider', () => {
      const notifier = new ChatNotifier({
        provider: 'slack',
        channel: '#general'
      });
      assert.strictEqual(notifier.enabled, true);
      assert.strictEqual(notifier.providerName, 'slack');
      assert.ok(notifier.provider !== null);
    });

    it('should initialize with whatsapp provider', () => {
      const notifier = new ChatNotifier({
        provider: 'whatsapp',
        contact: '+1234567890'
      });
      assert.strictEqual(notifier.enabled, true);
      assert.strictEqual(notifier.providerName, 'whatsapp');
      assert.ok(notifier.provider !== null);
    });

    it('should throw error for unknown provider', () => {
      assert.throws(() => {
        new ChatNotifier({ provider: 'discord' });
      }, /Unknown chat provider: discord/);
    });
  });

  describe('providers static getter', () => {
    it('should list available providers', () => {
      const providers = ChatNotifier.providers;
      assert.ok('slack' in providers);
      assert.ok('whatsapp' in providers);
    });
  });

  describe('isEnabled', () => {
    it('should return false when no provider configured', () => {
      const notifier = new ChatNotifier({});
      assert.strictEqual(notifier.isEnabled(), false);
    });

    it('should return true when provider is configured', () => {
      const notifier = new ChatNotifier({
        provider: 'slack',
        channel: '#test'
      });
      assert.strictEqual(notifier.isEnabled(), true);
    });
  });

  describe('notifySuccess when disabled', () => {
    it('should return skipped result', async () => {
      const notifier = new ChatNotifier({});
      const result = await notifier.notifySuccess({ totalIterations: 1 });
      assert.strictEqual(result.skipped, true);
      assert.strictEqual(result.reason, 'notifications disabled');
    });
  });

  describe('notifyError when disabled', () => {
    it('should return skipped result', async () => {
      const notifier = new ChatNotifier({});
      const result = await notifier.notifyError({ message: 'test error' });
      assert.strictEqual(result.skipped, true);
      assert.strictEqual(result.reason, 'notifications disabled');
    });
  });

  describe('sendMessage when disabled', () => {
    it('should return skipped result', async () => {
      const notifier = new ChatNotifier({});
      const result = await notifier.sendMessage('test message');
      assert.strictEqual(result.skipped, true);
    });
  });

  describe('startListening when disabled', () => {
    it('should throw error', async () => {
      const notifier = new ChatNotifier({});
      await assert.rejects(() => notifier.startListening(() => {}), /Chat provider not configured/);
    });
  });

  describe('connect and disconnect', () => {
    it('should handle disabled notifier gracefully', async () => {
      const notifier = new ChatNotifier({});
      // Should not throw
      await notifier.connect();
      await notifier.disconnect();
    });
  });
});
