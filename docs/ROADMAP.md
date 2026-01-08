# Wiggumizer Roadmap

> Transparency about what's implemented vs. what's planned

Last updated: 2024

## Status Legend

| Status | Meaning |
|--------|---------|
| ✅ Implemented | Feature is complete and tested |
| 🚧 In Progress | Currently being developed |
| 📋 Planned | On the roadmap, not yet started |
| 💡 Proposed | Under consideration |

---

## Core Features

### Loop Execution
| Feature | Status | Notes |
|---------|--------|-------|
| Basic Ralph loop | ✅ Implemented | `wiggumize run` |
| Iteration logging | ✅ Implemented | Stored in `.wiggumizer/iterations/` |
| Convergence detection | ✅ Implemented | Multiple detection strategies |
| Dry run mode | ✅ Implemented | `--dry-run` flag |
| Auto-commit | ✅ Implemented | `--auto-commit` flag |
| Verbose output | ✅ Implemented | `--verbose` flag |
| Work plan tracking | ✅ Implemented | Auto-updates PROMPT.md checkboxes |

### File Selection
| Feature | Status | Notes |
|---------|--------|-------|
| .gitignore support | ✅ Implemented | Automatic |
| Glob patterns | ✅ Implemented | Via config |
| File prioritization | ✅ Implemented | Smart ordering |
| Context size limits | ✅ Implemented | Configurable |

### Configuration
| Feature | Status | Notes |
|---------|--------|-------|
| YAML config file | ✅ Implemented | `.wiggumizer.yml` |
| User config | ✅ Implemented | `~/.wiggumizer.yml` |
| Environment variables | ✅ Implemented | `ANTHROPIC_API_KEY`, etc. |
| CLI option overrides | ✅ Implemented | CLI takes precedence |

### Error Handling
| Feature | Status | Notes |
|---------|--------|-------|
| Retry with backoff | ✅ Implemented | Configurable |
| Circuit breaker | ✅ Implemented | Auto-recovery |
| Rate limiting | ✅ Implemented | Per-minute/hour limits |
| File validation | ✅ Implemented | Syntax checking |
| Rollback on error | ✅ Implemented | Automatic |

### Git Integration
| Feature | Status | Notes |
|---------|--------|-------|
| Dirty repo warnings | ✅ Implemented | Before loop starts |
| Auto-commit per iteration | ✅ Implemented | Optional |
| Rollback support | ✅ Implemented | On validation failure |

---

## CLI Commands

### Implemented Commands

| Command | Status | Description |
|---------|--------|-------------|
| `wiggumize run` | ✅ Implemented | Run the Ralph loop |
| `wiggumize init` | ✅ Implemented | Initialize configuration |
| `wiggumize logs` | ✅ Implemented | View iteration logs |
| `wiggumize summary` | ✅ Implemented | Generate CHANGELOG |
| `wiggumize doctor` | ✅ Implemented | Diagnose issues |
| `wiggumize template` | 🚧 In Progress | Shows "coming soon" |

### Planned Commands

| Command | Status | Description |
|---------|--------|-------------|
| `wiggumize multi status` | 📋 Planned | Multi-repo workspace status |
| `wiggumize multi run` | 📋 Planned | Run across workspaces |
| `wiggumize config` | 💡 Proposed | View/edit configuration |
| `wiggumize validate` | 💡 Proposed | Validate prompt file |

---

## Run Command Options

### Implemented Options

| Option | Status | Description |
|--------|--------|-------------|
| `-p, --prompt <file>` | ✅ Implemented | Prompt file path |
| `-P, --provider <name>` | ✅ Implemented | AI provider |
| `-m, --max-iterations <num>` | ✅ Implemented | Max iterations |
| `-v, --verbose` | ✅ Implemented | Verbose output |
| `--dry-run` | ✅ Implemented | Preview changes |
| `--auto-commit` | ✅ Implemented | Auto-commit each iteration |

### Planned Options

| Option | Status | Description |
|--------|--------|-------------|
| `--watch` | 📋 Planned | Auto-restart on PROMPT.md changes |
| `--files <glob>` | 📋 Planned | Filter files to include |
| `--convergence-threshold <num>` | 📋 Planned | Override convergence threshold |
| `--continue` | 📋 Planned | Resume from previous session |
| `--quiet` | 📋 Planned | Less verbose output |
| `--json` | 💡 Proposed | JSON output for scripts |
| `--debug` | 💡 Proposed | Debug output |

---

## AI Providers

| Provider | Status | Notes |
|----------|--------|-------|
| Claude (Anthropic) | ✅ Implemented | Default provider, Claude Opus 4.5 |
| OpenAI (GPT-4) | 📋 Planned | Next priority |
| Ollama (Local) | 💡 Proposed | Local model support |
| Sourcegraph Amp | 💡 Proposed | Original Ralph tool |

---

## Multi-Repository Support

| Feature | Status | Notes |
|---------|--------|-------|
| WorkspaceManager class | ✅ Implemented | Core functionality exists |
| Workspace configuration | ✅ Implemented | In `.wiggumizer.yml` |
| CLI commands (`multi`) | 📋 Planned | Needs CLI integration |
| Cross-repo context | 🚧 In Progress | Basic support exists |

---

## Template System

| Feature | Status | Notes |
|---------|--------|-------|
| Built-in templates | ✅ Implemented | refactor, bugfix, feature, etc. |
| Template selection on init | ✅ Implemented | `--template <name>` |
| Template listing | ✅ Implemented | Shown during init |
| Custom template creation | 📋 Planned | Template management commands |
| Variable interpolation | 📋 Planned | `{{project_name}}`, etc. |
| Template registry | 💡 Proposed | Community templates |

---

## Documentation Status

### Existing Docs
- README.md - ✅ Accurate
- CHANGELOG.md - ✅ Auto-generated

### Needs Update
- docs/cli-reference/commands/run.md - ⚠️ Lists unimplemented options
- docs/ai-providers/* - ⚠️ Lists unimplemented providers

### Planned Docs
- docs/cli-reference/configuration-file.md
- docs/troubleshooting/loop-not-converging.md
- docs/troubleshooting/provider-errors.md
- docs/getting-started/troubleshooting-setup.md

---

## Version History

### v0.3.1 (Current)
- ✅ Automatic PROMPT.md progress tracking
- ✅ Enhanced convergence detection
- ✅ Session logging and summaries

### v0.4.0 (Next)
- 📋 Documentation accuracy improvements
- 📋 Additional run command options
- 📋 OpenAI provider support

### v0.5.0 (Future)
- 💡 Multi-repo CLI commands
- 💡 Template management
- 💡 Watch mode

---

## Contributing

Want to help implement planned features? See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

Priority areas for contribution:
1. OpenAI provider implementation
2. Additional run command options
3. Template management commands
4. Documentation improvements
