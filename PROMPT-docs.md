# Generate COMPLETE CLI Command Documentation - NOT STUBS!

**CRITICAL**: You must generate FULL, COMPLETE documentation files with ALL sections filled out. DO NOT create stub files with empty sections! The previous attempts only generated 6-line stubs - this is UNACCEPTABLE.

Review the implementation in `bin/wiggumize.js` and `src/commands/*.js` to document what actually exists.

## Task

For EACH command, create COMPLETE documentation (200+ lines each) in `docs/cli-reference/commands/[command].md`:

1. **Check Implementation**: Read the actual command implementation to understand ALL options and behavior
2. **Generate FULL Content** - Each file MUST include (NOT empty sections!):
   - Synopsis section with COMPLETE command syntax showing all options
   - Description section explaining in detail what the command does (multiple paragraphs)
   - Options section documenting EVERY available flag with examples
   - Multiple Examples section showing 5+ common usage patterns
   - Related commands section
   - Notes/Tips section with best practices

## Commands to Document

Based on the implementation, create docs for:
- `run` - Already has docs at docs/cli-reference/commands/run.md (keep existing)
- `init` - Initialize .wiggumizer.yml config
- `doctor` - Diagnose configuration issues
- `logs` - View iteration logs
- `summary` - Show summary of last run
- `template` - Template management (if implemented)
- `multi` - Multi-repo commands (if implemented)

## Guidelines

- **Write COMPLETE files** - Each doc MUST be 200+ lines with all sections filled out
- **NO STUBS** - Every section must have real content, not just headers
- **Document what EXISTS** - Don't document features that aren't implemented
- **Be thorough** - Include 5+ examples per command showing different use cases
- **Match existing style** - Follow the detailed format used in docs/cli-reference/commands/run.md (which is 444 lines)
- If a command isn't fully implemented, still write complete docs noting limitations

## CRITICAL RULES

1. **ONLY generate docs/cli-reference/commands/*.md files** - DO NOT generate random files like src/api/users.js or test files
2. **Each file must be AT LEAST 200 lines** - Short stubs are failures
3. **All sections must have content** - No empty Synopsis or Options sections
4. **Include 5+ detailed examples** per command

## Output Format

**CRITICAL**: DO NOT use code blocks (```) inside the markdown content! Use indented blocks instead.

For each file:
```
## File: docs/cli-reference/commands/[command].md
\`\`\`markdown
# Command Title

Description here.

## Synopsis

    wiggumize command [options]    <-- Use 4-space indentation, NOT ```bash blocks!

## Options

### --option

Description.

    wiggumize command --option value    <-- Use indentation for examples!

[Continue with COMPLETE content - 200+ lines!]
\`\`\`
```

**CRITICAL RULE**: Inside markdown files, use 4-space indentation for code examples, NOT triple-backtick code blocks. The parser breaks on nested backticks!

Generate COMPLETE documentation - this is a documentation task, not a code refactoring task!
