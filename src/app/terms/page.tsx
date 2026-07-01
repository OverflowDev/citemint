import type { Metadata } from "next";
import { PublicPolicy } from "@/components/public-policy";

export const metadata: Metadata = { title: "Terms of Use" };

export default function TermsPage() {
  return <PublicPolicy eyebrow="Legal" title="Terms of use" updated="June 29, 2026">
    <h2>Hackathon demonstration</h2><p>CiteMint is experimental software provided for evaluation and education. It is not a financial service, payment processor, investment product, or guarantee of creator earnings.</p>
    <h2>Permitted use</h2><p>Use only public content you have the right to register. Do not use the service to scrape restricted material, bypass paywalls, violate intellectual-property rights, or submit unlawful content.</p>
    <h2>AI output</h2><p>Generated answers can be incomplete or inaccurate. Citations and receipts improve traceability but do not replace independent verification.</p>
    <h2>Wallets and payments</h2><p>The public demo uses simulated or testnet USDC. Do not connect mainnet funds. Any future real-payment deployment requires separate security review, compliance work, and provider terms.</p>
    <h2>No warranty</h2><p>The software is provided as-is without warranties. Use it at your own risk, especially before enabling external APIs or blockchain transactions.</p>
  </PublicPolicy>;
}
