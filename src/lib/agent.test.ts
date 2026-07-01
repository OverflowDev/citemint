import { describe, expect, it } from "vitest";
import type { Creator, Source } from "@prisma/client";
import { rankSources } from "./agent";

function makeSource(overrides: Partial<Source>): Source & { creator: Creator } {
  const base: Source = {
    id: overrides.id ?? crypto.randomUUID(),
    creatorId: "creator",
    title: "",
    url: `https://example.com/${crypto.randomUUID()}`,
    content: "",
    excerpt: "",
    citationPriceMicros: 10_000,
    tags: "general",
    createdAt: new Date(),
  };
  const creator = { id: "creator", name: "Creator", walletAddress: "0x", walletVerifiedAt: null, walletVerificationMethod: null, createdAt: new Date() } as Creator;
  return { ...base, ...overrides, creator };
}

describe("rankSources", () => {
  it("ranks title matches above body-only matches", () => {
    const titleMatch = makeSource({ id: "title", title: "Nanopayments for research", tags: "payments" });
    const bodyMatch = makeSource({ id: "body", title: "Unrelated", tags: "general", content: "a passing mention of nanopayments in research" });
    const noMatch = makeSource({ id: "none", title: "Cooking", tags: "food", content: "recipes" });

    const ranked = rankSources("nanopayments research", [noMatch, bodyMatch, titleMatch]);

    expect(ranked[0].id).toBe("title");
    expect(ranked[ranked.length - 1].id).toBe("none");
    expect(ranked.find((source) => source.id === "none")?.score).toBe(0);
  });

  it("breaks score ties by cheaper citation price", () => {
    const pricey = makeSource({ id: "pricey", title: "research", citationPriceMicros: 20_000 });
    const cheap = makeSource({ id: "cheap", title: "research", citationPriceMicros: 5_000 });

    const ranked = rankSources("research", [pricey, cheap]);

    expect(ranked[0].id).toBe("cheap");
  });

  it("ignores stop words", () => {
    const ranked = rankSources("what is the", [makeSource({ title: "the what" })]);
    expect(ranked[0].score).toBe(0);
  });
});
