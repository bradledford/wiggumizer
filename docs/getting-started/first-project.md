# First Project Tutorial

This tutorial walks you through a complete end-to-end example of using Wiggumizer to refactor a real piece of code. By the end, you'll understand the full Ralph loop workflow.

## Project Overview

We'll refactor a simple Express.js API endpoint that has accumulated technical debt. The code works but needs modernization.

**Time estimate:** 15-20 minutes

## Prerequisites

- Wiggumizer installed and configured ([Installation](installation.md))
- Basic familiarity with JavaScript (or your language of choice)
- Git installed and configured

## Step 1: Set Up the Example Project

Create a new directory for this tutorial:

```bash
mkdir wiggumizer-tutorial
cd wiggumizer-tutorial
git init
```

Create a sample file `api.js` with legacy code:

```javascript
// api.js - Legacy user API endpoint
var express = require('express');
var router = express.Router();

router.get('/users/:id', function(req, res) {
  var userId = req.params.id;

  // Simulated database call
  db.query('SELECT * FROM users WHERE id = ' + userId, function(err, result) {
    if (err) {
      res.send('Error');
      return;
    }

    if (result.length == 0) {
      res.send('Not found');
      return;
    }

    var user = result[0];
    res.send({name: user.name, email: user.email});
  });
});

module.exports = router;
```

**Problems with this code:**
- Uses `var` instead of `const/let`
- Callback hell (no async/await)
- SQL injection vulnerability
- Poor error handling
- No input validation
- Hardcoded status codes in text
- No JSDoc comments

## Step 2: Initialize Wiggumizer

```bash
wiggumize init
```

Select your AI provider and configure your API key when prompted.

## Step 3: Write Your First Prompt

Create `PROMPT.md`:

```markdown
# Modernize User API Endpoint

File: api.js

## Objectives

Refactor the user API endpoint to modern standards:

1. **Security**: Fix SQL injection vulnerability (use parameterized queries)
2. **Modern Syntax**: Convert to ES6+ (const/let, arrow functions, async/await)
3. **Error Handling**: Proper error responses with status codes
4. **Input Validation**: Validate userId is a valid ID
5. **Response Format**: Consistent JSON responses
6. **Documentation**: Add JSDoc comments
7. **Code Quality**: Follow Express.js best practices

## Requirements

- Use async/await instead of callbacks
- Return proper HTTP status codes (200, 404, 500)
- Use parameterized queries to prevent SQL injection
- Validate userId is a positive integer
- Include JSDoc comments for the route
- Handle all error cases gracefully

## Constraints

- Keep using Express router pattern
- Maintain the same route path (/users/:id)
- Don't add external dependencies beyond what's already available
- Preserve the export structure

## Expected Outcome

Clean, modern, secure code that follows current best practices while maintaining the same functionality.
```

**Why this prompt works:**
- ✓ Specific file and objectives
- ✓ Clear technical requirements
- ✓ Security concerns highlighted
- ✓ Constraints clearly stated
- ✓ Expected outcome described

## Step 4: Run the Ralph Loop

Start the loop:

```bash
wiggumize run
```

Watch the iterations in real-time. You should see something like:

```
Wiggumizer v1.0.0
Provider: Claude (Sonnet 4.5)
Prompt: PROMPT.md

Iteration 1: Processing...
  Modified: api.js
  Changes: Converted to async/await, added const/let

Iteration 2: Processing...
  Modified: api.js
  Changes: Fixed SQL injection, added parameterized query

Iteration 3: Processing...
  Modified: api.js
  Changes: Added input validation, proper status codes

Iteration 4: Processing...
  Modified: api.js
  Changes: Added JSDoc comments, improved error messages

Iteration 5: Processing...
  Modified: api.js
  Changes: Minor formatting improvements

Iteration 6: Processing...
  No changes detected

Convergence detected after 6 iterations.
Total time: 45 seconds
```

## Step 5: Review the Changes

Check what changed:

```bash
git diff api.js
```

You should see code similar to this:

```javascript
// api.js - Modern user API endpoint
const express = require('express');
const router = express.Router();

/**
 * Get user by ID
 * @route GET /users/:id
 * @param {string} req.params.id - User ID
 * @returns {Object} User object with name and email
 * @returns {404} User not found
 * @returns {400} Invalid user ID
 * @returns {500} Server error
 */
router.get('/users/:id', async (req, res) => {
  const userId = req.params.id;

  // Validate user ID
  if (!userId || isNaN(userId) || parseInt(userId) <= 0) {
    return res.status(400).json({
      error: 'Invalid user ID',
      message: 'User ID must be a positive integer'
    });
  }

  try {
    // Use parameterized query to prevent SQL injection
    const result = await db.query(
      'SELECT * FROM users WHERE id = ?',
      [parseInt(userId)]
    );

    if (result.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: `User with ID ${userId} not found`
      });
    }

    const user = result[0];
    res.status(200).json({
      name: user.name,
      email: user.email
    });

  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({
      error: 'Server error',
      message: 'An error occurred while fetching user data'
    });
  }
});

module.exports = router;
```

