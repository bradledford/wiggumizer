#!/usr/bin/env node

const ClaudeCliProvider = require('./src/providers/claude-cli.js');

console.log('Testing Claude CLI streaming...\n');

const provider = new ClaudeCliProvider({
  verbose: true,
  model: 'claude-opus-4-5-20251101'
});

let chunks = [];

provider.executeClaudeCommand(
  'You are a helpful assistant',
  'Count from 1 to 5, one number per line',
  {
    onOutput: (text) => {
      chunks.push(text);
      console.log('CHUNK:', JSON.stringify(text));
    }
  }
).then(result => {
  console.log('\n=== FINAL RESULT ===');
  console.log(result);
  console.log('\n=== TOTAL CHUNKS ===');
  console.log(chunks.length);
  process.exit(0);
}).catch(err => {
  console.error('\n=== ERROR ===');
  console.error(err.message);
  process.exit(1);
});
