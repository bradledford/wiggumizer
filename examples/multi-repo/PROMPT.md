# Multi-Repo Example: Add User Authentication

Implement user authentication across the full stack:

## Backend (backend workspace):
- Add JWT token generation in `src/auth/tokens.js`
- Create authentication middleware in `src/middleware/auth.js`
- Add login/logout endpoints in `src/routes/auth.js`
- Update user model if needed

## Frontend (frontend workspace):
- Create login form component in `src/components/LoginForm.tsx`
- Add authentication context/state management
- Implement token storage (localStorage)
- Add protected route wrapper

## Shared (shared workspace):
- Add shared TypeScript types for auth payloads
- Add validation schemas for auth requests

Make sure all components work together and follow best practices for security.
