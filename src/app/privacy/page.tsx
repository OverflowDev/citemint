import type { Metadata } from "next";
import { PublicPolicy } from "@/components/public-policy";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return <PublicPolicy eyebrow="Legal" title="Privacy policy" updated="June 29, 2026">
    <h2>What CiteMint stores</h2><p>CiteMint stores registered creator names, public article URLs, public wallet addresses, research questions, generated answers, single-use authorization messages, and Arc Testnet transaction metadata in PostgreSQL. Private keys and wallet seed phrases are never requested.</p>
    <h2>Secrets</h2><p>API credentials belong only in server-side environment variables. CiteMint does not intentionally display them in the browser. Never submit private keys, seed phrases, or real payment credentials through creator or question forms.</p>
    <h2>Article ingestion</h2><p>When a public URL is registered, CiteMint may fetch its public title, description, and article text to create a searchable source. Private-network and localhost addresses are blocked.</p>
    <h2>Third-party services</h2><p>Arc RPC providers process blockchain reads and transaction broadcasts. If OpenAI is enabled, paid source context and the research question are processed under OpenAI&apos;s terms. Wallet signatures are verified by the CiteMint server.</p>
    <h2>Contact and deletion</h2><p>This is a demonstration project. A production deployment should provide a publisher contact address and a documented process for source removal and data deletion.</p>
  </PublicPolicy>;
}
