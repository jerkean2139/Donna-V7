import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { DomainError } from "../errors";

// AES-256-GCM at rest for third-party integration credentials (GHL, Resend),
// per Phase 2 design Decision 9 and the ShipSafe security spec referenced in
// PHASE_1_DESIGN.md: "GitHub OAuth access tokens are encrypted with
// AES-256-GCM using a key derived from ENCRYPTION_KEY via SHA-256. Loss of
// ENCRYPTION_KEY invalidates every stored token; we don't keep a backup."
// Same posture here: no key-recovery path, no plaintext fallback.
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit, the GCM standard
const AUTH_TAG_LENGTH = 16;

function deriveKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new DomainError("ENCRYPTION_KEY is required to store or read integration credentials.");
  }
  return createHash("sha256").update(secret).digest();
}

// Output is base64(iv || authTag || ciphertext) as a single opaque string,
// so the repository layer just stores/reads one text column.
export function encryptSecret(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decryptSecret(encoded: string): string {
  const key = deriveKey();
  const raw = Buffer.from(encoded, "base64");
  if (raw.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new DomainError("Stored credential is malformed or corrupted.");
  }

  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  try {
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString("utf-8");
  } catch {
    // GCM's auth tag check failed: wrong key (ENCRYPTION_KEY rotated without
    // migrating stored values) or the ciphertext was tampered with. Either
    // way, never return partial/garbage plaintext.
    throw new DomainError("Failed to decrypt credential -- wrong key or corrupted data.");
  }
}
