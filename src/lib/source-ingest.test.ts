import { describe, expect, it } from "vitest";
import { isPrivateIp } from "./source-ingest";

describe("isPrivateIp (SSRF guard)", () => {
  it("flags cloud metadata and private ranges", () => {
    for (const ip of ["169.254.169.254", "127.0.0.1", "10.0.0.1", "192.168.1.5", "172.16.0.1", "172.31.255.255", "100.64.0.1", "0.0.0.0"]) {
      expect(isPrivateIp(ip), ip).toBe(true);
    }
  });

  it("flags private IPv6", () => {
    for (const ip of ["::1", "fc00::1", "fd12:3456::1", "fe80::1", "::ffff:169.254.169.254"]) {
      expect(isPrivateIp(ip), ip).toBe(true);
    }
  });

  it("allows public addresses", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "93.184.216.34", "2606:4700:4700::1111", "::ffff:8.8.8.8"]) {
      expect(isPrivateIp(ip), ip).toBe(false);
    }
  });
});
