import { getAddress, isAddress } from "viem";
import { z } from "zod";
import { createAuthorizationMessage, createSpendAuthorization } from "@/lib/agent-authorization";
import { db } from "@/lib/db";
import { usdcToMicros } from "@/lib/money";
import { MAX_BUDGET_USDC, MIN_USDC } from "@/lib/limits";
import { configuredPaymentMode } from "@/lib/payment";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const schema = z.object({
  walletAddress: z.string(),
  question: z.string().trim().min(8).max(500),
  maxBudget: z.coerce.number().min(MIN_USDC).max(MAX_BUDGET_USDC),
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

    if (configuredPaymentMode() === "contract-v2") {
      // v2: the payer signs an EIP-712 budget voucher that the escrow verifies on-chain.
      const { nonce, questionHash, typedData } = createSpendAuthorization({ walletAddress, question: input.question, maxTotalMicros: maxBudgetMicros, expiresAt });
      const record = await db.agentAuthorization.create({
        data: { walletAddress, maxBudgetMicros, expiresAt, nonce, questionHash, message: JSON.stringify(typedData.message) },
      });
      return Response.json({ authorizationId: record.id, typedData, expiresAt });
    }

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
