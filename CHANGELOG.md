# Changelog

All notable changes to Wiggumizer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.2] - 2026-01-16

### CRITICAL FIX
- **BREAKING BUG FIXED**: Switched from full-file replacement to diff-based editing
- Previously, Claude would return incomplete files due to token limits, causing permanent data loss
- Now uses unified diff format (standard patch format) that only modifies changed lines
- **This prevents catastrophic deletion of code** - the previous version could silently delete functions/exports

### Added
- New `DiffApplier` module for parsing and applying unified diffs
- Comprehensive test suite for diff-based editing (8 tests, all passing)
- Line numbers added to file context sent to Claude for accurate diff generation

### Changed
- System prompt updated to request diffs instead of complete file contents
- WorkspaceManager now uses diff applier instead of direct file writes
- Loop simplified to delegate to diff applier
- Removed unused FileValidator import

### Technical Details
- Diffs are language/format agnostic (no code parsing required)
- Context-aware patching with fuzzy matching
- Automatic rollback on errors
- No Git dependency required

**UPGRADE IMMEDIATELY**: Version 0.3.1 and earlier have a critical data loss bug. Do not use them.

## [0.3.1] - 2024-01-14 [DEPRECATED - DATA LOSS BUG]

### Added
- Comprehensive CLI command documentation
- Documentation for `init`, `doctor`, `logs`, `summary`, and `template` commands
- Multi-repository workflow documentation

### Fixed
- Documentation improvements and clarifications
- CLI reference completeness

## [0.3.0] - 2024-01-XX

### Added
- Multi-repository support (`workspaces` configuration)
- `wiggumize multi status`, `multi run`, and `multi validate` commands
- Session summary generation with commit messages and PR descriptions
- JIRA integration via PROMPT.md metadata
- Watch mode for PROMPT.md changes (`--watch`)
- Continue mode to resume interrupted sessions (`--continue`)

### Changed
- Improved convergence detection with confidence scoring
- Enhanced file selection with priority scoring
- Better error handling with circuit breaker pattern

## [0.2.0] - 2024-01-XX

### Added
- Convergence detection (oscillation, diminishing changes, file hash stability)
- Error handling with retry and exponential backoff
- Rate limiting for API calls
- Progress tracking with iteration logs
- PROMPT.md checkbox auto-updates (`- [ ]` → `- [✅]`)

### Changed
- Improved file selection algorithm
- Better context management

## [0.1.0] - 2024-01-XX

### Added
- Initial release
- Core Ralph loop implementation
- Basic iteration management
- Claude (Anthropic) provider support
- Configuration via `.wiggumizer.yml`
- PROMPT.md-based task management
- `.gitignore` respect
- Dry run mode
- Basic CLI commands (`init`, `run`)

---

## Release Notes

For detailed session-specific changes from `wiggumize run`, see `SESSION-SUMMARY.md` (auto-generated after each run).

For implementation status of planned features, see [docs/ROADMAP.md](docs/ROADMAP.md).
