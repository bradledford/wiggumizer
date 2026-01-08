# Wiggumizer Change Summary

## v0.3.1 - Automatic Work Plan Progress Tracking

*Added on 2026-01-08*

### 🎉 New Feature: Automatic PROMPT.md Progress Tracking

Wiggumizer now automatically tracks and updates completion status of tasks in your PROMPT.md work plan. No more manually updating checkboxes - the system detects completed work and marks tasks as done automatically.

### How It Works

1. **Checkbox Syntax**: Use standard markdown checkbox syntax in PROMPT.md:
   ```markdown
   - [ ] Add error handling
   - [ ] Create tests
   - [ ] Update documentation
   ```

2. **Automatic Detection**: After each iteration, Wiggumizer analyzes:
   - Files that were modified
   - Keywords in commit messages
   - Test results (if available)
   - Completed work descriptions

3. **Progress Updates**: When tasks are detected as complete, checkboxes are automatically updated:
   ```markdown
   - [✅] Add error handling
   - [✅] Create tests
   - [ ] Update documentation
   ```

4. **Progress Display**: See real-time progress at the start of each run:
   ```
   Work Plan Progress: 2/3 tasks completed (67%)
     Remaining tasks:
       - Update documentation
   ```

### Changes

**New Files:**
- `src/prompt-updater.js` - Manages PROMPT.md parsing and progress tracking
- `test/prompt-updater.test.js` - Comprehensive unit tests for task parsing and completion detection
- `test/prompt-workflow.test.js` - Integration tests for multi-iteration workflows

**Modified Files:**
- `src/loop.js` - Integrated PromptUpdater for automatic progress tracking after each iteration

### Features

- **Smart Detection**: Multiple signals determine task completion (file matches, keyword analysis, git history)
- **Nested Tasks**: Supports indented sub-tasks with proper hierarchy
- **Preserves Context**: Non-task content in PROMPT.md is preserved
- **Dry-Run Safe**: Progress tracking respects `--dry-run` mode
- **Multiple Formats**: Supports various checkbox markers (`[x]`, `[X]`, `[✓]`, `[✅]`)

### Example Workflow

```markdown
# My Project v2.0

## Work Plan

- [ ] Implement error handling for API
- [ ] Add unit tests for error-handler.js
- [ ] Update documentation with error codes
```

After running iterations that implement error handling and tests, PROMPT.md automatically becomes:

```markdown
# My Project v2.0

## Work Plan

- [✅] Implement error handling for API
- [✅] Add unit tests for error-handler.js
- [ ] Update documentation with error codes
```

---

## v0.3.0 - Multi-Repository Workspace Support

*Added on 2026-01-07*

### 🎉 New Feature: Multi-Repo Workspaces

Wiggumizer now supports working across multiple repositories in a single iteration loop. Perfect for:
- Full-stack applications (frontend + backend)
- Monorepo-style development
- Microservices architectures
- Projects split across multiple Git repositories

### Changes

**New Files:**
- `src/workspace-manager.js` - Manages multiple repositories and coordinates file operations
- `examples/multi-repo/.wiggumizer.yml` - Example multi-repo configuration
- `examples/multi-repo/PROMPT.md` - Example multi-repo prompt
- `examples/multi-repo/README.md` - Documentation for multi-repo feature

**Modified Files:**
- `src/config.js` - Added `workspaces` configuration option
- `src/git-helper.js` - All methods now accept optional `cwd` parameter for multi-repo support
- `src/loop.js` - Integrated WorkspaceManager for context gathering and change application
- `src/providers/claude.js` - Updated prompts to include workspace context and file tagging

### Configuration

Add workspaces to `.wiggumizer.yml`:

```yaml
workspaces:
  - name: backend
    path: ../my-backend
    include:
      - "src/**/*.js"
    exclude:
      - "node_modules/**"

  - name: frontend
    path: ../my-frontend
    include:
      - "src/**/*.tsx"
    exclude:
      - "node_modules/**"
```

### File Output Format

Claude now tags files with workspace names in multi-repo mode:

```markdown
## File: [backend] src/api/users.js
## File: [frontend] src/components/UserList.tsx
```

### Features

- ✅ Context gathering from all configured workspaces
- ✅ Per-workspace file patterns and context limits
- ✅ Per-workspace git operations (status, commits)
- ✅ Smart file path resolution to correct repository
- ✅ Automatic fallback for untagged files
- ✅ Workspace-aware logging and progress tracking
- ✅ Full backwards compatibility (single-repo mode still works)

### Documentation

See `examples/multi-repo/README.md` for complete documentation and usage examples.

---

## v0.2.0 - Testing and Error Handling

*Generated on 2026-01-07T07:00:53.130Z*

## Overview

**Iterations**: 3
**Files Modified**: 5
**Duration**: 286s
**Status**: Converged (File hashes stable for 3 iterations)

## Original Request

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

## Changes Applied

- **Iteration 1**: Adding comprehensive unit tests for the convergence-analyzer module using Node's built-in test runner. (1 file)
- **Iteration 2**: Adding comprehensive unit tests for convergence-analyzer.js and error-handler.js using Node's built-in test runner (2 files)
- **Iteration 3**: Adding comprehensive unit tests for convergence-analyzer, error-handler, file-selector, and config modules (2 files)

## Convergence Analysis

**Status**: Not converged

## Suggested Commit Message

```
Wiggumizer v0.2 - Refinement and Testing

# Wiggumizer v0.2 - Refinement and Testing

You are refining Wiggumizer - a fully functional CLI tool for Ralph Wiggum style iterative AI coding. All core features are complete. Now we focus on **polish, testing, and documentation**.

## Current State

Modified 5 files through iterative refinement.
```

## Suggested PR Description

```markdown
## Summary

# Wiggumizer v0.2 - Refinement and Testing

You are refining Wiggumizer - a fully functional CLI tool for Ralph Wiggum style iterative AI coding. All core features are complete. Now we focus on **polish, testing, and documentation**.

## Changes Made

This PR contains changes generated through 3 iterations of automated refinement, modifying 5 files.

**Key changes:**
- Adding comprehensive unit tests for the convergence-analyzer module using Node's built-in test runner.
- Adding comprehensive unit tests for convergence-analyzer.js and error-handler.js using Node's built-in test runner
- Adding comprehensive unit tests for convergence-analyzer, error-handler, file-selector, and config modules

## Test Plan

- [ ] Code builds successfully
- [ ] All existing tests pass
- [ ] Manual testing completed

---
*Generated with [Wiggumizer](https://github.com/bradledford/wiggumizer) - Ralph Wiggum style iterative development*
```
