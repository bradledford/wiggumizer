# Complete Wiggumizer Implementation

You are building Wiggumizer - a CLI tool for Ralph Wiggum style AI coding automation. This is a **meta moment**: you're using Wiggumizer to complete the implementation of Wiggumizer itself!

## Context

Wiggumizer is based on the Ralph technique by Geoffrey Huntley - an iterative loop that repeatedly sends a prompt to an AI to refine code until it converges:

```bash
while :; do cat PROMPT.md | npx --yes @sourcegraph/amp ; done
```

The current implementation has:
- ✅ Basic CLI structure (bin/wiggumize.js, src/cli.js)
- ✅ `wiggumize run` command skeleton
- ✅ RalphLoop class with basic iteration logic
- ✅ ClaudeProvider with API integration
- ✅ Simple file gathering and context building

## What Needs to be Implemented

### 1. File Modification System (CRITICAL)

The `applyChanges()` method in `src/loop.js` is currently a stub. It needs to:

- Parse the AI's response to extract file modifications
- Support multiple output formats from the AI:
  - Code blocks with file paths: `## File: src/foo.js`
  - Diff format
  - Complete file replacements
- Apply changes safely (create backups, validate syntax)
- Track what changed for convergence detection
- Handle file creation, modification, and deletion

**Key requirement:** The AI response format should be flexible but parseable.

### 2. Better Convergence Detection

Current convergence detection is naive (just checking for "no changes" text). Improve it to:

- Compare actual file changes between iterations
- Detect oscillation (same changes repeating)
- Calculate a convergence score based on:
  - Size of changes
  - Number of files changed
  - Similarity to previous iterations
- Support configurable convergence thresholds

### 3. Configuration System

Implement `.wiggumizer.yml` support:

```yaml
provider: claude
max_iterations: 20
convergence_threshold: 0.02
files:
  include:
    - "src/**/*.js"
    - "*.md"
  exclude:
    - "node_modules/**"
    - "docs/**"
```

Load from:
- Project root `.wiggumizer.yml`
- User home `~/.wiggumizer.yml`
- Merge with CLI options (CLI takes precedence)

### 4. Smarter File Selection

Current file gathering is too broad. Improve `getRelevantFiles()` to:

- Respect `.gitignore` patterns
- Support glob patterns from config
- Limit total context size (Claude has token limits)
- Prioritize recently modified files
- Allow `--files` flag to specify exact files

### 5. Iteration Logging

Create `.wiggumizer/iterations/` directory and log:

- Each iteration's prompt, response, and changes
- Timestamps and metadata
- Convergence metrics
- Enable replay/debugging of loops

### 6. Error Handling

Add robust error handling:

- API failures (retry with exponential backoff)
- Rate limiting
- Syntax errors in generated code (rollback)
- File permission errors
- Git conflicts

### 7. Git Integration

Add git utilities:

- Check for uncommitted changes (warn user)
- Create automatic commits after convergence
- Support rollback to previous iterations
- Tag iterations in git history

## Implementation Approach

**Do NOT try to implement everything at once.** Follow the Ralph philosophy:

- Focus on ONE improvement per iteration
- Start with the most critical: file modification system
- Let each iteration build on the previous
- Trust the process to converge

## Constraints

- Keep it simple - no over-engineering
- Use only existing dependencies (no new npm packages yet)
- Maintain backward compatibility with current CLI interface
- Follow existing code style and patterns
- All code should be well-commented

## Success Criteria

When Wiggumizer can:
- ✅ Read a prompt and current codebase
- ✅ Send to Claude API
- ✅ Parse AI response and extract file changes
- ✅ Apply changes to actual files
- ✅ Detect convergence accurately
- ✅ Run iteratively until convergence or max iterations
- ✅ Create useful logs for debugging

Then Wiggumizer v0.1 is complete!

## Meta Note

This is iteration 1 of Wiggumizer building itself. Don't worry about perfection - just make incremental progress. The loop will refine it over iterations.

**Let's go! 🎯**
