"use client";

import Link from "next/link";
import { BookOpenText, CircleDollarSign, PlusSquare, Search, ShieldCheck, Wallet } from "lucide-react";
import { formatUnits } from "viem";
import { useArcWallet } from "@/components/arc-wallet-provider";
import { OnchainAdmin } from "@/components/onchain-admin";
import { Card, PageIntro } from "@/components/ui";
import { shortWallet } from "@/lib/money";

export function DashboardRoleView() {
  const { address, isOwner, escrowBalance } = useArcWallet();

  if (isOwner) return <>
    <PageIntro eyebrow="Owner command center" title="Platform operations and treasury." description="Your connected wallet matches the CiteMintEscrow owner. Manage settlement policy, operators and live contract controls." action={<Link href="/ask" className="button button-dark"><Search size={15} />Test research flow</Link>} />
    <OnchainAdmin />
  </>;

  return <>
    <PageIntro eyebrow="Research dashboard" title={address ? "Your onchain research account." : "Research that rewards its sources."} description={address ? `Connected as ${shortWallet(address)}. Fund your escrow, authorize one question at a time, or publish a source with this wallet.` : "Connect a wallet from the header to see your escrow balance, ask the agent, and verify a creator payout address."} action={<Link href="/ask" className="button button-dark"><Search size={15} />Ask the agent</Link>} />
    <Card className="mb-5 overflow-hidden"><div className="grid gap-0 md:grid-cols-[1.1fr_.9fr]"><div className="bg-[#173329] p-6 text-white"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-emerald-50/75">Personal research escrow</p><CircleDollarSign size={20} className="text-[#baff72]" /></div><p className="mt-5 text-3xl font-semibold tracking-[-.04em]">{address ? Number(formatUnits(escrowBalance, 6)).toFixed(6) : "—"} USDC</p><p className="mt-2 text-xs leading-5 text-emerald-50/50">{address ? "Available for signed citation purchases on Arc Testnet." : "Connect from the header to load your onchain balance."}</p></div><div className="grid grid-cols-3 divide-x p-3"><Link href="/ask" className="grid place-items-center rounded-xl p-3 text-center hover:bg-slate-50"><Search size={18} className="text-[#39745e]" /><span className="mt-2 text-xs font-semibold text-slate-700">Research</span></Link><Link href="/register" className="grid place-items-center rounded-xl p-3 text-center hover:bg-slate-50"><PlusSquare size={18} className="text-[#39745e]" /><span className="mt-2 text-xs font-semibold text-slate-700">Publish</span></Link><Link href="/sources" className="grid place-items-center rounded-xl p-3 text-center hover:bg-slate-50"><BookOpenText size={18} className="text-[#39745e]" /><span className="mt-2 text-xs font-semibold text-slate-700">Sources</span></Link></div></div><div className="flex items-center gap-2 border-t bg-slate-50 px-5 py-3 text-[11px] text-slate-500">{address ? <><ShieldCheck size={14} className="text-emerald-600" />Wallet connected and ready for signed authorization.</> : <><Wallet size={14} />One wallet works across research, creator verification and earnings.</>}</div></Card>
  </>;
}
