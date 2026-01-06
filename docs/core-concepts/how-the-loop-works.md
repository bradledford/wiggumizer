# How the Loop Works

Understanding the mechanics of the Ralph loop helps you use it effectively. This guide explains what happens during each iteration and how Wiggumizer enhances the basic loop.

## The Basic Loop

The canonical Ralph loop is remarkably simple:

```bash
while :; do
  cat PROMPT.md | npx --yes @sourcegraph/amp
done
```

### Breakdown

- `while :` - Infinite loop (runs forever until manually stopped)
- `cat PROMPT.md` - Read the prompt file
- `|` - Pipe the prompt to the AI tool
- `npx --yes @sourcegraph/amp` - Run Sourcegraph's amp tool
- `done` - End of loop, repeat

This loop will:
1. Read PROMPT.md
2. Send it to the AI (which has access to your code)
3. AI makes changes to your files
4. Loop repeats with the newly changed code
5. Continue until you press Ctrl+C

## The Iteration Lifecycle

Each iteration follows a predictable pattern:

```
┌─────────────────────────────────────────┐
│ 1. Read Prompt + Current Code State    │
├─────────────────────────────────────────┤
│ 2. Send to AI Provider                 │
├─────────────────────────────────────────┤
│ 3. AI Analyzes and Generates Changes   │
├─────────────────────────────────────────┤
│ 4. Apply Changes to Files              │
├─────────────────────────────────────────┤
│ 5. Check for Convergence                │
└─────────────────────────────────────────┘
         │                      │
         │ Not converged        │ Converged
         ↓                      ↓
    Next Iteration           Stop Loop
```

### Detailed Steps

#### 1. Read Prompt + Current Code State

The AI needs two inputs:
- **Your prompt** - What you want to achieve
- **Current code** - The actual state of your files

With each iteration, the code state changes, but the prompt stays the same (unless you manually edit it).

#### 2. Send to AI Provider

Wiggumizer packages this into an API call:

```json
{
  "messages": [
    {
      "role": "user",
      "content": "PROMPT.md contents + current file states"
    }
  ],
  "model": "claude-sonnet-4.5",
  "max_tokens": 4096
}
```

#### 3. AI Analyzes and Generates Changes

The AI:
- Understands your prompt
- Examines the current code
- Identifies what needs to change
- Generates specific edits

The AI's response includes:
- Which files to modify
- Exact changes to make
- Reasoning for the changes

#### 4. Apply Changes to Files

Wiggumizer applies the changes:

```python
for file, changes in ai_response.changes:
    apply_diff(file, changes)
    log_change(iteration_num, file, changes)
```

Changes are applied incrementally - modifying existing code rather than rewriting everything.

#### 5. Check for Convergence

Wiggumizer checks if the loop should stop:

```python
if no_changes_detected():
    print("Convergence detected!")
    exit_loop()
elif iteration_count >= max_iterations:
    print("Max iterations reached")
    exit_loop()
elif user_pressed_ctrl_c():
    print("Manually stopped")
    exit_loop()
else:
    continue_to_next_iteration()
```

## State Accumulation

Each iteration builds on the previous one:

```
Iteration 1:  Original Code + Prompt → Changes A
Iteration 2:  (Original + A) + Prompt → Changes B
Iteration 3:  (Original + A + B) + Prompt → Changes C
...
Iteration N:  Fully Refined Code + Prompt → No Changes
```

This accumulation is why:
- Early iterations can be messy
- Later iterations refine details
- Eventually no more changes are needed

## What Wiggumizer Adds

The basic loop is powerful but crude. Wiggumizer enhances it:

### 1. Convergence Detection

**Basic loop:** Runs forever until Ctrl+C

**Wiggumizer:** Automatically stops when:
- No changes between iterations
- Changes fall below threshold
- Max iterations reached

```yaml
convergence:
  detection: auto
  threshold: 0.02  # Stop if changes < 2% of code
  lookback: 2      # Require 2 stable iterations
```

### 2. Multi-File Coordination

**Basic loop:** AI might only see one file at a time

**Wiggumizer:** Provides full codebase context:
- All relevant files simultaneously
- Cross-file dependencies
- Project structure awareness

### 3. Provider Abstraction

**Basic loop:** Tied to one AI tool

**Wiggumizer:** Works with multiple providers:
- Claude (Anthropic)
- GPT (OpenAI)
- Sourcegraph Amp
- Local models (Ollama, llama.cpp)
- Custom providers

### 4. Iteration History

**Basic loop:** No record of iterations

**Wiggumizer:** Logs everything:

```
.wiggumizer/
  iterations/
    001-initial.json
    002-refactor.json
    003-formatting.json
    converged.json
```

Each log includes:
- Timestamp
- Files changed
- Diff of changes
- AI's reasoning
- Convergence metrics

### 5. Safety Features

**Basic loop:** Can break your code

**Wiggumizer:** Adds safeguards:
- Git status checks (warn if uncommitted changes)
- Syntax validation (rollback on syntax errors)
- Test execution (stop if tests fail)
- Backup creation (automatic snapshots)

