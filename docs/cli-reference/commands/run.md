# wiggumize run

Run a Ralph loop to iteratively refine code based on a prompt.

## Synopsis

```bash
wiggumize run [options]
```

## Description

The `run` command is the core of Wiggumizer - it starts a Ralph loop that iteratively applies your prompt to your code until convergence or manual termination.

Each iteration:
1. Reads the prompt file
2. Sends prompt + current code to AI provider
3. Applies suggested changes
4. Checks for convergence
5. Repeats or stops

## Options

### `--prompt <file>`

Specify which prompt file to use.

- **Default:** `PROMPT.md`
- **Alias:** `-p`

```bash
wiggumize run --prompt refactor-auth.md
wiggumize run -p docs/PROMPT-tests.md
```

### `--provider <name>`

Override the default AI provider.

- **Options:** `claude`, `openai`, `amp`, `local`
- **Default:** From config or `claude`
- **Alias:** `-P`

```bash
wiggumize run --provider openai
wiggumize run -P local
```

### `--max-iterations <num>`

Maximum number of iterations before stopping.

- **Default:** `20`
- **Alias:** `-m`

```bash
wiggumize run --max-iterations 50
wiggumize run -m 10
```

### `--convergence-threshold <num>`

Percentage threshold for detecting convergence (0.0 to 1.0).

- **Default:** `0.02` (2% changes)
- **Alias:** `-c`

```bash
wiggumize run --convergence-threshold 0.05
wiggumize run -c 0.01  # Very strict convergence
```

### `--files <glob>`

Limit loop to specific files.

```bash
wiggumize run --files "src/**/*.js"
wiggumize run --files "auth.ts,utils.ts"
```

### `--watch`

Watch mode - automatically restart loop when prompt file changes.

- **Alias:** `-w`

```bash
wiggumize run --watch
```

Useful for:
- Iterating on your prompt
- Live development with AI assistance

### `--continue`

Continue from last stopped iteration.

```bash
# Stop loop with Ctrl+C
# Edit prompt
# Continue where you left off
wiggumize run --continue
```

### `--dry-run`

Show what would change without actually modifying files.

```bash
wiggumize run --dry-run
```

### `--verbose`

Show detailed output for each iteration.

- **Alias:** `-v`

```bash
wiggumize run --verbose
wiggumize run -vv  # Very verbose
```

### `--quiet`

Minimal output - only show final results.

- **Alias:** `-q`

```bash
wiggumize run --quiet
```

### `--no-convergence-detection`

Disable automatic convergence detection. Run until max iterations or manual stop.

```bash
wiggumize run --no-convergence-detection --max-iterations 10
```

### `--stop-on-test-failure`

Stop the loop if tests fail after an iteration.

```bash
wiggumize run --stop-on-test-failure
```

Requires test command configured in `.wiggumizer.yml`:

```yaml
tests:
  command: npm test
  run_after_iteration: true
```

### `--stop-on-syntax-error`

Stop the loop if syntax errors are detected.

- **Default:** `true`
- **Disable with:** `--no-stop-on-syntax-error`

```bash
wiggumize run --no-stop-on-syntax-error
```

## Examples

### Basic Usage

Run with default settings:

```bash
wiggumize run
```

Uses:
- `PROMPT.md` as prompt
- Default provider from config
- Max 20 iterations
- Auto convergence detection

### Custom Prompt

```bash
wiggumize run --prompt refactoring/modernize-auth.md
```

### Quick Iteration

Fast iteration with GPT-3.5:

```bash
wiggumize run --provider openai --max-iterations 10
```

### Strict Convergence

Require very small changes to converge:

```bash
wiggumize run --convergence-threshold 0.005
```

### Development Workflow

Watch mode for live development:

```bash
wiggumize run --watch --verbose
```

Edit `PROMPT.md` in another window - loop auto-restarts on save.

### Specific Files Only

Refactor only authentication files:

```bash
wiggumize run --files "src/auth/**/*.js" --prompt refactor-auth.md
```

### Safe Refactoring

Stop if tests fail:

```bash
wiggumize run --stop-on-test-failure --max-iterations 30
```

### Non-Interactive (CI/CD)

For automated environments:

```bash
wiggumize run \
  --quiet \
  --max-iterations 15 \
  --no-convergence-detection \
  --stop-on-test-failure
```

