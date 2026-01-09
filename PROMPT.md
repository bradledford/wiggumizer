# Wiggumizer v0.4+ - Documentation Reality Check & Feature Completion

You are refining Wiggumizer. A comprehensive docs analysis revealed **significant gaps** between documentation and implementation. Focus on **closing critical gaps** and **removing misleading documentation**.

## Current State (v0.3.1)

**Implemented Features:**
- ✅ Full iteration loop with Claude Opus 4.5
- ✅ Smart file selection (.gitignore, glob patterns, prioritization)
- ✅ Advanced convergence detection (oscillation, hashing, confidence)
- ✅ Error handling (retry, backoff, circuit breaker, rate limiting)
- ✅ Configuration system (.wiggumizer.yml)
- ✅ Iteration logging and session tracking
- ✅ Git integration (warnings, auto-commit)
- ✅ File validation and safety (syntax checking, rollback)
- ✅ Multi-repository workspace support (WorkspaceManager exists)
- ✅ Automatic PROMPT.md progress tracking

## Critical Issues Found

### 📚 Docs Reference Missing Features
The documentation extensively describes features that **don't exist**:
- 8+ CLI commands documented but not implemented
- 15+ `run` command options documented but missing
- Template management system documented (8 commands) but returns "coming soon"
- Multi-repo commands (`wiggumize multi`) documented but don't exist
- 100+ documentation files referenced but missing

## Work Plan

### Phase 1: Critical Fixes (Stop Breaking User Experience)

#### A. Fix Misleading CLI Documentation
- [ ] Audit docs/cli-reference/ and mark unimplemented features as "Coming Soon"
- [ ] Clearly mark (with "Coming Soon" or "Not Yet Implemented" badges) any unimplemented `run` command options in docs/cli-reference/commands/run.md - DO NOT remove documentation, only add status markers
- [ ] Add "Status: Not Yet Implemented" badges to aspirational docs
- [ ] Create docs/ROADMAP.md showing what's planned vs implemented

#### B. Implement High-Value Missing Options
- [x] Add `--watch` mode to `run` command (auto-restart on PROMPT.md changes)
- [x] Add `--files <glob>` option to `run` command (filter which files to include)
- [x] Add `--convergence-threshold <num>` option to `run` command
- [x] Add `--continue` option to resume from previous session
- [x] Add `--quiet` mode for less verbose output

#### C. Fix Template Command
- [x] Either implement basic template management OR remove command and clarify it's coming later
- [x] If implementing: `template list` and `template show <name>` (read-only operations first)
- [ ] Add template variable interpolation: `{{project_name}}`, `{{author}}`, `{{date}}`

### Phase 2: Complete Existing Features

#### A. Multi-Repo Commands (WorkspaceManager exists, needs CLI)
- [ ] Implement `wiggumize multi status` - show workspace status
- [ ] Implement `wiggumize multi run` - run across workspaces
- [ ] Update docs/multi-repo/README.md with actual command syntax

#### B. Testing & Quality
- [x] Test convergence-analyzer.js
- [x] Test error-handler.js
- [x] Test prompt-updater.js
- [x] Test file-selector.js (31/32 tests pass - fix priority bug)
- [✅] Test config.js (config loading and merging)
- [ ] Test workspace-manager.js (multi-repo support)
- [ ] Add integration test for full loop execution

#### C. Fix file-selector.js Priority Bug
- [x] Fix failing test: `.js` files should have higher priority than `.md` files
- [x] Verify prioritization logic matches documented behavior
- [x] Ensure PROMPT.md still gets highest priority

### Phase 3: Documentation Cleanup

#### A. Create Missing Critical Docs
- [ ] docs/cli-reference/configuration-file.md - Document actual config options
- [ ] docs/getting-started/troubleshooting-setup.md - Help users debug setup
- [ ] docs/troubleshooting/loop-not-converging.md - Help when convergence fails
- [ ] docs/troubleshooting/provider-errors.md - Debug API issues
- [ ] docs/appendices/faq.md - Answer common questions

#### B. Fix Broken References
- [ ] Audit all docs for broken internal links
- [ ] Replace references to missing files with "Coming Soon" or alternative links
- [ ] Update guides/README.md to remove references to non-existent guides

#### C. Document Undocumented Features
- [ ] Document `--auto-commit` flag in run.md
- [ ] Document actual config options (context.maxSize, retry.*, rateLimit.*)
- [ ] Document `wiggumize doctor` command
- [ ] Document convergence analyzer behavior
- [ ] Document PROMPT.md progress tracking feature (NEW in v0.3.1!)

### Phase 4: Provider Support

#### A. OpenAI Provider
- [ ] Create src/providers/openai.js (GPT-4, GPT-3.5 support)
- [ ] Add OpenAI to provider selection in cli.js
- [ ] Update docs/ai-providers/openai/setup.md

