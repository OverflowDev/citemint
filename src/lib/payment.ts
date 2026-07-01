import { createWalletClient, getAddress, http, keccak256, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnet } from "viem/chains";
import { ARC_CHAIN_ID, ARC_RPC_URL, escrowAbi, getArcPublicClient, requireEscrowAddress, requireEscrowV2Address } from "@/lib/arc-contract";
import { db } from "@/lib/db";

export type CitationVoucher = {
  payer: string;
  questionHash: string;
  maxTotalMicros: number;
  deadlineUnix: number;
  nonce: string;
  signature: string;
};

let warnedDeployerFallback = false;

/** The server's settlement signer. Prefers OPERATOR_PRIVATE_KEY; the deployer key is a warned pre-rotation fallback. */
function getOperatorAccount() {
  const operatorKey = (process.env.OPERATOR_PRIVATE_KEY || "") as `0x${string}`;
  if (/^0x[0-9a-fA-F]{64}$/.test(operatorKey)) return privateKeyToAccount(operatorKey);
  const deployerKey = (process.env.DEPLOYER_PRIVATE_KEY || "") as `0x${string}`;
  if (/^0x[0-9a-fA-F]{64}$/.test(deployerKey)) {
    if (!warnedDeployerFallback) {
      console.warn("Settling with DEPLOYER_PRIVATE_KEY because OPERATOR_PRIVATE_KEY is unset. Rotate to a dedicated operator and keep the deployer key offline before hosting.");
      warnedDeployerFallback = true;
    }
    return privateKeyToAccount(deployerKey);
  }
  throw new Error("OPERATOR_PRIVATE_KEY is not configured on the server.");
}

export type PaymentReceipt = {
  status: "paid" | "failed";
  receiptId: string;
  txHash?: string;
  paymentId?: string;
  chainId?: number;
  contractAddress?: string;
  blockNumber?: string;
};

export interface PaymentAdapter {
  getBalance(walletAddress: string): Promise<number>;
  payCitation(input: {
    payerWallet: string;
    toWallet: string;
    amountMicros: number;
    sourceId: string;
    questionId: string;
    authorizationId?: string;
    voucher?: CitationVoucher;
  }): Promise<PaymentReceipt>;
}

export class MockPaymentAdapter implements PaymentAdapter {
  async getBalance() {
    const user = await db.user.findFirst({ orderBy: { createdAt: "asc" } });
    return user?.demoBalanceMicros ?? 0;
  }

  async payCitation(input: Parameters<PaymentAdapter["payCitation"]>[0]) {
    const user = await db.user.findFirst({ orderBy: { createdAt: "asc" } });
    if (!user || user.demoBalanceMicros < input.amountMicros) {
      return { status: "failed" as const, receiptId: `mock_failed_${crypto.randomUUID()}` };
    }
    await db.user.update({ where: { id: user.id }, data: { demoBalanceMicros: { decrement: input.amountMicros } } });
    return { status: "paid" as const, receiptId: `mock_arc_${crypto.randomUUID()}` };
  }
}

export class ContractPaymentAdapter implements PaymentAdapter {
  private publicClient = getArcPublicClient();

  async getBalance(walletAddress: string) {
    const balance = await this.publicClient.readContract({
      address: requireEscrowAddress(),
      abi: escrowAbi,
      functionName: "balances",
      args: [getAddress(walletAddress.toLowerCase())],
    });
    return Number(balance);
  }

