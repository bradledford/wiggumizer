# CLI Reference

Complete command-line interface reference for Wiggumizer.

## Quick Reference

| Command | Description |
|---------|-------------|
| [`wiggumize run`](commands/run.md) | Run a Ralph loop |
| [`wiggumize init`](commands/init.md) | Initialize configuration |
| [`wiggumize template`](commands/template.md) | Manage prompt templates |
| [`wiggumize provider`](commands/provider.md) | Configure AI providers |
| [`wiggumize multi`](commands/multi.md) | Multi-repo orchestration |
| [`wiggumize doctor`](commands/wiggumize.md#doctor) | Verify installation |
| [`wiggumize version`](commands/version.md) | Show version |

## Common Commands

### Run a Loop

```bash
wiggumize run
wiggumize run --prompt refactor.md
wiggumize run --provider openai --max-iterations 10
```

[Full run command reference](commands/run.md)

### Initialize Project

```bash
wiggumize init
wiggumize init --provider claude
```

[Full init command reference](commands/init.md)

### Manage Templates

```bash
wiggumize template list
wiggumize template show refactor
wiggumize template create my-template
```

[Full template command reference](commands/template.md)

## Global Options

Available on all commands:

```bash
--help, -h          Show help
--version, -v       Show version
--config <file>     Use specific config file
--no-color          Disable colored output
--quiet, -q         Minimal output
--verbose           Detailed output
```

## Configuration

- [Configuration File Reference](configuration-file.md) - `.wiggumizer.yml`
- [Environment Variables](environment-variables.md) - Environment config
- [Exit Codes](exit-codes.md) - Command exit codes

## Complete Command List

### Core Commands
- [run](commands/run.md) - Run a Ralph loop (most important)
- [init](commands/init.md) - Initialize configuration
- [wiggumize](commands/wiggumize.md) - Main command and doctor

### Template Management
- [template](commands/template.md) - Manage prompt templates
  - `template list` - List available templates
  - `template show <name>` - Show template contents
  - `template create <name>` - Create new template
  - `template edit <name>` - Edit template
  - `template delete <name>` - Delete template

### Provider Management
- [provider](commands/provider.md) - Configure AI providers
  - `provider list` - List available providers
  - `provider set <name>` - Set default provider
  - `provider test` - Test provider connection

### Multi-Repo
- [multi](commands/multi.md) - Multi-repo orchestration
  - `multi run` - Run across multiple repos
  - `multi init` - Initialize multi-repo workspace
  - `multi status` - Check status of all repos

### Utilities
- [version](commands/version.md) - Show version information
- [doctor](commands/wiggumize.md#doctor) - Diagnose installation issues

## Next Steps

- [Getting Started](../getting-started/README.md) - If you're new
- [Examples](../guides/examples/README.md) - Real-world usage
- [Configuration Guide](configuration-file.md) - Customize behavior
