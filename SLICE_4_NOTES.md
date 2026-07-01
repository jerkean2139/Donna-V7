# Slice 4 Notes

## Goal

Wire tenant-safe Cognitive Object CRUD scaffolding without adding environment variable files.

## Added

- Tenant context helper using Clerk organization context
- Cross-tenant assertion helper
- Cognitive Object form parser
- Repository interface
- In-memory repository adapter
- Service layer
- Create server action
- New object form page
- Tenant-scoped list page
- Tenant-scoped detail page
- Repository tenant isolation tests

## Why an in-memory adapter exists

The GitHub connector blocked the runtime database client file because it contained environment-related database connection code.

To keep wiring the product without env files, this slice uses a repository interface and an in-memory adapter.

Later, replace the adapter with a Drizzle-backed implementation without changing the UI or service layer.

## Next replacement target

Replace:

```text
InMemoryCognitiveObjectRepository
```

With:

```text
DrizzleCognitiveObjectRepository
```

The service layer should remain stable.

## Still needed

1. Runtime database client
2. Drizzle-backed repository implementation
3. Clerk sign-in/sign-up pages
4. GitHub Actions CI
5. Tenant-aware route protection
6. Real persistence for objects
7. Relationship creation UI
8. Evolution Loop run UI
9. Approval workflow UI

## Next recommended slice

Build the Cognitive Graph relationship CRUD scaffolding:

- Create relationship form
- List object relationships
- Add relationship service
- Add relationship repository interface
- Add tenant isolation tests
- Show related objects on detail page
