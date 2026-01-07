/**
 * Prompt templates for common use cases
 */

const templates = {
  blank: {
    name: 'Blank Template',
    description: 'Start from scratch',
    content: `---
issue:
ticket:
type: improvement
---

# Project Improvement

Describe what you want to improve or build in your codebase.

## Goals

- What needs to change?
- What's the desired outcome?

## Constraints

- Any limitations or requirements?
- Code style preferences?

## Context

Any additional context the AI should know about your project.
`
  },

  refactor: {
    name: 'Refactoring',
    description: 'Modernize or clean up existing code',
    content: `---
issue:
ticket:
type: refactor
---

# Refactoring Task

## What to Refactor

Describe the code that needs refactoring (e.g., "the authentication module", "all API endpoints").

## Goals

- **Modernize**: Update to latest patterns (async/await, ES6+, etc.)
- **Simplify**: Remove unnecessary complexity
- **Improve readability**: Better naming, structure, comments

## Preserve

- Existing functionality (no breaking changes)
- Test compatibility
- API contracts

## Constraints

- Maintain backward compatibility
- Follow existing code style
- Keep changes incremental
`
  },

  bugfix: {
    name: 'Bug Fix',
    description: 'Fix a specific bug or issue',
    content: `---
issue:
ticket:
type: bugfix
---

# Bug Fix

## Problem

Describe the bug:
- What's happening?
- What should happen instead?
- How to reproduce?

## Expected Fix

What needs to change to fix this bug?

## Testing

How to verify the fix works?

## Related Code

Which files/modules are likely affected?
`
  },

  feature: {
    name: 'New Feature',
    description: 'Add new functionality',
    content: `---
issue:
ticket:
type: feature
---

# New Feature

## Feature Description

What feature are you adding?

## Requirements

- User stories or use cases
- Technical requirements
- Integration points

## Implementation Notes

- Preferred approach or architecture
- Libraries or patterns to use
- Files that need creation/modification

## Acceptance Criteria

What does "done" look like?
`
  },

  testing: {
    name: 'Add Tests',
    description: 'Add or improve test coverage',
    content: `---
issue:
ticket:
type: testing
---

# Add Test Coverage

## What to Test

Which modules/functions need tests?

## Testing Goals

- Unit tests for core functionality
- Integration tests for workflows
- Edge cases and error handling

## Test Framework

Which testing framework to use? (Jest, Mocha, pytest, etc.)

## Coverage Target

Aim for what % coverage?
`
  },

  documentation: {
    name: 'Documentation',
    description: 'Improve code documentation',
    content: `---
issue:
ticket:
type: documentation
---

# Documentation Improvement

## What Needs Documentation

- Which modules/functions?
- README updates?
- API documentation?

## Documentation Style

- JSDoc/docstrings format
- Examples and usage
- Architecture overview

## Audience

Who is the documentation for? (developers, end users, etc.)
`
  },

  typescript: {
    name: 'TypeScript Migration',
    description: 'Convert JavaScript to TypeScript',
    content: `---
issue:
ticket:
type: refactor
---

# TypeScript Migration

## Files to Convert

Which JavaScript files should be converted to TypeScript?

## Type Safety Goals

- Add type annotations
- Fix type errors
- Use strict mode

## Approach

- Convert incrementally (file by file)
- Start with interfaces/types
- Preserve existing functionality

## Configuration

Use existing tsconfig.json or create new one?
`
  }
};

function getTemplate(name) {
  return templates[name] || templates.blank;
}

function listTemplates() {
  return Object.keys(templates).map(key => ({
    id: key,
    name: templates[key].name,
    description: templates[key].description
  }));
}

function generatePrompt(templateName, customization = {}) {
  const template = getTemplate(templateName);
  let content = template.content;

  // Apply customizations
  if (customization.projectType) {
    content = `# ${customization.projectType} - ` + content.split('\n').slice(1).join('\n');
  }

  return content;
}

module.exports = {
  getTemplate,
  listTemplates,
  generatePrompt,
  templates
};
