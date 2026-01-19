/**
 * Slack Provider Tests
 *
 * Tests for the Slack chat provider implementation.
 * These tests focus on unit testing without actual CLI calls.
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

const SlackProvider = require('../src/chat/slack-provider');

describe('SlackProvider', () => {
  describe('constructor', () => {
    it('should initialize with default config', () => {
      const provider = new SlackProvider();
      assert.strictEqual(provider.channel, '#general');
      assert.strictEqual(provider.workspace, null);
      assert.strictEqual(provider.listenProcess, null);
      assert.strictEqual(provider.cliValidated, false);
    });

    it('should accept custom channel', () => {
      const provider = new SlackProvider({ channel: '#dev-ops' });
      assert.strictEqual(provider.channel, '#dev-ops');
    });

    it('should accept custom workspace', () => {
      const provider = new SlackProvider({ workspace: 'my-workspace' });
      assert.strictEqual(provider.workspace, 'my-workspace');
    });
  });

  describe('name getter', () => {
    it('should return "slack"', () => {
      const provider = new SlackProvider();
      assert.strictEqual(provider.name, 'slack');
    });
  });

  describe('formatSuccessMessage', () => {
    it('should format with Slack-specific markdown', () => {
      const provider = new SlackProvider();
      const result = {
        totalIterations: 3,
        filesModified: 2,
        duration: 60,
        converged: true,
        sessionDir: '/logs/session-123'
      };

      const message = provider.formatSuccessMessage(result);

      // Check for Slack-specific formatting
      assert.ok(message.includes(':white_check_mark:'), 'Should use Slack emoji');
      assert.ok(message.includes('*Wiggumizer Run Complete*'), 'Should have bold header');
      assert.ok(message.includes('> *Iterations:*'), 'Should use block quotes');
      assert.ok(message.includes(':sparkles:'), 'Should include sparkles for converged');
      assert.ok(message.includes('_Session logs:'), 'Should show session path in italics');
    });

    it('should handle non-converged result', () => {
      const provider = new SlackProvider();
      const result = {
        totalIterations: 10,
        filesModified: 5,
        duration: 200,
        converged: false
      };

      const message = provider.formatSuccessMessage(result);
      assert.ok(message.includes('Max iterations reached'));
      assert.ok(!message.includes(':sparkles:'));
    });
  });

  describe('formatErrorMessage', () => {
    it('should format with Slack-specific markdown', () => {
      const provider = new SlackProvider();
      const error = {
        message: 'API timeout',
        iteration: 5,
        reason: 'Network error',
        filesModifiedBeforeError: 3
      };

      const message = provider.formatErrorMessage(error);

      assert.ok(message.includes(':x:'), 'Should use Slack X emoji');
      assert.ok(message.includes('*Wiggumizer Run Stopped*'), 'Should have bold header');
      assert.ok(message.includes('> *Error:*'), 'Should use block quotes');
      assert.ok(message.includes('API timeout'));
      assert.ok(message.includes('Network error'));
    });
  });

  describe('sendMessage without connection', () => {
    it('should attempt to connect before sending', async () => {
      const provider = new SlackProvider({ channel: '#test' });
      provider.connected = false;

      // This will either fail with CLI not found error (throws)
      // or return an error result if CLI check fails gracefully
      try {
        const result = await provider.sendMessage({
          channel: '#test',
          message: 'Hello'
        });
        // If we get here, it should have returned an error result
        assert.strictEqual(result.success, false);
      } catch (error) {
        // Expected: CLI not found or not authenticated
        assert.ok(
          error.message.includes('Slack CLI') ||
          error.message.includes('not found') ||
          error.message.includes('not authenticated'),
          `Expected CLI-related error, got: ${error.message}`
        );
      }
    });
  });

  describe('disconnect', () => {
    it('should set connected to false and stop listening', async () => {
      const provider = new SlackProvider();
      provider.connected = true;
      provider.listenProcess = null; // No process to kill

      await provider.disconnect();

      assert.strictEqual(provider.connected, false);
    });
  });

  describe('stopListening', () => {
    it('should handle null listenProcess', async () => {
      const provider = new SlackProvider();
      provider.listenProcess = null;

      // Should not throw
      await provider.stopListening();
    });
  });
});
