import { getAddress, isAddress, recoverMessageAddress } from "viem";
import { z } from "zod";
import { hashQuestion } from "@/lib/agent-authorization";
import { db } from "@/lib/db";
import { generateAnswer, rankSources, type RankedSource } from "@/lib/agent";
import { configuredPaymentMode, getPaymentAdapter } from "@/lib/payment";
import { usdcToMicros } from "@/lib/money";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const inputSchema = z.object({
  question: z.string().trim().min(8, "Ask a little more detail so the agent can research it.").max(500),
  maxBudget: z.coerce.number().min(0.000001).max(0.5),
  walletAddress: z.string().optional(),
  authorizationId: z.string().optional(),
  signature: z.string().optional(),
});

async function verifyAuthorization(input: z.infer<typeof inputSchema>, maxBudgetMicros: number) {
  if (!input.walletAddress || !isAddress(input.walletAddress) || !input.authorizationId || !input.signature) {
    throw new Error("Connect your payer wallet and sign this question before running the onchain agent.");
  }
  const walletAddress = getAddress(input.walletAddress.toLowerCase());
  const record = await db.agentAuthorization.findUnique({ where: { id: input.authorizationId } });
  if (!record || record.usedAt || record.expiresAt <= new Date()) throw new Error("This payment authorization is invalid or expired. Sign again.");
  if (record.walletAddress.toLowerCase() !== walletAddress.toLowerCase() || record.questionHash !== hashQuestion(input.question) || record.maxBudgetMicros !== maxBudgetMicros) {
    throw new Error("The signed authorization does not match this question and budget.");
  }
  const recovered = await recoverMessageAddress({ message: record.message, signature: input.signature as `0x${string}` });
  if (recovered.toLowerCase() !== walletAddress.toLowerCase()) throw new Error("The authorization signature does not match the payer wallet.");
  // Note: consumption is deferred so it can happen atomically with question creation (see POST).
  return { record, walletAddress };
}

export async function POST(request: Request) {
  try {
    const gate = rateLimit(`ask:${clientIp(request)}`, 8, 60_000);
    if (!gate.ok) return tooManyRequests(gate.retryAfterSeconds);
    const input = inputSchema.parse(await request.json());
    const maxBudgetMicros = usdcToMicros(input.maxBudget);
    const mode = configuredPaymentMode();
    const authorization = mode === "contract" ? await verifyAuthorization(input, maxBudgetMicros) : null;
    const payerWallet = authorization?.walletAddress || input.walletAddress || process.env.AGENT_WALLET_ADDRESS || "";
    const allSources = await db.source.findMany({ include: { creator: true } });
    if (!allSources.length) throw new Error("No sources are indexed yet. Register a source first.");

    const adapter = getPaymentAdapter();
    const availableBalance = await adapter.getBalance(payerWallet);
    if (mode === "contract" && availableBalance <= 0) throw new Error("Your CiteMint escrow balance is empty. Deposit Arc Testnet USDC first.");
    const ranked = rankSources(input.question, allSources);
    const candidates = ranked.filter((source) => source.score > 0);
    const pool = candidates.length >= 2 ? candidates : ranked;
    let remaining = Math.min(maxBudgetMicros, availableBalance);
    const selected = [];
    for (const source of pool) {
      if (selected.length >= 4) break;
      if (source.citationPriceMicros <= remaining) {
        selected.push(source);
        remaining -= source.citationPriceMicros;
      }
    }

    // Consume the single-use authorization and create the question in one transaction so a crash can
    // never burn the signature without producing a research record (and vice versa).
    const question = await db.$transaction(async (tx) => {
      if (authorization) {
        const consumed = await tx.agentAuthorization.updateMany({ where: { id: authorization.record.id, usedAt: null }, data: { usedAt: new Date() } });
        if (consumed.count !== 1) throw new Error("This payment authorization has already been used.");
      }
      return tx.agentQuestion.create({
        data: {
          question: input.question,
          payerWallet: payerWallet || null,
          maxBudgetMicros,
          answer: "",
          totalSpentMicros: 0,
          paymentMode: mode,
          network: mode === "contract" ? "arc-testnet" : null,
          authorizationId: authorization?.record.id,
        },
      });
    });
    const paidSources: RankedSource[] = [];
    const payments = [];
    for (const source of selected) {
      const receipt = await adapter.payCitation({
        payerWallet,
        toWallet: source.creator.walletAddress,
        amountMicros: source.citationPriceMicros,
        sourceId: source.id,
        questionId: question.id,
        authorizationId: authorization?.record.id,
      });
      const payment = await db.citationPayment.create({
        data: {
          questionId: question.id,
          sourceId: source.id,
          creatorId: source.creatorId,
          amountMicros: source.citationPriceMicros,
          status: receipt.status,
          txHash: receipt.txHash,
          receiptId: receipt.receiptId,
          paymentId: receipt.paymentId,
          chainId: receipt.chainId,
          contractAddress: receipt.contractAddress,
          blockNumber: receipt.blockNumber,
          selectionReason: source.reason,
        },
      });
      payments.push({ ...payment, source, creator: source.creator });
      if (receipt.status === "paid") paidSources.push(source);
    }

    const answer = paidSources.length
      ? await generateAnswer(input.question, paidSources)
      : "The agent could not purchase an eligible source within this budget. Deposit more USDC or increase the maximum spend.";
    const totalSpentMicros = payments.filter((payment) => payment.status === "paid").reduce((sum, payment) => sum + payment.amountMicros, 0);
    await db.agentQuestion.update({ where: { id: question.id }, data: { answer, totalSpentMicros } });

    return Response.json({
      questionId: question.id,
      answer,
      paymentMode: mode,
      totalSpentMicros,
      remainingBudgetMicros: maxBudgetMicros - totalSpentMicros,
      considered: ranked.slice(0, 6).map((source) => ({ id: source.id, title: source.title, score: source.score, priceMicros: source.citationPriceMicros, selected: paidSources.some((paid) => paid.id === source.id) })),
      payments: payments.map((payment) => ({
        id: payment.id,
        amountMicros: payment.amountMicros,
        status: payment.status,
        receiptId: payment.receiptId,
        txHash: payment.txHash,
        paymentId: payment.paymentId,
        reason: payment.selectionReason,
        source: { id: payment.source.id, title: payment.source.title, url: payment.source.url },
        creator: { name: payment.creator.name, walletAddress: payment.creator.walletAddress },
      })),
    });
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "The research run failed.";
    return Response.json({ error: message }, { status: 400 });
  }
}
