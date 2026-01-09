# Wiggumizer

> Ralph Wiggum style AI coding automation - deterministic imperfection meets eventual consistency.

Wiggumizer is a CLI tool that automates the [Ralph coding technique](https://ghuntley.com/ralph/) - an iterative AI-driven development approach that produces quality code through systematic refinement rather than upfront perfection.

## What is Ralph?

The Ralph technique, pioneered by Geoffrey Huntley, is based on a deceptively simple loop:

```bash
while :; do cat PROMPT.md | npx --yes @sourcegraph/amp ; done
```

You write a prompt describing what you want, and the loop iteratively refines your code until it converges to your requirements.

### Real-World Success

- **$50k contract delivered for $297** in API costs
- **Multiple repos built overnight** at Y Combinator hackathons
- **Novel programming languages created** despite not existing in training data

The technique works. Wiggumizer makes it practical.

## Quick Start

```bash
# Install
npm install -g wiggumizer

# Initialize in your project
cd your-project
wiggumize init

# Create a prompt
echo "Refactor getUserData to use async/await and add error handling" > PROMPT.md

# Run the loop
wiggumize run

# Watch your code converge to the desired state
```

[Full Documentation →](docs/index.md)

## Key Features

### 🎯 Prompt Template Library
Pre-built templates for common tasks: refactoring, testing, documentation, feature implementation.

### 🔄 Multi-Provider Support
Works with Claude, GPT, Sourcegraph Amp, Ollama, and local models. Switch providers seamlessly.

### 🚀 Multi-Repo Orchestration
Run Ralph loops across multiple repositories simultaneously. Coordinate changes across your entire stack.

### 🎓 Smart Convergence Detection
Automatically recognizes when code has reached the desired state. No more manual loop monitoring.

### 🛡️ Safety Features
Git integration, syntax validation, test execution, automatic backups. Safe by default.

### 📝 Change Documentation
Automatic CHANGELOG generation with commit messages, PR descriptions, and JIRA updates. Link changes to issues with YAML metadata.

### 🧠 Self-Discovery Through Iteration
Unlike other tools that "tell" the AI what was done, Wiggumizer implements the pure Ralph philosophy:
- **Constant prompts** - The same goal every iteration, forcing deeper engagement
- **Git archaeology** - Claude reads git log to discover what it did before
- **Breadcrumb notes** - Claude can create `.ralph-notes.md` to leave insights for future iterations
- **Autonomous learning** - Claude must examine files and context to understand its own progress

This creates true iterative learning where each iteration builds meaningfully on the last.

## Usage Patterns

Wiggumizer supports different workflows depending on your needs:

### Quick Fix (5-20 minutes)
```bash
echo "Add error handling to getUserData()" > PROMPT.md
wiggumize run --max-iterations 10
# Review, test, commit - done!
```

### Feature Development (1-3 hours, single session)
```bash
# PROMPT.md: "Implement dark mode with theme switcher and persistence"
wiggumize run --max-iterations 30
# Let it converge, review comprehensive changes
```

### Project Evolution (Days/weeks, multiple sessions)
```bash
# Day 1: Initial work
echo "Phase 1: Refactor authentication to use JWT" > PROMPT.md
wiggumize run
git commit -am "Phase 1: JWT authentication complete"

# Day 3: Next phase (MANUALLY UPDATE PROMPT.md)
vim PROMPT.md  # Change to "Phase 2: Add OAuth providers"
wiggumize run
```

**Key Principle**: Between sessions, manually update `PROMPT.md` to give the AI new direction. The AI discovers its previous work through git history and `.ralph-notes.md`, but you control the goal.

### What Updates Automatically vs. Manually

**Automatic** (Wiggumizer manages):
- ✅ Task checkboxes in PROMPT.md (`- [ ]` → `- [✅]`)
- ✅ `.ralph-notes.md` (AI leaves notes for next iteration)
- ✅ `CHANGELOG.md` (summary of changes)
- ✅ `.wiggumizer/iterations/` logs

**Manual** (You control):
- ✋ Core PROMPT.md instructions and goals
- ✋ Deciding what to work on next
- ✋ When to run again vs. commit and stop

This keeps you in the driver's seat while letting the AI iterate within your defined boundaries.

## Philosophy

Wiggumizer embraces **"deterministic imperfection"** - the idea that code quality emerges through iteration rather than upfront perfection.

**Traditional coding:** Think deeply → Code once → Done
**Ralph coding:** Code quickly → Iterate → Converge

This isn't about AI writing perfect code. It's about creating a **systematic process** that reliably transforms code toward quality through repeated refinement.

## Installation

```bash
# npm (Node.js)
npm install -g wiggumizer

# pip (Python)
pip install wiggumizer

# cargo (Rust)
cargo install wiggumizer

# Homebrew (macOS/Linux)
brew install wiggumizer
```

See [Installation Guide](docs/getting-started/installation.md) for detailed instructions.

## Documentation

- **[Quick Start (5 minutes)](docs/getting-started/quick-start.md)** - Get running fast
- **[First Project Tutorial](docs/getting-started/first-project.md)** - Complete example
- **[Ralph Philosophy](docs/core-concepts/ralph-philosophy.md)** - Why this works
- **[CLI Reference](docs/cli-reference/README.md)** - All commands
- **[Prompt Templates](docs/prompt-templates/README.md)** - Reusable patterns
- **[AI Providers](docs/ai-providers/README.md)** - Setup guides
- **[Troubleshooting](docs/troubleshooting/README.md)** - Common issues

[View Full Documentation](docs/index.md)

## Example

Here's a real prompt that modernized a legacy authentication module:

```markdown
# Modernize Authentication Module

File: src/auth/legacy-auth.js

Goals:
1. Convert to ES6+ syntax (const/let, arrow functions, async/await)
2. Replace callbacks with promises
3. Add input validation on all public methods
4. Add comprehensive JSDoc comments
5. Extract hardcoded values to constants
6. Keep 100% backward compatibility

Do NOT:
- Change function names or signatures
- Modify the export structure
- Add external dependencies

Run all existing tests after each change to ensure compatibility.
```

**Result:** Converged in 7 iterations. Legacy module fully modernized while maintaining full backward compatibility.

## Use Cases

**Refactoring:**
- Modernize legacy code
- Extract patterns into reusable functions
- Improve code organization

**Code Generation:**
- Generate tests from existing code
- Create documentation
- Build new features from specs

**Code Improvement:**
- Add error handling
- Improve security
- Optimize performance
- Add type annotations

**Learning:**
- Understand unfamiliar codebases
- Learn new patterns and frameworks
- Explore different approaches

## Configuration

Create `.wiggumizer.yml` in your project:

```yaml
provider: claude
api_keys:
  anthropic: ${ANTHROPIC_API_KEY}

defaults:
  max_iterations: 20
  convergence_threshold: 0.95

templates:
  directory: ./.wiggumizer/templates
```

Or use environment variables:

```bash
export WIGGUMIZER_PROVIDER=claude
export ANTHROPIC_API_KEY=your-api-key-here
```

See [Configuration Reference](docs/cli-reference/configuration-file.md) for all options.

## Community

- **[Contributing](docs/community/contributing.md)** - Help improve Wiggumizer
- **[Showcase](docs/community/showcase.md)** - Share your success stories
- **[Template Registry](docs/community/template-registry.md)** - Share and discover prompts
- **[GitHub Issues](https://github.com/bradledford/wiggumizer/issues)** - Report bugs
- **[Discussions](https://github.com/bradledford/wiggumizer/discussions)** - Get help

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- **[Geoffrey Huntley](https://ghuntley.com/)** - Creator of the Ralph technique
- **[@sourcegraph/amp](https://www.npmjs.com/package/@sourcegraph/amp)** - The original Ralph tool
- **Anthropic** - Claude AI
- **OpenAI** - GPT models
- All contributors to the Wiggumizer project

## Credits

Named after Ralph Wiggum from The Simpsons, whose endearing imperfection inspired the philosophy of "deterministic imperfection leading to eventual consistency."

> "I'm a Star Wars!" - Ralph Wiggum

---

**Ready to start?** Head to the [Quick Start guide](docs/getting-started/quick-start.md) and run your first Ralph loop in 5 minutes.
