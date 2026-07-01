import { createWalletClient, getAddress, http, keccak256, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnet } from "viem/chains";
import { ARC_CHAIN_ID, ARC_RPC_URL, escrowAbi, getArcPublicClient, requireEscrowAddress } from "@/lib/arc-contract";
import { db } from "@/lib/db";

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
  private static warnedDeployerFallback = false;
  private publicClient = getArcPublicClient();

  private getOperator() {
    const operatorKey = (process.env.OPERATOR_PRIVATE_KEY || "") as `0x${string}`;
    if (/^0x[0-9a-fA-F]{64}$/.test(operatorKey)) return privateKeyToAccount(operatorKey);
    // Fall back to the deployer key only for the pre-rotation demo; warn so it is never left in a hosted runtime.
    const deployerKey = (process.env.DEPLOYER_PRIVATE_KEY || "") as `0x${string}`;
    if (/^0x[0-9a-fA-F]{64}$/.test(deployerKey)) {
      if (!ContractPaymentAdapter.warnedDeployerFallback) {
        console.warn("Settling with DEPLOYER_PRIVATE_KEY because OPERATOR_PRIVATE_KEY is unset. Rotate to a dedicated operator and keep the deployer key offline before hosting.");
        ContractPaymentAdapter.warnedDeployerFallback = true;
      }
      return privateKeyToAccount(deployerKey);
    }
    throw new Error("OPERATOR_PRIVATE_KEY is not configured on the server.");
  }

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
    const operator = this.getOperator();
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

export function getPaymentAdapter(): PaymentAdapter {
  return process.env.PAYMENT_MODE === "contract" ? new ContractPaymentAdapter() : new MockPaymentAdapter();
}

export function configuredPaymentMode() {
  return process.env.PAYMENT_MODE === "contract" ? "contract" : "mock";
}
