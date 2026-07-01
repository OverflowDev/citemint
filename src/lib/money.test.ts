import { describe, expect, it } from "vitest";
import { formatUsdc, microsToUsdc, usdcToMicros, shortWallet } from "./money";

describe("money conversions", () => {
  it("round-trips whole and fractional USDC", () => {
    expect(usdcToMicros(1)).toBe(1_000_000);
    expect(usdcToMicros(0.01)).toBe(10_000);
    expect(usdcToMicros(0.000001)).toBe(1);
    expect(microsToUsdc(1_000_000)).toBe(1);
  });

  it("rounds to the nearest micro-USDC", () => {
    expect(usdcToMicros(0.0000004)).toBe(0);
    expect(usdcToMicros(0.0000006)).toBe(1);
  });

  it("formats compact and precise values", () => {
    expect(formatUsdc(10_000, true)).toBe("$0.01");
    expect(formatUsdc(1)).toBe("$0.000001");
    expect(formatUsdc(0)).toBe("$0.00");
  });

  it("shortens wallet addresses", () => {
    expect(shortWallet("0x040B0c43a75D4f936aF770C33CEb2AfC2211A21f")).toBe("0x040B…A21f");
  });
});
