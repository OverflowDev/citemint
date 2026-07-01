import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnet } from "viem/chains";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const contractName = process.argv[2] || "CiteMintEscrow";
const envKey = contractName === "CiteMintEscrowV2" ? "NEXT_PUBLIC_CITEMINT_ESCROW_V2_ADDRESS" : "NEXT_PUBLIC_CITEMINT_ESCROW_ADDRESS";
const artifactPath = resolve(root, `contracts/artifacts/${contractName}.json`);
const envPath = resolve(root, ".env");

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required in .env`);
  return value;
}

function parseFeeBps() {
  const value = Number(process.env.PLATFORM_FEE_BPS || "500");
  if (!Number.isInteger(value) || value < 0 || value > 1000) {
    throw new Error("PLATFORM_FEE_BPS must be an integer from 0 to 1000.");
  }
  return value;
}

async function saveContractAddress(address) {
  let contents = await readFile(envPath, "utf8");
  const line = `${envKey}="${address}"`;
  const pattern = new RegExp(`^${envKey}=.*$`, "m");
  if (pattern.test(contents)) {
    contents = contents.replace(pattern, line);
  } else {
    contents = `${contents.trimEnd()}\n${line}\n`;
  }
  await writeFile(envPath, contents, "utf8");
}

async function main() {
  const rpcUrl = required("ARC_RPC_URL");
  const privateKey = required("DEPLOYER_PRIVATE_KEY");
  if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    throw new Error("DEPLOYER_PRIVATE_KEY must be a 0x-prefixed 32-byte testnet key.");
  }

  const account = privateKeyToAccount(privateKey);
  const usdc = getAddress(required("ARC_USDC_ADDRESS"));
  const owner = getAddress(process.env.CONTRACT_OWNER_ADDRESS?.trim() || account.address);
  const treasury = getAddress(process.env.PLATFORM_TREASURY_ADDRESS?.trim() || account.address);
  const feeBps = parseFeeBps();
  const artifact = JSON.parse(await readFile(artifactPath, "utf8"));

  const publicClient = createPublicClient({ chain: arcTestnet, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain: arcTestnet, transport: http(rpcUrl) });

  const chainId = await publicClient.getChainId();
  if (chainId !== arcTestnet.id) {
    throw new Error(`RPC returned chain ${chainId}; expected Arc Testnet ${arcTestnet.id}.`);
  }

  console.log(`Deployer: ${account.address}`);
  console.log(`Owner: ${owner}`);
  console.log(`Treasury: ${treasury}`);
  console.log(`Platform fee: ${feeBps / 100}%`);

  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [usdc, owner, treasury, feeBps],
  });
  console.log(`Deployment transaction: ${hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success" || !receipt.contractAddress) {
    throw new Error(`Deployment failed: https://testnet.arcscan.app/tx/${hash}`);
  }

  await saveContractAddress(receipt.contractAddress);
  console.log(`${contractName}: ${receipt.contractAddress}`);
  console.log(`Explorer: https://testnet.arcscan.app/address/${receipt.contractAddress}`);
  console.log(`Saved ${envKey} in .env`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
