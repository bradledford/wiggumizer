# Multi-Repo Workspace Support

Wiggumizer supports working across multiple repositories in a single iteration loop. This is perfect for:

- Monorepo-style development with multiple packages
- Full-stack applications (frontend + backend)
- Microservices architectures
- Projects split across multiple Git repositories

## How It Works

When you configure multiple workspaces, Wiggumizer:

1. **Gathers context** from all repositories
2. **Presents the full picture** to Claude with workspace labels
3. **Applies changes** to the correct repository based on file paths
4. **Commits to each repo** individually (if auto-commit is enabled)

## Configuration

Create a `.wiggumizer.yml` file in your workspace root:

```yaml
workspaces:
  - name: backend
    path: ../my-backend
    include:
      - "src/**/*.js"
    exclude:
      - "node_modules/**"
    context:
      maxSize: 50000
      maxFiles: 30

  - name: frontend
    path: ../my-frontend
    include:
      - "src/**/*.tsx"
      - "src/**/*.ts"
    exclude:
      - "node_modules/**"
    context:
      maxSize: 50000
      maxFiles: 30
```

### Configuration Options

Each workspace supports:

- **name**: Friendly identifier for the workspace (used in logs and file tags)
- **path**: Relative or absolute path to the repository root
- **include**: File patterns to include (optional, inherits from global `files.include`)
- **exclude**: File patterns to exclude (optional, inherits from global `files.exclude`)
- **context**: Per-workspace context limits (optional, inherits from global `context`)

## File Output Format

When Claude makes changes in multi-repo mode, it **must** prefix file paths with the workspace name:

```markdown
## File: [backend] src/api/users.js
\`\`\`javascript
// file contents
\`\`\`

## File: [frontend] src/components/UserList.tsx
\`\`\`typescript
// file contents
\`\`\`
```

Wiggumizer parses these tags and writes files to the correct repository.

## Example: Full-Stack Authentication

See `PROMPT.md` for a complete example of implementing authentication across backend and frontend repositories.

## Directory Structure

Recommended structure for multi-repo workspaces:

```
workspace/
  .wiggumizer.yml       # Multi-repo configuration
  PROMPT.md             # Task description
  backend/              # Backend repository
    .git/
    src/
  frontend/             # Frontend repository
    .git/
    src/
  shared/               # Shared utilities (optional)
    .git/
    src/
```

## Git Integration

Each workspace is treated as an independent Git repository:

- Git status is checked per repository
- Auto-commits are created in each repository individually
- Convergence is detected across all repositories together

## Running Wiggumizer

```bash
cd workspace
wiggumize run
```

Wiggumizer will:
1. Show all configured workspaces
2. Check git status in each repository
3. Iterate across all repositories until convergence
4. Log changes per workspace

## Tips

### Context Limits
Adjust per-workspace context limits based on repository size:

```yaml
workspaces:
  - name: large-monorepo
    path: ../monorepo
    context:
      maxSize: 100000
      maxFiles: 50

  - name: small-utils
    path: ../utils
    context:
      maxSize: 20000
      maxFiles: 10
```

### File Selection
Use specific include patterns to focus on relevant files:

```yaml
workspaces:
  - name: backend
    path: ../backend
    include:
      - "src/**/*.js"
      - "!src/**/*.test.js"  # Exclude tests
```

### Workspace Organization
Give workspaces descriptive names that Claude will understand:

```yaml
workspaces:
  - name: api-server      # Clear purpose
  - name: web-client      # Clear purpose
  - name: mobile-app      # Clear purpose
```

## Limitations

- Maximum recommended workspaces: 5 (context limits apply)
- Each workspace must be a separate directory
- Workspace paths must exist before running Wiggumizer
- File changes must explicitly specify workspace name (Claude must learn this pattern)

## Fallback Behavior

If Claude forgets to tag a file with a workspace name, Wiggumizer will:

1. Check if the file exists in any configured workspace
2. Use the first workspace where the file is found
3. Default to the first workspace if file doesn't exist anywhere

This helps prevent errors but may place files in unexpected locations. Best practice: always use workspace tags.
