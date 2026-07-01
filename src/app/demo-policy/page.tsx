import type { Metadata } from "next";
import { PublicPolicy } from "@/components/public-policy";

export const metadata: Metadata = { title: "Demo & Payment Policy" };

export default function DemoPolicyPage() {
  return <PublicPolicy eyebrow="Transparency" title="Demo and payment policy" updated="June 29, 2026">
    <h2>Onchain testnet settlement</h2><p><code>PAYMENT_MODE=contract</code> reads user balances from CiteMintEscrow and submits creator settlements through an authorized server operator. Every successful citation contains an Arc transaction hash.</p>
    <h2>Testnet only</h2><p>Any Circle or Arc integration used for this hackathon must be limited to testnet and demo USDC. CiteMint&apos;s interface must not present mock receipts as mainnet transactions.</p>
    <h2>Budget guardrails</h2><p>Each question has a maximum spend. The agent selects only sources it can afford within that limit and records each attempt and result.</p>
    <h2>Creator pricing</h2><p>Creators choose a price per citation. Registration does not promise selection, payment volume, ranking, or future income.</p>
    <h2>Before production</h2><p>Real settlement requires idempotency, webhook verification, reconciliation, authentication, sanctions screening where applicable, incident controls, and an independent security review.</p>
  </PublicPolicy>;
}
