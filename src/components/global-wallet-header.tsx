"use client";

import { CheckCircle2, Copy, LoaderCircle, LogOut, ShieldCheck, Wallet } from "lucide-react";
import { formatUnits } from "viem";
import { useArcWallet } from "@/components/arc-wallet-provider";
import { friendlyError } from "@/lib/friendly-error";
import { shortWallet } from "@/lib/money";

export function GlobalWalletHeader() {
  const { address, connecting, connect, disconnect, copyAddress, escrowBalance, isArc, switchToArc, isOwner, notify } = useArcWallet();
  async function connectSafely() { try { await connect(); notify("Wallet connected to CiteMint.", "success"); } catch (error) { notify(friendlyError(error, "We could not connect your wallet."), "error"); } }
  async function switchSafely() { try { await switchToArc(); notify("Wallet switched to Arc Testnet.", "success"); } catch (error) { notify(friendlyError(error, "We could not switch your wallet to Arc Testnet."), "error"); } }

  return <header className="flex min-h-[78px] items-center justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur sm:px-5 md:px-8">
    <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 sm:text-xs">CiteMint network</p><div className="mt-1 flex items-center gap-2 text-xs font-semibold text-slate-700 sm:text-sm"><span className="status-dot"><span /></span>Arc Testnet <span className="hidden text-slate-300 md:inline">·</span><span className="hidden font-normal text-slate-500 md:inline">Onchain USDC settlement</span></div></div>
    {!address ? <button onClick={connectSafely} disabled={connecting} className="button button-dark shrink-0">{connecting ? <LoaderCircle size={15} className="animate-spin" /> : <Wallet size={15} />}Connect wallet</button> : <div className="flex min-w-0 items-center gap-2">
      <div className="hidden text-right sm:block"><p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Available escrow</p><p className="mt-0.5 text-xs font-bold text-[#39745e] md:text-sm">{Number(formatUnits(escrowBalance, 6)).toFixed(6)} USDC</p></div>
      {!isArc && <button onClick={switchSafely} className="button !min-h-10 border border-amber-200 bg-amber-50 !px-3 text-amber-800">Switch to Arc</button>}
      <div className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 sm:px-3"><div className={`grid size-7 shrink-0 place-items-center rounded-full ${isOwner ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-emerald-700"}`}>{isOwner ? <ShieldCheck size={14} /> : <CheckCircle2 size={14} />}</div><div className="hidden sm:block"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{isOwner ? "Verified owner" : "Connected wallet"}</p><p className="font-mono text-xs font-semibold text-slate-700">{shortWallet(address)}</p></div><button onClick={copyAddress} title="Copy full wallet address" aria-label="Copy wallet address" className="grid size-7 place-items-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700"><Copy size={13} /></button><button onClick={disconnect} title="Disconnect wallet" aria-label="Disconnect wallet" className="grid size-7 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"><LogOut size={13} /></button></div>
    </div>}
  </header>;
}
