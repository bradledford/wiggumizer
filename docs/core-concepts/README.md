# Core Concepts

Understand the principles and mechanics behind Ralph-style iterative development with Wiggumizer.

## Essential Reading

- **[Ralph Philosophy](ralph-philosophy.md)** - The "why" behind the technique
- **[How the Loop Works](how-the-loop-works.md)** - Technical mechanics
- **[Faith in Eventual Consistency](faith-in-eventual-consistency.md)** - The mindset shift
- **[Convergence Patterns](convergence-patterns.md)** - Recognizing when code converges

## Quick Overview

Ralph coding is based on three core principles:

1. **Deterministic Imperfection** - Code doesn't need to be perfect on the first iteration
2. **Eventual Consistency** - Quality emerges through systematic iteration
3. **AI as a Learnable Skill** - Your prompts improve with practice

## The Loop

At its heart, Ralph is an infinite loop:

```bash
while :; do
  cat PROMPT.md | ai-tool
done
```

Each iteration:
1. Reads your prompt
2. Examines current code
3. Makes improvements
4. Repeats until convergence

## Key Concepts

### Convergence
Code reaches a stable state where further iterations make no changes. This indicates the code matches your prompt's requirements.

### Iteration
A single pass through the loop. Early iterations make large changes, later iterations refine details.

### Prompt-Driven Development
Your prompt describes the desired outcome. The loop iteratively transforms code to match that description.

### State Accumulation
Each iteration builds on the previous one. Changes accumulate until code fully satisfies the prompt.

## Learning Path

1. Start with [Ralph Philosophy](ralph-philosophy.md) to understand the mindset
2. Read [How the Loop Works](how-the-loop-works.md) for technical details
3. Explore [Convergence Patterns](convergence-patterns.md) to recognize successful loops
4. Study [Faith in Eventual Consistency](faith-in-eventual-consistency.md) for the mental model

## Next Steps

After understanding core concepts:
- [Writing Effective Prompts](../guides/best-practices/writing-effective-prompts.md)
- [CLI Reference](../cli-reference/README.md)
- [Practical Examples](../guides/examples/README.md)
