"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, LoaderCircle, LockKeyhole, RefreshCw, Settings2 } from "lucide-react";
import { formatUnits, getAddress, isAddress } from "viem";
import { arcTestnet } from "viem/chains";
import { ARC_EXPLORER, ACTIVE_ESCROW_ADDRESS, escrowAbi, getArcPublicClient } from "@/lib/arc-contract";
import { useArcWallet } from "@/components/arc-wallet-provider";
import { Badge, Card } from "@/components/ui";
import { shortWallet } from "@/lib/money";

type State = { owner: `0x${string}`; treasury: `0x${string}`; feeBps: number; totalEscrowed: bigint; paused: boolean };

// Operators can't be enumerated on-chain and some RPCs cap historical log ranges, so we remember every
// address we've ever touched (per escrow) and re-check its live status. Keyed by contract address.
const knownOperatorsKey = () => `citemint.knownOperators.${ACTIVE_ESCROW_ADDRESS}`;

function readKnownOperators(): `0x${string}`[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(knownOperatorsKey()) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is `0x${string}` => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function rememberOperators(addresses: string[]) {
  if (typeof window === "undefined") return;
  try {
    const merged = [...new Set([...readKnownOperators(), ...addresses.map((item) => getAddress(item.toLowerCase()))])];
    window.localStorage.setItem(knownOperatorsKey(), JSON.stringify(merged));
  } catch {
    /* localStorage may be unavailable; the list still works from owner + logs this session. */
  }
}

export function OnchainAdmin() {
  const { address, connect, isArc, isOwner, switchToArc, getWalletClient, notify } = useArcWallet();
  const [state, setState] = useState<State | null>(null);
  const [fee, setFee] = useState("500");
  const [treasury, setTreasury] = useState("");
  const [operator, setOperator] = useState("");
  const [operators, setOperators] = useState<`0x${string}`[]>([]);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!ACTIVE_ESCROW_ADDRESS) return;
    const client = getArcPublicClient();
    const [owner, nextTreasury, feeBps, totalEscrowed, paused] = await Promise.all([
      client.readContract({ address: ACTIVE_ESCROW_ADDRESS, abi: escrowAbi, functionName: "owner" }),
      client.readContract({ address: ACTIVE_ESCROW_ADDRESS, abi: escrowAbi, functionName: "treasury" }),
      client.readContract({ address: ACTIVE_ESCROW_ADDRESS, abi: escrowAbi, functionName: "platformFeeBps" }),
      client.readContract({ address: ACTIVE_ESCROW_ADDRESS, abi: escrowAbi, functionName: "totalEscrowed" }),
      client.readContract({ address: ACTIVE_ESCROW_ADDRESS, abi: escrowAbi, functionName: "paused" }),
    ]);
    setState({ owner, treasury: nextTreasury, feeBps: Number(feeBps), totalEscrowed, paused });
    setFee(String(feeBps)); setTreasury(nextTreasury);
    // Build the candidate set from the owner (auto-operator at deploy), the local cache of addresses we've
    // touched, and OperatorUpdated logs (best-effort — some RPCs reject wide ranges). Then confirm each
    // against the live operators() view so removed addresses drop off.
    const candidateSet = new Set<`0x${string}`>([getAddress(owner), ...readKnownOperators()]);
    try {
      const logs = await client.getContractEvents({ address: ACTIVE_ESCROW_ADDRESS, abi: escrowAbi, eventName: "OperatorUpdated", fromBlock: 0n });
      for (const log of logs) candidateSet.add(getAddress((log.args.operator as string).toLowerCase()));
    } catch {
      /* RPC capped the log range; fall back to owner + cache. */
    }
    const candidates = [...candidateSet];
    rememberOperators(candidates);
    const statuses = await Promise.all(candidates.map((candidate) => client.readContract({ address: ACTIVE_ESCROW_ADDRESS, abi: escrowAbi, functionName: "operators", args: [candidate] })));
    setOperators(candidates.filter((_, index) => statuses[index]));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh().catch((caught) => setError(caught instanceof Error ? caught.message : "Could not read the escrow contract.")); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);
  if (!isOwner || !address) return null;

  async function write(action: string, functionName: "setPlatformFeeBps" | "setTreasury" | "setOperator" | "pause" | "unpause", args: readonly unknown[] = []) {
    setBusy(action); setError(""); setMessage("");
    try {
      const account = address || await connect();
      if (!isArc) await switchToArc();
      const hash = await getWalletClient().writeContract({ account, chain: arcTestnet, address: ACTIVE_ESCROW_ADDRESS, abi: escrowAbi, functionName, args } as never);
      await getArcPublicClient().waitForTransactionReceipt({ hash });
      // Cache operator addresses locally so the list resolves even when the RPC won't return logs.
      if (functionName === "setOperator" && typeof args[0] === "string") rememberOperators([args[0]]);
      const success = `${action} confirmed on Arc.`;
      setMessage(success); notify(success, "success"); await refresh();
    } catch (caught) { const failure = caught instanceof Error ? caught.message : `${action} failed.`; setError(failure); notify(failure, "error"); }
    finally { setBusy(""); }
  }

  return <Card className="mb-5 overflow-hidden">
    <div className="flex flex-col justify-between gap-4 border-b bg-[#173329] px-6 py-5 text-white md:flex-row md:items-center"><div><p className="flex items-center gap-2 text-sm font-semibold"><Settings2 size={16} className="text-[#baff72]" />Onchain escrow control</p><p className="mt-1 text-xs text-emerald-50/50">Live state from CiteMintEscrow on Arc Testnet</p></div><div className="flex items-center gap-2"><Badge tone={state?.paused ? "amber" : "green"}>{state?.paused ? "Paused" : "Active"}</Badge><a href={`${ARC_EXPLORER}/address/${ACTIVE_ESCROW_ADDRESS}`} target="_blank" rel="noreferrer" className="button !min-h-9 border border-white/15 bg-white/10 !px-3 text-white">ArcScan <ExternalLink size={12} /></a></div></div>
    <div className="p-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] uppercase tracking-wider text-slate-400">Total user escrow</p><p className="mt-2 text-xl font-semibold text-slate-800">{state ? Number(formatUnits(state.totalEscrowed, 6)).toFixed(6) : "—"} USDC</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] uppercase tracking-wider text-slate-400">Platform fee</p><p className="mt-2 text-xl font-semibold text-slate-800">{state ? state.feeBps / 100 : "—"}%</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] uppercase tracking-wider text-slate-400">Owner</p><p className="mt-2 text-sm font-semibold text-slate-700">{state ? shortWallet(state.owner) : "—"}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] uppercase tracking-wider text-slate-400">Treasury</p><p className="mt-2 text-sm font-semibold text-slate-700">{state ? shortWallet(state.treasury) : "—"}</p></div></div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3"><div><label className="label">Fee in basis points (max 1000)</label><div className="flex gap-2"><input className="input" type="number" min="0" max="1000" value={fee} onChange={(event) => setFee(event.target.value)} /><button onClick={() => write("Fee update", "setPlatformFeeBps", [Number(fee)])} disabled={!!busy} className="button button-outline">Save</button></div></div><div><label className="label">Treasury wallet</label><div className="flex gap-2"><input className="input font-mono text-xs" value={treasury} onChange={(event) => setTreasury(event.target.value)} /><button onClick={() => isAddress(treasury) ? write("Treasury update", "setTreasury", [getAddress(treasury.toLowerCase())]) : setError("Enter a valid treasury address.")} disabled={!!busy} className="button button-outline">Save</button></div></div><div><label className="label">Add settlement operator</label><div className="flex gap-2"><input className="input font-mono text-xs" value={operator} onChange={(event) => setOperator(event.target.value)} placeholder="0x…" /><button onClick={() => isAddress(operator) ? write("Operator update", "setOperator", [getAddress(operator.toLowerCase()), true]) : setError("Enter a valid operator address.")} disabled={!!busy} className="button button-outline">Add</button></div></div><div className="lg:col-span-3 flex gap-2"><button onClick={() => write("Contract status", state?.paused ? "unpause" : "pause")} disabled={!!busy} className="button button-dark">{busy ? <LoaderCircle size={14} className="animate-spin" /> : <LockKeyhole size={14} />}{state?.paused ? "Unpause deposits and settlements" : "Pause deposits and settlements"}</button><button onClick={() => refresh()} className="button button-outline"><RefreshCw size={14} />Refresh</button></div></div>
      <div className="mt-6 border-t pt-5">
        <p className="text-sm font-semibold text-slate-800">Authorized settlement operators</p>
        <p className="mt-1 text-xs text-slate-400">Every address here can settle citations from user escrow. The server signs with the matching OPERATOR_PRIVATE_KEY.</p>
        {operators.length ? <ul className="mt-4 space-y-2">{operators.map((op) => { const isOwnerOperator = !!state && op.toLowerCase() === state.owner.toLowerCase(); return <li key={op} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"><span className="flex min-w-0 items-center gap-2 font-mono text-xs text-slate-700"><span className="truncate" title={op}>{op}</span>{isOwnerOperator && <Badge tone="green">Owner</Badge>}</span><button onClick={() => write("Operator removed", "setOperator", [op, false])} disabled={!!busy} className="button button-outline !min-h-8 !px-3 font-sans text-red-600 hover:border-red-200">{busy === "Operator removed" ? <LoaderCircle size={13} className="animate-spin" /> : null}Remove</button></li>; })}</ul> : <p className="mt-4 text-xs text-slate-400">No operators found yet. Add one above, or the RPC did not return operator history.</p>}
      </div>
      {message && <p className="mt-4 text-xs text-emerald-700">{message}</p>}{error && <p className="mt-4 text-xs text-red-600">{error}</p>}
    </div>
  </Card>;
}
