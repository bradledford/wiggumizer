# Configuration File Reference

Wiggumizer uses YAML configuration files for persistent settings.

## File Locations

Configuration is loaded in order (later overrides earlier):

1. **Defaults** - Built-in defaults
2. **User Config** - `~/.wiggumizer.yml` (applies to all projects)
3. **Project Config** - `.wiggumizer.yml` (project-specific)
4. **CLI Options** - Command-line flags (highest priority)

## Creating Configuration

