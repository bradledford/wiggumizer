# Cross-Session Workflows

This guide explains how to use Wiggumizer across multiple work sessions, days apart, or weeks apart.

## The Core Question

**Q: Should I keep running with the same PROMPT.md after days/weeks, or update it?**

**A: Update PROMPT.md manually between sessions.** It's your steering wheel - you control where the AI focuses.

## Understanding Session Continuity

Wiggumizer is designed around the "Pure Ralph Philosophy" where the AI discovers its own history rather than being told what happened.

### How the AI Discovers Context

When you run `wiggumize run`, the AI examines:

1. **Current PROMPT.md** - Your instructions and goals
2. **Git history** - `git log` shows what changed and when
3. **`.ralph-notes.md`** - Notes the AI left for itself in previous iterations
4. **SESSION-SUMMARY.md** - Summary of last run's work
5. **Current code state** - The actual files as they exist now

This means the AI can pick up where it left off **even if you don't tell it what happened**.

## Three Workflow Patterns

### 1. Quick Fix Session (5-20 minutes)

**Scenario:** Fix a bug, add a small feature, make a quick improvement.

```bash
# Create focused prompt
echo "Add input validation to the login form" > PROMPT.md

# Run until done
wiggumize run --max-iterations 10

# Review and commit
git diff
git commit -am "Add login form validation"
```

**Characteristics:**
- Single session
- Focused goal
- Usually converges quickly (5-15 iterations)
- One commit at the end

### 2. Feature Development (1-3 hours, single session)

**Scenario:** Implement a complete feature with multiple parts.

```bash
# Create comprehensive prompt
cat > PROMPT.md << 'EOF'
# Implement User Profile Page

## Requirements
1. Create ProfilePage component with user info display
2. Add edit mode with form validation
3. Integrate with /api/users/:id endpoint
4. Add loading states and error handling
5. Write component tests

## Constraints
- Use existing Button and Input components
- Follow current styling patterns
- Maintain TypeScript strict mode
EOF

# Run with higher iteration limit
wiggumize run --max-iterations 30

# It will converge when feature is complete
# Review changes, test manually, commit
```

**Characteristics:**
- Single extended session
- Complex, multi-part goal
- May run 15-30 iterations
- One comprehensive commit at the end

### 3. Project Evolution (Multiple sessions, days/weeks apart)

**Scenario:** Large refactoring or feature that takes multiple sessions.

#### Session 1: Initial Work
```bash
# Day 1, 10:00 AM
cat > PROMPT.md << 'EOF'
# Phase 1: Authentication Refactoring

## Goal
Convert authentication from sessions to JWT tokens.

## Work Plan
- [ ] Create JWT utility functions
- [ ] Update login endpoint to issue tokens
- [ ] Add token validation middleware
- [ ] Update tests
EOF

wiggumize run
# Runs for 20 iterations, converges

# Review what was done
cat SESSION-SUMMARY.md
cat .ralph-notes.md  # AI's notes about what it learned

# Commit phase 1
git add .
git commit -m "Phase 1: JWT authentication basics"
```

#### Session 2: Next Phase (3 days later)
```bash
# Day 4, 2:00 PM
# MANUALLY UPDATE PROMPT.md with new goals
cat > PROMPT.md << 'EOF'
# Phase 2: Add OAuth Providers

## Context
JWT authentication is now working (see previous commits).

## Next Steps
- [ ] Add OAuth provider abstraction
- [ ] Implement Google OAuth flow
- [ ] Implement GitHub OAuth flow
- [ ] Update user model to support OAuth
- [ ] Add provider-specific tests

## Constraints
- Maintain backward compatibility with JWT login
- Use existing token generation
EOF

wiggumize run
# AI reads git history, sees JWT work is done
# Focuses on OAuth implementation
```

**Characteristics:**
- Multiple sessions with gaps
- Phased approach
- **You manually update PROMPT.md** between sessions
- Git commits separate each phase
- AI discovers previous work via git/notes

## Best Practices for Cross-Session Work

### 1. Review Before Resuming

Before starting a new session, review:

```bash
# What was done last time?
git log --oneline -10

# What did the AI learn?
cat .ralph-notes.md

# What was the last summary?
cat SESSION-SUMMARY.md

# What was converged?
ls -lt .wiggumizer/iterations/
```

### 2. Update PROMPT.md Deliberately

**Good approach:**
```markdown
# Phase 2: Add Feature X

## Context
Phase 1 (JWT auth) is complete. See commit abc123.

## Current Focus
- [ ] Build on JWT to add OAuth
- [ ] Support Google and GitHub
- [ ] Maintain backward compatibility
```

**Bad approach:**
```markdown
# Do everything!

Fix all bugs, add all features, refactor everything!
```

