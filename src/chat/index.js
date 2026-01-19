/**
 * Chat Service Integration Module
 *
 * Provides a pluggable provider system for sending Ralph Wiggum responses
 * through various messaging platforms.
 *
 * Supported Providers:
 * - Slack: Uses Slack CLI for local workspace integration
 * - WhatsApp: Uses WhatsApp CLI tools for messaging
 *
 * Usage:
 *   const { ChatNotifier, SlackProvider, WhatsAppProvider } = require('./chat');
 *
 *   // Create notifier with provider
 *   const notifier = new ChatNotifier({
 *     provider: 'slack',
 *     channel: '#general'
 *   });
 *
 *   // Send notifications
 *   await notifier.connect();
 *   await notifier.notifySuccess(result);
 *   await notifier.notifyError(error);
 */

const BaseChatProvider = require('./base-provider');
const SlackProvider = require('./slack-provider');
const WhatsAppProvider = require('./whatsapp-provider');
const ChatNotifier = require('./notifier');

module.exports = {
  BaseChatProvider,
  SlackProvider,
  WhatsAppProvider,
  ChatNotifier
};
