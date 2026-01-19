## Chat Service Integration

Add the ability to connect Wiggumizer to external chat services using a provider model architecture. This allows Ralph Wiggum responses to be delivered through various messaging platforms.

### Provider Model Design

Implement a pluggable provider system where each chat service is a separate provider module. Providers should:

- Implement a common interface for sending/receiving messages
- Handle authentication and connection management specific to each service
- Support both sending Ralph responses and receiving user prompts

### Communication Triggers

Providers should send messages at these key points:

1. **Successful completion** - At the end of a successful `wiggumizer run` event, send a short summary of the work completed (e.g., files modified, iterations performed)

2. **Unexpected stoppage** - When iterations are interrupted unexpectedly, send a notification with the reason why (e.g., error encountered, rate limit hit, permission denied)

### Initial Providers (CLI-based, local execution)

Start with CLI-based chat systems that users can run locally (assuming they have the respective CLI tools installed):

1. **Slack Provider**
   - Use the Slack CLI (`slack`) for local workspace integration
   - Support posting to channels and responding to direct messages
   - Leverage Slack CLI's authentication flow

2. **WhatsApp Provider**
   - Use WhatsApp CLI tools (e.g., `whatsapp-cli` or similar)
   - Support sending messages to contacts and groups
   - Handle WhatsApp's authentication/QR code flow

### Usage

```bash
# Send a Ralph response to Slack
wiggumizer run --provider slack --channel "#general"

# Send a Ralph response via WhatsApp
wiggumizer run --provider whatsapp --contact "+1234567890"

# Interactive mode - listen and respond
wiggumizer listen --provider slack --channel "#random"
```

### Future Considerations

- Add API-based providers for hosted/cloud integrations
- Support Discord, Teams, Telegram, and other platforms
- Add message threading and conversation context

---

## Non-Git Repository Support: Iteration Journal

Add a fallback mechanism for projects that aren't Git repositories to maintain context between iterations. This ensures Wiggumizer can work in any project, not just those with version control.

### Problem Statement

Currently, Wiggumizer relies heavily on Git for context passing between iterations:
- **Git log** shows what was done in previous iterations (factual work history)
- **`.ralph-notes.md`** allows Claude to leave strategic insights (architectural decisions, learnings, blockers)
- Without Git, Claude has no factual memory of previous work
- `.ralph-notes.md` is mentioned in prompts but **not currently read back into context** (incomplete feature)

While Git is recommended (and users get a warning), Wiggumizer should gracefully support non-Git workflows.

### Context Architecture: Two Complementary Mechanisms

There are two distinct types of context that Claude needs between iterations:

**1. Factual Work History (Tactical Context)**
- **What**: Chronological log of iterations with files changed and summaries
- **Git repos**: Provided by `git log` (commit history)
- **Non-Git repos**: Currently missing - proposed iteration journal fills this gap
- **Purpose**: "What did I do?" - factual record of changes
- **Created by**: System automatically

**2. Strategic Insights (Strategic Context)**
- **What**: Claude's observations, architectural decisions, learnings, blockers
- **All repos**: Provided by `.ralph-notes.md` (Claude writes this during iterations)
- **Purpose**: "Why did I do it? What did I learn? What's next?"
- **Created by**: Claude during iterations (optional but valuable)

**Current State**:
- Git repos: ✅ Have factual history (git log), ❌ breadcrumbs not read
- Non-Git repos: ❌ No factual history, ❌ breadcrumbs not read

**Goal**: Both repo types should have both context mechanisms working.

### Proposed Solution: Iteration Journal

Implement a `.wiggumizer/iteration-journal.txt` file that mimics git log format but works without Git:

```
Iteration 5 - 2025-01-19 14:32:15
Files: src/auth.js, src/config.js
Summary: Added JWT token validation and updated config schema

Iteration 4 - 2025-01-19 14:28:03
Files: src/auth.js
Summary: Created authentication module with basic login function

Iteration 3 - 2025-01-19 14:23:47
Files: src/index.js
Summary: Fixed import statements and added error handling
```

### Design Principles

**1. Git-First Philosophy**
- Git is always preferred when available
- Journal is **only used as fallback** when Git isn't present
- Never create journal entries in Git repositories

**2. Unified Context Interface**
The iteration context should be identical regardless of source:
```javascript
// Both return same format:
getIterationContext() {
  if (GitHelper.isGitRepo()) {
    return this.getGitLog();  // "abc123 Iteration 5 - Added auth..."
  } else {
    return this.getJournalLog();  // "Iteration 5 - Added auth..."
  }
}
```

**3. Simple Append-Only Format**
- Plain text file (human-readable, debuggable)
- Append-only (never edit history)
- Same information density as git log
- Show last 10 entries by default (matching git log -10)

**4. Automatic Management**
- Created automatically on first run in non-Git repos
- Appended to after each iteration
- No user configuration required
- Kept in `.wiggumizer/` directory (already gitignored)

### Implementation Details

**File Location**: `.wiggumizer/iteration-journal.txt`

**Entry Format**:
```
Iteration N - YYYY-MM-DD HH:MM:SS
Files: file1.js, file2.js, file3.js
Summary: <what was done this iteration>
---
```

**Integration Points**:

1. **IterationJournal class** (`src/iteration-journal.js`):
   - `append(iteration, files, summary)` - Add entry after each iteration
   - `read(limit = 10)` - Get last N entries
   - `format()` - Convert to git-log-like string format

