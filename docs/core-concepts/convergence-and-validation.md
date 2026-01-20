# Convergence and Validation

This guide explains how Wiggumizer determines when work is complete and how validation ensures quality before convergence.

## How Convergence Works

Wiggumizer uses a **multi-layered convergence system** that goes beyond simple file quietness to determine if your work is actually complete.

### The Four Layers

Convergence is evaluated through four layers, in order of priority:

#### Layer 1: Goal Completion (PRIMARY)
**Question:** Are all PROMPT.md checkboxes complete?

If your PROMPT.md contains checkboxes like this:

```markdown
## Tasks
- [✅] Create user model
- [✅] Add authentication
- [ ] Implement drag-and-drop
- [ ] Write tests
```

The system will **NOT converge** if there are unchecked boxes, even if file changes have stopped. This prevents premature convergence when the AI is still planning or analyzing.

**This is the most important signal** - it keeps iterations running until your actual goals are met.

#### Layer 2: Validation (SECONDARY)
**Question:** Do tests pass? Does the build succeed?

Once all checkboxes are complete, Wiggumizer can optionally run validation commands:

```yaml
validation:
  runTests: true
  testCommand: "npm test"
  requireTestPass: true

  runBuild: true
  buildCommand: "npm run build"
  requireBuildSuccess: true
```

If validation is configured and fails, the loop continues iterating to fix the issues.

This ensures your work isn't just "done" but actually **functional**.

#### Layer 3: Oscillation Detection (SAFETY)
**Question:** Is the code flip-flopping between states?

The system tracks file content hashes across iterations. If it detects patterns like:
- State A → State B → State A → State B (alternating)
- State A → State B → State C → State A (cycling)

It will stop to prevent infinite loops, even if tasks remain incomplete.

#### Layer 4: Max Iterations (SAFETY)
**Question:** Have we hit the iteration limit?

The `maxIterations` setting (default: 20) acts as a safety ceiling. If reached:

**With incomplete tasks:**
```
⚠ Max iterations (20) reached with 3 task(s) incomplete
  Incomplete tasks:
    - Implement drag-and-drop
    - Write tests
    - Add error handling
```

**With validation failures:**
```
⚠ Max iterations reached - validation failed
  Validation results:
    ✗ Tests (2451ms)
    ✓ Build (1823ms)
```

This prevents runaway costs while clearly showing what's incomplete.

### Fallback Behavior

If no PROMPT.md exists or it has no checkboxes, Wiggumizer falls back to the legacy behavior:
- File quietness (2 consecutive iterations with no changes)
- File hash stability (3 iterations with identical file states)
- Diminishing changes (change rate decreasing to zero)

But **we strongly recommend using PROMPT.md checkboxes** for better control.

## Validation Framework

### Language-Agnostic Auto-Detection

Wiggumizer automatically detects your project type and appropriate test/build commands. No manual configuration needed!

**Supported languages and frameworks:**
- **Node.js**: npm, yarn, pnpm, bun
- **Python**: pytest, unittest
- **Java**: Maven, Gradle, Ant
- **Go**: go test, go build
- **Rust**: cargo test, cargo build
- **Ruby**: rake, rspec
- **PHP**: PHPUnit
- **.NET**: dotnet test, dotnet build
- **C/C++**: CMake, Make
- **Swift**: swift test, swift build
- **Kotlin**: Gradle, Maven
- **Elixir**: mix test, mix compile
- **Perl**: prove

### Basic Configuration

Enable validation in `.wiggumizer.yml`:

```yaml
validation:
  # Auto-detection is enabled by default
  autoDetect: true               # Detects project type and commands

  # Simply enable validation - commands are auto-detected
  runTests: true
  requireTestPass: true          # Must pass for convergence

  runBuild: true
  requireBuildSuccess: true      # Must succeed for convergence

  # Maximum time for validation commands (5 minutes)
  timeout: 300000
```

**Manual override (if needed):**
```yaml
validation:
  runTests: true
  testCommand: "pytest --verbose --cov"  # Override auto-detected command
```

### Custom Validation Checks

Add domain-specific validations:

```yaml
validation:
  customChecks:
    - name: "Type Check"
      command: "tsc --noEmit"
      required: true             # Fail convergence if this fails

    - name: "Lint"
      command: "npm run lint"
      required: false            # Warning only, doesn't block convergence

    - name: "Security Audit"
      command: "npm audit --audit-level=high"
      required: true
```

### Domain-Specific Examples

**Note:** With auto-detection enabled (default), test and build commands are automatically detected. You only need to enable validation and optionally add custom checks.

#### Node.js / TypeScript Web App (Auto-Detected)

```yaml
validation:
  autoDetect: true             # Detects: npm test, npm run build
  runTests: true
  runBuild: true

  customChecks:
    - name: "Type Check"
      command: "tsc --noEmit"
      required: true
    - name: "E2E Tests"
      command: "npm run test:e2e"
      required: false
```

#### Python Project (Auto-Detected)

```yaml
validation:
  autoDetect: true             # Detects: pytest or unittest
  runTests: true

  customChecks:
    - name: "Type Check"
      command: "mypy src/"
      required: true
    - name: "Lint"
      command: "ruff check src/"
      required: true
```

#### Rust Project (Auto-Detected)

