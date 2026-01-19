/**
 * WhatsApp Chat Provider
 *
 * Uses WhatsApp CLI tools for sending messages.
 * Supports sending messages to contacts and groups.
 *
 * Prerequisites:
 * - whatsapp-cli or similar tool installed
 * - Authenticated via QR code flow
 *
 * Common CLI tools:
 * - whatsapp-cli (npm install -g whatsapp-cli)
 * - mudslide (npm install -g mudslide)
 * - yowsup-cli
 */

const { spawn, execSync } = require('child_process');
const BaseChatProvider = require('./base-provider');

class WhatsAppProvider extends BaseChatProvider {
  constructor(config = {}) {
    super(config);
    this.contact = config.contact || null;
    this.group = config.group || null;
    this.cliTool = config.cliTool || 'mudslide'; // Default to mudslide
    this.listenProcess = null;
    this.cliValidated = false;
  }

  get name() {
    return 'whatsapp';
  }

  /**
   * Supported CLI tools for WhatsApp
   */
  static get supportedCliTools() {
    return ['mudslide', 'whatsapp-cli', 'yowsup-cli'];
  }

  /**
   * Check if a WhatsApp CLI tool is installed
   * @returns {Promise<boolean>}
   */
  async checkCliInstalled() {
    const tools = WhatsAppProvider.supportedCliTools;

    for (const tool of tools) {
      try {
        const isWindows = process.platform === 'win32';
        const command = isWindows ? `where ${tool}` : `which ${tool}`;
        execSync(command, { stdio: 'pipe' });
        this.cliTool = tool;
        this.log(`WhatsApp CLI found: ${tool}`);
        return true;
      } catch (error) {
        // Try next tool
      }
    }

    return false;
  }

  /**
   * Connect to WhatsApp (verify/initiate authentication)
   * @returns {Promise<void>}
   */
  async connect() {
    // Check if CLI is installed
    if (!this.cliValidated) {
      const installed = await this.checkCliInstalled();
      if (!installed) {
        throw new Error(
          'WhatsApp CLI tool not found.\n' +
          'Install one of the following:\n' +
          '  npm install -g mudslide\n' +
          '  npm install -g whatsapp-cli\n' +
          'Then authenticate by following the QR code flow.'
        );
      }
      this.cliValidated = true;
    }

    // Check authentication status
    try {
      await this.checkAuth();
      this.connected = true;
      this.log('WhatsApp connected');
    } catch (error) {
      throw new Error(
        'WhatsApp not authenticated.\n' +
        `Run: ${this.cliTool} login\n` +
        'Then scan the QR code with your phone.'
      );
    }
  }

