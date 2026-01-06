/**
 * Wiggumizer - Ralph Wiggum style AI coding automation
 *
 * "That's the beauty of Ralph - the technique is deterministically bad
 *  in an undeterministic world."
 */

const RalphLoop = require('./loop');
const ClaudeProvider = require('./providers/claude');

module.exports = {
  RalphLoop,
  ClaudeProvider
};
