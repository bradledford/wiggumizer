# Wiggumizer Documentation

> Ralph Wiggum style AI coding automation - because sometimes the best code emerges from deterministic imperfection.

## Quick Navigation

| Getting Started | Core Concepts | Reference |
|----------------|---------------|-----------|
| [Quick Start (5 min)](getting-started/quick-start.md) | [Ralph Philosophy](core-concepts/ralph-philosophy.md) | [CLI Commands](cli-reference/README.md) |
| [Installation](getting-started/installation.md) | [How the Loop Works](core-concepts/how-the-loop-works.md) | [Configuration](cli-reference/configuration-file.md) |
| [First Project](getting-started/first-project.md) | [Convergence Patterns](core-concepts/convergence-patterns.md) | [Prompt Templates](prompt-templates/README.md) |

## What is Wiggumizer?

Wiggumizer is a CLI tool that automates the Ralph Wiggum coding technique - an iterative AI-driven development approach based on this simple loop:

```bash
while :; do cat PROMPT.md | npx --yes @sourcegraph/amp ; done
```

The technique relies on **"deterministic imperfection"** and **"faith in eventual consistency"** - code converges to quality through iteration rather than getting it perfect on the first try.

### Key Features

- **Prompt Template Library** - Reusable templates for common tasks (refactoring, testing, features)
- **Multi-Provider Support** - Works with Claude, GPT, Sourcegraph Amp, Ollama, and local models
- **Multi-Repo Orchestration** - Run Ralph loops across multiple repositories simultaneously
- **Convergence Detection** - Automatically recognize when code has converged
- **Built for Developers** - Simple CLI, Git-friendly, CI/CD ready

## Popular Documentation

### For Beginners
1. [Quick Start](getting-started/quick-start.md) - Your first Ralph loop in 5 minutes
2. [Ralph Philosophy](core-concepts/ralph-philosophy.md) - Why this works
3. [Writing Effective Prompts](guides/best-practices/writing-effective-prompts.md)

### For Practitioners
1. [AI Provider Setup](ai-providers/provider-comparison.md) - Choose and configure providers
2. [Refactoring Tutorial](guides/tutorials/refactoring-legacy-code.md) - Complete worked example
3. [Loop Not Converging?](troubleshooting/loop-not-converging.md) - Debug techniques

### For Teams
1. [Multi-Repo Orchestration](multi-repo/README.md) - Coordinate multiple repositories
2. [CI/CD Integration](advanced/ci-cd-integration.md) - Automate with GitHub Actions
3. [Team Collaboration](guides/best-practices/team-collaboration.md) - Using Ralph in teams

## Documentation Sections

### [Getting Started](getting-started/README.md)
Installation, quick start, and your first project.

### [Core Concepts](core-concepts/README.md)
The philosophy and mechanics of Ralph-style iterative development.

### [CLI Reference](cli-reference/README.md)
Complete command reference and configuration documentation.

### [Prompt Templates](prompt-templates/README.md)
Template system, built-in templates, and creating custom templates.

### [AI Providers](ai-providers/README.md)
Setup guides for Claude, GPT, Sourcegraph Amp, and local models.

### [Multi-Repo](multi-repo/README.md)
Orchestrating Ralph loops across multiple repositories.

### [Guides](guides/README.md)
Best practices, tutorials, examples, and workflow patterns.

### [Troubleshooting](troubleshooting/README.md)
Common issues, debugging techniques, and getting help.

### [Advanced](advanced/README.md)
CI/CD integration, hooks, plugins, and internals.

### [Community](community/README.md)
Contributing, showcase, and community resources.

### [Appendices](appendices/README.md)
Glossary, FAQ, migration guides, and changelog.

## Getting Help

- **[Troubleshooting](troubleshooting/README.md)** - Start here if something isn't working
- **[FAQ](appendices/faq.md)** - Common questions answered
- **[Community](community/README.md)** - Get help from other Ralph practitioners

## Quick Links

- [Home](index.md) - Documentation homepage
- [Installation](getting-started/installation.md) - Install Wiggumizer
- [Quick Start](getting-started/quick-start.md) - 5-minute tutorial
- [All Commands](cli-reference/README.md) - CLI reference
- [Examples](guides/examples/README.md) - Real-world examples
- [Contributing](community/contributing.md) - Contribute to Wiggumizer
