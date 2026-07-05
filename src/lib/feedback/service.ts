import { randomBytes } from "node:crypto";
import type { EmbeddingProvider } from "../ai/embeddings";
import type { CognitiveObjectRepository } from "../cognitive-object/repository";
import { createCognitiveObject } from "../cognitive-object/service";
import type { FeedbackWidgetKeyRepository } from "./repository";
import type { FeedbackWidgetKey } from "./types";

const PUBLIC_KEY_PREFIX = "fw_pub_";

export function generateWidgetPublicKey(): string {
  return `${PUBLIC_KEY_PREFIX}${randomBytes(24).toString("base64url")}`;
}

export interface MintWidgetKeyInput {
  tenantId: string;
  userId: string;
  label: string;
  allowedOrigins: string[];
}

export async function mintWidgetKey(
  repository: FeedbackWidgetKeyRepository,
  input: MintWidgetKeyInput,
): Promise<FeedbackWidgetKey> {
  return repository.create({
    tenantId: input.tenantId,
    publicKey: generateWidgetPublicKey(),
    label: input.label,
    allowedOrigins: input.allowedOrigins,
    createdByUserId: input.userId,
  });
}

export async function listWidgetKeys(
  repository: FeedbackWidgetKeyRepository,
  tenantId: string,
): Promise<FeedbackWidgetKey[]> {
  return repository.listByTenant(tenantId);
}

export async function revokeWidgetKey(
  repository: FeedbackWidgetKeyRepository,
  id: string,
  tenantId: string,
): Promise<void> {
  await repository.revokeForTenant(id, tenantId);
}

export async function resolveActiveWidgetKey(
  repository: FeedbackWidgetKeyRepository,
  publicKey: string,
): Promise<FeedbackWidgetKey | null> {
  return repository.findActiveByPublicKey(publicKey);
}

// Defense-in-depth on top of the key. Empty allowlist => the key alone gates
// (allow any origin). A configured allowlist is enforced exactly.
export function isOriginAllowed(allowedOrigins: string[], origin: string | null): boolean {
  if (allowedOrigins.length === 0) return true;
  if (!origin) return false;
  return allowedOrigins.includes(origin);
}

function deriveTitle(message: string): string {
  const firstLine = message.trim().split("\n")[0]?.trim() ?? "";
  const title = firstLine.length > 0 ? firstLine : message.trim();
  return title.length > 100 ? `${title.slice(0, 97)}…` : title;
}

export interface IngestFeedbackInput {
  tenantId: string;
  widgetKeyId: string;
  message: string;
  email?: string | null;
  pageUrl?: string | null;
}

// Ingested feedback is UNTRUSTED external input (the classic prompt-injection
// vector). It becomes a low-trust, low-risk Cognitive Object -- the read/act
// boundary and the "data, not instructions" framing in the reasoning engine
// still stand, so it can never smuggle out an action. createdByUserId records
// the widget key, not a person.
export async function ingestFeedback(
  objectRepository: CognitiveObjectRepository,
  embeddingProvider: EmbeddingProvider,
  input: IngestFeedbackInput,
): Promise<{ objectId: string }> {
  const result = await createCognitiveObject(
    objectRepository,
    {
      tenantId: input.tenantId,
      createdByUserId: `widget:${input.widgetKeyId}`,
      objectType: "issue",
      title: deriveTitle(input.message),
      body: input.message,
      source: "api",
      riskLevel: "low",
      tags: ["feedback"],
      metadata: {
        feedback: {
          email: input.email ?? null,
          pageUrl: input.pageUrl ?? null,
          widgetKeyId: input.widgetKeyId,
        },
      },
    },
    embeddingProvider,
  );
  return { objectId: result.object.id };
}
