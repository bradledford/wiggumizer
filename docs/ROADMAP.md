# Wiggumizer Roadmap

> **Last Updated:** v0.3.1  
> This document shows the actual implementation status of Wiggumizer features.

## Legend

| Status | Meaning |
|--------|---------|
| ✅ | Fully implemented and tested |
| 🚧 | Partially implemented |
| 📋 | Planned (not yet started) |
| ❌ | Not planned / Removed |

---

## Core Features

### Loop Execution
| Feature | Status | Notes |
|---------|--------|-------|
| Basic Ralph loop | ✅ | `wiggumize run` |
| Max iterations limit | ✅ | `--max-iterations` or config |
| Dry run mode | ✅ | `--dry-run` |
| Verbose output | ✅ | `--verbose` |
| Quiet mode | ✅ | `--quiet` |
| Watch mode | ✅ | `--watch` - auto-restart on PROMPT.md changes |
| Continue from session | ✅ | `--continue` |
| Custom file patterns | ✅ | `--files` |
| Convergence threshold | ✅ | `--convergence-threshold` |
| Auto-commit | ✅ | `--auto-commit` |

### Convergence Detection
| Feature | Status | Notes |
|---------|--------|-------|
| No-changes detection | ✅ | Stops when no files modified |
| File hash stability | ✅ | Detects when files stop changing |
| Oscillation detection | ✅ | Detects flip-flopping between states |
| Diminishing changes | ✅ | Detects changes trending to zero |
| Confidence scoring | ✅ | 0-1 confidence in convergence |

### File Selection
| Feature | Status | Notes |
|---------|--------|-------|
| Glob pattern matching | ✅ | Via micromatch |
| .gitignore respect | ✅ | Automatic |
| Priority scoring | ✅ | Source code > docs |
| Context size limits | ✅ | Configurable max size |
| File count limits | ✅ | Configurable max files |

### Error Handling
| Feature | Status | Notes |
|---------|--------|-------|
| Retry with backoff | ✅ | Exponential backoff |
| Circuit breaker | ✅ | Opens after repeated failures |
| Rate limiting | ✅ | Per-minute and per-hour limits |
| Error classification | ✅ | Retryable vs non-retryable |

### Progress Tracking
| Feature | Status | Notes |
|---------|--------|-------|
| PROMPT.md checkbox updates | ✅ | Auto-marks completed tasks |
| Iteration logging | ✅ | JSON logs per iteration |
| Session summaries | ✅ | SESSION-SUMMARY.md at end of run |
| Session summary generation | ✅ | Auto-generated with commit/PR templates |

---

## CLI Commands

| Command | Status | Notes |
|---------|--------|-------|
| `wiggumize run` | ✅ | Core loop execution |
| `wiggumize init` | ✅ | Initialize project |
| `wiggumize template list` | ✅ | List available templates |
| `wiggumize template show <name>` | ✅ | Display template content |
| `wiggumize logs` | ✅ | View session logs |
| `wiggumize summary` | ✅ | Regenerate SESSION-SUMMARY.md |
| `wiggumize doctor` | ✅ | Diagnose setup issues |
| `wiggumize multi status` | 📋 | Show workspace status |
| `wiggumize multi run` | 📋 | Run across workspaces |
| `wiggumize template create` | 📋 | Create custom template |
| `wiggumize template edit` | 📋 | Edit template |
| `wiggumize template delete` | 📋 | Delete template |

---

## AI Providers

| Provider | Status | Notes |
|----------|--------|-------|
| Claude (Anthropic) | ✅ | Default provider, claude-opus-4-5-20251101 |
| OpenAI (GPT-4/GPT-3.5) | 📋 | Planned |
| Sourcegraph Amp | 📋 | Planned |
| Ollama (local models) | 📋 | Planned |
| Provider fallback/rotation | 📋 | Planned |

---

## Configuration

### Implemented Config Options

