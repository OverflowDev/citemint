import { z } from "zod";
import { getAddress, verifyMessage, type Hex } from "viem";
import { db } from "@/lib/db";
import { usdcToMicros } from "@/lib/money";
import { MAX_CITATION_PRICE_USDC, MIN_USDC } from "@/lib/limits";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const patchSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  price: z.coerce.number().min(MIN_USDC).max(MAX_CITATION_PRICE_USDC).optional(),
  tags: z.string().trim().max(160).optional(),
  walletChallengeId: z.string().cuid(),
  walletSignature: z.string().regex(/^0x[a-fA-F0-9]+$/),
});

// Edit an existing source. Authorized by a fresh wallet-ownership signature from the source's creator
// wallet — the same proof used at registration, so only the owner can change it.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const gate = rateLimit(`sources-edit:${clientIp(request)}`, 20, 60_000);
    if (!gate.ok) return tooManyRequests(gate.retryAfterSeconds);
    const { id } = await params;
    const input = patchSchema.parse(await request.json());

    const source = await db.source.findUnique({ where: { id }, include: { creator: true } });
    if (!source) throw new Error("Source not found.");

    const challenge = await db.walletChallenge.findUnique({ where: { id: input.walletChallengeId } });
    if (!challenge || challenge.usedAt || challenge.expiresAt <= new Date()) throw new Error("Wallet verification expired. Connect and sign again.");
    if (challenge.walletAddress !== source.creator.walletAddress.toLowerCase()) throw new Error("Only the source's verified creator wallet can edit it.");
    const valid = await verifyMessage({ address: getAddress(source.creator.walletAddress), message: challenge.message, signature: input.walletSignature as Hex });
    if (!valid) throw new Error("Wallet signature could not be verified.");

    const data: { title?: string; citationPriceMicros?: number; tags?: string } = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.price !== undefined) data.citationPriceMicros = usdcToMicros(input.price);
    if (input.tags !== undefined) data.tags = input.tags || "independent publishing";
    if (Object.keys(data).length === 0) throw new Error("Provide a new title, price, or tags to update.");

    const updated = await db.$transaction(async (tx) => {
      const consumed = await tx.walletChallenge.updateMany({ where: { id: challenge.id, usedAt: null }, data: { usedAt: new Date() } });
      if (consumed.count !== 1) throw new Error("This wallet signature was already used.");
      return tx.source.update({ where: { id }, data, include: { creator: true } });
    });
    return Response.json(updated);
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "Could not update the source.";
    return Response.json({ error: message }, { status: 400 });
  }
}
