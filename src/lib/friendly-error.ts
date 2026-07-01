export function friendlyError(error: unknown, fallback = "Something went wrong. Please try again.") {
  const message = error instanceof Error ? error.message : String(error || "");
  const lower = message.toLowerCase();
  if (lower.includes("user rejected") || lower.includes("user denied") || lower.includes("4001")) return "The wallet request was cancelled. Nothing was changed.";
  if (lower.includes("insufficient funds")) return "Your wallet does not have enough Arc Testnet USDC to cover this transaction.";
  if (lower.includes("insufficientbalance") || lower.includes("escrow balance is empty")) return "Your escrow balance is too low. Deposit more Arc Testnet USDC before asking the agent.";
  if (lower.includes("notoperator")) return "The server settlement wallet is not authorized by the escrow owner.";
  if (lower.includes("paused")) return "The CiteMint escrow is temporarily paused by the platform owner.";
  if (lower.includes("expired")) return "The signed question authorization expired. Please sign a new one.";
  if (lower.includes("network") || lower.includes("chain")) return "Switch your wallet to Arc Testnet and try again.";
  if (message.length > 180 || lower.includes("request arguments") || lower.includes("contractfunctionexecutionerror")) return fallback;
  return message || fallback;
}
