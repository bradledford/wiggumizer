# Wiggumizer v0.2 - Refinement and Testing

You are refining Wiggumizer - a fully functional CLI tool for Ralph Wiggum style iterative AI coding. All core features are complete. Now we focus on **polish, testing, and documentation**.

## Current State

Wiggumizer v0.1 is feature-complete with:
- ✅ Full iteration loop with Claude Opus 4.5
- ✅ Smart file selection (.gitignore, glob patterns, prioritization)
- ✅ Advanced convergence detection (oscillation, hashing, confidence)
- ✅ Error handling (retry, backoff, circuit breaker, rate limiting)
- ✅ Configuration system (.wiggumizer.yml)
- ✅ Iteration logging and session tracking
- ✅ Git integration (warnings, auto-commit)
- ✅ File validation and safety (syntax checking, rollback)

## Goals for v0.2

### 1. Add Unit Tests

Create `test/` directory with tests for:
- **src/convergence-analyzer.js** - Test oscillation detection, hashing, confidence scoring
- **src/error-handler.js** - Test retry logic, error classification, circuit breaker
- **src/file-selector.js** - Test glob matching, .gitignore parsing, prioritization
- **src/config.js** - Test config loading and merging

Use a simple test framework (Jest or built-in Node test runner).

### 2. Improve Error Messages

Make error messages more helpful:
- When API key is missing, show example .env file
- When PROMPT.md is missing, show example prompt
- When convergence fails, suggest prompt improvements
- When oscillation detected, show the conflicting states

### 3. Add Progress Indicators

Enhance the loop output:
- Show estimated time remaining (based on average iteration time)
- Display token usage per iteration (if available from API)
- Show real-time convergence confidence as it increases
- Add a summary dashboard at the end

### 4. Add `wiggumize init` Wizard

Make `wiggumize init` interactive:
- Ask which AI provider to use (Claude/OpenAI)
- Ask for typical project type (Node.js/Python/etc.)
- Generate appropriate file patterns
- Create sample PROMPT.md with examples
- Validate API key before finishing

### 5. Improve Documentation

Update README.md with:
- Clear quick start guide
- Real-world examples (not just theory)
- Troubleshooting section
- FAQ about common issues
- Performance tips (context size, iteration limits)

### 6. Add Multi-Provider Support

Complete OpenAI provider implementation:
- Create `src/providers/openai.js` similar to claude.js
- Support GPT-5 and GPT-4
- Handle different token limits
- Test with both providers

## Implementation Philosophy

**Keep following Ralph principles:**
- One improvement per iteration
- Small, incremental changes
- Trust the convergence process
- Don't over-engineer

**Priority:**
1. Tests first (validate what we've built)
2. Error messages (improve user experience)
3. Documentation (help others use it)
4. Nice-to-haves (progress indicators, wizard)

## Success Criteria

Wiggumizer v0.2 is complete when:
- ✅ Core modules have test coverage
- ✅ Error messages are helpful and actionable
- ✅ README.md has complete examples
- ✅ `wiggumize init` is interactive and helpful
- ✅ OpenAI provider works alongside Claude

## Current Files to Focus On

Start with whichever makes the most sense:
- `test/convergence-analyzer.test.js` - Add tests for convergence logic
- `test/error-handler.test.js` - Add tests for retry and rate limiting
- `README.md` - Improve with real examples
- `src/cli.js` - Make init command interactive
- `src/providers/openai.js` - Add OpenAI support

**Remember:** You don't need to do everything at once. Pick ONE thing, do it well, let the loop iterate.

Let's refine this tool! 🎯
