"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Bot, CircleDollarSign, ExternalLink, FileText, LoaderCircle, Pencil, RefreshCw, Wallet, X } from "lucide-react";
import { ARC_EXPLORER } from "@/lib/arc-contract";
import { useArcWallet } from "@/components/arc-wallet-provider";
import { Badge, Card } from "@/components/ui";
import { formatUsdc, microsToUsdc, shortWallet } from "@/lib/money";
import { MAX_CITATION_PRICE_USDC, MIN_USDC } from "@/lib/limits";
import { friendlyError } from "@/lib/friendly-error";

type Earnings = {
  registered: boolean;
  name: string | null;
  walletAddress: string;
  totalEarnedMicros: number;
  sourceCount: number;
  citationCount: number;
  distinctAgents: number;
  perSource: { id: string; title: string; url: string; tags: string; priceMicros: number; timesCited: number; totalMicros: number; lastCitedAt: string | null }[];
  ledger: { id: string; amountMicros: number; createdAt: string; txHash: string | null; receiptId: string; source: { title: string; url: string }; question: string }[];
};

const dateFmt = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" });

export function CreatorEarnings() {
  const { address, connect, connecting, signMessage, notify } = useArcWallet();
  const [data, setData] = useState<Earnings | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<{ id: string; title: string; price: string; tags: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (wallet: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/earnings?wallet=${wallet}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not load earnings.");
      setData(body);
    } catch (caught) {
      notify(friendlyError(caught, "Could not load your earnings."), "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  async function saveEdit() {
    if (!editing || !address) return;
    setSaving(true);
    try {
      // Prove ownership of the source's creator wallet with a fresh single-use signature.
      const challengeResponse = await fetch("/api/wallet/challenge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ walletAddress: address }) });
      const challenge = await challengeResponse.json();
      if (!challengeResponse.ok) throw new Error(challenge.error || "Could not start wallet verification.");
      const walletSignature = await signMessage(challenge.message);
      const response = await fetch(`/api/sources/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editing.title, price: Number(editing.price), tags: editing.tags, walletChallengeId: challenge.challengeId, walletSignature }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not update the source.");
      notify("Source updated.", "success");
      setEditing(null);
      await load(address);
    } catch (caught) {
      notify(friendlyError(caught, "Could not update the source."), "error");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!address) { setData(null); return; }
      void load(address);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [address, load]);

  if (!address) {
    return <Card className="flex flex-col items-center gap-3 p-8 text-center">
      <div className="grid size-11 place-items-center rounded-xl bg-[#eef5f1] text-[#39745e]"><Wallet size={19} /></div>
      <div><p className="text-sm font-semibold text-slate-800">See your creator earnings</p><p className="mt-1 text-xs text-slate-400">Connect the wallet you registered your sources with to view paid citations and usage.</p></div>
      <button onClick={() => { void connect().catch((caught) => notify(friendlyError(caught, "We could not connect your wallet."), "error")); }} disabled={connecting} className="button button-dark">{connecting ? <LoaderCircle size={14} className="animate-spin" /> : <Wallet size={14} />}Connect wallet</button>
    </Card>;
  }

  if (loading && !data) return <Card className="flex items-center justify-center gap-2 p-8 text-sm text-slate-400"><LoaderCircle size={15} className="animate-spin" />Loading your earnings…</Card>;

  if (data && !data.registered) {
    return <Card className="p-6"><p className="text-sm font-semibold text-slate-800">No sources registered for {shortWallet(address)}</p><p className="mt-1 text-xs text-slate-400">Register a source with this wallet to start earning citation payments.</p></Card>;
  }

  if (!data) return null;

  const stats = [
    { label: "Total earned", value: formatUsdc(data.totalEarnedMicros), icon: CircleDollarSign, note: "Arc Testnet USDC" },
    { label: "Agents that cited you", value: String(data.distinctAgents), icon: Bot, note: "Distinct research runs" },
    { label: "Paid citations", value: String(data.citationCount), icon: FileText, note: "Across all sources" },
    { label: "Registered sources", value: String(data.sourceCount), icon: BarChart3, note: "Indexed for the agent" },
  ];

  return <Card className="overflow-hidden">
    <div className="flex flex-col justify-between gap-3 border-b bg-[#fbfcfb] p-5 sm:flex-row sm:items-center">
      <div><p className="text-sm font-semibold text-slate-800">{data.name || "Your"} earnings</p><p className="mt-1 font-mono text-[10px] text-slate-400">{shortWallet(address)}</p></div>
      <button onClick={() => { void load(address); }} disabled={loading} className="button button-outline min-h-9! px-3!">{loading ? <LoaderCircle size={13} className="animate-spin" /> : <RefreshCw size={13} />}Refresh</button>
    </div>
    <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <div key={stat.label} className="rounded-xl bg-slate-50 p-4"><div className="flex items-center justify-between"><p className="text-[10px] uppercase tracking-wider text-slate-400">{stat.label}</p><stat.icon size={15} className="text-[#39745e]" /></div><p className="mt-2 text-2xl font-semibold text-slate-800">{stat.value}</p><p className="mt-0.5 text-[10px] text-slate-400">{stat.note}</p></div>)}</div>

    {data.perSource.length > 0 && <div className="border-t p-5">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Your sources</p>
      <div className="table-wrap"><table><thead><tr><th>Source</th><th>Price</th><th>Cited</th><th>Last cited</th><th>Earned</th><th /></tr></thead><tbody>{data.perSource.map((source) => <tr key={source.id}><td className="max-w-xs truncate font-semibold text-slate-650"><FileText size={13} className="mr-2 inline text-slate-400" /><a href={source.url} target="_blank" rel="noreferrer" className="hover:underline">{source.title}</a></td><td className="text-xs text-slate-600">{formatUsdc(source.priceMicros)}</td><td>{source.timesCited}</td><td className="whitespace-nowrap text-xs text-slate-500">{source.lastCitedAt ? dayFmt.format(new Date(source.lastCitedAt)) : "—"}</td><td className="font-bold text-[#39745e]">{formatUsdc(source.totalMicros)}</td><td className="text-right"><button onClick={() => setEditing({ id: source.id, title: source.title, price: microsToUsdc(source.priceMicros).toString(), tags: source.tags })} className="button button-outline min-h-8! px-2.5! text-xs"><Pencil size={12} />Edit</button></td></tr>)}</tbody></table></div>

      {editing && <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold text-slate-800">Edit source</p><button onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-700"><X size={16} /></button></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="label" htmlFor="edit-title">Title</label><input id="edit-title" className="input" value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} /></div>
          <div><label className="label" htmlFor="edit-price">Price per citation (USDC)</label><input id="edit-price" className="input" type="number" min={MIN_USDC} max={MAX_CITATION_PRICE_USDC} step="0.000001" value={editing.price} onChange={(event) => setEditing({ ...editing, price: event.target.value })} /></div>
          <div><label className="label" htmlFor="edit-tags">Topics</label><input id="edit-tags" className="input" value={editing.tags} onChange={(event) => setEditing({ ...editing, tags: event.target.value })} placeholder="journalism, AI, research" /></div>
        </div>
        <p className="mt-3 text-[11px] text-slate-400">Saving requires a one-time signature from your creator wallet. No transaction is sent.</p>
        <div className="mt-3 flex gap-2"><button onClick={() => { void saveEdit(); }} disabled={saving} className="button button-dark min-h-9!">{saving ? <LoaderCircle size={14} className="animate-spin" /> : null}Sign & save</button><button onClick={() => setEditing(null)} disabled={saving} className="button button-outline min-h-9!">Cancel</button></div>
      </div>}
    </div>}

    <div className="border-t p-5">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Payment ledger</p>
      {data.ledger.length ? <div className="table-wrap"><table><thead><tr><th>Date</th><th>Source</th><th>Question</th><th>Amount</th><th>Receipt</th></tr></thead><tbody>{data.ledger.map((entry) => <tr key={entry.id}><td className="whitespace-nowrap text-xs text-slate-500">{dateFmt.format(new Date(entry.createdAt))}</td><td className="max-w-40 truncate font-semibold text-slate-650">{entry.source.title}</td><td className="max-w-xs truncate text-xs text-slate-500">{entry.question}</td><td className="font-bold text-[#39745e]">{formatUsdc(entry.amountMicros)}</td><td className="max-w-32 truncate font-mono text-[10px] text-slate-400">{entry.txHash ? <a href={`${ARC_EXPLORER}/tx/${entry.txHash}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">{entry.txHash.slice(0, 14)}… <ExternalLink size={10} /></a> : entry.receiptId}</td></tr>)}</tbody></table></div> : <div className="rounded-xl bg-slate-50 px-4 py-6 text-center text-xs text-slate-400"><Badge tone="neutral">No paid citations yet</Badge><p className="mt-2">When a research agent cites one of your sources, the dated receipt appears here.</p></div>}
    </div>
  </Card>;
}
