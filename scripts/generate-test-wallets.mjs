import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const outputPath = resolve("test-wallets.local.json");
if (existsSync(outputPath) && !process.argv.includes("--force")) {
  console.error("test-wallets.local.json already exists. Use --force only if you intend to replace every demo wallet.");
  process.exit(1);
}

const labels = ["circle-agent-stack", "circle-nanopayments", "circle-x402", "open-source-guides", "circle-financial-rails"];
const wallets = labels.map((label) => {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return { label, address: account.address, privateKey };
});

writeFileSync(outputPath, `${JSON.stringify({ warning: "TEST-ONLY WALLETS. NEVER FUND ON MAINNET.", createdAt: new Date().toISOString(), wallets }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
console.log("Created five test-only wallets:");
for (const wallet of wallets) console.log(`${wallet.label}: ${wallet.address}`);
console.log(`Private keys were written only to: ${outputPath}`);
