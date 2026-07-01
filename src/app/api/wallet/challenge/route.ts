import { z } from "zod";
import { getAddress } from "viem";
import { db } from "@/lib/db";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const schema = z.object({ walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/) });

export async function POST(request: Request) {
  try {
    const gate = rateLimit(`challenge:${clientIp(request)}`, 20, 60_000);
    if (!gate.ok) return tooManyRequests(gate.retryAfterSeconds);
    // Best-effort purge of stale unused challenges so the table does not grow unbounded.
    void db.walletChallenge.deleteMany({ where: { usedAt: null, expiresAt: { lt: new Date() } } }).catch(() => undefined);
    const { walletAddress: rawAddress } = schema.parse(await request.json());
    const walletAddress = getAddress(rawAddress);
    const nonce = crypto.randomUUID().replaceAll("-", "");
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + 10 * 60 * 1000);
    const origin = new URL(request.url).origin;
    const message = [
      "CiteMint wallet ownership verification",
      "",
      `Wallet: ${walletAddress}`,
      "Purpose: Register creator sources and receive demo citation payments.",
      `URI: ${origin}`,
      "Version: 1",
      "Chain: EVM",
      `Nonce: ${nonce}`,
      `Issued At: ${issuedAt.toISOString()}`,
      `Expiration Time: ${expiresAt.toISOString()}`,
      "",
      "This signature does not authorize a token transfer."
    ].join("\n");

    const challenge = await db.walletChallenge.create({
      data: { walletAddress: walletAddress.toLowerCase(), nonce, message, expiresAt }
    });
    return Response.json({ challengeId: challenge.id, message, expiresAt });
  } catch (error) {
    const message = error instanceof z.ZodError ? "Enter a valid EVM wallet address." : error instanceof Error ? error.message : "Could not create wallet challenge.";
    return Response.json({ error: message }, { status: 400 });
  }
}
