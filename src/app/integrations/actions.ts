"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTenantContext } from "@/lib/auth/tenant";
import { credentialRepository } from "@/lib/repositories";
import { deleteCredential, hasCredential, setCredential } from "@/lib/integrations/credentials/service";
import { integrationProviders } from "@/lib/integrations/credentials/types";
import { logger } from "@/lib/logger";

// No page reads/writes this yet -- the UI for tenant admins to manage
// GHL/Resend keys is a follow-up. This is the server-action layer PR3
// promised (Decision 9): the only place a plaintext secret is ever
// accepted from a form, encrypted immediately via setCredential.
const setIntegrationCredentialFormSchema = z.object({
  provider: z.enum(integrationProviders),
  secret: z.string().min(1, "A credential value is required.").max(4000),
});

export async function setIntegrationCredentialAction(formData: FormData): Promise<void> {
  const tenant = await getTenantContext();
  const input = setIntegrationCredentialFormSchema.parse({
    provider: formData.get("provider"),
    secret: formData.get("secret"),
  });

  await setCredential(credentialRepository, {
    tenantId: tenant.tenantId,
    provider: input.provider,
    secret: input.secret,
    userId: tenant.userId,
  });

  logger.info("integration_credential.set", {
    tenantId: tenant.tenantId,
    userId: tenant.userId,
    provider: input.provider,
  });

  revalidatePath("/integrations");
}

const deleteIntegrationCredentialFormSchema = z.object({
  provider: z.enum(integrationProviders),
});

export async function deleteIntegrationCredentialAction(formData: FormData): Promise<void> {
  const tenant = await getTenantContext();
  const input = deleteIntegrationCredentialFormSchema.parse({
    provider: formData.get("provider"),
  });

  await deleteCredential(credentialRepository, tenant.tenantId, input.provider);

  logger.info("integration_credential.deleted", {
    tenantId: tenant.tenantId,
    userId: tenant.userId,
    provider: input.provider,
  });

  revalidatePath("/integrations");
}

export interface IntegrationCredentialStatus {
  provider: (typeof integrationProviders)[number];
  configured: boolean;
}

// Deliberately returns configured/not-configured only -- never the
// decrypted secret, so a page listing status can never leak it.
export async function getIntegrationCredentialStatuses(): Promise<IntegrationCredentialStatus[]> {
  const tenant = await getTenantContext();
  return Promise.all(
    integrationProviders.map(async (provider) => ({
      provider,
      configured: await hasCredential(credentialRepository, tenant.tenantId, provider),
    })),
  );
}