  async payCitation(input: Parameters<PaymentAdapter["payCitation"]>[0]) {
    const operator = getOperatorAccount();
    const escrowAddress = requireEscrowAddress();
    const paymentId = keccak256(toBytes(`${input.authorizationId || input.questionId}:${input.sourceId}:${input.payerWallet.toLowerCase()}`));
    const walletClient = createWalletClient({ account: operator, chain: arcTestnet, transport: http(ARC_RPC_URL) });
    try {
      const hash = await walletClient.writeContract({
        address: escrowAddress,
        abi: escrowAbi,
        functionName: "settleCitation",
        args: [getAddress(input.payerWallet.toLowerCase()), getAddress(input.toWallet.toLowerCase()), BigInt(input.amountMicros), paymentId],
      });
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("Arc settlement reverted.");
      return {
        status: "paid" as const,
        receiptId: hash,
        txHash: hash,
        paymentId,
        chainId: ARC_CHAIN_ID,
        contractAddress: escrowAddress,
        blockNumber: receipt.blockNumber.toString(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Arc settlement failed.";
      console.error("Citation settlement failed", { paymentId, message });
      return { status: "failed" as const, receiptId: `arc_failed_${paymentId.slice(2, 18)}`, paymentId, chainId: ARC_CHAIN_ID, contractAddress: escrowAddress };
    }
  }
}

export class ContractV2PaymentAdapter implements PaymentAdapter {
  private publicClient = getArcPublicClient();

  async getBalance(walletAddress: string) {
    const balance = await this.publicClient.readContract({
      address: requireEscrowV2Address(),
      abi: escrowAbi,
      functionName: "balances",
      args: [getAddress(walletAddress.toLowerCase())],
    });
    return Number(balance);
  }

  async payCitation(input: Parameters<PaymentAdapter["payCitation"]>[0]) {
    const escrowAddress = requireEscrowV2Address();
    const voucher = input.voucher;
    const paymentId = keccak256(toBytes(`${voucher?.nonce ?? input.authorizationId ?? input.questionId}:${input.sourceId}:${input.payerWallet.toLowerCase()}`));
    if (!voucher) {
      console.error("Citation settlement failed", { paymentId, message: "Missing signed budget voucher for v2 settlement." });
      return { status: "failed" as const, receiptId: `arc_failed_${paymentId.slice(2, 18)}`, paymentId, chainId: ARC_CHAIN_ID, contractAddress: escrowAddress };
    }
    const operator = getOperatorAccount();
    const walletClient = createWalletClient({ account: operator, chain: arcTestnet, transport: http(ARC_RPC_URL) });
    try {
      const hash = await walletClient.writeContract({
        address: escrowAddress,
        abi: escrowAbi,
        functionName: "settleWithAuthorization",
        args: [
          {
            payer: getAddress(voucher.payer.toLowerCase()),
            questionHash: voucher.questionHash as `0x${string}`,
            maxTotal: BigInt(voucher.maxTotalMicros),
            deadline: BigInt(voucher.deadlineUnix),
            nonce: voucher.nonce as `0x${string}`,
          },
          voucher.signature as `0x${string}`,
          getAddress(input.toWallet.toLowerCase()),
          BigInt(input.amountMicros),
          paymentId,
        ],
      });
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("Arc settlement reverted.");
      return {
        status: "paid" as const,
        receiptId: hash,
        txHash: hash,
        paymentId,
        chainId: ARC_CHAIN_ID,
        contractAddress: escrowAddress,
        blockNumber: receipt.blockNumber.toString(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Arc settlement failed.";
      console.error("Citation settlement failed", { paymentId, message });
      return { status: "failed" as const, receiptId: `arc_failed_${paymentId.slice(2, 18)}`, paymentId, chainId: ARC_CHAIN_ID, contractAddress: escrowAddress };
    }
  }
}

export function getPaymentAdapter(): PaymentAdapter {
  if (process.env.PAYMENT_MODE === "contract-v2") return new ContractV2PaymentAdapter();
  if (process.env.PAYMENT_MODE === "contract") return new ContractPaymentAdapter();
  return new MockPaymentAdapter();
}

export function configuredPaymentMode() {
  if (process.env.PAYMENT_MODE === "contract-v2") return "contract-v2";
  if (process.env.PAYMENT_MODE === "contract") return "contract";
  return "mock";
}

/** Both onchain modes require a signed payer authorization before settlement. */
export function isOnchainMode(mode: string) {
  return mode === "contract" || mode === "contract-v2";
}
