# Wiggumizer Roadmap

> **Last Updated**: v0.3.1  
> This document shows the actual implementation status of Wiggumizer features.

## Legend

| Status | Meaning |
|--------|---------|
| ✅ Implemented | Feature is complete and tested |
| 🔨 In Progress | Feature is partially implemented |
| 📋 Planned | Feature is designed but not yet started |
| 💡 Proposed | Feature is under consideration |

---

## Core Features

### Ralph Loop Engine ✅ Implemented

The core iteration loop that sends code to AI and applies changes.

| Feature | Status | Notes |
|---------|--------|-------|
| Basic iteration loop | ✅ Implemented | `wiggumize run` |
| Convergence detection | ✅ Implemented | Hash-based + oscillation detection |
| File selection | ✅ Implemented | .gitignore aware, priority-based |
| Iteration logging | ✅ Implemented | `.wiggumizer/logs/` |
| Session tracking | ✅ Implemented | Resume with `--continue` |
| PROMPT.md progress tracking | ✅ Implemented | Auto-updates checkboxes |

### CLI Commands

| Command | Status | Notes |
|---------|--------|-------|
| `wiggumize run` | ✅ Implemented | Core loop execution |
| `wiggumize init` | ✅ Implemented | Project initialization |
| `wiggumize doctor` | ✅ Implemented | Diagnose setup issues |
| `wiggumize logs` | ✅ Implemented | View iteration logs |
| `wiggumize summary` | ✅ Implemented | Generate CHANGELOG |
| `wiggumize template list` | ✅ Implemented | List available templates |
| `wiggumize template show` | ✅ Implemented | View template content |
| `wiggumize multi status` | ✅ Implemented | Multi-repo workspace status |
| `wiggumize multi run` | ✅ Implemented | Run across workspaces |
| `wiggumize multi validate` | ✅ Implemented | Validate workspace config |

### `run` Command Options

| Option | Status | Notes |
|--------|--------|-------|
| `--prompt <file>` | ✅ Implemented | Custom prompt file |
| `--provider <name>` | ✅ Implemented | AI provider (claude only) |
| `--max-iterations <num>` | ✅ Implemented | Iteration limit |
| `--verbose` | ✅ Implemented | Detailed output |
| `--quiet` | ✅ Implemented | Minimal output |
| `--dry-run` | ✅ Implemented | Preview without changes |
| `--auto-commit` | ✅ Implemented | Git commit per iteration |
| `--watch` | ✅ Implemented | Auto-restart on PROMPT.md change |
| `--files <patterns>` | ✅ Implemented | Filter included files |
| `--convergence-threshold` | ✅ Implemented | Tune convergence sensitivity |
| `--continue` | ✅ Implemented | Resume previous session |
| `--json` | 📋 Planned | JSON output for scripting |
| `--debug` | 📋 Planned | Debug logging |
| `--prd <file>` | 📋 Planned | PRD-based workflow |
| `--fresh-context` | 📋 Planned | Fresh context per iteration |
| `--single-task` | 📋 Planned | Focus on one task |

### AI Providers

| Provider | Status | Notes |
|----------|--------|-------|
| Claude (Anthropic) | ✅ Implemented | claude-opus-4-5-20251101 |
| OpenAI GPT-4 | 📋 Planned | Not yet implemented |
| OpenAI GPT-3.5 | 📋 Planned | Not yet implemented |
| Local LLMs | 💡 Proposed | Ollama integration |

### Configuration

| Feature | Status | Notes |
|---------|--------|-------|
| `.wiggumizer.yml` | ✅ Implemented | Project config |
| `~/.wiggumizer.yml` | ✅ Implemented | User config |
| Environment variables | ✅ Implemented | `ANTHROPIC_API_KEY`, etc. |
| Workspace definitions | ✅ Implemented | Multi-repo support |
| File patterns | ✅ Implemented | Include/exclude globs |
| Context limits | ✅ Implemented | `maxSize`, `maxFiles` |
| Retry settings | ✅ Implemented | `maxRetries`, delays |
| Rate limiting | ✅ Implemented | Per-minute/hour limits |

