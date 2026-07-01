import { getAddress } from "viem";
import { db } from "@/lib/db";

// Public read of a creator's paid-citation history. Payment data is already on-chain, so no auth is
// required — the wallet is just the lookup key for "my earnings".
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("wallet")?.trim() ?? "";
  if (!/^0x[a-fA-F0-9]{40}$/.test(raw)) return Response.json({ error: "Enter a valid EVM wallet address." }, { status: 400 });
  const walletAddress = getAddress(raw);

  const creator = await db.creator.findUnique({
    where: { walletAddress },
    include: {
      sources: { select: { id: true, title: true, url: true, tags: true, citationPriceMicros: true }, orderBy: { createdAt: "desc" } },
      payments: {
        where: { status: "paid" },
        include: {
          source: { select: { id: true, title: true, url: true } },
          question: { select: { id: true, question: true, payerWallet: true, createdAt: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!creator) {
    return Response.json({ registered: false, name: null, walletAddress, totalEarnedMicros: 0, sourceCount: 0, citationCount: 0, distinctAgents: 0, perSource: [], ledger: [] });
  }

  const { payments } = creator;
  const totalEarnedMicros = payments.reduce((sum, payment) => sum + payment.amountMicros, 0);
  // "Agents" = distinct research runs that paid this creator, keyed by the payer wallet when present
  // (contract mode) and falling back to the question id (mock mode).
  const distinctAgents = new Set(payments.map((payment) => payment.question.payerWallet?.toLowerCase() ?? payment.questionId)).size;

  // Start from every source the creator owns (so uncited ones are still listed and editable), then fold
  // in payment stats.
  const perSourceMap = new Map<string, { id: string; title: string; url: string; tags: string; priceMicros: number; timesCited: number; totalMicros: number; lastCitedAt: string | null }>();
  for (const source of creator.sources) {
    perSourceMap.set(source.id, { id: source.id, title: source.title, url: source.url, tags: source.tags, priceMicros: source.citationPriceMicros, timesCited: 0, totalMicros: 0, lastCitedAt: null });
  }
  for (const payment of payments) {
    const stat = perSourceMap.get(payment.sourceId);
    if (!stat) continue;
    stat.timesCited += 1;
    stat.totalMicros += payment.amountMicros;
    if (!stat.lastCitedAt || payment.createdAt > new Date(stat.lastCitedAt)) stat.lastCitedAt = payment.createdAt.toISOString();
  }

  return Response.json({
    registered: true,
    name: creator.name,
    walletAddress,
    totalEarnedMicros,
    sourceCount: creator.sources.length,
    citationCount: payments.length,
    distinctAgents,
    perSource: [...perSourceMap.values()].sort((a, b) => b.totalMicros - a.totalMicros || (a.title < b.title ? -1 : 1)),
    ledger: payments.map((payment) => ({
      id: payment.id,
      amountMicros: payment.amountMicros,
      createdAt: payment.createdAt,
      txHash: payment.txHash,
      receiptId: payment.receiptId,
      source: { title: payment.source.title, url: payment.source.url },
      question: payment.question.question,
    })),
  });
}
