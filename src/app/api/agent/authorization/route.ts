import { getAddress, isAddress } from "viem";
import { z } from "zod";
import { createAuthorizationMessage } from "@/lib/agent-authorization";
import { db } from "@/lib/db";
import { usdcToMicros } from "@/lib/money";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const schema = z.object({
  walletAddress: z.string(),
  question: z.string().trim().min(8).max(500),
  maxBudget: z.coerce.number().min(0.000001).max(0.5),
});

export async function POST(request: Request) {
  try {
    const gate = rateLimit(`authorization:${clientIp(request)}`, 20, 60_000);
    if (!gate.ok) return tooManyRequests(gate.retryAfterSeconds);
    // Best-effort purge of stale unused authorizations so the table does not grow unbounded.
    void db.agentAuthorization.deleteMany({ where: { usedAt: null, expiresAt: { lt: new Date() } } }).catch(() => undefined);
    const input = schema.parse(await request.json());
    if (!isAddress(input.walletAddress)) throw new Error("A valid payer wallet is required.");
    const walletAddress = getAddress(input.walletAddress.toLowerCase());
    const maxBudgetMicros = usdcToMicros(input.maxBudget);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const authorization = createAuthorizationMessage({ walletAddress, question: input.question, maxBudgetMicros, expiresAt });
    const record = await db.agentAuthorization.create({
      data: { walletAddress, maxBudgetMicros, expiresAt, ...authorization },
    });
    return Response.json({ authorizationId: record.id, message: record.message, expiresAt });
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "Could not create authorization.";
    return Response.json({ error: message }, { status: 400 });
  }
}
