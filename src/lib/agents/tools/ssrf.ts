import dns from "node:dns";
import { isIP } from "node:net";

// Ported from KOB v2's web_fetch SSRF guard (donna/agent_tools.py): resolve
// the hostname and reject any address that lands in a private, loopback,
// link-local, or reserved range before fetching. Same security posture as
// the original -- resolve-then-check, not a network-level proxy -- so it
// carries the same small TOCTOU gap (the address the HTTP client actually
// connects to could theoretically differ from the one checked here). That
// gap exists in the ported code too; closing it would need a custom
// connect-time dispatcher, which is out of scope for this port.
export class SsrfBlockedError extends Error {}

function ipv4ToInt(ip: string): number {
  const parts = ip.split(".").map(Number);
  return ((parts[0] ?? 0) << 24) + ((parts[1] ?? 0) << 16) + ((parts[2] ?? 0) << 8) + (parts[3] ?? 0);
}

function isPrivateOrReservedIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  const inRange = (base: string, bits: number): boolean => {
    const baseInt = ipv4ToInt(base);
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (n & mask) === (baseInt & mask);
  };

  return (
    inRange("10.0.0.0", 8) || // RFC 1918
    inRange("172.16.0.0", 12) ||
    inRange("192.168.0.0", 16) ||
    inRange("127.0.0.0", 8) || // loopback
    inRange("169.254.0.0", 16) || // link-local
    inRange("100.64.0.0", 10) || // shared/CGNAT address space (Tailscale et al.)
    inRange("0.0.0.0", 8) || // "this network"
    inRange("224.0.0.0", 4) || // multicast
    inRange("240.0.0.0", 4) // reserved
  );
}

function isPrivateOrReservedIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();

  if (lower === "::1") return true; // loopback
  if (lower.startsWith("fe80:") || lower.startsWith("fe8") || lower.startsWith("fe9")) return true; // link-local (fe80::/10, roughly)
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local (fc00::/7)

  // IPv4-mapped IPv6 (::ffff:a.b.c.d): unwrap and check the embedded IPv4.
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1]) return isPrivateOrReservedIpv4(mapped[1]);

  return false;
}

export function isPrivateOrReservedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateOrReservedIpv4(ip);
  if (version === 6) return isPrivateOrReservedIpv6(ip);
  return true; // not a recognizable IP literal -- refuse rather than guess
}

// Resolves the hostname and throws SsrfBlockedError if ANY resolved address
// is private/reserved. Callers must fetch by the same hostname afterward
// (not a pinned IP), matching the original's behavior.
export async function assertHostnameIsPublic(hostname: string): Promise<void> {
  let addresses: dns.LookupAddress[];
  try {
    addresses = await dns.promises.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new SsrfBlockedError(`Could not resolve hostname '${hostname}'.`);
  }

  if (addresses.length === 0) {
    throw new SsrfBlockedError(`Could not resolve hostname '${hostname}'.`);
  }

  for (const { address } of addresses) {
    if (isPrivateOrReservedIp(address)) {
      throw new SsrfBlockedError(`Access to internal/private addresses is blocked (${hostname}).`);
    }
  }
}