```yaml
validation:
  autoDetect: true             # Detects: cargo test, cargo build
  runTests: true
  runBuild: true

  customChecks:
    - name: "Clippy"
      command: "cargo clippy -- -D warnings"
      required: true
    - name: "Format Check"
      command: "cargo fmt --check"
      required: false
```

#### Go Project (Auto-Detected)

```yaml
validation:
  autoDetect: true             # Detects: go test ./..., go build ./...
  runTests: true
  runBuild: true

  customChecks:
    - name: "Vet"
      command: "go vet ./..."
      required: true
    - name: "Static Check"
      command: "staticcheck ./..."
      required: true
```

#### Java Maven Project (Auto-Detected)

```yaml
validation:
  autoDetect: true             # Detects: mvn test, mvn package
  runTests: true
  runBuild: true

  customChecks:
    - name: "CheckStyle"
      command: "mvn checkstyle:check"
      required: true
```

#### Embedded C/C++ (Manual Configuration)

```yaml
validation:
  runTests: true
  testCommand: "make test"     # Override auto-detection if needed
  requireTestPass: true

  customChecks:
    - name: "Static Analysis"
      command: "cppcheck --error-exitcode=1 src/"
      required: true
    - name: "MISRA Compliance"
      command: "misra-check src/"
      required: true
    - name: "Memory Safety"
      command: "valgrind --error-exitcode=1 ./bin/test"
      required: true
```

## Best Practices

### 1. Always Use PROMPT.md Checkboxes

**Good:**
```markdown
# Implement User Authentication

## Tasks
- [ ] Create User model with email/password
- [ ] Add JWT token generation
- [ ] Implement login endpoint
- [ ] Add authentication middleware
- [ ] Write unit tests for auth flow
```

**Bad:**
```markdown
# Implement User Authentication

Just do it!
```

The checkboxes give Wiggumizer clear goals to track.

### 2. Enable Validation for Quality Assurance

Don't rely on file quietness alone:

```yaml
validation:
  runTests: true
  testCommand: "npm test"
  requireTestPass: true
```

This ensures code actually works, not just that changes have stopped.

### 3. Set Realistic maxIterations

Based on project complexity:

**Small features:** 10-15 iterations
```yaml
maxIterations: 15
```

**Complex features:** 20-30 iterations
```yaml
maxIterations: 30
```

**Large refactors:** 40-50 iterations
```yaml
maxIterations: 50
```

### 4. Use Optional Checks for Nice-to-Haves

```yaml
validation:
  customChecks:
    - name: "Core Tests"
      command: "npm test"
      required: true          # Must pass

    - name: "Integration Tests"
      command: "npm run test:integration"
      required: false         # Warning only
```

This allows convergence even if optional checks fail, while still surfacing issues.

### 5. Monitor Progress in Verbose Mode

```bash
wiggumize run --verbose
```

Shows:
- Checkbox completion progress
- Convergence confidence scores
- Validation results in real-time

## Troubleshooting

### Problem: Converging Too Early

**Symptoms:** Work stops before checkboxes are complete

**Cause:** No PROMPT.md or no checkboxes

**Solution:** Add checkboxes to PROMPT.md
```markdown
## Tasks
- [ ] Your
- [ ] Specific
- [ ] Tasks
```

### Problem: Never Converging

**Symptoms:** Hits maxIterations every time

**Possible Causes:**
1. **Tasks too vague** - Make checkboxes more specific
2. **Oscillation** - AI flip-flopping between solutions
3. **Tests always failing** - Check if tests are actually achievable

**Solutions:**
- Break down large tasks into smaller ones
- Review oscillation warnings in output
- Temporarily set `requireTestPass: false` to debug

### Problem: Validation Taking Too Long

**Symptoms:** Long wait times during convergence checks

**Solutions:**
1. Increase timeout:
```yaml
validation:
  timeout: 600000  # 10 minutes
```

2. Run lighter checks during iteration:
```yaml
validation:
  testCommand: "npm test -- --maxWorkers=2"  # Faster with fewer workers
```

3. Make certain checks optional:
```yaml
validation:
  customChecks:
    - name: "Quick Unit Tests"
      command: "npm test -- --testPathPattern=unit"
      required: true
    - name: "Slow Integration Tests"
      command: "npm test -- --testPathPattern=integration"
      required: false  # Run but don't block convergence
```

## Migration from Old Behavior

### Removed: convergenceThreshold

Previous versions had a `convergenceThreshold` config option that was never actually used in calculations. It has been removed.

**Old config:**
```yaml
convergenceThreshold: 0.02  # This did nothing!
```

**No migration needed** - simply remove this line. The new system provides better convergence detection through the multi-layered approach.

### Backward Compatibility

Projects without PROMPT.md checkboxes continue to work using the legacy file-quietness detection. But we recommend adding checkboxes for better control:

```markdown
# PROMPT.md

## Current Task
Refactor authentication system

## Checklist
- [ ] Extract auth logic to service
- [ ] Add unit tests
- [ ] Update documentation
```

## See Also

- [How the Loop Works](./how-the-loop-works.md) - Core iteration mechanics
- [Cross-Session Workflows](../guides/cross-session-workflows.md) - Managing long-running projects
- [Ralph Philosophy](./ralph-philosophy.md) - The principles behind Wiggumizer