  /**
   * Check WhatsApp authentication status
   * @returns {Promise<boolean>}
   */
  async checkAuth() {
    try {
      switch (this.cliTool) {
        case 'mudslide':
          // mudslide uses 'me' command to check auth
          await this.executeCommand(['me']);
          return true;

        case 'whatsapp-cli':
          // whatsapp-cli uses 'status' command
          await this.executeCommand(['status']);
          return true;

        case 'yowsup-cli':
          // yowsup uses different auth flow
          await this.executeCommand(['registration', '--check']);
          return true;

        default:
          // Generic check - try to list contacts
          await this.executeCommand(['contacts', 'list']);
          return true;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Execute a CLI command
   * @param {string[]} args - Command arguments
   * @returns {Promise<string>} Command output
   */
  async executeCommand(args) {
    return new Promise((resolve, reject) => {
      const child = spawn(this.cliTool, args);

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`${this.cliTool} error: ${stderr || stdout || 'Unknown error'}`));
          return;
        }
        resolve(stdout);
      });

      child.on('error', (error) => {
        if (error.code === 'ENOENT') {
          reject(new Error(`${this.cliTool} not found`));
        } else {
          reject(new Error(`${this.cliTool} error: ${error.message}`));
        }
      });
    });
  }

  /**
   * Send a message to a WhatsApp contact or group
   * @param {Object} options - Message options
   * @returns {Promise<Object>} Send result
   */
  async sendMessage(options) {
    const { channel, message, contact, group } = options;
    const targetContact = contact || this.contact;
    const targetGroup = group || this.group;

    if (!targetContact && !targetGroup && !channel) {
      throw new Error('WhatsApp: contact or group required');
    }

    if (!this.connected) {
      await this.connect();
    }

    try {
      let args = [];
      let target = '';

      switch (this.cliTool) {
        case 'mudslide':
          // mudslide send <phone/group> <message>
          if (targetGroup) {
            args = ['send', '--group', targetGroup, message];
            target = targetGroup;
          } else {
            args = ['send', targetContact || channel, message];
            target = targetContact || channel;
          }
          break;

        case 'whatsapp-cli':
          // whatsapp-cli send -t <target> -m <message>
          target = targetGroup || targetContact || channel;
          args = ['send', '-t', target, '-m', message];
          break;

        case 'yowsup-cli':
          // yowsup-cli demos -c config.txt -s <phone> "<message>"
          target = targetContact || channel;
          args = ['demos', '-s', target, message];
          break;

        default:
          target = targetGroup || targetContact || channel;
          args = ['send', target, message];
      }

      this.log(`Sending message to ${target}`);
      const result = await this.executeCommand(args);

      return {
        success: true,
        target,
        response: result
      };
    } catch (error) {
      return {
        success: false,
        target: targetGroup || targetContact || channel,
        error: error.message
      };
    }
  }

  /**
   * Listen for incoming WhatsApp messages
   * @param {Object} options - Listen options
   */
  async listen(options) {
    const { channel, contact, group, onMessage } = options;
    const targetContact = contact || this.contact;
    const targetGroup = group || this.group;

    if (!this.connected) {
      await this.connect();
    }

    this.log(`Starting to listen for messages`);

    let args = [];

    switch (this.cliTool) {
      case 'mudslide':
        // mudslide listen
        args = ['listen'];
        break;

      case 'whatsapp-cli':
        // whatsapp-cli listen
        args = ['listen'];
        break;

      default:
        args = ['listen'];
    }

    this.listenProcess = spawn(this.cliTool, args);

    this.listenProcess.stdout.on('data', (data) => {
      const text = data.toString();

      try {
        // Try to parse as JSON event
        const event = JSON.parse(text);

        // Filter by contact/group if specified
        if (targetContact && event.from !== targetContact) return;
        if (targetGroup && event.group !== targetGroup) return;

        if (event.body || event.message || event.text) {
          onMessage({
            from: event.from || event.sender,
            group: event.group,
            text: event.body || event.message || event.text,
            timestamp: event.timestamp || Date.now()
          });
        }
      } catch (e) {
        // Not JSON, try to parse plain text output
        // Format varies by CLI tool
        const match = text.match(/From:\s*(\S+).*Message:\s*(.+)/s);
        if (match) {
          onMessage({
            from: match[1],
            text: match[2].trim(),
            raw: true
          });
        }
      }
    });

    this.listenProcess.stderr.on('data', (data) => {
      this.log(`WhatsApp listen error: ${data.toString()}`);
    });

    this.listenProcess.on('close', (code) => {
      this.log(`WhatsApp listen process exited with code ${code}`);
      this.listenProcess = null;
    });
  }

  /**
   * Stop listening for messages
   */
  async stopListening() {
    if (this.listenProcess) {
      this.listenProcess.kill();
      this.listenProcess = null;
      this.log('Stopped listening');
    }
  }

  /**
   * Disconnect from WhatsApp
   */
  async disconnect() {
    await this.stopListening();
    this.connected = false;
    this.log('Disconnected');
  }

  /**
   * Format a success message for WhatsApp
   * @param {Object} result - Run result data
   * @returns {string} Formatted message
   */
  formatSuccessMessage(result) {
    const lines = [
      '✅ *Wiggumizer Run Complete*',
      '',
      `📊 *Iterations:* ${result.totalIterations}`,
      `📁 *Files modified:* ${result.filesModified}`,
      `⏱️ *Duration:* ${result.duration}s`,
      `📋 *Status:* ${result.converged ? 'Converged ✨' : 'Max iterations reached'}`,
    ];

    if (result.convergenceReason) {
      lines.push(`💡 *Reason:* ${result.convergenceReason}`);
    }

    return lines.join('\n');
  }

  /**
   * Format an error message for WhatsApp
   * @param {Object} error - Error data
   * @returns {string} Formatted message
   */
  formatErrorMessage(error) {
    const lines = [
      '❌ *Wiggumizer Run Stopped*',
      '',
      `⚠️ *Error:* ${error.message || 'Unknown error'}`,
      `🔄 *Iteration:* ${error.iteration || 'N/A'}`,
    ];

    if (error.reason) {
      lines.push(`💡 *Reason:* ${error.reason}`);
    }

    if (error.filesModifiedBeforeError) {
      lines.push(`📁 *Files modified before error:* ${error.filesModifiedBeforeError}`);
    }

    return lines.join('\n');
  }
}

module.exports = WhatsAppProvider;
