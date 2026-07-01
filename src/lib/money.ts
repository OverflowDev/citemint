// Amounts are stored and passed around as micro-USDC in a JS number / Prisma Int (signed 32-bit,
// max ~2,147 USDC). That ceiling is unreachable here because the API caps budgets at 0.5 USDC and
// citation prices at 0.1 USDC (see the ask/authorization/sources zod schemas). If those caps are
// ever raised toward the thousands, migrate these fields to BigInt before doing so.
export const microsToUsdc = (micros: number) => micros / 1_000_000;
export const usdcToMicros = (usdc: number) => Math.round(usdc * 1_000_000);

export function formatUsdc(micros: number, compact = false) {
  const value = microsToUsdc(micros);
  if (compact && value >= 0.01) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(6).replace(/0+$/, "").replace(/\.$/, ".00")}`;
}

export function shortWallet(wallet: string) {
  return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
}
