# Wiggumizer Roadmap

> **Transparency Note**: This document clearly distinguishes between what's implemented and what's planned. We believe in honest documentation.

## Current Version: v0.3.1

Released: January 2025

---

## ✅ Implemented Features

These features are fully functional and tested:

### Core Loop
- **Ralph iteration loop** - Full implementation with Claude Opus 4.5
- **Smart file selection** - .gitignore respect, glob patterns, priority-based selection
- **Convergence detection** - Hash comparison, oscillation detection, confidence scoring
- **Error handling** - Retry with exponential backoff, circuit breaker, rate limiting
- **Configuration system** - .wiggumizer.yml with layered config (defaults < user < project < CLI)
- **Iteration logging** - Full session tracking with JSON logs

### CLI Commands
| Command | Status | Description |
|---------|--------|-------------|
| `wiggumize run` | ✅ Implemented | Run a Ralph loop |
| `wiggumize init` | ✅ Implemented | Initialize configuration |
| `wiggumize logs` | ✅ Implemented | View iteration logs |
| `wiggumize summary` | ✅ Implemented | Generate CHANGELOG |
| `wiggumize doctor` | ✅ Implemented | Diagnose installation |
| `wiggumize template` | ⚠️ Partial | Lists templates, management coming soon |

### Run Command Options
| Option | Status | Description |
|--------|--------|-------------|
| `--prompt <file>` | ✅ Implemented | Specify prompt file |
| `--provider <name>` | ✅ Implemented | AI provider selection |
| `--max-iterations <num>` | ✅ Implemented | Set iteration limit |
| `--verbose` | ✅ Implemented | Verbose output |
| `--dry-run` | ✅ Implemented | Preview without changes |
| `--auto-commit` | ✅ Implemented | Auto-commit each iteration |

### Safety Features
- **File validation** - Syntax checking before write (JSON, YAML, JS)
- **Automatic rollback** - Revert on validation failure
- **Git integration** - Dirty repo warnings, backup commits
- **Context limits** - Configurable max file size and count

### Configuration
- **Project config** - .wiggumizer.yml in project root
- **User config** - ~/.wiggumizer.yml for global defaults
- **Environment variables** - ANTHROPIC_API_KEY, WIGGUMIZER_PROVIDER

### Progress Tracking
- **PROMPT.md task tracking** - Automatic checkbox updates based on work completed
- **Session summaries** - CHANGELOG.md generation after runs

---

## 🚧 In Progress (v0.4)

Features currently being developed:

### High Priority
- [ ] **Fix file-selector priority bug** - .js should rank higher than .md
- [ ] **Documentation audit** - Mark unimplemented features clearly
- [ ] **Config tests** - Complete test coverage for config.js

### Medium Priority
- [ ] **--watch mode** - Auto-restart on PROMPT.md changes
- [ ] **--files <glob> option** - Filter files from CLI
- [ ] **--convergence-threshold option** - Override threshold from CLI
- [ ] **--quiet mode** - Less verbose output

---

## 📋 Planned (v0.5+)

### Multi-Repository Support
The WorkspaceManager exists but needs CLI integration:
- [ ] `wiggumize multi status` - Show workspace status
- [ ] `wiggumize multi run` - Run across multiple repos
- [ ] Workspace-specific configuration

### Template System
Basic templates exist, full management planned:
- [ ] `wiggumize template list` - List available templates
- [ ] `wiggumize template show <name>` - Display template content
- [ ] `wiggumize template create` - Create custom templates
- [ ] Variable interpolation: `{{project_name}}`, `{{date}}`, etc.

### Provider Support
- [x] **Claude** - Fully implemented
- [ ] **OpenAI** - GPT-4, GPT-3.5 support
- [ ] **Ollama** - Local model support
- [ ] **Provider fallback** - Automatic failover

### CLI Enhancements
- [ ] `--continue` - Resume from previous session
- [ ] `--json` - JSON output for scripting
- [ ] `--debug` - Detailed debugging output
- [ ] Interactive `init` - Guided configuration

### Monitoring
- [ ] Estimated time remaining
- [ ] Token usage tracking
- [ ] Session dashboard with stats

---

## 🔮 Future Ideas (Backlog)

These are ideas being considered but not yet committed:

- **IDE integrations** - VS Code extension, JetBrains plugin
- **Web dashboard** - Browser-based session monitoring
- **Team features** - Shared templates, usage analytics
- **Custom providers** - Plugin system for AI backends
- **Streaming output** - Real-time response display
- **Parallel workspaces** - Run multiple repos simultaneously

---

## Documentation Status

### Implemented & Documented
- [x] README.md - Project overview
- [x] Quick start guide basics
- [x] Configuration file format

### Needs Documentation
- [ ] `--auto-commit` flag details
- [ ] Convergence analyzer behavior
- [ ] PROMPT.md progress tracking
- [ ] Rate limiting configuration
- [ ] Error handling and retry logic

### Documentation Gaps
Some documentation was written aspirationally and describes features not yet implemented. We're actively marking these sections as "Coming Soon" or removing them.

---

## Version History

### v0.3.1 (Current)
- Added automatic PROMPT.md progress tracking
- Improved convergence detection
- Enhanced error handling with circuit breaker

### v0.3.0
- Multi-repository workspace support (internal)
- Advanced convergence analyzer
- Rate limiting and retry logic

### v0.2.0
- Iteration logging and session management
- CHANGELOG generation
- Git integration

### v0.1.0
- Initial release
- Basic Ralph loop
- Claude provider

---

## Contributing

Want to help? Check out:
1. Issues labeled `good first issue`
2. The "In Progress" section above
3. Documentation gaps

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

---

## Feedback

Have ideas for the roadmap? Open an issue or discussion on GitHub!
