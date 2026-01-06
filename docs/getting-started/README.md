# Getting Started with Wiggumizer

Welcome! This section will get you up and running with Wiggumizer, from installation through your first complete project.

## Quick Links

- **[Quick Start (5 minutes)](quick-start.md)** - Fastest way to get started
- **[Installation Guide](installation.md)** - Detailed installation instructions
- **[First Project Tutorial](first-project.md)** - Complete end-to-end example
- **[Troubleshooting Setup](troubleshooting-setup.md)** - Installation issues

## Learning Path

If you're new to Wiggumizer, follow this path:

### 1. Install Wiggumizer
Start with [Installation](installation.md) to get Wiggumizer on your system and configure your AI provider.

**Time:** 5-10 minutes

### 2. Run Your First Loop
Follow the [Quick Start](quick-start.md) guide to run your first Ralph loop and see the magic happen.

**Time:** 5 minutes

### 3. Complete a Real Project
Work through the [First Project Tutorial](first-project.md) to understand the full workflow with a realistic example.

**Time:** 15-20 minutes

### 4. Understand the Philosophy
Read [Ralph Philosophy](../core-concepts/ralph-philosophy.md) to understand *why* this technique works and how to think about iterative development.

**Time:** 10 minutes

### 5. Level Up Your Prompts
Study [Writing Effective Prompts](../guides/best-practices/writing-effective-prompts.md) to learn how to craft prompts that converge quickly.

**Time:** 15 minutes

## What is Wiggumizer?

Wiggumizer is a CLI tool that automates the **Ralph Wiggum coding technique** - an iterative AI-driven development approach.

At its core, Ralph is simple:

```bash
while :; do cat PROMPT.md | ai-tool ; done
```

You write a prompt describing what you want, and the loop iteratively refines your code until it matches your requirements.

### Key Concepts

- **Deterministic Imperfection** - Code doesn't need to be perfect on the first iteration
- **Eventual Consistency** - Quality emerges through iteration
- **Convergence** - Code naturally reaches a stable, high-quality state
- **Prompt-Driven Development** - Your prompt is as important as your code

## What Can You Do With Wiggumizer?

### Common Use Cases

**Refactoring:**
- Modernize legacy code
- Extract patterns into reusable functions
- Improve code structure and organization

**Code Generation:**
- Generate tests from existing code
- Create documentation from code
- Build new features from specifications

**Code Improvement:**
- Add error handling
- Improve security
- Optimize performance
- Add type annotations

**Learning:**
- Understand unfamiliar codebases
- Learn new patterns and frameworks
- Explore different implementation approaches

## System Requirements

- **Operating System:** macOS, Linux, or Windows (WSL recommended)
- **Package Manager:** npm, pip, or cargo
- **AI Provider:** API key for Claude, GPT, or local model setup
- **Git:** Recommended for version control

## Installation Quick Reference

```bash
# npm
npm install -g wiggumizer

# pip
pip install wiggumizer

# cargo
cargo install wiggumizer

# Verify
wiggumize --version
```

See [Installation](installation.md) for detailed instructions.

## First Steps Checklist

- [ ] Install Wiggumizer
- [ ] Configure AI provider and API key
- [ ] Run `wiggumize doctor` to verify setup
- [ ] Complete the Quick Start tutorial
- [ ] Run a loop on your own code
- [ ] Read about the Ralph philosophy

## Getting Help

**Having trouble?**
- [Troubleshooting Setup](troubleshooting-setup.md) - Installation issues
- [FAQ](../appendices/faq.md) - Common questions
- [Community](../community/README.md) - Get help from others

**Ready to dive deeper?**
- [Core Concepts](../core-concepts/README.md) - Understanding Ralph
- [CLI Reference](../cli-reference/README.md) - All commands
- [Best Practices](../guides/best-practices/README.md) - Pro tips

## Next Section

Once you've completed the getting started guides, move on to [Core Concepts](../core-concepts/README.md) to deepen your understanding of how and why Ralph works.

---

**Let's get started!** Begin with [Installation](installation.md) →
