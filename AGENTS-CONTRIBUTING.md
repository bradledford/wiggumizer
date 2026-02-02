# AGENTS-CONTRIBUTION.md
Guidance for AI agents contributing features requested via GitHub Issues.

## Mission
Turn a GitHub Issue (feature request) into a safe, well-scoped, tested change that matches project conventions and is easy for maintainers to review.

## Non-Negotiables (Policy & Safety)
1. **Follow repository rules first**
   - Obey `LICENSE`, `CONTRIBUTING.md`, code style guides, and CI requirements.
   - Do not introduce dependencies unless explicitly approved by maintainers or required by the issue.

2. **No secrets or credential handling**
   - Never add API keys, tokens, private URLs, or credentials to code, tests, docs, or examples.
   - If integration requires secrets, use environment variables and documented placeholders.

3. **Security by default**
   - Avoid unsafe patterns: command injection, path traversal, insecure deserialization, SSRF, weak crypto, etc.
   - Validate/encode inputs and use least privilege. Prefer safe standard libraries over custom parsing.

4. **Respect IP and licensing**
   - Do not paste large copyrighted code snippets from external sources.
   - Only use compatible, permissively licensed references when necessary, and cite in PR description if required.

5. **Be honest about uncertainty**
   - If requirements are ambiguous, propose a plan and ask for clarification in the issue/PR rather than guessing.
   - If you cannot run tests locally, say so and explain what you did to mitigate risk.

## Issue Intake Checklist
When you start work, capture the following in your working notes (or in a comment if appropriate):
- **Issue link + title**
- **Problem statement**: one paragraph in your own words
- **Intended users** and primary use case
- **Non-goals** (explicitly out of scope)
- **Acceptance criteria** (a checklist)
- **Compatibility constraints** (versions, platforms)
- **Security/privacy considerations**
- **Performance constraints** (if any)

If anything is missing, ask clarifying questions before coding:
- What should happen in edge cases?
- What is the expected API/UX behavior?
- Are there examples or mockups?
- Should this be behind a feature flag?
- What’s the migration story?

## Triage & Planning
### 1) Confirm scope
- Search the repo for existing similar functionality.
- Check for duplicates or related issues/PRs.
- Identify which modules/components are affected.

### 2) Propose an implementation plan (lightweight design)
Create a short plan (comment or PR description) including:
- Approach summary (2–5 bullets)
- Files/modules to change
- Data model/API changes
- Backward compatibility notes
- Test strategy
- Documentation updates required

Do not start large refactors unless explicitly asked.

## Implementation Standards
### Make changes small and reviewable
- Prefer incremental commits.
- Avoid formatting-only diffs unless required.

### Code quality expectations
- Follow existing patterns in the codebase.
- Add/extend types and documentation comments where the project uses them.
- Handle errors explicitly; do not swallow exceptions silently.
- Keep public APIs stable unless the issue explicitly requests a breaking change.

### Testing requirements
At minimum:
- Add tests that fail before your change and pass after.
- Cover:
  - Happy path
  - Boundary/edge cases
  - Error handling
  - Regression for any bug fixed along the way

If the repo has multiple test layers (unit/integration/e2e), pick the closest layer that validates behavior without being brittle.

### Documentation requirements
Update relevant docs when behavior changes:
- README / docs site pages
- Configuration reference
- Examples / sample code
- Changelog / release notes (if the repo uses them)

## Branch, Commit, and PR Conventions
### Branch name
Use: `feat/<short-issue-id>-<slug>` or follow repository convention.

### Commits
- Use clear messages (e.g., Conventional Commits if the repo uses them).
- Include the issue reference when appropriate.

### Pull Request must include
1. **Summary**: what changed and why (3–8 sentences)
2. **Issue linkage**: `Closes #123` (or `Refs #123` if partial)
3. **Acceptance criteria checklist**: copy from issue and tick completed items
4. **Testing evidence**:
   - Commands run and results (or CI links)
5. **Screenshots/GIFs** for UI changes
6. **Backward compatibility** notes
7. **Security considerations**: brief statement (even “N/A”)

## AI Agent Work Protocol (Step-by-Step)
1. **Read the issue carefully** and restate it as a concise spec.
2. **Scan the repo structure**:
   - Locate relevant modules, existing patterns, and test layout.
3. **Draft acceptance criteria** and confirm missing info:
   - If ambiguous, ask questions in the issue before coding.
4. **Draft a plan** and keep it scoped.
5. **Implement** with minimal, targeted changes.
6. **Add tests** and run the smallest relevant test suite.
7. **Update docs** and examples.
8. **Self-review**:
   - Remove dead code and debug logs
   - Ensure consistent formatting and naming
   - Confirm error paths and edge cases
9. **Prepare PR** using the PR requirements above.

## Definition of Done
A feature request is “done” when:
- Acceptance criteria are met
- Tests added/updated and passing in CI
- Docs updated
- No new lints/static analysis issues
- Backward compatibility is addressed (or breaking change documented)
- PR is easy to review (small diff, clear narrative)

## If You Get Stuck
- Prefer asking maintainers clarifying questions over making assumptions.
- Propose two options with tradeoffs, and default to the least risky/minimal change.
- If you suspect a security implication, flag it and recommend a maintainer review.

---
Maintainers: if you want agents to follow stricter rules (e.g., dependency bans, specific test commands, required templates), add them here and treat this file as the source of truth.
