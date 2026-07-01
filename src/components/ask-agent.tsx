"use client";

import { useState } from "react";
import { ArrowRight, Check, Copy, ExternalLink, FileSearch, LoaderCircle, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { ARC_EXPLORER } from "@/lib/arc-contract";
import { useArcWallet } from "@/components/arc-wallet-provider";
import { EscrowWallet } from "@/components/escrow-wallet";
import { Badge, Card, PageIntro } from "@/components/ui";
import { formatUsdc, shortWallet } from "@/lib/money";
import { friendlyError } from "@/lib/friendly-error";

type Result = {
  answer: string;
  paymentMode: string;
  totalSpentMicros: number;
  remainingBudgetMicros: number;
  payments: { id: string; amountMicros: number; status: string; receiptId: string; txHash?: string; paymentId?: string; reason: string; source: { title: string; url: string }; creator: { name: string; walletAddress: string } }[];
};

const demoQuestion = "How can nanopayments help independent writers and AI agents?";

export function AskAgent() {
  const { address, isArc, escrowBalance, refreshEscrowBalance, switchToArc, signMessage, signTypedData, notify } = useArcWallet();
  const [question, setQuestion] = useState(demoQuestion);
  const [budget, setBudget] = useState("0.01");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  async function runAgent(event: React.FormEvent) {
    event.preventDefault(); setResult(null); setError("");
    try {
      if (!address) throw new Error("Connect your wallet from the page header before asking the agent.");
      if (escrowBalance <= 0n) throw new Error("Your escrow is empty. Deposit Arc Testnet USDC before asking the agent.");
      const payer = address;
      if (!isArc) await switchToArc();
      setLoading(true); setStage(1);
      const authorizationResponse = await fetch("/api/agent/authorization", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, maxBudget: Number(budget), walletAddress: payer }) });
      const authorization = await authorizationResponse.json();
      if (!authorizationResponse.ok) throw new Error(authorization.error || "Could not create the payment authorization.");
      setStage(2);
      const signature = authorization.typedData
        ? await signTypedData({
            domain: authorization.typedData.domain,
            types: authorization.typedData.types,
            primaryType: authorization.typedData.primaryType,
            message: { ...authorization.typedData.message, maxTotal: BigInt(authorization.typedData.message.maxTotal), deadline: BigInt(authorization.typedData.message.deadline) },
          })
        : await signMessage(authorization.message);
      setStage(3);
      const response = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, maxBudget: Number(budget), walletAddress: payer, authorizationId: authorization.authorizationId, signature }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "The agent could not complete this run.");
      setResult(body); setStage(4); await refreshEscrowBalance(); notify("Research completed and creator payments were settled on Arc.", "success");
    } catch (caught) { const message = friendlyError(caught, "The research run could not be completed. Please check your wallet and try again."); setError(message); notify(message, "error"); }
    finally { setLoading(false); }
  }

  const execution = [
    [FileSearch, "Rank indexed evidence"],
    [ShieldCheck, "Sign question spending limit"],
    [WalletCards, "Settle creator USDC on Arc"],
    [Sparkles, "Compose answer with receipts"],
  ] as const;

  return <>
    <PageIntro eyebrow="Onchain research" title="Ask. Verify. Pay on Arc." description="Connect a wallet, fund your escrow, and authorize a maximum spend for this question. CiteMint settles every purchased source onchain." />
    <div className="grid gap-5 xl:grid-cols-[.82fr_1.18fr]">
      <div className="space-y-5">
        <EscrowWallet />
        <Card className="p-6"><form onSubmit={runAgent} className="space-y-5">
          <div><label className="label" htmlFor="question">Research question</label><textarea id="question" className="input min-h-32 resize-none leading-6" value={question} onChange={(event) => setQuestion(event.target.value)} /></div>
          <div><div className="mb-2 flex justify-between"><label className="label mb-0" htmlFor="budget">Maximum authorized spend</label><span className="text-xs font-bold text-[#39745e]">${Number(budget || 0).toFixed(4)} USDC</span></div><input id="budget" type="range" min="0.0001" max="0.02" step="0.0001" value={budget} onChange={(event) => setBudget(event.target.value)} className="w-full accent-[#2e7256]" /><div className="mt-1 flex justify-between text-[10px] text-slate-400"><span>$0.0001</span><span>$0.02</span></div></div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 text-xs leading-5 text-emerald-800"><strong>One signature, one question:</strong> your authorization is bound to this question, wallet, budget and a ten-minute expiry. It cannot approve tokens or be reused.</div>
          <button disabled={loading || !address || escrowBalance <= 0n} className="button button-dark w-full">{loading ? <><LoaderCircle size={16} className="animate-spin" />Settling on Arc…</> : !address ? <><WalletCards size={16} />Connect wallet from header</> : escrowBalance <= 0n ? <><WalletCards size={16} />Deposit USDC to continue</> : <><Sparkles size={16} />Authorize and run agent<ArrowRight size={15} /></>}</button>
          <p className="text-center text-[11px] text-slate-400">{address ? `${shortWallet(address)} · ${isArc ? "Arc Testnet" : "switch network required"}` : "Wallet connection required"}</p>
        </form></Card>
        {(loading || result) && <Card className="p-5"><p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">Onchain execution</p><div className="space-y-4">{execution.map(([Icon, label], index) => { const done = stage > index; const active = loading && stage === index + 1; return <div key={label} className="flex items-center gap-3"><div className={`grid size-7 place-items-center rounded-full ${done ? "bg-emerald-100 text-emerald-700" : active ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400"}`}>{done ? <Check size={14} /> : active ? <LoaderCircle size={13} className="animate-spin" /> : <Icon size={13} />}</div><span className={`text-xs font-medium ${done || active ? "text-slate-700" : "text-slate-400"}`}>{label}</span></div>; })}</div></Card>}
      </div>
      <div>
        {error && <Card className="mb-5 border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</Card>}
        {!result && <Card className="grid min-h-[560px] place-items-center border-dashed p-8 text-center"><div className="max-w-sm"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#eef5f1] text-[#39745e]">{loading ? <LoaderCircle size={23} className="animate-spin" /> : <Sparkles size={23} />}</div><p className="mt-5 text-lg font-semibold text-slate-700">{loading ? "Agent is settling evidence" : "Fund the escrow, then ask"}</p><p className="mt-2 text-sm leading-6 text-slate-400">Every successful citation will include an Arc transaction hash that anyone can verify.</p></div></Card>}
        {result && <div className="space-y-5"><Card className="overflow-hidden"><div className="flex items-center justify-between border-b bg-[#fbfcfb] px-6 py-4"><div><Badge tone="green">Onchain answer complete</Badge><p className="mt-2 text-xs text-slate-400">{result.payments.filter((item) => item.status === "paid").length} sources · {formatUsdc(result.totalSpentMicros)} settled</p></div><button className="button button-outline !min-h-9 !px-3" onClick={() => navigator.clipboard.writeText(result.answer)}><Copy size={13} />Copy</button></div><article className="whitespace-pre-line p-6 text-[15px] leading-7 text-slate-650">{result.answer}</article></Card>
          <Card className="overflow-hidden"><div className="border-b px-6 py-4"><p className="font-semibold text-slate-800">Arc settlement receipts</p><p className="mt-1 text-xs text-slate-400">One verifiable payment per purchased source</p></div><div className="divide-y">{result.payments.map((payment, index) => <div key={payment.id} className="p-5"><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 gap-3"><div className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#eef5f1] text-xs font-bold text-[#39745e]">{index + 1}</div><div><a href={payment.source.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-slate-750 hover:text-[#39745e]">{payment.source.title}</a><p className="mt-1 text-xs text-slate-400">{payment.creator.name} · {shortWallet(payment.creator.walletAddress)}</p></div></div><div className="text-right"><p className="text-sm font-bold text-[#39745e]">{formatUsdc(payment.amountMicros)}</p><Badge tone={payment.status === "paid" ? "green" : "amber"}>{payment.status}</Badge></div></div><p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500">{payment.reason}</p>{payment.txHash ? <a href={`${ARC_EXPLORER}/tx/${payment.txHash}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] text-[#39745e]">{payment.txHash.slice(0, 18)}… <ExternalLink size={10} /></a> : <p className="mt-2 font-mono text-[10px] text-slate-350">{payment.receiptId}</p>}</div>)}</div></Card>
          <Card className="p-5"><div className="flex items-center justify-between text-sm"><span className="text-slate-500">Unused authorization</span><strong className="text-slate-750">{formatUsdc(result.remainingBudgetMicros)}</strong></div></Card>
        </div>}
      </div>
    </div>
  </>;
}
