import { describe, expect, it } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { verifyTypedData } from "viem";

// A well-known test private key (hardhat account #0). Never used for anything real.
const TEST_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

describe("spend authorization (EIP-712 v2 voucher)", () => {
  it("client-signed voucher verifies against the server's reconstructed message", async () => {
    process.env.NEXT_PUBLIC_CITEMINT_ESCROW_V2_ADDRESS = "0x1111111111111111111111111111111111111111";
    // Import after env is set so the escrow address const captures it.
    const { createSpendAuthorization, spendAuthorizationDomain, spendAuthorizationMessage, SPEND_AUTHORIZATION_TYPES } = await import("./agent-authorization");
    const account = privateKeyToAccount(TEST_KEY);
    const maxTotalMicros = 500_000;

    // Server builds the voucher + JSON-safe typed data (as the authorization route does).
    const { nonce, questionHash, deadlineUnix, typedData } = createSpendAuthorization({
      walletAddress: account.address,
      question: "how do nanopayments help creators",
      maxTotalMicros,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Client signs it (bigint-coerced, as ask-agent does).
    const signature = await account.signTypedData({
      domain: typedData.domain,
      types: typedData.types,
      primaryType: "SpendAuthorization",
      message: { ...typedData.message, maxTotal: BigInt(typedData.message.maxTotal), deadline: BigInt(typedData.message.deadline) },
    });

    // Server reconstructs the message from stored fields (as /ask does) and verifies.
    const valid = await verifyTypedData({
      address: account.address,
      domain: spendAuthorizationDomain(),
      types: SPEND_AUTHORIZATION_TYPES,
      primaryType: "SpendAuthorization",
      message: spendAuthorizationMessage({ walletAddress: account.address, questionHash, maxTotalMicros, deadlineUnix, nonce }),
      signature,
    });

    expect(valid).toBe(true);
  });

  it("rejects a voucher signed by a different wallet", async () => {
    process.env.NEXT_PUBLIC_CITEMINT_ESCROW_V2_ADDRESS = "0x1111111111111111111111111111111111111111";
    const { createSpendAuthorization, spendAuthorizationDomain, spendAuthorizationMessage, SPEND_AUTHORIZATION_TYPES } = await import("./agent-authorization");
    const payer = privateKeyToAccount(TEST_KEY);
    const attacker = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
    const maxTotalMicros = 500_000;

    const { nonce, questionHash, deadlineUnix, typedData } = createSpendAuthorization({ walletAddress: payer.address, question: "budget voucher", maxTotalMicros, expiresAt: new Date(Date.now() + 600_000) });
    const forged = await attacker.signTypedData({ domain: typedData.domain, types: typedData.types, primaryType: "SpendAuthorization", message: { ...typedData.message, maxTotal: BigInt(typedData.message.maxTotal), deadline: BigInt(typedData.message.deadline) } });

    const valid = await verifyTypedData({
      address: payer.address,
      domain: spendAuthorizationDomain(),
      types: SPEND_AUTHORIZATION_TYPES,
      primaryType: "SpendAuthorization",
      message: spendAuthorizationMessage({ walletAddress: payer.address, questionHash, maxTotalMicros, deadlineUnix, nonce }),
      signature: forged,
    });

    expect(valid).toBe(false);
  });
});
