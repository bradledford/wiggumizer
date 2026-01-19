/**
 * Base Chat Provider Interface
 *
 * All chat service providers must implement this interface.
 * Providers handle authentication, sending messages, and receiving messages
 * from external chat platforms.
 */

class BaseChatProvider {
  /**
   * Create a new chat provider
   * @param {Object} config - Provider-specific configuration
   */
  constructor(config = {}) {
    this.config = config;
    this.verbose = config.verbose || false;
    this.connected = false;
  }

  /**
   * Get the provider name
   * @returns {string} Provider name (e.g., 'slack', 'whatsapp')
   */
  get name() {
    throw new Error('Provider must implement name getter');
  }

  /**
   * Check if the required CLI tools are installed
   * @returns {Promise<boolean>} True if CLI tools are available
   */
  async checkCliInstalled() {
    throw new Error('Provider must implement checkCliInstalled()');
  }

  /**
   * Initialize connection/authentication with the chat service
   * @returns {Promise<void>}
   */
  async connect() {
    throw new Error('Provider must implement connect()');
  }

  /**
   * Disconnect from the chat service
   * @returns {Promise<void>}
   */
  async disconnect() {
    this.connected = false;
  }

  /**
   * Send a message to a channel/contact
   * @param {Object} options - Message options
   * @param {string} options.channel - Channel name (e.g., '#general') or contact
   * @param {string} options.message - The message to send
   * @param {Object} options.metadata - Optional metadata (thread_ts, etc.)
   * @returns {Promise<Object>} Send result with success status
   */
  async sendMessage(options) {
    throw new Error('Provider must implement sendMessage()');
  }

  /**
   * Listen for incoming messages
   * @param {Object} options - Listen options
   * @param {string} options.channel - Channel to listen on
   * @param {Function} options.onMessage - Callback for received messages
   * @returns {Promise<void>}
   */
  async listen(options) {
    throw new Error('Provider must implement listen()');
  }

  /**
   * Stop listening for messages
   * @returns {Promise<void>}
   */
  async stopListening() {
    throw new Error('Provider must implement stopListening()');
  }

  /**
   * Format a success notification message
   * @param {Object} result - Run result data
   * @returns {string} Formatted message
   */
  formatSuccessMessage(result) {
    const emoji = '✅';
    const lines = [
      `${emoji} *Wiggumizer Run Complete*`,
      '',
      `• Iterations: ${result.totalIterations}`,
      `• Files modified: ${result.filesModified}`,
      `• Duration: ${result.duration}s`,
      result.converged ? `• Status: Converged` : `• Status: Max iterations reached`,
    ];

    if (result.convergenceReason) {
      lines.push(`• Reason: ${result.convergenceReason}`);
    }

    return lines.join('\n');
  }

  /**
   * Format an error/stoppage notification message
   * @param {Object} error - Error data
   * @returns {string} Formatted message
   */
  formatErrorMessage(error) {
    const emoji = '❌';
    const lines = [
      `${emoji} *Wiggumizer Run Stopped*`,
      '',
      `• Error: ${error.message || 'Unknown error'}`,
      `• Iteration: ${error.iteration || 'N/A'}`,
    ];

    if (error.reason) {
      lines.push(`• Reason: ${error.reason}`);
    }

    if (error.filesModifiedBeforeError) {
      lines.push(`• Files modified before error: ${error.filesModifiedBeforeError}`);
    }

    return lines.join('\n');
  }

  /**
   * Log a message (respects verbose setting)
   * @param {string} message - Message to log
   */
  log(message) {
    if (this.verbose) {
      console.log(`[${this.name}] ${message}`);
    }
  }
}

module.exports = BaseChatProvider;
