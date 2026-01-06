# Multi-Repo Orchestration

Run Ralph loops across multiple repositories simultaneously with Wiggumizer.

## Overview

Multi-repo orchestration lets you:
- Refactor multiple services at once
- Coordinate changes across your stack
- Ensure consistency across repositories
- Save time on large-scale updates

## Quick Start

```bash
# Initialize multi-repo workspace
wiggumize multi init

# Define repositories in workspace.yml
# Run across all repos
wiggumize multi run --prompt modernize.md
```

## Use Cases

### Microservices Refactoring

Update authentication across 5 services simultaneously:

```bash
wiggumize multi run \
  --repos "auth-api,user-api,payment-api,notification-api,gateway" \
  --prompt "Update to new auth library v3.0"
```

### Monorepo Updates

Apply TypeScript migration across packages:

```bash
wiggumize multi run \
  --workspace monorepo \
  --prompt "Migrate to TypeScript strict mode"
```

### Cross-Team Coordination

Standardize error handling across team repositories:

```bash
wiggumize multi run \
  --repos "$(cat team-repos.txt)" \
  --prompt "Standardize error handling pattern"
```

## Configuration

**workspace.yml:**

```yaml
name: my-microservices
repos:
  - name: auth-api
    path: ./services/auth
    prompt: prompts/auth-refactor.md

  - name: user-api
    path: ./services/user
    prompt: prompts/user-refactor.md

  - name: gateway
    path: ./services/gateway
    prompt: prompts/gateway-refactor.md
    dependencies:
      - auth-api
      - user-api

execution:
  strategy: parallel  # or sequential
  max_parallel: 3
```

## Execution Strategies

### Parallel Execution

Run all repos simultaneously:

```bash
wiggumize multi run --parallel
```

Best for: Independent changes, fast completion

[Parallel execution guide →](parallel-execution.md)

### Sequential Execution

Run repos one after another:

```bash
wiggumize multi run --sequential
```

Best for: Dependent changes, debugging

### Dependency-Based

Respect dependencies, parallelize when possible:

```bash
wiggumize multi run --dependency-order
```

Best for: Complex systems with dependencies

[Dependency ordering guide →](dependency-ordering.md)

## Monitoring

### Real-Time Status

```bash
wiggumize multi status
```

Shows:
- Which repos are running
- Current iteration per repo
- Convergence status
- Errors or warnings

### Logs

```bash
# All repos
wiggumize multi logs

# Specific repo
wiggumize multi logs --repo auth-api

# Follow mode
wiggumize multi logs --follow
```

## Documentation

- **[Configuration](configuration.md)** - Workspace setup
- **[Parallel Execution](parallel-execution.md)** - Running in parallel
- **[Dependency Ordering](dependency-ordering.md)** - Coordinating repos
- **[State Management](state-management.md)** - Managing state across repos
- **[Monitoring](monitoring.md)** - Tracking progress
- **[Case Studies](case-studies/README.md)** - Real-world examples

## Case Studies

- [Microservices](case-studies/microservices.md) - 10-service refactor
- [Monorepo](case-studies/monorepo.md) - TypeScript migration
- [Cross-Team](case-studies/cross-team.md) - Organization-wide update

## Next Steps

1. [Set up your workspace](configuration.md)
2. [Choose execution strategy](parallel-execution.md)
3. [Run your first multi-repo loop](configuration.md#running)

---

Multi-repo orchestration unlocks Ralph at scale.