### 6. Smart Prompting

**Basic loop:** Same prompt every iteration

**Wiggumizer:** Can enhance prompts:

```markdown
<!-- Original prompt -->
Refactor the auth module

<!-- Wiggumizer adds context -->
Refactor the auth module

Current iteration: 3
Previous changes:
- Iteration 1: Converted to async/await
- Iteration 2: Added error handling

Remaining issues detected:
- TODO: Add input validation
- TODO: Extract constants
```

## Iteration Patterns

Different tasks produce different iteration patterns:

### Pattern 1: Rapid Convergence (2-4 iterations)

```
Iteration 1: ████████████ 80% of changes
Iteration 2: ███ 15% refinements
Iteration 3: █ 5% polish
Iteration 4: (no changes) - CONVERGED
```

**Typical for:**
- Simple refactorings
- Clear requirements
- Small code changes

### Pattern 2: Stepped Progress (5-10 iterations)

```
Iteration 1-2: ██████ Structure changes
Iteration 3-5: █████ Logic improvements
Iteration 6-8: ████ Edge cases
Iteration 9-10: ██ Polish
Iteration 11: (no changes) - CONVERGED
```

**Typical for:**
- Complex refactorings
- Multiple objectives
- Large files

### Pattern 3: Oscillation (may not converge)

```
Iteration 1: ████ Change A
Iteration 2: ████ Undo A, Change B
Iteration 3: ████ Undo B, Change A
Iteration 4: ████ Undo A, Change B
(pattern repeats)
```

**Indicates:**
- Conflicting requirements in prompt
- AI is uncertain about best approach
- Prompt needs refinement

**Solution:** Stop loop, clarify prompt, restart

## Performance Optimization

Loop speed depends on:

### 1. API Latency

**Claude API:** 2-5 seconds per iteration
**GPT-4:** 3-8 seconds per iteration
**Local Ollama:** 10-30 seconds per iteration

**Optimization:**
- Use faster models for simple tasks (GPT-3.5, Claude Haiku)
- Cache provider responses
- Parallelize independent changes

### 2. Code Size

**Small files (<100 lines):** Fast iterations
**Large files (1000+ lines):** Slower iterations

**Optimization:**
- Break large files into modules
- Use `--files` to limit scope
- Refactor in stages

### 3. Prompt Complexity

**Simple prompts:** AI responds quickly
**Complex prompts:** AI needs more processing

**Optimization:**
- Break complex prompts into stages
- Use templates for common patterns
- Keep prompts focused

## Monitoring the Loop

Wiggumizer provides real-time feedback:

```bash
$ wiggumize run

Wiggumizer v1.0.0
Provider: Claude (Sonnet 4.5)
Prompt: PROMPT.md
Max iterations: 20
Convergence: auto

Iteration 1/20 [██████████          ] 45%
  Modified: src/auth.js (+32, -18 lines)
  Modified: src/utils.js (+5, -2 lines)
  Time: 3.2s

Iteration 2/20 [████████████████    ] 78%
  Modified: src/auth.js (+8, -3 lines)
  Time: 2.8s

Iteration 3/20 [████████████████████] 100%
  No changes detected

Convergence detected after 3 iterations.
Total time: 9 seconds
Total cost: $0.04
```

### What to Watch

**Healthy loop:**
- Decreasing changes per iteration
- Progress toward prompt goals
- Eventually: no changes

**Unhealthy loop:**
- Same files changing repeatedly
- Oscillating between states
- No progress toward goals

## Advanced Loop Control

### Pause and Resume

```bash
# Pause after iteration completes
wiggumize run --pause-after 5

# Resume from iteration 5
wiggumize run --continue-from 5
```

### Conditional Termination

```yaml
# .wiggumizer.yml
convergence:
  max_iterations: 20
  stop_on_test_failure: true
  stop_on_syntax_error: true
  require_improvement: true  # Stop if no progress for 3 iterations
```

### Manual Intervention

```bash
# Interrupt with Ctrl+C
# Wiggumizer asks:
Loop interrupted at iteration 4.
What would you like to do?
1. Stop and keep changes
2. Stop and rollback to iteration 3
3. Edit prompt and continue
4. Resume loop
```

## Debugging Loops

### View Iteration Details

```bash
wiggumize log --iteration 3
```

Shows:
- Exact prompt sent to AI
- AI's full response
- Changes made
- Reasoning provided

### Replay Iterations

```bash
wiggumize replay --from 1 --to 5 --slow
```

Steps through iterations one by one, showing changes.

## Next Steps

- [Convergence Patterns](convergence-patterns.md) - Recognize when loops will converge
- [Writing Effective Prompts](../guides/best-practices/writing-effective-prompts.md) - Improve your prompts
- [Loop Termination](../guides/best-practices/loop-termination.md) - When to stop
- [Troubleshooting Non-Convergence](../troubleshooting/loop-not-converging.md) - Fix stuck loops

---

**Understanding the loop mechanics gives you the power to use it effectively.** The loop is simple, but the patterns it creates are rich and nuanced.
