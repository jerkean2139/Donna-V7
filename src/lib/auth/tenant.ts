import { auth } from "@clerk/nextjs/server";

export interface TenantContext {
  tenantId: string;
  userId: string;
}

export async function getTenantContext(): Promise<TenantContext> {
  const { orgId, userId } = await auth();

  if (!userId) {
    throw new Error("Authentication required.");
  }

  if (!orgId) {
    throw new Error("Clerk organization context is required for tenant-scoped work.");
  }

  return {
    tenantId: orgId,
    userId,
  };
}

export function assertTenantAccess(recordTenantId: string, activeTenantId: string): void {
  if (recordTenantId !== activeTenantId) {
    throw new Error("Cross-tenant access blocked.");
  }
}
