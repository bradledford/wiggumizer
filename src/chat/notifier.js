/**
 * Chat Notifier Service
 *
 * Manages chat providers and sends notifications at key points:
 * - Successful completion of wiggumizer run
 * - Unexpected stoppage/errors during run
 *
 * Usage:
 *   const notifier = new ChatNotifier({ provider: 'slack', channel: '#general' });
 *   await notifier.connect();
 *   await notifier.notifySuccess(result);
 *   await notifier.notifyError(error);
 */

const chalk = require('chalk');
const SlackProvider = require('./slack-provider');
const WhatsAppProvider = require('./whatsapp-provider');

class ChatNotifier {
  /**
   * Create a new ChatNotifier
   * @param {Object} config - Configuration options
   * @param {string} config.provider - Chat provider name ('slack', 'whatsapp')
   * @param {string} config.channel - Channel/contact to send messages to
   * @param {boolean} config.verbose - Enable verbose logging
   * @param {Object} config.providerConfig - Provider-specific configuration
   */
  constructor(config = {}) {
    this.providerName = config.provider || null;
    this.channel = config.channel || null;
    this.contact = config.contact || null;
    this.group = config.group || null;
    this.verbose = config.verbose || false;
    this.provider = null;
    this.enabled = !!this.providerName;

    if (this.enabled) {
      this.provider = this.createProvider(config);
    }
  }

  /**
   * Available chat providers
   */
  static get providers() {
    return {
      slack: SlackProvider,
      whatsapp: WhatsAppProvider
    };
  }

  /**
   * Create a chat provider instance
   * @param {Object} config - Provider configuration
   * @returns {BaseChatProvider} Provider instance
   */
  createProvider(config) {
    const ProviderClass = ChatNotifier.providers[config.provider];

    if (!ProviderClass) {
      throw new Error(
        `Unknown chat provider: ${config.provider}\n` +
        `Available providers: ${Object.keys(ChatNotifier.providers).join(', ')}`
      );
    }

    return new ProviderClass({
      channel: config.channel,
      contact: config.contact,
      group: config.group,
      workspace: config.workspace,
      webhookUrl: config.webhookUrl,
      verbose: config.verbose,
      ...config.providerConfig
    });
  }

  /**
   * Check if notifications are enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this.enabled && this.provider !== null;
  }

  /**
   * Connect to the chat service
   * @returns {Promise<void>}
   */
  async connect() {
    if (!this.isEnabled()) {
      return;
    }

    try {
      await this.provider.connect();
      this.log(`Connected to ${this.providerName}`);
    } catch (error) {
      console.error(chalk.yellow(`⚠ Chat notification setup failed: ${error.message}`));
      console.error(chalk.dim('  Continuing without chat notifications'));
      this.enabled = false;
    }
  }

  /**
   * Disconnect from the chat service
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (!this.isEnabled()) {
      return;
    }

    try {
      await this.provider.disconnect();
      this.log(`Disconnected from ${this.providerName}`);
    } catch (error) {
      this.log(`Disconnect error: ${error.message}`);
    }
  }

  /**
   * Send a success notification
   * @param {Object} result - Run result data
   * @returns {Promise<Object>} Send result
   */
  async notifySuccess(result) {
    if (!this.isEnabled()) {
      return { skipped: true, reason: 'notifications disabled' };
    }

    try {
      const message = this.provider.formatSuccessMessage(result);
      const sendResult = await this.provider.sendMessage({
        channel: this.channel,
        contact: this.contact,
        group: this.group,
        message
      });

      if (sendResult.success) {
        this.log(`Success notification sent to ${sendResult.channel || sendResult.target}`);
      } else {
        console.error(chalk.yellow(`⚠ Failed to send success notification: ${sendResult.error}`));
      }

      return sendResult;
    } catch (error) {
      console.error(chalk.yellow(`⚠ Error sending success notification: ${error.message}`));
      return { success: false, error: error.message };
    }
  }

  /**
   * Send an error/stoppage notification
   * @param {Object} error - Error data
   * @returns {Promise<Object>} Send result
   */
  async notifyError(error) {
    if (!this.isEnabled()) {
      return { skipped: true, reason: 'notifications disabled' };
    }

    try {
      const message = this.provider.formatErrorMessage(error);
      const sendResult = await this.provider.sendMessage({
        channel: this.channel,
        contact: this.contact,
        group: this.group,
        message
      });

      if (sendResult.success) {
        this.log(`Error notification sent to ${sendResult.channel || sendResult.target}`);
      } else {
        console.error(chalk.yellow(`⚠ Failed to send error notification: ${sendResult.error}`));
      }

      return sendResult;
    } catch (error) {
      console.error(chalk.yellow(`⚠ Error sending error notification: ${error.message}`));
      return { success: false, error: error.message };
    }
  }

  /**
   * Send a custom message
   * @param {string} message - Message to send
   * @returns {Promise<Object>} Send result
   */
  async sendMessage(message) {
    if (!this.isEnabled()) {
      return { skipped: true, reason: 'notifications disabled' };
    }

    try {
      return await this.provider.sendMessage({
        channel: this.channel,
        contact: this.contact,
        group: this.group,
        message
      });
    } catch (error) {
      console.error(chalk.yellow(`⚠ Error sending message: ${error.message}`));
      return { success: false, error: error.message };
    }
  }

  /**
   * Start listening for messages (for interactive mode)
   * @param {Function} onMessage - Callback for received messages
   * @returns {Promise<void>}
   */
  async startListening(onMessage) {
    if (!this.isEnabled()) {
      throw new Error('Chat provider not configured');
    }

    await this.provider.listen({
      channel: this.channel,
      contact: this.contact,
      group: this.group,
      onMessage
    });
  }

  /**
   * Stop listening for messages
   * @returns {Promise<void>}
   */
  async stopListening() {
    if (this.provider) {
      await this.provider.stopListening();
    }
  }

  /**
   * Log a message (respects verbose setting)
   * @param {string} message - Message to log
   */
  log(message) {
    if (this.verbose) {
      console.log(chalk.dim(`[ChatNotifier] ${message}`));
    }
  }
}

module.exports = ChatNotifier;
