"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTenantContext } from "@/lib/auth/tenant";
import { DomainError } from "@/lib/errors";
import { toFieldErrors, type FormActionState } from "@/lib/forms";
import { credentialRepository } from "@/lib/repositories";
import { deleteCredential, hasCredential, setCredential } from "@/lib/integrations/credentials/service";
import { integrationProviders } from "@/lib/integrations/credentials/types";
import { errorField, logger } from "@/lib/logger";

// This is the server-action layer PR3 promised (Decision 9): the only place
// a plaintext secret is ever accepted from a form, encrypted immediately via
// setCredential. The settings page at /integrations is the only caller.
const setIntegrationCredentialFormSchema = z.object({
  provider: z.enum(integrationProviders),
  secret: z.string().min(1, "A credential value is required.").max(4000),
});

export async function setIntegrationCredentialAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const tenant = await getTenantContext();
  const parsed = setIntegrationCredentialFormSchema.safeParse({
    provider: formData.get("provider"),
    secret: formData.get("secret"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields and try again.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  try {
    await setCredential(credentialRepository, {
      tenantId: tenant.tenantId,
      provider: parsed.data.provider,
      secret: parsed.data.secret,
      userId: tenant.userId,
    });
  } catch (error) {
    logger.error("integration_credential.set_failed", {
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      provider: parsed.data.provider,
      error: errorField(error),
    });
    return {
      status: "error",
      message:
        error instanceof DomainError
          ? error.message
          : "The credential could not be saved. Please try again.",
    };
  }

  logger.info("integration_credential.set", {
    tenantId: tenant.tenantId,
    userId: tenant.userId,
    provider: parsed.data.provider,
  });

  revalidatePath("/integrations");
  return { status: "idle" };
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

