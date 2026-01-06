# Template Syntax

Wiggumizer prompt templates use a simple yet powerful syntax for creating reusable, configurable prompts.

## Basic Structure

Templates are Markdown files with variable interpolation:

```markdown
# {{title}}

{{description}}

## Files
{{#each files}}
- {{this}}
{{/each}}

## Requirements
{{requirements}}
```

## Variables

### Simple Variables

Use `{{variable}}` to insert values:

```markdown
Refactor {{filename}} to use {{pattern}}.
```

Usage:

```bash
wiggumize run --template refactor \
  --var filename=auth.js \
  --var pattern="async/await"
```

### Default Values

Provide defaults with `{{variable:default}}`:

```markdown
Use {{style:ES6+}} syntax.
Max iterations: {{max_iterations:20}}
```

### Required Variables

Mark as required with `{{!variable}}`:

```markdown
Refactor file {{!filename}} in directory {{!directory}}.
```

Wiggumizer will error if required variables aren't provided.

## Conditionals

### If/Else

```markdown
{{#if add_tests}}
Include comprehensive unit tests.
{{/if}}

{{#if use_typescript}}
Use TypeScript with strict mode.
{{else}}
Use JavaScript with JSDoc types.
{{/if}}
```

### Unless

```markdown
{{#unless preserve_comments}}
Remove outdated comments.
{{/unless}}
```

## Loops

### Each Loop

Iterate over arrays:

```markdown
## Files to Modify
{{#each files}}
- {{this}}
{{/each}}
```

With index:

```markdown
{{#each files}}
{{@index}}. {{this}}
{{/each}}
```

### Nested Data

Access object properties:

```markdown
{{#each tasks}}
**{{this.name}}**: {{this.description}}
{{/each}}
```

## Partials

Include reusable template fragments:

```markdown
{{> header}}

Main content here.

{{> footer}}
```

Define partials in `.wiggumizer/partials/`:

**partials/header.md:**
```markdown
# Code Refactoring Task
Generated: {{timestamp}}
```

## Built-in Variables

Available in all templates:

- `{{timestamp}}` - Current timestamp
- `{{date}}` - Current date (YYYY-MM-DD)
- `{{cwd}}` - Current working directory
- `{{git_branch}}` - Current git branch
- `{{git_commit}}` - Current git commit hash
- `{{wiggumizer_version}}` - Wiggumizer version

Example:

```markdown
# Refactoring Task
Date: {{date}}
Branch: {{git_branch}}
```

## Comments

Comments aren't sent to the AI:

```markdown
{{!-- This is a comment --}}
{{! Also a comment }}

<!-- This is sent to AI as it's standard Markdown -->
```

## Complex Example

**templates/refactor-module.md:**

```markdown
# Refactor {{!module_name}} Module

{{description:Modernize and improve code quality}}

## Target Files
{{#each files}}
- `{{this}}`
{{/each}}

## Objectives

{{#if modernize}}
### Modernization
- Convert to {{syntax_style:ES6+}}
- Use {{async_pattern:async/await}}
- Apply {{#if use_typescript}}TypeScript{{else}}JSDoc{{/if}} types
{{/if}}

{{#if improve_error_handling}}
### Error Handling
- Add try/catch blocks
- Return proper error codes
- Log errors appropriately
{{/if}}

{{#if add_tests}}
### Testing
- Generate {{test_framework:Jest}} tests
- Aim for {{coverage:80}}% coverage
- Include edge cases
{{/if}}

## Requirements

{{requirements}}

## Constraints

{{#if preserve_api}}
- Maintain existing public API
- Keep function signatures unchanged
{{/if}}

{{#if no_dependencies}}
- Don't add external dependencies
{{/if}}

{{#unless allow_breaking_changes}}
- No breaking changes allowed
{{/unless}}

## Success Criteria

{{#each success_criteria}}
- {{this}}
{{/each}}

---
Generated: {{timestamp}}
Wiggumizer v{{wiggumizer_version}}
```

Usage:

```bash
wiggumize run \
  --template refactor-module \
  --var module_name="Authentication" \
  --var files="[auth.js, tokens.js]" \
  --var modernize=true \
  --var use_typescript=true \
  --var add_tests=true \
  --var test_framework=Vitest \
  --var requirements="Must maintain backward compatibility" \
  --var success_criteria="[All tests pass, No TypeScript errors, Coverage > 85%]"
```

## Template Functions

### String Functions

```markdown
{{uppercase variable}}
{{lowercase variable}}
{{capitalize variable}}
{{trim variable}}
```

### Array Functions

```markdown
{{join array ", "}}
{{length array}}
{{first array}}
{{last array}}
```

### Comparison

```markdown
{{#if (eq status "complete")}}
Done!
{{/if}}

{{#if (gt iterations 10)}}
Many iterations needed.
{{/if}}
```

## Best Practices

### 1. Clear Variable Names

**Good:**
```markdown
{{target_file}}
{{desired_pattern}}
{{code_style}}
```

**Bad:**
```markdown
{{f}}
{{p}}
{{s}}
```

### 2. Provide Defaults

```markdown
Max iterations: {{max_iterations:20}}
Style: {{code_style:modern}}
```

### 3. Document Variables

Add comments at top of template:

```markdown
{{!--
Variables:
- module_name (required): Name of module to refactor
- files (required): Array of files to modify
- test_framework (optional): Jest, Vitest, Mocha (default: Jest)
- coverage (optional): Target coverage percentage (default: 80)
--}}

# Refactor {{!module_name}}
...
```

### 4. Use Partials for Reuse

Instead of duplicating:

```markdown
{{> common/file-header}}
{{> common/requirements}}
{{> common/constraints}}
```

### 5. Validate Required Variables

```markdown
{{!filename}}
{{!operation}}
```

Wiggumizer will error clearly if missing.

## Creating Templates

### From Scratch

```bash
wiggumize template create my-template
```

Opens editor with starter template.

### From Existing Prompt

```bash
wiggumize template create my-template --from PROMPT.md
```

### Interactive

```bash
wiggumize template create my-template --interactive
```

Prompts for:
- Template description
- Variables needed
- Default values
- Required vs optional

## Testing Templates

### Dry Run

```bash
wiggumize run --template my-template --dry-run \
  --var file=test.js \
  --var pattern=async
```

Shows rendered template without running loop.

### Render Only

```bash
wiggumize template render my-template \
  --var file=test.js
```

Outputs final prompt text.

## See Also

- [Built-in Templates](built-in-templates/README.md) - Pre-made templates
- [Custom Templates](custom-templates.md) - Creating your own
- [Template Library](template-library.md) - Managing templates
- [CLI Template Command](../cli-reference/commands/template.md)

---

Template syntax is designed to be simple for basic use, powerful for advanced needs.