2. **RalphLoop integration** (`src/loop.js`):
   ```javascript
   getIterationHistory() {
     if (GitHelper.isGitRepo()) {
       return this.getGitLogForWorkspace();
     } else {
       return this.iterationJournal.read(10);
     }
   }
   ```

3. **Provider context building** (`src/providers/claude.js` and `claude-cli.js`):
   - Replace `context.gitLog` with `context.iterationHistory`
   - Format message identically: "Your Work History (previous iterations):"
   - Claude sees same context structure regardless of source

**Example Context Messages**:

With Git:
```
# Your Work History (git log):
You can see what you've done in previous iterations:

a3f5d12 Iteration 5 - Added JWT validation
b8e2c91 Iteration 4 - Created auth module
c1d7a44 Iteration 3 - Fixed imports
```

Without Git:
```
# Your Work History (previous iterations):
You can see what you've done in previous iterations:

Iteration 5 - 2025-01-19 14:32:15
Files: src/auth.js, src/config.js
Summary: Added JWT validation

Iteration 4 - 2025-01-19 14:28:03
Files: src/auth.js
Summary: Created auth module
```

### User Experience

**Warning on First Run** (non-Git repo):
```
⚠ Not a Git repository
→ Using iteration journal for context (.wiggumizer/iteration-journal.txt)
→ For best results, consider: git init
```

**No Action Required**:
- Journal automatically created
- Context passing works transparently
- Users can inspect `.wiggumizer/iteration-journal.txt` to see history

### Alternative Considered: Require Git

**Option**: Fail with error if Git isn't available
- Simpler implementation
- Enforces best practices
- Matches the "Ralph Philosophy" of git archaeology

**Rejected because**:
- Unnecessarily restrictive for prototyping/experimentation
- Some valid use cases (Jupyter notebooks, sandboxed environments, learning)
- Falls short of "works everywhere" goal
- Simple fallback provides better UX

### Migration Path

**Existing behavior** (already implemented):
1. Warning shown when Git not detected
2. Execution continues but with degraded context

**New behavior**:
1. Warning shown when Git not detected
2. Iteration journal automatically created
3. Context passing works via journal instead of git log
4. If user runs `git init` later, seamlessly switch to Git

**No breaking changes** - purely additive feature.

### Breadcrumbs (.ralph-notes.md) Implementation

**Current Issue**: The providers mention `.ralph-notes.md` in prompts and check `context.breadcrumbs`, but nothing actually reads the file and populates it.

**Required Changes**:

1. **WorkspaceManager**: Add breadcrumbs reading in `getCodebaseContext()`:
   ```javascript
   getCodebaseContext() {
     const context = {
       files: this.getRelevantFiles(),
       breadcrumbs: this.readBreadcrumbs(), // NEW
       // ... other context
     };
     return context;
   }

   readBreadcrumbs() {
     const breadcrumbsPath = path.join(this.cwd, '.wiggumizer', 'ralph-notes.md');
     if (fs.existsSync(breadcrumbsPath)) {
       return fs.readFileSync(breadcrumbsPath, 'utf-8');
     }
     return null;
   }
   ```

2. **File Location Change**: Move from `.ralph-notes.md` → `.wiggumizer/ralph-notes.md`
   - **Why**: Keeps project root clean, matches other wiggumizer files
   - **Migration**: Check both locations for backwards compatibility
   - **Priority**: Read from `.wiggumizer/ralph-notes.md` first, fall back to `.ralph-notes.md`

3. **Update Provider Prompts**: Change references from `.ralph-notes.md` → `.wiggumizer/ralph-notes.md`

**Benefits of Moving to `.wiggumizer/` Directory**:
- ✅ Keeps project root tidy (only PROMPT.md is user-facing)
- ✅ Groups all Wiggumizer state files together
- ✅ Easier to .gitignore (entire `.wiggumizer/` folder)
- ✅ Reduces confusion (clear separation: user files vs. system files)
- ✅ Consistent with iteration journal location

**User-Facing Files** (project root):
- `PROMPT.md` - The work plan (user controls this)

**System/State Files** (`.wiggumizer/` directory):
- `ralph-notes.md` - Claude's strategic notes
- `iteration-journal.txt` - Factual work history (non-Git repos)
- `iterations/` - Detailed iteration logs
- `config.yml` - Local configuration overrides

### Implementation Priority

**Phase 1: Iteration Journal** (solves non-Git context gap)
1. Create `IterationJournal` class
2. Integrate with `RalphLoop` to append after each iteration
3. Update providers to use unified context interface
4. Add warning message for non-Git repos

**Phase 2: Breadcrumbs Reading** (completes existing feature)
1. Add breadcrumbs reading in `WorkspaceManager`
2. Support both `.ralph-notes.md` and `.wiggumizer/ralph-notes.md` locations
3. Update provider prompts with new location
4. Add migration helper to move existing `.ralph-notes.md` files

**Phase 3: Polish**
1. Add `wiggumizer history` command to view iteration journal
2. Add `wiggumizer notes` command to view/edit ralph-notes.md
3. Support migrating journal → Git when running `git init`
4. Export capabilities for documentation

### Future Enhancements

Once basic journal support works:
- Allow manual journal editing for context adjustment
- Export journal to markdown for documentation
- Combine journal + breadcrumbs into unified timeline view
- Add search/filter capabilities across iteration history