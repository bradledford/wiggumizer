/**
 * Slack Chat Provider
 *
 * Uses Slack Incoming Webhooks to send messages to channels.
 * Simple and reliable - no complex CLI or app setup required.
 *
 * Prerequisites:
 * - Create an Incoming Webhook at: https://api.slack.com/messaging/webhooks
 * - Set SLACK_WEBHOOK_URL environment variable or pass webhookUrl in config
 */

const https = require('https');
const BaseChatProvider = require('./base-provider');

class SlackProvider extends BaseChatProvider {
  constructor(config = {}) {
    super(config);
    this.channel = config.channel || '#general';
    this.webhookUrl = config.webhookUrl || process.env.SLACK_WEBHOOK_URL;
  }

  get name() {
    return 'slack';
  }

  /**
   * Connect to Slack (verify webhook is configured)
   * @returns {Promise<void>}
   */
  async connect() {
    if (!this.webhookUrl) {
      throw new Error(
        'Slack webhook URL not configured.\n' +
        '1. Create a webhook at: https://api.slack.com/messaging/webhooks\n' +
        '2. Set SLACK_WEBHOOK_URL environment variable\n' +
        '   or add webhookUrl to your .wiggumizer.yml'
      );
    }
    this.log('Webhook URL configured');
    this.connected = true;
  }

  /**
   * Send a message to Slack via webhook
   * @param {Object} options - Message options
   * @returns {Promise<Object>} Send result
   */
  async sendMessage(options) {
    const { channel, message } = options;
    const targetChannel = channel || this.channel;

    if (!this.connected) {
      await this.connect();
    }

    try {
      this.log(`Sending message to ${targetChannel}`);

      const payload = {
        text: message,
        channel: targetChannel
      };

      await this.postToWebhook(payload);

      return {
        success: true,
        channel: targetChannel
      };
    } catch (error) {
      this.log(`Failed to send message: ${error.message}`);
      return {
        success: false,
        channel: targetChannel,
        error: error.message
      };
    }
  }

  /**
   * Post payload to Slack webhook
   * @param {Object} payload - Message payload
   * @returns {Promise<void>}
   */
  postToWebhook(payload) {
    return new Promise((resolve, reject) => {
      const url = new URL(this.webhookUrl);
      const data = JSON.stringify(payload);

      const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(body);
          } else {
            reject(new Error(`Slack API error (${res.statusCode}): ${body}`));
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  /**
   * Listen for incoming messages (not supported with webhooks)
   * @param {Object} options - Listen options
   */
  async listen(options) {
    throw new Error(
      'Listening is not supported with webhook-based Slack integration.\n' +
      'Webhooks are outbound-only. For bidirectional messaging,\n' +
      'you would need a Slack app with Socket Mode or Events API.'
    );
  }

  /**
   * Stop listening for messages
   */
  async stopListening() {
    // No-op for webhook-based provider
  }

  /**
   * Disconnect from Slack
   */
  async disconnect() {
    this.connected = false;
    this.log('Disconnected');
  }

  /**
   * Format a success message with Slack-specific markdown
   * @param {Object} result - Run result data
   * @returns {string} Slack-formatted message
   */
  formatSuccessMessage(result) {
    const lines = [
      ':white_check_mark: *Wiggumizer Run Complete*',
      '',
      `> *Iterations:* ${result.totalIterations}`,
      `> *Files modified:* ${result.filesModified}`,
      `> *Duration:* ${result.duration}s`,
      `> *Status:* ${result.converged ? 'Converged :sparkles:' : 'Max iterations reached'}`,
    ];

    if (result.convergenceReason) {
      lines.push(`> *Reason:* ${result.convergenceReason}`);
    }

    if (result.sessionDir) {
      lines.push('', `_Session logs: ${result.sessionDir}_`);
    }

    return lines.join('\n');
  }

  /**
   * Format an error message with Slack-specific markdown
   * @param {Object} error - Error data
   * @returns {string} Slack-formatted message
   */
  formatErrorMessage(error) {
    const lines = [
      ':x: *Wiggumizer Run Stopped*',
      '',
      `> *Error:* ${error.message || 'Unknown error'}`,
      `> *Iteration:* ${error.iteration || 'N/A'}`,
    ];

    if (error.reason) {
      lines.push(`> *Reason:* ${error.reason}`);
    }

    if (error.filesModifiedBeforeError) {
      lines.push(`> *Files modified before error:* ${error.filesModifiedBeforeError}`);
    }

    return lines.join('\n');
  }
}

module.exports = SlackProvider;
