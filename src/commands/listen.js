/**
 * Listen Command
 *
 * Interactive mode that listens for incoming chat messages and responds
 * with Ralph Wiggum style AI responses.
 *
 * Usage:
 *   wiggumize listen --chat-provider slack --channel "#random"
 *   wiggumize listen --chat-provider whatsapp --contact "+1234567890"
 */

const chalk = require('chalk');
const { ChatNotifier } = require('../chat');
const ConfigLoader = require('../config');

async function listenCommand(cliOptions) {
  const packageJson = require('../../package.json');
  console.log(chalk.bold.blue(`\n🎯 Wiggumizer v${packageJson.version}`));
  console.log(chalk.dim('Ralph Wiggum style AI coding automation - Listen Mode\n'));

  // Load configuration
  const config = ConfigLoader.load(cliOptions);

  // Validate chat provider is specified
  if (!cliOptions.chatProvider) {
    console.error(chalk.red('✗ Chat provider required'));
    console.log(chalk.dim('\nUsage:'));
    console.log(chalk.dim('  wiggumize listen --chat-provider slack --channel "#random"'));
    console.log(chalk.dim('  wiggumize listen --chat-provider whatsapp --contact "+1234567890"'));
    console.log(chalk.dim('\nAvailable providers: slack, whatsapp'));
    process.exit(1);
  }

  // Validate channel/contact is specified
  if (!cliOptions.channel && !cliOptions.contact && !cliOptions.group) {
    console.error(chalk.red('✗ Channel or contact required'));
    console.log(chalk.dim('\nFor Slack: --channel "#channel-name"'));
    console.log(chalk.dim('For WhatsApp: --contact "+1234567890" or --group "Group Name"'));
    process.exit(1);
  }

  console.log(chalk.cyan('Chat Provider:') + ` ${cliOptions.chatProvider}`);
  if (cliOptions.channel) {
    console.log(chalk.cyan('Channel:') + ` ${cliOptions.channel}`);
  }
  if (cliOptions.contact) {
    console.log(chalk.cyan('Contact:') + ` ${cliOptions.contact}`);
  }
  if (cliOptions.group) {
    console.log(chalk.cyan('Group:') + ` ${cliOptions.group}`);
  }
  console.log();

  // Create chat notifier
  const notifier = new ChatNotifier({
    provider: cliOptions.chatProvider,
    channel: cliOptions.channel,
    contact: cliOptions.contact,
    group: cliOptions.group,
    webhookUrl: config.webhookUrl,
    verbose: cliOptions.verbose
  });

  try {
    // Connect to chat service
    console.log(chalk.blue('Connecting to chat service...'));
    await notifier.connect();
    console.log(chalk.green('✓ Connected'));
    console.log();

    // Start listening
    console.log(chalk.blue('👂 Listening for messages...'));
    console.log(chalk.dim('Press Ctrl+C to stop\n'));

    // Set up message handler
    await notifier.startListening(async (message) => {
      console.log(chalk.dim(`[${new Date().toLocaleTimeString()}]`) + ` Received: ${message.text}`);

      // Check if message is directed at us (mentions wiggumizer or starts with a trigger)
      const triggers = ['!ralph', '@wiggumizer', '!wiggum', 'wiggumize'];
      const isTriggered = triggers.some(t => message.text.toLowerCase().includes(t));

      if (isTriggered) {
        console.log(chalk.yellow('  → Responding...'));

        // Extract the actual prompt (remove trigger words)
        let prompt = message.text;
        for (const trigger of triggers) {
          prompt = prompt.replace(new RegExp(trigger, 'gi'), '').trim();
        }

        // Generate a Ralph Wiggum style response
        const response = await generateRalphResponse(prompt, config, cliOptions);

        // Send response
        await notifier.sendMessage(response);
        console.log(chalk.green('  ✓ Sent response'));
      }
    });

    // Keep the process running
    await new Promise((resolve) => {
      process.on('SIGINT', async () => {
        console.log(chalk.yellow('\n\nShutting down...'));
        await notifier.stopListening();
        await notifier.disconnect();
        console.log(chalk.green('✓ Disconnected'));
        resolve();
      });
    });

  } catch (error) {
    console.error(chalk.red('\n✗ Error:'), error.message);
    if (cliOptions.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

/**
 * Generate a Ralph Wiggum style response to a prompt
 * @param {string} prompt - The user's prompt
 * @param {Object} config - Configuration
 * @param {Object} options - CLI options
 * @returns {Promise<string>} The response
 */
async function generateRalphResponse(prompt, config, options) {
  // For interactive mode, use a simple response generator
  // In a full implementation, this would use the AI provider

  const providerName = options.provider || config.provider || 'claude';

  try {
    if (providerName === 'claude' || providerName === 'claude-cli') {
      // Use Claude to generate a response
      const ClaudeProvider = providerName === 'claude-cli'
        ? require('../providers/claude-cli')
        : require('../providers/claude');

      const provider = new ClaudeProvider({
        ...(config.providers?.[providerName] || {}),
        verbose: options.verbose,
        fast: true // Use fast mode for interactive responses
      });

      const systemPrompt = `You are Ralph Wiggum from The Simpsons, responding to coding questions.
Keep responses short (1-3 sentences). Be endearing but occasionally insightful.
Mix childlike wonder with unexpected technical observations.
Examples of Ralph's style:
- "My cat's breath smells like cat food."
- "I bent my Wookiee."
- "Me fail English? That's unpossible!"

Respond to the user's message in Ralph's voice.`;

      const response = await provider.iterate({
        prompt: systemPrompt + '\n\nUser: ' + prompt,
        context: { files: [] },
        iteration: 1
      });

      return response.raw || response.changes || "I'm helping! 🦭";
    }
  } catch (error) {
    console.error(chalk.yellow(`  Warning: AI response failed: ${error.message}`));
  }

  // Fallback: return a canned Ralph response
  const fallbackResponses = [
    "My code tastes like burning! 🔥",
    "I'm learnding! 📚",
    "The doctor said I wouldn't have so many bugs if I used TypeScript.",
    "My cat's breath smells like cat food... and also like undefined.",
    "I bent my repository!",
    "That's unpossible! But I'll try anyway.",
    "I'm a unitasker! I can only do one thing at a time, and right now it's being confused.",
    "My code doesn't run, but my nose does! 🏃"
  ];

  return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
}

module.exports = listenCommand;