#### B. Provider Documentation
- [ ] Clearly mark which providers are implemented vs planned
- [ ] Update ai-providers/README.md with realistic status
- [ ] Add provider fallback/rotation if primary fails

### Phase 5: Nice-to-Have Enhancements

#### A. CLI Improvements
- [ ] Make `wiggumize init` interactive (ask questions vs require flags)
- [ ] Add `--json` output mode for programmatic use
- [ ] Add `--debug` flag for troubleshooting

#### B. Monitoring & Observability
- [ ] Show estimated time remaining based on average iteration time
- [ ] Display token usage per iteration (if available from provider)
- [ ] Add summary dashboard at loop completion with stats

#### C. Template System (Full Implementation)
- [ ] Template variable interpolation with helpers ({{uppercase}}, {{lowercase}})
- [ ] Built-in variables ({{timestamp}}, {{git_branch}}, {{wiggumizer_version}})
- [ ] Template management commands (create, edit, delete)

## Implementation Strategy

**Priority Order:**
1. **Fix Misleading Docs First** - Don't promise what doesn't exist
2. **Implement High-Value Options** - --watch, --files, --convergence-threshold
3. **Complete Existing Features** - Multi-repo CLI, test coverage
4. **Provider Support** - OpenAI at minimum
5. **Polish** - Better error messages, documentation

**Principles:**
- One improvement per iteration
- Test as you build
- Update docs to match reality, not aspirations
- Mark "Coming Soon" features clearly
- Focus on user-facing value

## Current Focus

**Start here (highest impact):**

1. ~~**Fix file-selector.js priority bug**~~ ✅ Fixed with tier-based system
2. **Audit docs/cli-reference/commands/run.md** - Mark unimplemented options clearly
3. ~~**Implement --watch mode**~~ ✅ Already implemented in commands/run.js
4. **Document --auto-commit** - Exists but undocumented
5. **Create docs/ROADMAP.md** - Show users what's real vs planned

---

## Phase 6: Ralph-Inspired Enhancements

