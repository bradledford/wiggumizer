# AGENTS.md
Guidance for AI agents working on the Wiggumizer codebase.

**For detailed contribution guidelines, see [AGENTS-CONTRIBUTING.md](AGENTS-CONTRIBUTING.md).**

## Project Overview
Wiggumizer is a CLI tool that automates the [Ralph coding technique](https://ghuntley.com/ralph/) - iterative AI-driven development that produces quality code through systematic refinement.

## Quick Reference

### Tech Stack
- **Runtime:** Node.js
- **Language:** JavaScript (ES6+)
- **Testing:** Node.js built-in test runner (`node --test`)
- **Package Manager:** npm

### Key Commands
```bash
# Run all tests
npm test

# Run specific test file
node --test test/filename.test.js

# Install dependencies
npm install
```

### Project Structure
```
src/
├── cli.js              # CLI entry point
├── config.js           # Configuration loading
├── index.js            # Main exports
├── loop.js             # Core iteration loop
├── providers/          # AI provider integrations (claude, claude-cli, ai-sdk)
├── commands/           # CLI command implementations
├── chat/               # Chat service integrations (Slack, WhatsApp)
└── *.js                # Core modules (validation, git, prompts, etc.)

test/                   # Test files (*.test.js)
docs/                   # Documentation
bin/                    # CLI executable
```

### Code Conventions
- Follow existing patterns in the codebase
- Use ES6+ syntax (const/let, arrow functions, async/await)
- Export modules using CommonJS (`module.exports`)
- Handle errors explicitly with try/catch
- Add JSDoc comments for public functions

### Testing Requirements
- Add tests for new functionality in `test/` directory
- Test files should be named `*.test.js`
- Cover happy path, edge cases, and error handling
- Run `npm test` before submitting changes

### Configuration Files
- `.wiggumizer.yml` - Project configuration (provider, templates, defaults)
- `PROMPT.md` - User prompt file (not to be modified by agents unless updating checkboxes)

## Non-Negotiables
1. **No secrets in code** - Use environment variables for API keys
2. **Security first** - Validate inputs, avoid command injection
3. **Backward compatibility** - Don't break existing APIs without explicit approval
4. **Tests required** - All changes must include tests
5. **Follow existing patterns** - Match the codebase style

## Before You Start
1. Read the issue/request carefully
2. Search for existing similar functionality
3. Draft a plan before implementing large changes
4. Ask clarifying questions if requirements are ambiguous

See [AGENTS-CONTRIBUTING.md](AGENTS-CONTRIBUTING.md) for complete guidelines.
