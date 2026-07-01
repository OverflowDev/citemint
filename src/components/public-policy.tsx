import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function PublicPolicy({ eyebrow, title, updated, children }: { eyebrow: string; title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="policy-page min-h-screen bg-[#07120f] px-5 py-6 text-white md:px-8">
      <header className="mx-auto flex max-w-[980px] items-center justify-between">
        <Link href="/" aria-label="CiteMint home"><Image src="/citemint-logo.svg" alt="CiteMint" width={164} height={40} priority /></Link>
        <Link href="/" className="landing-nav-cta"><ArrowLeft size={14} /> Back home</Link>
      </header>
      <article className="policy-card mx-auto my-12 max-w-[980px] md:my-20">
        <p className="landing-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="policy-updated">Last updated: {updated}</p>
        <div className="policy-content">{children}</div>
      </article>
      <footer className="mx-auto flex max-w-[980px] flex-wrap gap-5 border-t border-white/10 py-8 text-xs text-emerald-50/40">
        <Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/demo-policy">Demo policy</Link>
      </footer>
    </main>
  );
}
