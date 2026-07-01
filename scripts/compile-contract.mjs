import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import solc from "solc";

const contractPath = resolve("contracts/CiteMintEscrow.sol");
const input = {
  language: "Solidity",
  sources: { "contracts/CiteMintEscrow.sol": { content: readFileSync(contractPath, "utf8") } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"] } }
  }
};

function findImports(importPath) {
  const candidates = [resolve(importPath), resolve("node_modules", importPath), resolve("contracts", importPath)];
  for (const candidate of candidates) {
    try { return { contents: readFileSync(candidate, "utf8") }; } catch { /* try next path */ }
  }
  return { error: `Import not found: ${importPath}` };
}

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
for (const issue of output.errors || []) console[issue.severity === "error" ? "error" : "warn"](issue.formattedMessage);
if ((output.errors || []).some((issue) => issue.severity === "error")) process.exit(1);

const compiled = output.contracts["contracts/CiteMintEscrow.sol"].CiteMintEscrow;
const artifactPath = resolve("contracts/artifacts/CiteMintEscrow.json");
mkdirSync(dirname(artifactPath), { recursive: true });
writeFileSync(artifactPath, `${JSON.stringify({ contractName: "CiteMintEscrow", sourceName: "contracts/CiteMintEscrow.sol", abi: compiled.abi, bytecode: `0x${compiled.evm.bytecode.object}`, deployedBytecode: `0x${compiled.evm.deployedBytecode.object}` }, null, 2)}\n`);
console.log(`Compiled CiteMintEscrow to ${artifactPath}`);
