import Link from "next/link";
import { ArrowUpRight, BookOpenText, Bot, CircleDollarSign, Coins, Users } from "lucide-react";
import { Badge, Card, EmptyState } from "@/components/ui";
import { formatUsdc, shortWallet } from "@/lib/money";
import { getDashboardData } from "@/lib/queries";
import { configuredPaymentMode } from "@/lib/payment";
import { DashboardRoleView } from "@/components/dashboard-role-view";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const data = await getDashboardData();
  const metrics = [
    { label: "Questions researched", value: data.questions.toString().padStart(2, "0"), icon: Bot, note: "Agent runs" },
    { label: "Citations purchased", value: data.citations.toString().padStart(2, "0"), icon: BookOpenText, note: "Paid evidence" },
    { label: "Creators paid", value: data.creators.toString().padStart(2, "0"), icon: Users, note: "Indexed publishers" },
    { label: "Total USDC routed", value: formatUsdc(data.totalPaidMicros), icon: Coins, note: "Confirmed settlements" }
  ];
  return <>
    <DashboardRoleView />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => <Card key={metric.label} className="p-5"><div className="flex items-start justify-between"><div className="grid size-10 place-items-center rounded-xl bg-[#eef5f1] text-[#376b58]"><metric.icon size={18} /></div><Badge tone="green">Live</Badge></div><p className="mt-6 text-[30px] font-semibold tracking-[-.04em] text-[#15241f]">{metric.value}</p><p className="mt-1 text-sm font-semibold text-slate-700">{metric.label}</p><p className="mt-1 text-xs text-slate-400">{metric.note}</p></Card>)}
    </div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <Card className="overflow-hidden"><div className="flex items-center justify-between border-b p-5"><div><p className="font-semibold text-slate-800">Recent research</p><p className="mt-1 text-xs text-slate-400">Answers purchased by your agent</p></div><Link href="/ask" className="text-xs font-semibold text-[#39745e]">New question <ArrowUpRight className="inline" size={13} /></Link></div>
        {data.recentQuestions.length ? <div className="divide-y">{data.recentQuestions.map((question) => <div key={question.id} className="group p-5 hover:bg-slate-50/70"><div className="flex items-start justify-between gap-5"><div><p className="line-clamp-1 text-sm font-semibold text-slate-700">{question.question}</p><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{question.answer}</p></div><Badge tone="purple">{question.payments.length} sources</Badge></div><div className="mt-3 flex items-center gap-4 text-[11px] text-slate-400"><span>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(question.createdAt)}</span><span className="font-semibold text-[#39745e]">{formatUsdc(question.totalSpentMicros)} paid</span></div></div>)}</div> : <EmptyState title="No research runs yet" copy="Ask your first question to populate this feed." />}
      </Card>
      <div className="space-y-5">
        {configuredPaymentMode() === "mock" && <Card className="overflow-hidden bg-[#173329] text-white"><div className="p-6"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-emerald-50/80">Available agent budget</p><CircleDollarSign size={21} className="text-[#baff72]" /></div><p className="mt-5 text-[40px] font-semibold tracking-[-.05em]">{formatUsdc(data.user?.demoBalanceMicros ?? 0, true)}</p><p className="mt-1 text-xs text-emerald-50/55">Demo balance used for mock-mode research runs</p><div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-[11px] text-emerald-50/60"><span className="font-mono">{data.user ? shortWallet(data.user.walletAddress) : "No demo wallet"}</span><span className="uppercase tracking-wider text-emerald-50/45">Test USDC · Arc</span></div></div></Card>}
        <Card className="overflow-hidden"><div className="border-b p-5"><p className="font-semibold text-slate-800">Latest settlements</p><p className="mt-1 text-xs text-slate-400">Creator payments and receipts</p></div>{data.recentPayments.length ? <div className="divide-y">{data.recentPayments.map((payment) => <div key={payment.id} className="flex items-center justify-between gap-3 px-5 py-3.5"><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-650">{payment.creator.name}</p><p className="mt-1 truncate text-[10px] text-slate-400">{payment.source.title}</p></div><div className="text-right"><p className="text-xs font-bold text-[#39745e]">{formatUsdc(payment.amountMicros)}</p><Badge tone="green">Paid</Badge></div></div>)}</div> : <EmptyState title="No settlements" copy="Receipts appear after the first answer." />}</Card>
      </div>
    </div>
  </>;
}
