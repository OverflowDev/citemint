"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, CheckCircle2, FileText, Globe2, LoaderCircle, ShieldCheck, Unplug, Wallet } from "lucide-react";
import { Card, PageIntro } from "@/components/ui";
import { shortWallet } from "@/lib/money";
import { useArcWallet } from "@/components/arc-wallet-provider";

const initial = { creatorName: "", walletAddress: "", url: "", price: "0.0001", tags: "", summary: "" };
type WalletProof = { challengeId: string; signature: string };

export function RegisterSource() {
  const { address, getWalletClient, notify } = useArcWallet();
  const [form, setForm] = useState(initial);
  const [walletProof, setWalletProof] = useState<WalletProof | null>(null);
  const [signing, setSigning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ title: string; ingested?: boolean; excerpt?: string } | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setWalletProof(null);
      setForm((value) => ({ ...value, walletAddress: address || "" }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [address]);

  function update(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((value) => ({ ...value, [event.target.name]: event.target.value }));
  }

  async function verifyConnectedWallet() {
    setError("");
    if (!address) {
      setError("Connect the payout wallet from the page header first.");
      return;
    }
    setSigning(true);
    try {
      const walletAddress = address;
      const challengeResponse = await fetch("/api/wallet/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress })
      });
      const challenge = await challengeResponse.json();
      if (!challengeResponse.ok) throw new Error(challenge.error || "Could not start wallet verification.");
      const signature = await getWalletClient().signMessage({ account: walletAddress, message: challenge.message });
      setForm((value) => ({ ...value, walletAddress }));
      setWalletProof({ challengeId: challenge.challengeId, signature });
      notify("Wallet ownership verified. You can register your source now.", "success");
    } catch (caught) {
      setWalletProof(null);
      const message = caught instanceof Error ? caught.message : "Wallet connection was cancelled.";
      setError(message);
      notify(message, "error");
    } finally {
      setSigning(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setCreated(null);
    if (!walletProof || !form.walletAddress) {
      setError("Connect and sign with the creator wallet before registering a source.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          walletChallengeId: walletProof.challengeId,
          walletSignature: walletProof.signature
        })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Registration failed.");
      setCreated(body);
      setForm(initial);
      setWalletProof(null);
      notify("Source registered and indexed for the research agent.", "success");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Registration failed.";
      setError(message);
      notify(message, "error");
    } finally {
      setLoading(false);
    }
  }

  return <>
    <PageIntro eyebrow="Creator onboarding" title="Prove the wallet. Publish the source." description="Anyone can join CiteMint. A one-time signature proves that the payout wallet belongs to the creator—without exposing its private key or approving a transaction." />
    <div className="grid gap-5 xl:grid-cols-[1fr_.58fr]">
      <Card className="p-6 md:p-8">
        {created ? <div className="grid min-h-[520px] place-items-center text-center"><div className="max-w-md"><CheckCircle2 size={48} className="mx-auto text-emerald-600" /><h2 className="mt-5 text-2xl font-semibold text-slate-800">Source registered</h2><p className="mt-2 text-sm text-slate-500"><strong>{created.title}</strong> is now searchable and linked to a verified payout wallet.</p>
          <div className={`mt-4 rounded-xl border p-3 text-left text-xs leading-5 ${created.ingested ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
            <p className="font-semibold">{created.ingested ? "✓ Fetched from the article URL" : "Used your fallback summary"}</p>
            <p className="mt-1 opacity-80">{created.ingested ? "CiteMint pulled the title and text from the page." : "The URL could not be fetched (blocked, private, or no readable text), so your pasted summary was indexed instead."}</p>
            {created.excerpt && <p className="mt-2 line-clamp-3 italic opacity-70">“{created.excerpt}”</p>}
          </div>
          <div className="mt-6 flex justify-center gap-3"><button className="button button-outline" onClick={() => setCreated(null)}>Add another</button><Link href="/sources" className="button button-dark">View marketplace</Link></div></div></div> :
        <form onSubmit={submit} className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3"><div className={`grid size-10 place-items-center rounded-xl ${walletProof ? "bg-emerald-100 text-emerald-700" : "bg-white text-slate-500 shadow-sm"}`}>{walletProof ? <Check size={18} /> : <Wallet size={18} />}</div><div><p className="text-sm font-semibold text-slate-750">Creator payout wallet</p><p className="mt-1 text-[11px] text-slate-400">{walletProof ? `${shortWallet(form.walletAddress)} · ownership signed` : address ? `${shortWallet(address)} · connected in header` : "Connect your payout wallet from the page header."}</p></div></div>
              <button type="button" onClick={verifyConnectedWallet} disabled={signing || !address} className={walletProof ? "button button-outline" : "button button-dark"}>{signing ? <><LoaderCircle size={15} className="animate-spin" />Waiting for signature…</> : walletProof ? <><ShieldCheck size={15} />Verified</> : <><ShieldCheck size={15} />Verify connected wallet</>}</button>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2"><div><label className="label" htmlFor="creatorName">Creator or publisher name</label><input className="input" id="creatorName" name="creatorName" value={form.creatorName} onChange={update} placeholder="Your public name" required /></div><div><label className="label">Verified wallet</label><div className="input flex items-center overflow-hidden font-mono text-xs text-slate-500" title={form.walletAddress || undefined}><span className="truncate">{form.walletAddress || "Connect wallet in the header"}</span></div></div></div>
          <div><label className="label" htmlFor="url">Article URL</label><div className="relative"><Globe2 size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input className="input" style={{ paddingLeft: 44 }} type="url" id="url" name="url" value={form.url} onChange={update} placeholder="https://your-publication.com/article" required /></div><p className="mt-2 text-[11px] text-slate-400">We fetch public article metadata and text. No paywalls are bypassed.</p></div>
          <div className="grid gap-5 md:grid-cols-2"><div><label className="label" htmlFor="price">Price per citation (USDC)</label><input className="input" type="number" min="0.000001" max="0.1" step="0.000001" id="price" name="price" value={form.price} onChange={update} required /></div><div><label className="label" htmlFor="tags">Topics</label><input className="input" id="tags" name="tags" value={form.tags} onChange={update} placeholder="journalism, AI, research" /></div></div>
          <div><label className="label" htmlFor="summary">Fallback article summary <span className="font-normal text-slate-400">(recommended)</span></label><textarea className="input min-h-28 resize-none" id="summary" name="summary" value={form.summary} onChange={update} maxLength={20000} placeholder="Used only if the publisher blocks automated fetching. Paste the article text here — it becomes the indexed content the agent ranks and cites." /><p className="mt-2 text-[11px] text-slate-400">{form.summary.length.toLocaleString()}/20,000 characters</p></div>
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
          <button disabled={loading || !walletProof} className="button button-dark w-full sm:w-auto">{loading ? <><LoaderCircle size={15} className="animate-spin" />Fetching article…</> : <>Register verified source<ArrowRight size={15} /></>}</button>
        </form>}
      </Card>
      <div className="space-y-5">
        <Card className="p-5"><p className="text-sm font-semibold text-slate-800">Ownership flow</p><div className="mt-5 space-y-5">{[[Wallet, "Connect", "Choose the EVM wallet that should receive citation payments."], [ShieldCheck, "Sign", "Sign a ten-minute, single-use ownership message. No transaction is sent."], [FileText, "Publish", "The verified wallet is stored with your indexed source."]].map(([Icon, title, copy]) => <div key={title as string} className="flex gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#eef5f1] text-[#39745e]"><Icon size={16} /></div><div><p className="text-xs font-semibold text-slate-700">{title as string}</p><p className="mt-1 text-xs leading-5 text-slate-400">{copy as string}</p></div></div>)}</div></Card>
        <Card className="bg-[#fffaf0] p-5"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700"><Unplug size={14} />Signature safety</p><p className="mt-2 text-xs leading-5 text-amber-900/60">CiteMint never requests a private key. The message states its purpose and explicitly does not authorize a transfer.</p></Card>
      </div>
    </div>
  </>;
}
