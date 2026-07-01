import { createPublicClient, http } from "viem";
import { arcTestnet } from "viem/chains";

export const ARC_CHAIN_ID = 5_042_002;
export const ARC_CHAIN_HEX = "0x4cef52";
export const ARC_EXPLORER = process.env.NEXT_PUBLIC_ARC_EXPLORER_URL || "https://testnet.arcscan.app";
export const ARC_RPC_URL = process.env.NEXT_PUBLIC_ARC_RPC_URL || process.env.ARC_RPC_URL || "https://rpc.testnet.arc.network";
export const ARC_USDC_ADDRESS = (process.env.NEXT_PUBLIC_ARC_USDC_ADDRESS || process.env.ARC_USDC_ADDRESS || "0x3600000000000000000000000000000000000000") as `0x${string}`;
export const CITEMINT_ESCROW_ADDRESS = (process.env.NEXT_PUBLIC_CITEMINT_ESCROW_ADDRESS || "") as `0x${string}`;
export const CITEMINT_ESCROW_V2_ADDRESS = (process.env.NEXT_PUBLIC_CITEMINT_ESCROW_V2_ADDRESS || "") as `0x${string}`;
// Client-visible payment mode so the browser knows which escrow deployment is active ("contract" | "contract-v2" | "mock").
export const PUBLIC_PAYMENT_MODE = process.env.NEXT_PUBLIC_PAYMENT_MODE || "contract";
// The escrow deposits/balances/settlement all target. v2 uses the same deposit/withdraw/balances ABI as v1.
export const ACTIVE_ESCROW_ADDRESS = (PUBLIC_PAYMENT_MODE === "contract-v2" && CITEMINT_ESCROW_V2_ADDRESS ? CITEMINT_ESCROW_V2_ADDRESS : CITEMINT_ESCROW_ADDRESS) as `0x${string}`;

export const usdcAbi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
] as const;

export const escrowAbi = [
  { type: "function", name: "balances", stateMutability: "view", inputs: [{ name: "payer", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "totalEscrowed", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "platformFeeBps", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint16" }] },
  { type: "function", name: "treasury", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { type: "function", name: "paused", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "operators", stateMutability: "view", inputs: [{ name: "operator", type: "address" }], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "deposit", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "withdraw", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "settleCitation", stateMutability: "nonpayable", inputs: [{ name: "payer", type: "address" }, { name: "creator", type: "address" }, { name: "grossAmount", type: "uint256" }, { name: "paymentId", type: "bytes32" }], outputs: [] },
  { type: "function", name: "settleWithAuthorization", stateMutability: "nonpayable", inputs: [
    { name: "auth", type: "tuple", components: [
      { name: "payer", type: "address" },
      { name: "questionHash", type: "bytes32" },
      { name: "maxTotal", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "nonce", type: "bytes32" },
    ] },
    { name: "signature", type: "bytes" },
    { name: "creator", type: "address" },
    { name: "grossAmount", type: "uint256" },
    { name: "paymentId", type: "bytes32" },
  ], outputs: [] },
  { type: "function", name: "spentByNonce", stateMutability: "view", inputs: [{ name: "nonce", type: "bytes32" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "setOperator", stateMutability: "nonpayable", inputs: [{ name: "operator", type: "address" }, { name: "allowed", type: "bool" }], outputs: [] },
  { type: "function", name: "setTreasury", stateMutability: "nonpayable", inputs: [{ name: "newTreasury", type: "address" }], outputs: [] },
  { type: "function", name: "setPlatformFeeBps", stateMutability: "nonpayable", inputs: [{ name: "newFeeBps", type: "uint16" }], outputs: [] },
  { type: "function", name: "pause", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "unpause", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "event", name: "OperatorUpdated", inputs: [{ name: "operator", type: "address", indexed: true }, { name: "allowed", type: "bool", indexed: false }] },
] as const;

export function getArcPublicClient() {
  return createPublicClient({ chain: arcTestnet, transport: http(ARC_RPC_URL) });
}

export function requireEscrowAddress() {
  if (!/^0x[0-9a-fA-F]{40}$/.test(CITEMINT_ESCROW_ADDRESS)) {
    throw new Error("NEXT_PUBLIC_CITEMINT_ESCROW_ADDRESS is not configured.");
  }
  return CITEMINT_ESCROW_ADDRESS;
}

export function requireEscrowV2Address() {
  if (!/^0x[0-9a-fA-F]{40}$/.test(CITEMINT_ESCROW_V2_ADDRESS)) {
    throw new Error("NEXT_PUBLIC_CITEMINT_ESCROW_V2_ADDRESS is not configured.");
  }
  return CITEMINT_ESCROW_V2_ADDRESS;
}
