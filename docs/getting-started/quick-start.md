# Quick Start

Get up and running with Wiggumizer in 5 minutes. This guide will walk you through your first Ralph loop.

## Prerequisites

- Wiggumizer installed ([Installation Guide](installation.md))
- An AI provider API key (Claude, GPT, or Sourcegraph Amp account)
- A code project to work with (or create a test project)

## Your First Ralph Loop

### 1. Initialize Wiggumizer

Navigate to your project directory and initialize Wiggumizer:

```bash
cd your-project
wiggumize init
```

This creates a `.wiggumizer.yml` configuration file. You'll be prompted to:
- Choose your default AI provider
- Set your API key
- Configure basic options

### 2. Create Your First Prompt

Create a file called `PROMPT.md` in your project root:

```markdown
# Refactor getUserData Function

Please refactor the getUserData function in src/api.js to:
- Use async/await instead of promises
- Add proper error handling
- Add JSDoc comments
- Follow our coding standards

Keep the same functionality, just improve the code quality.
```

**Tips for effective prompts:**
- Be specific about what you want changed
- Reference exact file names and function names
- Describe the desired outcome, not implementation details
- Include context about coding standards or patterns to follow

### 3. Run Your First Loop

Start the Ralph loop:

```bash
wiggumize run
```

This will:
1. Read your `PROMPT.md` file
2. Send it to your configured AI provider
3. Apply suggested changes to your code
4. Iterate until convergence or manual stop

**You'll see output like:**

```
Wiggumizer v1.0.0
Provider: Claude (Sonnet 4.5)
Prompt: PROMPT.md

Iteration 1: Processing...
  Modified: src/api.js
  Changes: Converted promises to async/await

Iteration 2: Processing...
  Modified: src/api.js
  Changes: Added error handling, JSDoc comments

Iteration 3: Processing...
  No changes detected

Convergence detected after 3 iterations.
```

### 4. Review the Changes

The loop will automatically stop when it detects convergence (no more changes between iterations). Review the changes:

```bash
git diff
```

You should see that `src/api.js` has been refactored according to your prompt.

### 5. Stop the Loop (Manual)

If you need to manually stop the loop before convergence:

- **Press `Ctrl+C`** to gracefully stop
- Changes up to that point will be preserved
- You can restart with `wiggumize run --continue` to resume

## What Just Happened?

Wiggumizer ran a **Ralph loop** - iteratively sending your prompt and current code to an AI provider, applying changes, and repeating until the code matches your desired outcome.

This is the core of the **"deterministic imperfection"** philosophy:
- Each iteration doesn't need to be perfect
- Small improvements accumulate
- Code **converges** to quality over multiple iterations
- Trust the process (faith in eventual consistency)

## Common Options

### Specify a Different Prompt File

```bash
wiggumize run --prompt refactor-auth.md
```

### Set Maximum Iterations

```bash
wiggumize run --max-iterations 10
```

### Use a Different Provider

```bash
wiggumize run --provider openai
```

### Watch Mode (Auto-restart on prompt changes)

```bash
wiggumize run --watch
```

## Next Steps

Now that you've run your first Ralph loop, explore:

1. **[Cross-Session Workflows](../guides/cross-session-workflows.md)** - Working across multiple sessions ⭐ **Essential for ongoing work**
2. **[First Project Tutorial](first-project.md)** - Complete end-to-end example
3. **[Ralph Philosophy](../core-concepts/ralph-philosophy.md)** - Understand the "why"
4. **[Writing Effective Prompts](../guides/best-practices/writing-effective-prompts.md)** - Craft better prompts
5. **[Prompt Templates](../prompt-templates/README.md)** - Use pre-made templates
6. **[Loop Not Converging?](../troubleshooting/loop-not-converging.md)** - Troubleshooting tips

## Real Example

Here's a real prompt that refactored a legacy authentication module:

```markdown
# Modernize Authentication Module

File: src/auth/legacy-auth.js

Goals:
1. Convert to ES6+ syntax (const/let, arrow functions, async/await)
2. Replace callbacks with promises
3. Add input validation on all public methods
4. Add comprehensive JSDoc comments
5. Extract hardcoded values to constants
6. Keep 100% backward compatibility with existing API

Do NOT:
- Change function names or signatures
- Modify the export structure
- Add external dependencies

Run all existing tests after each change to ensure compatibility.
```

**Result:** Converged in 7 iterations. Legacy module fully modernized while maintaining full backward compatibility.

## Tips for Success

1. **Start Small** - Begin with simple, focused refactorings
2. **Be Specific** - The clearer your prompt, the faster convergence
3. **Trust the Process** - Early iterations may look messy, that's normal
4. **Use Git** - Commit often so you can roll back if needed
5. **Watch the Changes** - Keep `git diff` open in another terminal

## Troubleshooting

**Loop runs forever without converging:**
- Your prompt may be too vague or have conflicting requirements
- Try being more specific or breaking into smaller tasks
- See [Loop Not Converging](../troubleshooting/loop-not-converging.md)

**API errors:**
- Check your API key configuration
- Verify you have API credits/quota
- See [Provider Errors](../troubleshooting/provider-errors.md)

**Changes aren't what you expected:**
- Refine your prompt to be more specific
- Add examples of what you want
- See [Writing Effective Prompts](../guides/best-practices/writing-effective-prompts.md)

---

**Ready for more?** Try the [First Project Tutorial](first-project.md) for a complete end-to-end example.
