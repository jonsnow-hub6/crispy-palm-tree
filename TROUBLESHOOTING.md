# Troubleshooting Guide

## Project Creation Issues

If projects are not being created, check the following:

### 1. PocketBase Access Rules

The `projects` collection might have restrictive access rules. Check in PocketBase Admin UI:

1. Go to PocketBase Admin (usually `http://localhost:8090/_/`)
2. Navigate to Collections → `projects`
3. Check the "API rules" tab
4. Ensure `createRule`, `updateRule`, `listRule`, `viewRule`, and `deleteRule` are either:
   - `null` (allow all) - recommended for development
   - Or set to appropriate rules like `@request.auth.id != ""` if using authentication

**Issue**: Migration `1769072170_updated_projects.js` sets rules to empty strings (`""`), which means "deny all access".

**Fix**: In PocketBase Admin UI, set all rules to `null` or appropriate access rules.

### 2. Check Browser Console

Open browser DevTools (F12) and check the Console tab for errors when creating a project. Common errors:

- `Failed to create project: Failed to create record` - Usually access rules issue
- `Failed to create project: Unique constraint violation` - Project name or host:port combination already exists
- Network errors - Check if PocketBase server is running and `VITE_POCKETBASE_URL` is correct

### 3. Verify PocketBase Connection

Check that:

- PocketBase server is running (`npm run dev:backend`)
- `VITE_POCKETBASE_URL` environment variable is set correctly (default: `http://localhost:8090`)
- No CORS errors in browser console

### 4. Unique Constraints

Projects have two unique constraints:

- Project `name` must be unique
- `host` + `port` combination must be unique

If you get a unique constraint error, try a different name or host:port combination.

### 5. Required Fields

Ensure all required fields are provided:

- `name` (string, required)
- `host` (string, required)
- `port` (number, required, 1-65535)

## Quick Fix for Access Rules

If you have access to PocketBase Admin UI:

1. Open PocketBase Admin
2. Go to Collections → projects
3. Click on "API rules" tab
4. Set all rules to `null` (or leave empty and save)
5. Try creating a project again

Alternatively, you can use PocketBase CLI or create a new migration to fix the rules.
