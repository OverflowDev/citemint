import { randomBytes } from "node:crypto";
import { keccak256, toBytes } from "viem";
import { ARC_CHAIN_ID, requireEscrowAddress } from "@/lib/arc-contract";

export function hashQuestion(question: string) {
  return keccak256(toBytes(question.trim()));
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