## Output

### Standard Output

```
Wiggumizer v1.0.0
Provider: Claude (Sonnet 4.5)
Prompt: PROMPT.md
Max iterations: 20
Convergence: auto (threshold: 2%)

Iteration 1/20 [██████████          ] 45%
  Modified: src/auth.js (+32, -18 lines)
  Modified: src/utils.js (+5, -2 lines)
  Time: 3.2s | Cost: $0.02

Iteration 2/20 [████████████████    ] 78%
  Modified: src/auth.js (+8, -3 lines)
  Time: 2.8s | Cost: $0.01

Iteration 3/20 [████████████████████] 100%
  No changes detected

Convergence detected after 3 iterations.
Total time: 9 seconds
Total cost: $0.03
Files modified: 2
```

### Verbose Output

With `--verbose`, includes:
- AI's reasoning for each change
- Full diff of modifications
- Convergence metrics per iteration
- Token usage and costs

### Quiet Output

With `--quiet`:

```
Converged in 3 iterations.
Modified: src/auth.js, src/utils.js
```

## Exit Codes

- `0` - Successful convergence
- `1` - Error (invalid config, API error, etc.)
- `2` - Max iterations reached without convergence
- `3` - Stopped by user (Ctrl+C)
- `4` - Test failure (with `--stop-on-test-failure`)
- `5` - Syntax error (with `--stop-on-syntax-error`)

Use in scripts:

```bash
if wiggumize run --quiet; then
  echo "Converged successfully"
  git commit -am "Refactored with Wiggumizer"
else
  echo "Did not converge"
  exit 1
fi
```

## Configuration File

Options can be set in `.wiggumizer.yml`:

```yaml
run:
  default_prompt: PROMPT.md
  max_iterations: 20
  convergence_threshold: 0.02
  stop_on_test_failure: true
  stop_on_syntax_error: true
  provider: claude

tests:
  command: npm test
  run_after_iteration: false

files:
  include:
    - "src/**/*.js"
    - "src/**/*.ts"
  exclude:
    - "**/*.test.js"
    - "node_modules/**"
```

CLI options override config file settings.

## Monitoring

### Real-Time Monitoring

In another terminal:

```bash
# Watch iteration logs
wiggumize logs --follow

# View current status
wiggumize status
```

### Interrupting

Press `Ctrl+C` to gracefully stop:

```
^C
Loop interrupted at iteration 4.
Changes have been preserved.

What would you like to do?
1. Stop and keep changes
2. Stop and rollback to iteration 3
3. Edit prompt and continue
4. Resume loop

Choice:
```

## Tips

### Start Simple

Begin with short, focused prompts and increase complexity:

```bash
# First: modernize syntax
wiggumize run --prompt modernize-syntax.md

# Then: add error handling
wiggumize run --prompt add-error-handling.md

# Finally: add tests
wiggumize run --prompt generate-tests.md
```

### Use Watch Mode for Prompt Development

```bash
wiggumize run --watch
```

Iterate on your prompt in real-time, seeing results immediately.

### Combine with Git

```bash
# Commit before starting
git commit -am "Before Wiggumizer refactor"

# Run loop
wiggumize run

# Review changes
git diff

# Commit result
git commit -am "After Wiggumizer refactor"
```

## Common Issues

### Loop Doesn't Converge

- Prompt may have conflicting requirements
- Try `--verbose` to see what's changing
- See [Loop Not Converging](../../troubleshooting/loop-not-converging.md)

### API Rate Limiting

- Add delays between iterations in config
- Use cheaper/faster model for iterations
- See [Provider Errors](../../troubleshooting/provider-errors.md)

### Unexpected Changes

- Narrow scope with `--files`
- Make prompt more specific
- See [Writing Effective Prompts](../../guides/best-practices/writing-effective-prompts.md)

## See Also

- [wiggumize init](init.md) - Initialize configuration
- [Configuration File](../configuration-file.md) - Full config reference
- [How the Loop Works](../../core-concepts/how-the-loop-works.md) - Loop mechanics
- [Convergence Patterns](../../core-concepts/convergence-patterns.md) - Understanding convergence

---

The `run` command is the heart of Wiggumizer. Master it, and you've mastered Ralph-style development.
