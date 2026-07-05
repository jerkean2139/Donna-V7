import { isPrivateOrReservedIp } from "../src/lib/agents/tools/ssrf";

describe("isPrivateOrReservedIp", () => {
  it("blocks RFC 1918 private ranges", () => {
    expect(isPrivateOrReservedIp("10.0.0.1")).toBe(true);
    expect(isPrivateOrReservedIp("172.16.0.1")).toBe(true);
    expect(isPrivateOrReservedIp("172.31.255.255")).toBe(true);
    expect(isPrivateOrReservedIp("192.168.1.1")).toBe(true);
  });

  it("blocks loopback and link-local", () => {
    expect(isPrivateOrReservedIp("127.0.0.1")).toBe(true);
    expect(isPrivateOrReservedIp("169.254.1.1")).toBe(true);
    expect(isPrivateOrReservedIp("::1")).toBe(true);
  });

  it("blocks the shared/CGNAT range (100.64.0.0/10) -- Tailscale-style infra", () => {
    expect(isPrivateOrReservedIp("100.64.0.1")).toBe(true);
    expect(isPrivateOrReservedIp("100.100.100.100")).toBe(true);
  });

  it("blocks IPv4-mapped IPv6 addresses that resolve to a private range", () => {
    expect(isPrivateOrReservedIp("::ffff:10.0.0.1")).toBe(true);
    expect(isPrivateOrReservedIp("::ffff:192.168.1.1")).toBe(true);
  });

  it("blocks IPv6 unique-local and link-local prefixes", () => {
    expect(isPrivateOrReservedIp("fd00::1")).toBe(true);
    expect(isPrivateOrReservedIp("fc00::1")).toBe(true);
    expect(isPrivateOrReservedIp("fe80::1")).toBe(true);
  });

  it("allows public IPv4 addresses", () => {
    expect(isPrivateOrReservedIp("8.8.8.8")).toBe(false);
    expect(isPrivateOrReservedIp("1.1.1.1")).toBe(false);
  });

  it("allows public IPv6 addresses", () => {
    expect(isPrivateOrReservedIp("2606:4700:4700::1111")).toBe(false);
  });

  it("refuses (blocks) anything that isn't a recognizable IP literal", () => {
    expect(isPrivateOrReservedIp("not-an-ip")).toBe(true);
  });
});
