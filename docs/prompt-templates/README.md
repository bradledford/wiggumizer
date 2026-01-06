# Prompt Templates

Reusable prompt templates for common coding tasks with Wiggumizer.

## Quick Start

```bash
# List available templates
wiggumize template list

# Use a template
wiggumize run --template refactor --var file=auth.js

# Create your own
wiggumize template create my-template
```

## What are Templates?

Templates are reusable prompts with variables that you can customize for different situations. Instead of writing the same prompt structure repeatedly, you define it once and reuse it.

**Without templates:**
```bash
# Write PROMPT.md every time
echo "Refactor auth.js to use async/await..." > PROMPT.md
wiggumize run
```

**With templates:**
```bash
# Use pre-made template
wiggumize run --template refactor \
  --var file=auth.js \
  --var pattern="async/await"
```

## Built-in Templates

Wiggumizer includes templates for common tasks:

- **[refactor](built-in-templates/refactor.md)** - Code refactoring
- **[test-generation](built-in-templates/test-generation.md)** - Generate tests
- **[feature-implementation](built-in-templates/feature-implementation.md)** - Build new features
- **[bug-fix](built-in-templates/bug-fix.md)** - Fix bugs systematically
- **[documentation](built-in-templates/documentation.md)** - Generate docs
- **[code-review](built-in-templates/code-review.md)** - Prepare for code review

[View all built-in templates →](built-in-templates/README.md)

## Template Syntax

Templates use simple variable interpolation:

```markdown
# Refactor {{filename}}

Convert {{filename}} to use {{pattern}}.

{{#if add_tests}}
Include unit tests.
{{/if}}
```

[Full syntax guide →](template-syntax.md)

## Creating Templates

### Quick Create

```bash
wiggumize template create my-refactor
```

### From Existing Prompt

```bash
wiggumize template create my-refactor --from PROMPT.md
```

### Interactive Mode

```bash
wiggumize template create my-refactor --interactive
```

[Creating custom templates guide →](custom-templates.md)

## Using Templates

### Basic Usage

```bash
wiggumize run --template refactor \
  --var file=auth.js
```

### With Multiple Variables

```bash
wiggumize run --template feature-implementation \
  --var feature="User authentication" \
  --var files="[auth.js, middleware.js]" \
  --var tests=true
```

### Saving Configuration

Create `.wiggumizer.yml`:

```yaml
templates:
  refactor:
    pattern: "async/await"
    add_tests: true
    code_style: "modern"
```

Then just:

```bash
wiggumize run --template refactor --var file=auth.js
```

## Template Library

- **[Built-in Templates](built-in-templates/README.md)** - Pre-made templates
- **[Custom Templates](custom-templates.md)** - Create your own
- **[Template Syntax](template-syntax.md)** - Full syntax reference
- **[Managing Templates](template-library.md)** - Organize your templates
- **[Sharing Templates](sharing-templates.md)** - Publish templates

## Community Templates

Browse and use templates shared by the community:

```bash
wiggumize template search refactor
wiggumize template install community/modern-refactor
```

[Community template registry →](../community/template-registry.md)

## Next Steps

1. [Browse built-in templates](built-in-templates/README.md)
2. [Learn template syntax](template-syntax.md)
3. [Create your first template](custom-templates.md)
4. [Share templates with your team](sharing-templates.md)

---

Templates make Ralph coding faster and more consistent.
