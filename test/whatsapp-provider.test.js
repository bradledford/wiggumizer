/**
 * WhatsApp Provider Tests
 *
 * Tests for the WhatsApp chat provider implementation.
 * These tests focus on unit testing without actual CLI calls.
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

const WhatsAppProvider = require('../src/chat/whatsapp-provider');

describe('WhatsAppProvider', () => {
  describe('constructor', () => {
    it('should initialize with default config', () => {
      const provider = new WhatsAppProvider();
      assert.strictEqual(provider.contact, null);
      assert.strictEqual(provider.group, null);
      assert.strictEqual(provider.cliTool, 'mudslide');
      assert.strictEqual(provider.listenProcess, null);
      assert.strictEqual(provider.cliValidated, false);
    });

    it('should accept custom contact', () => {
      const provider = new WhatsAppProvider({ contact: '+1234567890' });
      assert.strictEqual(provider.contact, '+1234567890');
    });

    it('should accept custom group', () => {
      const provider = new WhatsAppProvider({ group: 'Dev Team' });
      assert.strictEqual(provider.group, 'Dev Team');
    });

    it('should accept custom CLI tool', () => {
      const provider = new WhatsAppProvider({ cliTool: 'yowsup-cli' });
      assert.strictEqual(provider.cliTool, 'yowsup-cli');
    });
  });

  describe('name getter', () => {
    it('should return "whatsapp"', () => {
      const provider = new WhatsAppProvider();
      assert.strictEqual(provider.name, 'whatsapp');
    });
  });

  describe('supportedCliTools', () => {
    it('should list supported CLI tools', () => {
      const tools = WhatsAppProvider.supportedCliTools;
      assert.ok(Array.isArray(tools));
      assert.ok(tools.includes('mudslide'));
      assert.ok(tools.includes('whatsapp-cli'));
      assert.ok(tools.includes('yowsup-cli'));
    });
  });

  describe('formatSuccessMessage', () => {
    it('should format with WhatsApp-specific emoji', () => {
      const provider = new WhatsAppProvider();
      const result = {
        totalIterations: 4,
        filesModified: 6,
        duration: 90,
        converged: true,
        convergenceReason: 'All tasks complete'
      };

      const message = provider.formatSuccessMessage(result);

      // Check for WhatsApp-friendly formatting
      assert.ok(message.includes('✅'), 'Should use checkmark emoji');
      assert.ok(message.includes('*Wiggumizer Run Complete*'), 'Should have bold header');
      assert.ok(message.includes('📊'), 'Should use chart emoji for iterations');
      assert.ok(message.includes('📁'), 'Should use folder emoji for files');
      assert.ok(message.includes('⏱️'), 'Should use timer emoji for duration');
      assert.ok(message.includes('✨'), 'Should include sparkles for converged');
      assert.ok(message.includes('💡'), 'Should use lightbulb for reason');
    });

    it('should handle non-converged result', () => {
      const provider = new WhatsAppProvider();
      const result = {
        totalIterations: 15,
        filesModified: 8,
        duration: 400,
        converged: false
      };

      const message = provider.formatSuccessMessage(result);
      assert.ok(message.includes('Max iterations reached'));
      assert.ok(!message.includes('✨'));
    });
  });

  describe('formatErrorMessage', () => {
    it('should format with WhatsApp-specific emoji', () => {
      const provider = new WhatsAppProvider();
      const error = {
        message: 'Permission denied',
        iteration: 3,
        reason: 'Permission denied',
        filesModifiedBeforeError: 2
      };

      const message = provider.formatErrorMessage(error);

      assert.ok(message.includes('❌'), 'Should use X emoji');
      assert.ok(message.includes('*Wiggumizer Run Stopped*'), 'Should have bold header');
      assert.ok(message.includes('⚠️'), 'Should use warning emoji');
      assert.ok(message.includes('🔄'), 'Should use cycle emoji for iteration');
      assert.ok(message.includes('Permission denied'));
    });
  });

  describe('sendMessage validation', () => {
    it('should throw error when no target specified', async () => {
      const provider = new WhatsAppProvider();
      provider.connected = true;

      await assert.rejects(
        () => provider.sendMessage({ message: 'Hello' }),
        /contact or group required/
      );
    });
  });

  describe('disconnect', () => {
    it('should set connected to false and stop listening', async () => {
      const provider = new WhatsAppProvider();
      provider.connected = true;
      provider.listenProcess = null;

      await provider.disconnect();

      assert.strictEqual(provider.connected, false);
    });
  });

  describe('stopListening', () => {
    it('should handle null listenProcess', async () => {
      const provider = new WhatsAppProvider();
      provider.listenProcess = null;

      // Should not throw
      await provider.stopListening();
    });
  });
});