**Improvements made:**
- ✓ SQL injection fixed with parameterized query
- ✓ Async/await replaces callbacks
- ✓ Input validation added
- ✓ Proper HTTP status codes (200, 400, 404, 500)
- ✓ Consistent JSON error responses
- ✓ JSDoc comments added
- ✓ Modern ES6+ syntax throughout

## Step 6: Verify and Commit

Review the changes carefully:

```bash
# See the full diff
git diff

# If you're happy with the changes, commit them
git add api.js PROMPT.md
git commit -m "Modernize user API endpoint with Wiggumizer

- Fixed SQL injection vulnerability
- Converted to async/await
- Added input validation
- Improved error handling
- Added JSDoc comments

🤖 Generated with Wiggumizer
"
```

## Understanding What Happened

### The Ralph Philosophy in Action

Notice how the code didn't become perfect in one iteration:

**Iteration 1:** Fixed the most obvious issues (syntax, async/await)
**Iteration 2:** Addressed security (SQL injection)
**Iteration 3:** Added validation and proper responses
**Iteration 4:** Documentation and polish
**Iteration 5:** Minor refinements
**Iteration 6:** No more changes = convergence

This is **"deterministic imperfection"** - each iteration improved the code incrementally rather than trying to be perfect immediately.

### Convergence Recognition

The loop detected convergence when:
- No changes were made between iterations
- Code matched all requirements in the prompt
- Further iterations would just shuffle code without improvements

This is the "faith in eventual consistency" - trust that the code will converge to quality.

## Try It Yourself

Now that you've seen the full workflow, try these exercises:

### Exercise 1: Add a POST Endpoint

Create a new prompt `PROMPT-post.md`:

```markdown
# Add Create User Endpoint

Add a POST /users endpoint to api.js that:
- Accepts JSON body with name and email
- Validates required fields
- Prevents duplicate emails
- Returns 201 with created user
- Handles all errors properly
- Follows the same patterns as GET /users/:id
```

Run: `wiggumize run --prompt PROMPT-post.md`

### Exercise 2: Add Tests

Create `PROMPT-tests.md`:

```markdown
# Add Unit Tests

Create tests/api.test.js with Jest tests for:
- GET /users/:id happy path
- 404 when user not found
- 400 on invalid ID
- 500 on database error
- POST /users success
- POST /users validation errors

Use proper mocking for database calls.
```

Run: `wiggumize run --prompt PROMPT-tests.md`

### Exercise 3: Extract to Service Layer

Create `PROMPT-refactor.md`:

```markdown
# Extract Business Logic to Service

Refactor api.js:
- Create services/userService.js with business logic
- Keep api.js as thin route handlers only
- Move validation to service layer
- Move database calls to service layer
- Export functions for testing

Maintain all existing functionality and error handling.
```

## Common Patterns You'll Notice

### Iteration 1-2: Foundation
- Basic structure improvements
- Syntax modernization
- Core logic refactoring

### Iteration 3-5: Refinement
- Error handling
- Validation
- Edge cases
- Documentation

### Iteration 6+: Convergence
- Minor tweaks
- Style consistency
- Eventually: no changes

## Tips for Success

**1. Start with Clear Objectives**
Your prompt should read like a code review comment - specific, actionable, with clear success criteria.

**2. Watch the Iterations**
Keep `git diff` open in another terminal to see changes in real-time. This builds intuition for how Ralph works.

**3. Trust the Process**
If iteration 2 looks worse than iteration 1, that's okay. Code often gets messier before it converges to clean.

**4. Iterate on Your Prompt**
If the loop isn't converging well, stop it (Ctrl+C), revise your prompt, and restart. Your prompt is code - it needs refactoring too.

**5. Commit Often**
Make small commits after each successful loop. This lets you roll back easily if needed.

## Next Steps

You've completed your first real Wiggumizer project! Now explore:

1. **[Ralph Philosophy](../core-concepts/ralph-philosophy.md)** - Deeper understanding of why this works
2. **[Writing Effective Prompts](../guides/best-practices/writing-effective-prompts.md)** - Level up your prompt skills
3. **[Prompt Templates](../prompt-templates/README.md)** - Use pre-made templates for common tasks
4. **[Multi-File Refactoring](../guides/examples/multi-file-refactor.md)** - Work across multiple files
5. **[Convergence Patterns](../core-concepts/convergence-patterns.md)** - Recognize convergence faster

## Real-World Example

A developer at a startup used Wiggumizer to refactor their entire authentication module:

- **Files**: 8 files, ~2000 lines of legacy code
- **Time**: 2 hours of prompt writing + 3 hours of loop runtime (overnight)
- **Result**: Modern, tested, documented auth system
- **Cost**: $12 in API credits (Claude)
- **Alternative**: Estimated 3-4 days of manual refactoring

The key was breaking it into 8 separate prompts, one per file, then a final prompt to ensure consistency across files.

---

**Congratulations!** You've mastered the basics of Ralph-style development with Wiggumizer. Keep practicing, and you'll develop intuition for how to write prompts that converge quickly.
