# wiggumize init

Initialize Wiggumizer configuration in your project.

## Synopsis

    wiggumize init [options]

## Description

The `init` command sets up Wiggumizer in your project by creating the necessary configuration files. This is typically the first command you run when starting to use Wiggumizer in a new project.

When executed, `init` creates:

1. **`.wiggumizer.yml`** - The main configuration file containing settings for the AI provider, iteration limits, file patterns, and more
2. **`PROMPT.md`** - A starter prompt file where you describe what changes you want to make to your codebase

The command will not overwrite existing files unless you use the `--force` flag.

### What Gets Created

#### `.wiggumizer.yml`

This configuration file includes:

- **Provider settings** - Which AI provider to use (Claude, OpenAI) and model configuration
- **Iteration limits** - Maximum number of iterations and convergence thresholds
- **File patterns** - Which files to include/exclude from the Ralph loop
- **Context limits** - Maximum context size and file count
- **Rate limiting** - API request rate limits to avoid throttling
- **Multi-repo support** - Optional workspace configuration for working across multiple repositories

#### `PROMPT.md`

A template prompt file that includes:

- Instructions on how to write effective prompts
- Example prompts for common tasks (refactoring, bug fixes, documentation)
- Best practices for Ralph loop convergence

You can customize this file to describe exactly what changes you want the AI to make to your codebase.

## Options

### `--force`

Overwrite existing configuration files if they already exist.

**Default:** `false` (will not overwrite)

    wiggumize init --force

Use this when you want to reset your configuration to defaults or update the config file format after upgrading Wiggumizer.

**Warning:** This will overwrite your existing `.wiggumizer.yml` and `PROMPT.md` files. Make sure to back up any customizations first.

### `--template <name>`

Initialize with a specific prompt template instead of the default generic template.

**Available templates:**
- `refactor` - For code refactoring tasks
- `bugfix` - For fixing bugs and issues
- `feature` - For implementing new features
- `testing` - For adding or improving tests
- `docs` - For documentation improvements

**Example:**

    wiggumize init --template refactor

This creates a `PROMPT.md` file pre-populated with a template for refactoring tasks, including common refactoring patterns and best practices.

## Examples

### Basic Initialization

Initialize Wiggumizer in your project with default settings:

    cd /path/to/your/project
    wiggumize init

This creates `.wiggumizer.yml` and `PROMPT.md` with sensible defaults.

### Initialize with a Template

Start with a testing-focused prompt template:

    wiggumize init --template testing

This creates configuration files and a `PROMPT.md` optimized for adding tests to your codebase.

### Reset Configuration

Reset your configuration to defaults, overwriting existing files:

    wiggumize init --force

**Warning:** This will overwrite your existing configuration. Back up first!

### Initialize with Custom Template for Bug Fixing

Start with a bug-fixing template to help structure your debugging prompts:

    wiggumize init --template bugfix

The generated `PROMPT.md` will include sections for:
- Describing the bug symptoms
- Expected vs actual behavior
- Relevant error messages or logs
- Files that might be involved

### Initialize for Documentation Work

Use the docs template when working on documentation:

    wiggumize init --template docs

This creates a `PROMPT.md` structured for documentation tasks like:
- Adding missing docstrings
- Improving README files
- Creating API documentation
- Writing usage guides

## What Happens After Init

After running `init`, you should:

1. **Review `.wiggumizer.yml`** - Customize settings for your project:
   - Adjust file inclusion/exclusion patterns
   - Set appropriate iteration limits
   - Configure your preferred AI provider

2. **Edit `PROMPT.md`** - Describe what you want to accomplish:
   - Be specific about the changes you want
   - Include context about your codebase
   - Reference specific files or patterns to focus on

3. **Set API Key** - Configure your AI provider API key:

       export ANTHROPIC_API_KEY=your-key-here

   Or for OpenAI:

       export OPENAI_API_KEY=your-key-here

4. **Run Wiggumizer** - Start the Ralph loop:

       wiggumize run

## Configuration File Format

The generated `.wiggumizer.yml` follows this structure:

    # AI Provider
    provider: claude

    # Iteration Settings
    maxIterations: 20
    convergenceThreshold: 0.02
    autoCommit: false

    # Context Limits
    context:
      maxSize: 100000
      maxFiles: 50

    # File Patterns
    files:
      include:
        - "**/*"
      exclude:
        - "node_modules/**"
        - ".git/**"
        - "dist/**"

    # Provider Configuration
    providers:
      claude:
        model: claude-opus-4-5-20251101
        maxTokens: 16384

You can edit this file directly to customize behavior.

## Related Commands

- [`wiggumize run`](./run.md) - Start the Ralph loop with your prompt
- [`wiggumize template`](./template.md) - View or manage prompt templates
- [`wiggumize doctor`](./doctor.md) - Diagnose configuration issues

## Troubleshooting

### File Already Exists

If you see an error like "`.wiggumizer.yml` already exists", either:
- Use `--force` to overwrite
- Manually delete the file first
- Keep your existing configuration and just edit `PROMPT.md`

### Permission Denied

If you get permission errors when creating files:
- Ensure you have write permissions in the current directory
- Try running from your project root directory
- Check that the directory isn't read-only

### Template Not Found

If a template name isn't recognized:
- Run `wiggumize template list` to see available templates
- Check spelling of the template name
- Omit `--template` to use the default generic template

## Notes

- **Git Integration**: It's recommended to run `init` in a git repository so you can track changes made by Wiggumizer
- **Safe Defaults**: The default configuration includes sensible exclusions (node_modules, .git, dist, etc.) to avoid processing unnecessary files
- **Customization**: After init, review and customize `.wiggumizer.yml` for your specific project needs
- **API Keys**: Remember to set your API key environment variable before running `wiggumize run`

## Tips

1. **Start Small**: On first use, consider narrowing the file patterns to a specific directory until you're comfortable with how Wiggumizer works

2. **Version Control**: Commit `.wiggumizer.yml` to version control but keep `PROMPT.md` in `.gitignore` if it contains project-specific implementation details you don't want to share

3. **Multiple Prompts**: You can create multiple prompt files (e.g., `PROMPT-refactor.md`, `PROMPT-tests.md`) and switch between them using `wiggumize run --prompt PROMPT-tests.md`

4. **Template Customization**: After init, you can modify the prompt template for your specific needs - the templates are just starting points

5. **Multi-repo Setup**: If working across multiple related repositories, consider using the `workspaces` configuration in `.wiggumizer.yml` instead of running Wiggumizer separately in each repo