**Goal**: Emulate key features from the [snarktank/ralph](https://github.com/snarktank/ralph) implementation to improve autonomous iteration quality and persistence.

### A. PRD-Based Workflow (Story Mode)
Ralph uses structured `prd.json` files to track individual user stories with completion status. This complements Wiggumizer's PROMPT.md approach.

- [ ] Create `src/prd-manager.js` - Parse and manage PRD files
- [ ] Support `prd.json` format with user stories:
  ```json
  {
    "userStories": [
      {
        "id": "US-001",
        "title": "Add dark mode toggle",
        "description": "...",
        "priority": 1,
        "passes": false,
        "acceptanceCriteria": ["tests pass", "UI renders"]
      }
    ]
  }
  ```
- [ ] Add `--prd <file>` option to `run` command (use PRD mode instead of PROMPT.md)
- [ ] Implement story selection logic: pick highest priority where `passes: false`
- [ ] Add `wiggumize prd init` command - Convert PROMPT.md checkboxes to prd.json
- [ ] Add `wiggumize prd status` command - Show completion status of all stories
- [ ] Update PRD status after each iteration (mark `passes: true` on success)

### B. Learning Persistence (`progress.txt`)
Ralph maintains an append-only log capturing learnings between iterations, providing memory across fresh contexts.

- [ ] Create `src/progress-logger.js` - Manage iteration learning log
- [ ] Generate `progress.txt` file in project root (or `.wiggumizer/progress.txt`)
- [ ] After each iteration, append:
  - Iteration number and timestamp
  - Story/task worked on
  - Changes made (files modified)
  - Tests/checks passed or failed
  - Key learnings or gotchas discovered
- [ ] Include `progress.txt` in context for next iteration (as reference)
- [ ] Add `--progress-file <path>` option to customize location
- [ ] Add `wiggumize progress show` command - Display recent learnings
- [ ] Archive old progress files when starting new sessions

### C. Codebase Pattern Documentation (`AGENTS.md`)
Ralph updates `AGENTS.md` files with discovered patterns, conventions, and gotchas to benefit future iterations.

- [ ] Create `src/agents-updater.js` - Manage pattern documentation
- [ ] Detect or create `AGENTS.md` files in relevant directories
- [ ] After successful iterations, prompt AI to update AGENTS.md with:
  - Architectural patterns discovered
  - Code conventions in this area
  - Common gotchas or pitfalls
  - Testing approaches that work
- [ ] Include relevant AGENTS.md files in iteration context
- [ ] Add `--update-agents` flag to enable/disable this feature
- [ ] Add section markers: `## Patterns`, `## Conventions`, `## Gotchas`, `## Testing`

### D. Quality Gates & Verification
Ralph enforces quality checks (type-checking, tests) before marking tasks complete.

- [ ] Create `src/quality-checker.js` - Run configurable quality gates
- [ ] Support quality check definitions in `.wiggumizer.yml`:
  ```yaml
  qualityGates:
    - name: "Type Check"
      command: "npm run typecheck"
      required: true
    - name: "Unit Tests"
      command: "npm test"
      required: true
    - name: "Lint"
      command: "npm run lint"
      required: false
  ```
- [ ] Run quality gates after each iteration
- [ ] Only mark task complete if required gates pass
- [ ] Report gate results in progress.txt and iteration logs
- [ ] Add `--skip-quality-gates` flag for development/debugging
- [ ] Add `--quality-gate <name>` to run specific gate only

### E. Fresh Context Mode (Ralph's Core Innovation)
Ralph spawns fresh AI instances per iteration to prevent context degradation. Adapt this for Wiggumizer.

- [ ] Add `--fresh-context` mode to `run` command
- [ ] In fresh context mode:
  - Limit context to: PROMPT.md (or current story), progress.txt, AGENTS.md, selected files
  - Don't include full conversation history from previous iterations
  - Each iteration starts with clean slate + memory files
- [ ] Implement context handoff mechanism:
  - Save iteration summary to progress.txt
  - Update PRD status
  - Commit changes
  - Next iteration reads memory files but not full chat history
- [ ] Add `context.fresh` config option to enable by default
- [ ] Balance between fresh context (prevents bloat) and continuity (maintains understanding)

### F. Session Archival
Ralph archives previous runs with timestamps for debugging and reference.

- [ ] Create `src/session-archiver.js` - Archive completed sessions
- [ ] On new session start, archive previous session:
  - Move `.wiggumizer/logs/*` to `.wiggumizer/archive/<timestamp>/`
  - Archive progress.txt as `progress-<timestamp>.txt`
  - Keep git history intact
- [ ] Add `--archive-previous` flag (default: true)
- [ ] Add `wiggumize sessions list` command - Show archived sessions
- [ ] Add `wiggumize sessions restore <timestamp>` - Restore archived session
- [ ] Limit archive retention (config: `archive.maxSessions`, default: 10)

### G. Single-Task Focus Mode
Ralph focuses on one user story per iteration. Add similar capability to Wiggumizer.

- [ ] Add `--single-task` mode to `run` command
- [ ] In single-task mode:
  - Parse PROMPT.md for checkboxes or load from prd.json
  - Select ONE task (highest priority uncompleted)
  - Focus iteration only on that task
  - Mark complete and commit only if task passes quality gates
  - Move to next task in subsequent iteration
- [ ] Integrate with PRD workflow (single story mode)
- [ ] Add `--task-id <id>` to work on specific task
- [ ] Report focused task clearly in iteration output

### H. Browser/UI Verification (Future)
Ralph includes browser verification for UI components. Plan for integration.

- [ ] Research integration with Playwright or Puppeteer
- [ ] Add `qualityGates` entry for visual regression testing
- [ ] Support screenshot comparison for UI changes
- [ ] Document in Phase 5 (Nice-to-Have)

## Implementation Priority: Ralph Features

**High Priority (Implement Soon):**
1. **PRD-Based Workflow** - Structured task tracking superior to PROMPT.md checkboxes
2. **Learning Persistence** - progress.txt provides memory across iterations
3. **Quality Gates** - Ensure iterations produce working code
4. **Session Archival** - Essential for debugging and rollback

**Medium Priority (After Core Features):**
5. **AGENTS.md Pattern Documentation** - Builds institutional knowledge
6. **Single-Task Focus Mode** - Complements existing convergence mode
7. **Fresh Context Mode** - Prevents context bloat (needs careful design)

**Low Priority (Future):**
8. **Browser/UI Verification** - Nice to have, requires additional dependencies

## Integration Strategy

Ralph's approach complements Wiggumizer rather than replacing it:
- **Ralph**: Single story, fresh context, quality gates, structured PRD
- **Wiggumizer**: Multi-file convergence, intelligent file selection, retry logic

**Hybrid approach:**
- Add `--mode <convergence|story>` option
  - `convergence` mode (default): Current Wiggumizer behavior
  - `story` mode: Ralph-style PRD-based workflow
- Let users choose based on use case:
  - Convergence mode: Refactoring, bug fixes, iterative improvements
  - Story mode: Feature development, PRD execution, structured tasks

## Meta-Notes

The docs were written aspirationally (describing the vision) rather than accurately (describing reality). This is **dangerous** - users will be frustrated when promised features don't work.

**Two paths forward:**
1. **Conservative**: Remove/mark aspirational docs as "Coming Soon"
2. **Aggressive**: Implement the most critical missing features

**Recommendation**: Do both - fix docs NOW, implement features over time.

**Ralph Integration**: Ralph's approach to autonomous iteration offers valuable patterns:
- Memory persistence without context bloat (progress.txt + AGENTS.md)
- Quality gates prevent error accumulation
- Fresh contexts prevent degradation
- PRD structure provides clear completion criteria

Let's make Wiggumizer's documentation match its reality AND incorporate Ralph's best practices! 🎯
