import { db } from "@/lib/db";

export async function getDashboardData() {
  const [user, questions, citations, creators, recentQuestions, recentPayments] = await Promise.all([
    db.user.findFirst({ orderBy: { createdAt: "asc" } }),
    db.agentQuestion.count(),
    db.citationPayment.count({ where: { status: "paid" } }),
    db.creator.count(),
    db.agentQuestion.findMany({ orderBy: { createdAt: "desc" }, take: 4, include: { payments: true } }),
    db.citationPayment.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { source: true, creator: true } })
  ]);
  const total = await db.citationPayment.aggregate({ where: { status: "paid" }, _sum: { amountMicros: true } });
  return { user, questions, citations, creators, recentQuestions, recentPayments, totalPaidMicros: total._sum.amountMicros ?? 0 };
}
