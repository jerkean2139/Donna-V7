import { decryptSecret, encryptSecret } from "../src/lib/security/encryption";
import { DomainError } from "../src/lib/errors";

describe("encryptSecret / decryptSecret", () => {
  beforeEach(() => {
    vi.stubEnv("ENCRYPTION_KEY", "unit-test-encryption-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("round-trips a secret through encrypt then decrypt", () => {
    const encoded = encryptSecret("sk_live_abc123");
    expect(encoded).not.toContain("sk_live_abc123");
    expect(decryptSecret(encoded)).toBe("sk_live_abc123");
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const first = encryptSecret("same-secret");
    const second = encryptSecret("same-secret");
    expect(first).not.toBe(second);
  });

  it("throws when the stored value was tampered with", () => {
    const encoded = encryptSecret("sk_live_abc123");
    const raw = Buffer.from(encoded, "base64");
    raw[raw.length - 1] = raw[raw.length - 1]! ^ 0xff;
    expect(() => decryptSecret(raw.toString("base64"))).toThrow(DomainError);
  });

  it("throws when decrypted with the wrong key", () => {
    const encoded = encryptSecret("sk_live_abc123");
    vi.stubEnv("ENCRYPTION_KEY", "a-completely-different-key");
    expect(() => decryptSecret(encoded)).toThrow(DomainError);
  });

  it("throws when ENCRYPTION_KEY is not set", () => {
    vi.stubEnv("ENCRYPTION_KEY", "");
    expect(() => encryptSecret("x")).toThrow(DomainError);
  });

  it("throws on a malformed (too-short) stored value", () => {
    expect(() => decryptSecret(Buffer.from("short").toString("base64"))).toThrow(DomainError);
  });
});
