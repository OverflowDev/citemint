import { randomBytes } from "node:crypto";
import { keccak256, toBytes } from "viem";
import { ARC_CHAIN_ID, requireEscrowAddress, requireEscrowV2Address } from "@/lib/arc-contract";

export function hashQuestion(question: string) {
  return keccak256(toBytes(question.trim()));
}

// ---- v2: EIP-712 budget voucher ----
// The payer signs one voucher; the contract enforces payer, question, budget and deadline on-chain,
// so the operator can only relay settlements the payer actually authorized.
export const SPEND_AUTHORIZATION_TYPES = {
  SpendAuthorization: [
    { name: "payer", type: "address" },
    { name: "questionHash", type: "bytes32" },
    { name: "maxTotal", type: "uint256" },
    { name: "deadline", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

export function spendAuthorizationDomain() {
  return { name: "CiteMint", version: "1", chainId: ARC_CHAIN_ID, verifyingContract: requireEscrowV2Address() } as const;
}

/** Voucher message with bigint fields, for server-side verifyTypedData and contract calls. */
export function spendAuthorizationMessage(input: { walletAddress: `0x${string}`; questionHash: `0x${string}`; maxTotalMicros: number; deadlineUnix: number; nonce: `0x${string}` }) {
  return {
    payer: input.walletAddress,
    questionHash: input.questionHash,
    maxTotal: BigInt(input.maxTotalMicros),
    deadline: BigInt(input.deadlineUnix),
    nonce: input.nonce,
  } as const;
}

/** Build a voucher plus a JSON-safe typed-data payload the browser can sign (uint256 fields as strings). */
export function createSpendAuthorization(input: { walletAddress: `0x${string}`; question: string; maxTotalMicros: number; expiresAt: Date; nonce?: `0x${string}` }) {
  const nonce = input.nonce || (`0x${randomBytes(32).toString("hex")}` as `0x${string}`);
  const questionHash = hashQuestion(input.question);
  const deadlineUnix = Math.floor(input.expiresAt.getTime() / 1000);
  const typedData = {
    domain: spendAuthorizationDomain(),
    types: SPEND_AUTHORIZATION_TYPES,
    primaryType: "SpendAuthorization" as const,
    message: { payer: input.walletAddress, questionHash, maxTotal: String(input.maxTotalMicros), deadline: String(deadlineUnix), nonce },
  };
  return { nonce, questionHash, deadlineUnix, typedData };
}

export function createAuthorizationMessage(input: {
  walletAddress: string;
  question: string;
  maxBudgetMicros: number;
  expiresAt: Date;
  nonce?: string;
}) {
  const nonce = input.nonce || `0x${randomBytes(16).toString("hex")}`;
  const questionHash = hashQuestion(input.question);
  const message = [
    "CiteMint onchain research authorization",
    "",
    `Wallet: ${input.walletAddress}`,
    `Question hash: ${questionHash}`,
    `Maximum spend: ${input.maxBudgetMicros} micro-USDC`,
    `Arc chain ID: ${ARC_CHAIN_ID}`,
    `Escrow: ${requireEscrowAddress()}`,
    `Nonce: ${nonce}`,
    `Expires: ${input.expiresAt.toISOString()}`,
    "",
    "This signature authorizes CiteMint to settle citations for this question only. It is not a token approval.",
  ].join("\n");
  return { nonce, questionHash, message };
}
