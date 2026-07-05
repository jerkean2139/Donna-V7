"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTenantContext } from "@/lib/auth/tenant";
import { DomainError } from "@/lib/errors";
import { toFieldErrors, type FormActionState } from "@/lib/forms";
import { errorField, logger } from "@/lib/logger";
import { feedbackWidgetKeyRepository } from "@/lib/repositories";
import { mintWidgetKey, revokeWidgetKey } from "@/lib/feedback/service";

const mintSchema = z.object({
  label: z.string().min(1, "Give this key a label.").max(120),
  allowedOrigins: z.string().max(2000).optional(),
});

// Split a textarea (one origin per line, or comma-separated) into a validated,
// deduped origin allowlist. Each entry must be a bare origin (scheme + host,
// no path), which is what the ingest route compares the request Origin against.
function parseOrigins(raw: string | undefined): { origins: string[] } | { error: string } {
  if (!raw || !raw.trim()) return { origins: [] };
  const parts = raw
    .split(/[\n,]/)
    .map((part) => part.trim())
    .filter(Boolean);

  const origins: string[] = [];
  for (const part of parts) {
    let parsed: URL;
    try {
      parsed = new URL(part);
    } catch {
      return { error: `"${part}" is not a valid origin (e.g. https://example.com).` };
    }
    if (parsed.origin !== part.replace(/\/$/, "")) {
      return { error: `"${part}" must be a bare origin like https://example.com (no path).` };
    }
    if (!origins.includes(parsed.origin)) origins.push(parsed.origin);
  }
  return { origins };
}

export async function mintWidgetKeyAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const tenant = await getTenantContext();

  const parsed = mintSchema.safeParse({
    label: formData.get("label"),
    allowedOrigins: formData.get("allowedOrigins") ?? undefined,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields and try again.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const origins = parseOrigins(parsed.data.allowedOrigins);
  if ("error" in origins) {
    return { status: "error", message: origins.error, fieldErrors: { allowedOrigins: origins.error } };
  }

  try {
    const key = await mintWidgetKey(feedbackWidgetKeyRepository, {
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      label: parsed.data.label,
      allowedOrigins: origins.origins,
    });
    logger.info("feedback_widget_key.minted", {
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      widgetKeyId: key.id,
    });
  } catch (error) {
    logger.error("feedback_widget_key.mint_failed", {
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      error: errorField(error),
    });
    return {
      status: "error",
      message: error instanceof DomainError ? error.message : "Could not create the key. Please try again.",
    };
  }

  revalidatePath("/settings/feedback");
  return { status: "idle" };
}

const revokeSchema = z.object({ keyId: z.uuid("Invalid key id.") });

export async function revokeWidgetKeyAction(formData: FormData): Promise<void> {
  const tenant = await getTenantContext();
  const input = revokeSchema.parse({ keyId: formData.get("keyId") });

  await revokeWidgetKey(feedbackWidgetKeyRepository, input.keyId, tenant.tenantId);
  logger.info("feedback_widget_key.revoked", {
    tenantId: tenant.tenantId,
    userId: tenant.userId,
    widgetKeyId: input.keyId,
  });

  revalidatePath("/settings/feedback");
}
