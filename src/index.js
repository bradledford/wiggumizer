/**
 * Wiggumizer - Ralph Wiggum style AI coding automation
 *
 * "That's the beauty of Ralph - the technique is deterministically bad
 *  in an undeterministic world."
 */

const RalphLoop = require('./loop');
const ClaudeProvider = require('./providers/claude');
const ClaudeCliProvider = require('./providers/claude-cli');
const { ChatNotifier, SlackProvider, WhatsAppProvider, BaseChatProvider } = require('./chat');
const IterationJournal = require('./iteration-journal');
const WorkspaceManager = require('./workspace-manager');

module.exports = {
  RalphLoop,
  ClaudeProvider,
  ClaudeCliProvider,
  // Chat service integration
  ChatNotifier,
  SlackProvider,
  WhatsAppProvider,
  BaseChatProvider,
  // Non-Git support
  IterationJournal,
  WorkspaceManager
};
