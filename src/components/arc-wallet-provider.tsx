"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { createWalletClient, custom, getAddress, type WalletClient } from "viem";
import { arcTestnet } from "viem/chains";
import { ARC_CHAIN_HEX, ARC_CHAIN_ID, ARC_EXPLORER, ARC_RPC_URL, CITEMINT_ESCROW_ADDRESS, escrowAbi, getArcPublicClient } from "@/lib/arc-contract";

type ToastTone = "success" | "error" | "info";
type Toast = { id: string; message: string; tone: ToastTone };
type ArcWalletContextValue = {
  address: `0x${string}` | null;
  chainId: number | null;
  connecting: boolean;
  isArc: boolean;
  ownerAddress: `0x${string}` | null;
  isOwner: boolean;
  escrowBalance: bigint;
  connect: () => Promise<`0x${string}`>;
  disconnect: () => Promise<void>;
  copyAddress: () => Promise<void>;
  switchToArc: () => Promise<void>;
  signMessage: (message: string) => Promise<`0x${string}`>;
  getWalletClient: () => WalletClient;
  refreshEscrowBalance: () => Promise<void>;
  notify: (message: string, tone?: ToastTone) => void;
};

const ArcWalletContext = createContext<ArcWalletContextValue | null>(null);

export function ArcWalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [ownerAddress, setOwnerAddress] = useState<`0x${string}` | null>(null);
  const [escrowBalance, setEscrowBalance] = useState<bigint>(0n);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, tone: ToastTone = "info") => {
    const id = crypto.randomUUID();
    setToasts((items) => [...items, { id, message, tone }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 10_000);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!CITEMINT_ESCROW_ADDRESS) return;
      void getArcPublicClient().readContract({ address: CITEMINT_ESCROW_ADDRESS, abi: escrowAbi, functionName: "owner" }).then(setOwnerAddress).catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const provider = window.ethereum;
    if (!provider) return;
    provider.request<string[]>({ method: "eth_accounts" }).then((accounts) => setAddress(accounts[0] ? getAddress(accounts[0].toLowerCase()) : null)).catch(() => undefined);
    provider.request<string>({ method: "eth_chainId" }).then((value) => setChainId(Number.parseInt(value, 16))).catch(() => undefined);
    const accountsChanged = (accounts: string[]) => setAddress(accounts[0] ? getAddress(accounts[0].toLowerCase()) : null);
    const chainChanged = (value: string) => setChainId(Number.parseInt(value, 16));
    provider.on?.("accountsChanged", accountsChanged);
    provider.on?.("chainChanged", chainChanged);
    return () => { provider.removeListener?.("accountsChanged", accountsChanged); provider.removeListener?.("chainChanged", chainChanged); };
  }, []);

  const refreshEscrowBalance = useCallback(async () => {
    if (!address || !CITEMINT_ESCROW_ADDRESS) { setEscrowBalance(0n); return; }
    const balance = await getArcPublicClient().readContract({ address: CITEMINT_ESCROW_ADDRESS, abi: escrowAbi, functionName: "balances", args: [address] });
    setEscrowBalance(balance);
  }, [address]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refreshEscrowBalance(); }, 0);
    const interval = window.setInterval(() => { void refreshEscrowBalance(); }, 15_000);
    return () => { window.clearTimeout(timer); window.clearInterval(interval); };
  }, [refreshEscrowBalance]);

  const connect = useCallback(async () => {
    if (!window.ethereum) throw new Error("Install MetaMask or another EVM wallet first.");
    setConnecting(true);
    try {
      const accounts = await window.ethereum.request<string[]>({ method: "eth_requestAccounts" });
      if (!accounts[0]) throw new Error("The wallet did not return an account.");
      const next = getAddress(accounts[0].toLowerCase()); setAddress(next); return next;
    } finally { setConnecting(false); }
  }, []);

  const disconnect = useCallback(async () => {
    try { await window.ethereum?.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] }); } catch { /* Some wallets do not implement permission revocation. */ }
    setAddress(null); setEscrowBalance(0n); notify("Wallet disconnected from CiteMint.", "info");
  }, [notify]);

  const copyAddress = useCallback(async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address); notify("Wallet address copied.", "success");
  }, [address, notify]);

  const switchToArc = useCallback(async () => {
    if (!window.ethereum) throw new Error("Install MetaMask or another EVM wallet first.");
    try { await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: ARC_CHAIN_HEX }] }); }
    catch (error) {
      const code = typeof error === "object" && error && "code" in error ? Number((error as { code: unknown }).code) : 0;
      if (code !== 4902) throw error;
      await window.ethereum.request({ method: "wallet_addEthereumChain", params: [{ chainId: ARC_CHAIN_HEX, chainName: "Arc Testnet", nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, rpcUrls: [ARC_RPC_URL], blockExplorerUrls: [ARC_EXPLORER] }] });
    }
    setChainId(ARC_CHAIN_ID);
  }, []);

  const getWalletClient = useCallback(() => {
    if (!window.ethereum) throw new Error("Install MetaMask or another EVM wallet first.");
    return createWalletClient({ chain: arcTestnet, transport: custom(window.ethereum) });
  }, []);

  const signMessage = useCallback(async (message: string) => {
    const account = address || await connect();
    if (chainId !== ARC_CHAIN_ID) await switchToArc();
    return getWalletClient().signMessage({ account, message });
  }, [address, chainId, connect, getWalletClient, switchToArc]);

  const isOwner = !!address && !!ownerAddress && address.toLowerCase() === ownerAddress.toLowerCase();
  const value = useMemo(() => ({ address, chainId, connecting, isArc: chainId === ARC_CHAIN_ID, ownerAddress, isOwner, escrowBalance, connect, disconnect, copyAddress, switchToArc, signMessage, getWalletClient, refreshEscrowBalance, notify }), [address, chainId, connecting, ownerAddress, isOwner, escrowBalance, connect, disconnect, copyAddress, switchToArc, signMessage, getWalletClient, refreshEscrowBalance, notify]);
  return <ArcWalletContext.Provider value={value}>{children}<div className="fixed bottom-5 right-5 z-[100] flex w-[min(380px,calc(100vw-40px))] flex-col gap-3">{toasts.map((toast) => { const Icon = toast.tone === "success" ? CheckCircle2 : toast.tone === "error" ? AlertCircle : Info; return <div key={toast.id} className={`flex items-start gap-3 rounded-2xl border p-4 shadow-xl backdrop-blur ${toast.tone === "success" ? "border-emerald-200 bg-emerald-50/95 text-emerald-900" : toast.tone === "error" ? "border-red-200 bg-red-50/95 text-red-900" : "border-slate-200 bg-white/95 text-slate-700"}`}><Icon size={19} className="mt-0.5 shrink-0" /><p className="flex-1 text-sm font-medium leading-5">{toast.message}</p><button aria-label="Dismiss alert" onClick={() => setToasts((items) => items.filter((item) => item.id !== toast.id))}><X size={15} /></button></div>; })}</div></ArcWalletContext.Provider>;
}

export function useArcWallet() {
  const value = useContext(ArcWalletContext);
  if (!value) throw new Error("useArcWallet must be used inside ArcWalletProvider.");
  return value;
}