Keep prompts **focused** and **phased**.

### 3. Use Checkboxes for Sub-Tasks

**Important:** Wiggumizer automatically modifies your PROMPT.md file to update checkbox status as work completes.

When you write checkboxes in PROMPT.md like this:
```markdown
## Work Plan
- [ ] Create ProfilePage component
- [ ] Add form validation
- [ ] Write tests
```

Wiggumizer will **automatically edit PROMPT.md** after each iteration, changing it to:
```markdown
## Work Plan
- [✅] Create ProfilePage component  ← Auto-updated in PROMPT.md
- [✅] Add form validation           ← Auto-updated in PROMPT.md
- [ ] Write tests                    ← Still pending
```

**How it works:**
- After each iteration, Wiggumizer analyzes which files were modified
- It matches file paths and keywords to checkbox tasks
- It updates `- [ ]` to `- [✅]` directly in your PROMPT.md file
- The file is saved back to disk automatically

**This means:**
- ✅ You get visual progress tracking automatically
- ✅ PROMPT.md shows current status when you come back days later
- ✋ But you still control the task list (adding/removing tasks)
- ✋ And you still control the overall goals and direction

### 4. Let the AI Use .ralph-notes.md

Don't delete `.ralph-notes.md` - it's how the AI talks to itself across iterations:

```markdown
# Ralph Notes

## Iteration 5 Insights
- The ProfileForm validation is more complex than expected
- Added custom email validator to handle edge cases
- Next iteration should focus on avatar upload

## Technical Decisions
- Using FormData for file uploads (better browser support)
- Validating on both client and server side
```

The AI reads this in the next iteration and builds on its own insights.

## Common Questions

### Q: How long should I wait between sessions?

**A:** There's no limit. Days, weeks, or months work fine. The AI discovers context from git history.

### Q: What if I made manual changes between sessions?

**A:** Perfect! The AI will see your changes in the current code state and incorporate them.

### Q: Should I delete .ralph-notes.md between sessions?

**A:** No. It helps continuity. Only delete if you're starting a completely unrelated task.

### Q: Can I run multiple different prompts in parallel (different branches)?

**A:** Yes! Each git branch can have its own PROMPT.md and .ralph-notes.md.

```bash
# Branch 1: Feature work
git checkout -b feature/oauth
echo "Add OAuth" > PROMPT.md
wiggumize run

# Branch 2: Bug fixes (later)
git checkout -b fix/validation
echo "Fix validation bugs" > PROMPT.md
wiggumize run
```

### Q: What if the AI ignores previous work and starts over?

This usually means the PROMPT.md is too broad or contradicts what's done. Solutions:

1. **Be more specific** about what's next:
   ```markdown
   # Next: Add OAuth (JWT already works)
   ```

2. **Reference previous commits**:
   ```markdown
   # Build on JWT auth from commit abc123
   ```

3. **Check .ralph-notes.md** to see if the AI left insights you should incorporate

## Example: Week-Long Feature Development

Real example of building a notification system over a week:

### Monday
```bash
echo "Phase 1: Basic notification storage and API" > PROMPT.md
wiggumize run
git commit -m "Notification database and API"
```

### Wednesday
```bash
vim PROMPT.md  # Update to "Phase 2: Email notifications"
wiggumize run
git commit -m "Email notification delivery"
```

### Friday
```bash
vim PROMPT.md  # Update to "Phase 3: In-app notification UI"
wiggumize run
git commit -m "In-app notification components"
```

### Next Monday
```bash
vim PROMPT.md  # Update to "Phase 4: Push notifications"
wiggumize run
git commit -m "Push notification support"
```

Each session builds on the previous work through:
- Git history (AI reads commits)
- .ralph-notes.md (AI's running notes)
- Current code state (AI sees what exists)
- Your updated PROMPT.md (AI knows next goal)

## Summary

**Golden Rule:** Treat PROMPT.md as your steering wheel. Update it between sessions to direct the AI's focus.

**Remember:**
- ✅ **Auto-updates (Wiggumizer modifies these files):**
  - **PROMPT.md checkboxes** - `- [ ]` becomes `- [✅]` as tasks complete
  - **.ralph-notes.md** - AI leaves breadcrumb notes for itself
  - **SESSION-SUMMARY.md** - Summary of last run (commit messages, PR templates)
- ✋ **Manual control (You edit these):**
  - **PROMPT.md core content** - Goals, instructions, new tasks
  - **What to work on next** - You decide direction between sessions
  - **When to run vs. commit** - You control the workflow
- 🔍 **AI discovers:** Previous work via git history
- 🎯 **You decide:** What to work on next

**Key insight:** PROMPT.md is a **living document** - checkboxes update automatically, but you control the content and direction.

The AI is your co-pilot, but you're the pilot.
