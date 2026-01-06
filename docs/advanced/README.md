# Advanced Topics

Advanced Wiggumizer usage for power users.

## CI/CD Integration

Automate Ralph loops in your CI/CD pipeline:

- **[CI/CD Integration](ci-cd-integration.md)** - GitHub Actions, GitLab CI
- [GitHub Actions example](ci-cd-integration.md#github-actions)
- [GitLab CI example](ci-cd-integration.md#gitlab-ci)

## Customization

- **[Hooks and Callbacks](hooks-and-callbacks.md)** - Customize loop behavior
- **[Plugins](plugins.md)** - Extend Wiggumizer
- **[Custom Loop Logic](custom-loop-logic.md)** - Advanced loop control

## Automation

- **[Scripting](scripting.md)** - Script Wiggumizer workflows
- **[Performance Tuning](performance-tuning.md)** - Optimize speed and cost

## Internals

- **[How Wiggumizer Works](internals.md)** - Architecture deep dive

## Quick Links

```bash
# Run in CI/CD
wiggumize run --non-interactive --max-iterations 10

# Custom hooks
wiggumize run --hook pre-iteration=./check.sh

# Scripting
wiggumize run --json-output > results.json
```

## For Contributors

- [Internals](internals.md) - How Wiggumizer works
- [Contributing](../community/contributing.md) - Contribute code

## Next Steps

Choose your advanced topic:
- **Automate?** [CI/CD Integration](ci-cd-integration.md)
- **Customize?** [Hooks and Callbacks](hooks-and-callbacks.md)
- **Understand internals?** [How Wiggumizer Works](internals.md)
