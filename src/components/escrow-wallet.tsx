"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, LoaderCircle, RefreshCw, Wallet } from "lucide-react";
import { formatUnits, parseUnits } from "viem";
import { arcTestnet } from "viem/chains";
import { ARC_EXPLORER, ARC_USDC_ADDRESS, CITEMINT_ESCROW_ADDRESS, escrowAbi, getArcPublicClient, usdcAbi } from "@/lib/arc-contract";
import { useArcWallet } from "@/components/arc-wallet-provider";
import { Card } from "@/components/ui";
import { shortWallet } from "@/lib/money";
import { friendlyError } from "@/lib/friendly-error";

type Balances = { wallet: bigint; escrow: bigint; allowance: bigint };

export function EscrowWallet() {
  const { address, connect, connecting, isArc, escrowBalance, switchToArc, getWalletClient, refreshEscrowBalance, notify } = useArcWallet();
  const [amount, setAmount] = useState("0.01");
  const [balances, setBalances] = useState<Balances>({ wallet: 0n, escrow: 0n, allowance: 0n });
  const [busy, setBusy] = useState("");

  const refresh = useCallback(async () => {
    if (!address || !CITEMINT_ESCROW_ADDRESS) return;
    const client = getArcPublicClient();
    const [wallet, escrow, allowance] = await Promise.all([
      client.readContract({ address: ARC_USDC_ADDRESS, abi: usdcAbi, functionName: "balanceOf", args: [address] }),
      client.readContract({ address: CITEMINT_ESCROW_ADDRESS, abi: escrowAbi, functionName: "balances", args: [address] }),
      client.readContract({ address: ARC_USDC_ADDRESS, abi: usdcAbi, functionName: "allowance", args: [address, CITEMINT_ESCROW_ADDRESS] }),
    ]);
    setBalances({ wallet, escrow, allowance });
  }, [address]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh().catch((caught) => notify(friendlyError(caught, "We could not load your Arc balances."), "error")); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh, notify]);

  useEffect(() => {
    const timer = window.setTimeout(() => setBalances((value) => ({ ...value, escrow: escrowBalance })), 0);
    return () => window.clearTimeout(timer);
  }, [escrowBalance]);

  // Keep wallet USDC / allowance current when the balance changes off-page (e.g. after a faucet claim).
  useEffect(() => {
    if (!address) return;
    const run = () => { void refresh().catch(() => undefined); void refreshEscrowBalance(); };
    const interval = window.setInterval(run, 12_000);
    const onVisible = () => { if (document.visibilityState === "visible") run(); };
    window.addEventListener("focus", run);
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", run); document.removeEventListener("visibilitychange", onVisible); };
  }, [address, refresh, refreshEscrowBalance]);

  async function ensureArc() {
    const account = address || await connect();
    if (!isArc) await switchToArc();
    return account;
  }

  async function deposit() {
    setBusy("deposit");
    try {
      const account = await ensureArc();
      const value = parseUnits(amount, 6);
      if (value <= 0n) throw new Error("Enter an amount greater than zero.");
      if (value > balances.wallet) throw new Error("Your wallet does not have enough Arc Testnet USDC.");
      const wallet = getWalletClient();
      const publicClient = getArcPublicClient();
      if (balances.allowance < value) {
        notify("Confirm the USDC spending approval in your wallet.", "info");
        const approval = await wallet.writeContract({ account, chain: arcTestnet, address: ARC_USDC_ADDRESS, abi: usdcAbi, functionName: "approve", args: [CITEMINT_ESCROW_ADDRESS, value] });
        await publicClient.waitForTransactionReceipt({ hash: approval });
      }
      notify("Approval confirmed. Now confirm the escrow deposit.", "info");
      const hash = await wallet.writeContract({ account, chain: arcTestnet, address: CITEMINT_ESCROW_ADDRESS, abi: escrowAbi, functionName: "deposit", args: [value] });
      await publicClient.waitForTransactionReceipt({ hash });
      await Promise.all([refresh(), refreshEscrowBalance()]);
      notify(`Deposit confirmed on Arc: ${hash.slice(0, 10)}…`, "success");
    } catch (caught) { notify(friendlyError(caught, "The deposit could not be completed. Check your balance and try again."), "error"); }
    finally { setBusy(""); }
  }

  async function withdraw() {
    setBusy("withdraw");
    try {
      const account = await ensureArc();
      const value = parseUnits(amount, 6);
      if (value <= 0n || value > balances.escrow) throw new Error("Enter an amount within your escrow balance.");
      const hash = await getWalletClient().writeContract({ account, chain: arcTestnet, address: CITEMINT_ESCROW_ADDRESS, abi: escrowAbi, functionName: "withdraw", args: [value] });
      await getArcPublicClient().waitForTransactionReceipt({ hash });
      await Promise.all([refresh(), refreshEscrowBalance()]);
      notify(`Withdrawal confirmed on Arc: ${hash.slice(0, 10)}…`, "success");
    } catch (caught) { notify(friendlyError(caught, "The withdrawal could not be completed. Check the amount and try again."), "error"); }
    finally { setBusy(""); }
  }

  return <Card className="overflow-hidden">
    <div className="flex items-center justify-between border-b bg-[#fbfcfb] px-5 py-4">
      <div><p className="text-sm font-semibold text-slate-800">Your Arc escrow</p><p className="mt-1 text-[11px] text-slate-400">Deposit test USDC before asking the agent</p></div>
      {address ? <button onClick={() => { void refresh(); void refreshEscrowBalance(); }} className="button button-outline !min-h-9 !px-3"><RefreshCw size={13} />{shortWallet(address)}</button> : <button onClick={() => { void connect().then(() => switchToArc()).catch((caught) => notify(friendlyError(caught, "We could not connect your wallet."), "error")); }} disabled={connecting} className="button button-dark !min-h-9 !px-3">{connecting ? <LoaderCircle size={13} className="animate-spin" /> : <Wallet size={13} />}Connect wallet</button>}
    </div>
    <div className="p-5">
      {!isArc && address && <button onClick={switchToArc} className="mb-4 w-full rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">Switch to Arc Testnet</button>}
      <div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400">Wallet USDC</p><p className="mt-1 font-semibold text-slate-750">{Number(formatUnits(balances.wallet, 6)).toFixed(6)}</p></div><div className="rounded-xl bg-emerald-50 p-3"><p className="text-[10px] uppercase tracking-wider text-emerald-600">Available escrow</p><p className="mt-1 font-semibold text-emerald-800">{Number(formatUnits(balances.escrow, 6)).toFixed(6)}</p></div></div>
      <label className="label mt-4" htmlFor="escrow-amount">Amount (USDC)</label><input id="escrow-amount" className="input" type="number" min="0.000001" step="0.000001" value={amount} onChange={(event) => setAmount(event.target.value)} />
      <div className="mt-3 grid grid-cols-2 gap-2"><button onClick={deposit} disabled={!address || !!busy} className="button button-dark">{busy === "deposit" ? <LoaderCircle size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}Approve & deposit</button><button onClick={withdraw} disabled={!address || !!busy || balances.escrow === 0n} className="button button-outline">{busy === "withdraw" ? <LoaderCircle size={14} className="animate-spin" /> : null}Withdraw</button></div>
      {busy && <p className="mt-3 text-xs font-medium text-slate-500">Waiting for Arc confirmation. Keep this page open…</p>}
      {CITEMINT_ESCROW_ADDRESS && <a className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold text-[#39745e]" href={`${ARC_EXPLORER}/address/${CITEMINT_ESCROW_ADDRESS}`} target="_blank" rel="noreferrer">View escrow on ArcScan <ExternalLink size={11} /></a>}
    </div>
  </Card>;
}