### Safety & Reliability

| Feature | Status | Notes |
|---------|--------|-------|
| Syntax validation | ✅ Implemented | JS/JSON/YAML validation |
| Automatic rollback | ✅ Implemented | On validation failure |
| Git integration | ✅ Implemented | Dirty repo warnings |
| Auto-commit | ✅ Implemented | `--auto-commit` flag |
| Circuit breaker | ✅ Implemented | API failure protection |
| Exponential backoff | ✅ Implemented | Retry with backoff |

---

## Planned Features (Phase 2+)

### Template System Enhancements 📋 Planned

- [ ] Template variable interpolation (`{{project_name}}`, `{{date}}`)
- [ ] Built-in variables (`{{timestamp}}`, `{{git_branch}}`)
- [ ] Template create/edit/delete commands

### Quality Gates 📋 Planned

- [ ] Configurable quality checks in `.wiggumizer.yml`
- [ ] Run tests/linters after each iteration
- [ ] Block completion if gates fail
- [ ] `--skip-quality-gates` flag

### PRD-Based Workflow 📋 Planned

- [ ] `prd.json` support for structured task tracking
- [ ] `wiggumize prd init` - Convert PROMPT.md to PRD
- [ ] `wiggumize prd status` - Show story completion
- [ ] Story-based iteration mode

### Learning Persistence 📋 Planned

- [ ] `progress.txt` append-only learning log
- [ ] Include learnings in context
- [ ] `wiggumize progress show` command

### Session Management 📋 Planned

- [ ] `wiggumize sessions list` - View past sessions
- [ ] `wiggumize sessions restore` - Restore archived session
- [ ] Automatic session archival

### Additional Providers 📋 Planned

- [ ] OpenAI provider (GPT-4, GPT-3.5)
- [ ] Provider fallback/rotation
- [ ] Token usage tracking

---

## Documentation Status

### Implemented & Documented ✅

- Basic usage guide
- Configuration options (partial)
- Template system (basic)

### Needs Documentation 🔨

- `--auto-commit` flag behavior
- Convergence analyzer details
- PROMPT.md progress tracking
- Multi-repo workspace setup
- Troubleshooting guides

### Not Yet Created 📋

- `docs/cli-reference/configuration-file.md`
- `docs/troubleshooting/loop-not-converging.md`
- `docs/troubleshooting/provider-errors.md`
- `docs/appendices/faq.md`

---

## Version History

### v0.3.1 (Current)

- ✅ PROMPT.md automatic progress tracking
- ✅ `--watch` mode for auto-restart
- ✅ `--files` option for file filtering
- ✅ `--continue` to resume sessions
- ✅ `--quiet` mode
- ✅ Multi-repo CLI commands (`multi status`, `multi run`, `multi validate`)
- ✅ Tier-based file prioritization
- ✅ Template list/show commands

### v0.3.0

- ✅ Advanced convergence detection (oscillation, hashing)
- ✅ Error handling with retry and circuit breaker
- ✅ Rate limiting
- ✅ Iteration logging and session tracking
- ✅ File validation and rollback
- ✅ WorkspaceManager for multi-repo support

### v0.2.0

- ✅ Configuration system (`.wiggumizer.yml`)
- ✅ Git integration (warnings, auto-commit)
- ✅ Smart file selection with .gitignore

### v0.1.0

- ✅ Basic Ralph loop with Claude
- ✅ Simple convergence detection
- ✅ CLI structure

---

## Contributing

Want to help implement a planned feature? Check the issues on GitHub or pick something from the "Planned" sections above.

**Priority areas:**
1. OpenAI provider implementation
2. Quality gates system
3. Documentation improvements
4. Test coverage expansion

---

## Feedback

Found a bug? Have a feature request? Open an issue on GitHub.

**Note**: This roadmap reflects actual implementation status. If you find discrepancies between documentation and reality, please report them so we can fix the docs.
