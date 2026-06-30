# Slice 3 Notes

## What this slice adds

This slice adds the first app/package foundation for Donna V7.

## Added

- Next.js package foundation
- TypeScript configuration
- Vitest configuration
- Drizzle configuration
- Postgres schema for Cognitive Objects and Cognitive Graph relationships
- Root app layout with Clerk provider
- Home page shell
- Dashboard shell
- Cognitive Objects page shell
- Global styles

## Connector limitations encountered

The GitHub connector blocked writes for files that contained environment variable templates, database runtime connection code, and GitHub Actions workflow YAML.

Those should be added locally or by Codex in the next pass.

## Still needed

1. Environment template file
2. Runtime database client
3. GitHub Actions CI workflow
4. CodeQL workflow
5. Dependency review workflow
6. Secret scanning workflow
7. Clerk sign-in and sign-up routes
8. Real Cognitive Object CRUD
9. Tenant-scoped database queries
10. Railway deployment configuration

## Recommended CI workflow

Run these checks on pull requests and pushes to main:

```text
npm install
npm run typecheck
npm run test
npm run build
```

## Next development slice

Build real CRUD for Cognitive Objects with tenant-safe queries and Clerk organization context.
