> **WARNING**
> This library is under active development, primarily using Wiggumizer itself to work through the missing elements. There are currently Documentation inaccuracies, issues with the file parsing logic, strange behaviors that need prompt engineering, and so on. Use at your own risk!

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
Works with Claude, GPT-4, Gemini, Mistral, Cohere, and 15+ other providers via [AI SDK](https://ai-sdk.dev/). Switch providers seamlessly.

### 🚀 Multi-Repo Orchestration
Run Ralph loops across multiple repositories simultaneously. Coordinate changes across your entire stack.

### 🎓 Smart Convergence Detection
Automatically recognizes when code has reached the desired state. No more manual loop monitoring.

### 🛡️ Safety Features
Git integration, syntax validation, test execution, automatic backups. Safe by default.

### 📝 Change Documentation
Automatic session summary generation with commit messages, PR descriptions, and JIRA updates. Link changes to issues with YAML metadata.

### 💬 Chat Service Integration
Get notified via Slack or WhatsApp when runs complete or encounter errors. Interactive mode to respond to chat messages.

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

**Automatic** (Wiggumizer modifies these files):
- ✅ **PROMPT.md checkboxes** - Wiggumizer directly edits PROMPT.md to change `- [ ]` → `- [✅]` as work completes
- ✅ **`.ralph-notes.md`** - AI leaves notes for next iteration
- ✅ **`SESSION-SUMMARY.md`** - Summary of last run (commit messages, PR descriptions)
- ✅ **`.wiggumizer/iterations/`** - Detailed logs

**Manual** (You control):
- ✋ **PROMPT.md content** - Core instructions, goals, adding new tasks
- ✋ **What to work on next** - Deciding direction between sessions
- ✋ **When to run vs. commit** - Workflow control

**Important:** PROMPT.md is a living document - Wiggumizer automatically updates checkbox status in the file, but you control everything else.

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

## AI Providers

Wiggumizer supports two ways to use Claude AI:

### Claude API (default)
Uses the Anthropic API directly. Requires an API key and charges based on usage.

```bash
export ANTHROPIC_API_KEY=your-api-key-here
wiggumize run --provider claude
```

**Best for:**
- Production use
- CI/CD pipelines
- Precise cost tracking
- Advanced retry and rate limiting features

### Claude CLI
Uses the `claude` CLI command, which leverages your Claude Pro or Max subscription instead of API costs.

```bash
# Install the Claude CLI
npm install -g @anthropic-ai/claude-cli

# Use it with Wiggumizer
wiggumize run --provider claude-cli
```

**Best for:**
- Personal projects
- Heavy usage (fixed monthly cost)
- Claude Pro/Max subscribers
- Simplified setup (no API key management)

**Note:** The CLI provider has simplified error handling (no automatic retries) but works great for most use cases.

### AI SDK (Multi-Provider)
Uses [Vercel's AI SDK](https://ai-sdk.dev/) for access to 15+ AI providers with a unified API.

```bash
# Install the AI SDK core package
npm install ai

# Install your preferred provider(s)
npm install @ai-sdk/openai      # OpenAI (GPT-4, GPT-4o)
npm install @ai-sdk/anthropic   # Anthropic (Claude)
npm install @ai-sdk/google      # Google (Gemini)
npm install @ai-sdk/mistral     # Mistral
npm install @ai-sdk/cohere      # Cohere
npm install @ai-sdk/groq        # Groq
npm install @ai-sdk/amazon-bedrock  # Amazon Bedrock

# Set your API key
export OPENAI_API_KEY=your-key-here

# Run with AI SDK
wiggumize run --provider ai-sdk
```

**Supported Providers:**
- OpenAI (GPT-4, GPT-4o, GPT-4o-mini)
- Anthropic (Claude 3, Claude 3.5)
- Google (Gemini Pro, Gemini Ultra)
- Mistral (Mistral Large, Mixtral)
- Cohere (Command, Command-R)
- Groq (Llama, Mixtral)
- Amazon Bedrock
- Azure OpenAI
- Perplexity
- xAI (Grok)
- DeepSeek
- Together AI
- Fireworks
- Cerebras

**Best for:**
- Using non-Claude models (GPT-4, Gemini, Mistral, etc.)
- Switching between providers easily
- Experimenting with different models
- Organizations with existing AI SDK infrastructure

**Configuration:**
```yaml
# .wiggumizer.yml
provider: ai-sdk

providers:
  ai-sdk:
    provider: openai    # AI SDK provider name
    model: gpt-4o       # Model for that provider
    maxTokens: 16384
```

See the [AI SDK documentation](https://ai-sdk.dev/docs/foundations/providers-and-models) for all available providers and models.

## Configuration

Create `.wiggumizer.yml` in your project:

```yaml
# Choose your provider
provider: claude  # or 'claude-cli', 'ai-sdk'

# Provider-specific settings
providers:
  claude:
    model: claude-opus-4-5-20251101
    maxTokens: 16384
  claude-cli:
    model: claude-opus-4-5-20251101
    maxTokens: 16384
  ai-sdk:
    provider: openai    # or anthropic, google, mistral, cohere, groq, etc.
    model: gpt-4o       # model name for the chosen provider
    maxTokens: 16384

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

## Chat Service Integration

Wiggumizer can send notifications to external chat services when runs complete or encounter errors. This is useful for long-running jobs where you want to be notified of progress.

### Supported Providers

- **Slack** - Uses the Slack CLI for local workspace integration
- **WhatsApp** - Uses CLI tools like `mudslide` for WhatsApp messaging

### Usage

```bash
# Send notifications to Slack
wiggumize run --chat-provider slack --channel "#dev-notifications"

# Send notifications via WhatsApp
wiggumize run --chat-provider whatsapp --contact "+1234567890"

# Interactive mode - listen and respond to messages
wiggumize listen --chat-provider slack --channel "#random"
```

### Prerequisites

**For Slack:**
```bash
# Install Slack CLI
# See: https://api.slack.com/automation/cli/install

# Authenticate
slack login
```

**For WhatsApp:**
```bash
# Install mudslide
npm install -g mudslide

# Authenticate (scan QR code)
mudslide login
```

### Configuration

Add to `.wiggumizer.yml`:

```yaml
# Chat notifications
chatProvider: slack
channel: "#wiggumizer"

# Or for WhatsApp
# chatProvider: whatsapp
# contact: "+1234567890"
# group: "Dev Team"
```

### Notification Events

1. **Successful completion** - Summary of work completed (files modified, iterations, duration)
2. **Unexpected stoppage** - Error notification with reason (rate limit, permission denied, etc.)

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
