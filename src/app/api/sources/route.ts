import { z } from "zod";
import { getAddress, verifyMessage, type Hex } from "viem";
import { db } from "@/lib/db";
import { ingestUrl } from "@/lib/source-ingest";
import { usdcToMicros } from "@/lib/money";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const inputSchema = z.object({
  creatorName: z.string().trim().min(2).max(80),
  walletAddress: z.string().trim().regex(/^0x[a-fA-F0-9]{40}$/, "Enter a valid EVM wallet address."),
  url: z.string().url(),
  price: z.coerce.number().min(0.000001).max(0.1),
  tags: z.string().trim().max(160).default("independent publishing"),
  summary: z.string().trim().max(2000).optional(),
  walletChallengeId: z.string().cuid(),
  walletSignature: z.string().regex(/^0x[a-fA-F0-9]+$/)
});

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const sources = await db.source.findMany({
    where: search ? { OR: [
      { title: { contains: search } },
      { tags: { contains: search } },
      { creator: { name: { contains: search } } }
    ] } : undefined,
    include: { creator: true, payments: { where: { status: "paid" } } },
    orderBy: { createdAt: "desc" }
  });
  return Response.json(sources.map((source) => ({
    ...source,
    timesCited: source.payments.length,
    totalEarnedMicros: source.payments.reduce((sum, payment) => sum + payment.amountMicros, 0),
    payments: undefined
  })));
}

export async function POST(request: Request) {
  try {
    const gate = rateLimit(`sources:${clientIp(request)}`, 12, 60_000);
    if (!gate.ok) return tooManyRequests(gate.retryAfterSeconds);
    const input = inputSchema.parse(await request.json());
    const walletAddress = getAddress(input.walletAddress);
    const challenge = await db.walletChallenge.findUnique({ where: { id: input.walletChallengeId } });
    if (!challenge || challenge.usedAt || challenge.expiresAt <= new Date()) throw new Error("Wallet verification expired. Connect and sign again.");
    if (challenge.walletAddress !== walletAddress.toLowerCase()) throw new Error("The signed wallet does not match this registration.");
    const validSignature = await verifyMessage({ address: walletAddress, message: challenge.message, signature: input.walletSignature as Hex });
    if (!validSignature) throw new Error("Wallet signature could not be verified.");
    let article: { title: string; content: string; excerpt: string };
    try {
      article = await ingestUrl(input.url);
    } catch (error) {
      if (!input.summary) throw error;
      const hostname = new URL(input.url).hostname.replace(/^www\./, "");
      article = { title: `Article from ${hostname}`, content: input.summary, excerpt: input.summary.slice(0, 240) };
    }
    const source = await db.$transaction(async (tx) => {
      const consumed = await tx.walletChallenge.updateMany({ where: { id: challenge.id, usedAt: null }, data: { usedAt: new Date() } });
      if (consumed.count !== 1) throw new Error("This wallet signature was already used.");
      const creator = await tx.creator.upsert({
        where: { walletAddress },
        update: { name: input.creatorName, walletVerifiedAt: new Date(), walletVerificationMethod: "eip191" },
        create: { name: input.creatorName, walletAddress, walletVerifiedAt: new Date(), walletVerificationMethod: "eip191" }
      });
      return tx.source.create({
        data: {
          creatorId: creator.id,
          title: article.title,
          url: input.url,
          content: article.content,
          excerpt: article.excerpt,
          citationPriceMicros: usdcToMicros(input.price),
          tags: input.tags || "independent publishing"
        },
        include: { creator: true }
      });
    });
    return Response.json(source, { status: 201 });
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "Could not register this source.";
    return Response.json({ error: message }, { status: 400 });
  }
}
