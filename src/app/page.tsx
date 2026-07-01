import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Bot,
  CircleDollarSign,
  Coins,
  FileCheck2,
  Fingerprint,
  Orbit,
  ReceiptText,
  Search,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

const steps = [
  { number: "01", icon: Search, title: "Find the signal", copy: "The agent compares indexed sources for relevance, authority, and price." },
  { number: "02", icon: WalletCards, title: "Pay with purpose", copy: "It purchases only the evidence that fits the question and your spending limit." },
  { number: "03", icon: FileCheck2, title: "Answer with proof", copy: "Every purchased claim arrives with its source, selection reason, and receipt." },
];

const proof = [
  { value: "$0.000001", label: "Minimum unit", icon: Coins },
  { value: "4 max", label: "Sources per answer", icon: BookOpen },
  { value: "100%", label: "Receipt coverage", icon: ReceiptText },
  { value: "Testnet", label: "Protected demo mode", icon: ShieldCheck },
];

export default function LandingPage() {
  return (
    <div className="landing-page min-h-screen overflow-hidden bg-[#07120f] text-white">
      <div className="landing-noise" />
      <header className="landing-nav relative z-40 mx-auto flex h-[72px] max-w-[1240px] items-center justify-between px-5 md:px-8">
        <Link href="/" aria-label="CiteMint home"><Image src="/citemint-logo.svg" alt="CiteMint" width={164} height={40} priority /></Link>
        <nav className="hidden items-center gap-8 text-xs font-medium text-emerald-50/55 md:flex">
          <a href="#how-it-works" className="transition hover:text-white">How it works</a>
          <a href="#for-creators" className="transition hover:text-white">For creators</a>
          <Link href="/sources" className="transition hover:text-white">Marketplace</Link>
        </nav>
        <Link href="/dashboard" className="landing-nav-cta">Launch app <ArrowRight size={14} /></Link>
      </header>

      <main>
        <section className="landing-hero landing-hero-tight relative mx-auto grid max-w-[1240px] items-center gap-6 px-5 md:px-8 lg:grid-cols-[.93fr_1.07fr]">
          <div className="relative z-20 max-w-[650px]">
            <div className="landing-kicker"><span className="landing-pulse" />Autonomous payments on Arc</div>
            <h1 className="landing-hero-title mt-5 font-semibold leading-[.94] tracking-[-.065em]">
              AI answers that
              <span className="landing-gradient-text block">pay their sources.</span>
            </h1>
            <p className="landing-hero-copy mt-5 max-w-[560px] text-emerald-50/55">
              CiteMint finds high-value independent work, pays creators tiny citation fees, and returns every answer with a proof trail.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/dashboard" className="landing-primary-cta">Open the live app <ArrowRight size={17} /></Link>
              <Link href="/ask" className="landing-secondary-cta"><Bot size={16} /> Ask CiteMint</Link>
            </div>
            <div className="landing-trust-row mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-medium text-emerald-50/40">
              <span><ShieldCheck size={13} /> Testnet only</span>
              <span><BadgeCheck size={13} /> Auditable receipts</span>
              <span><Orbit size={13} /> Circle/Arc ready</span>
            </div>
          </div>

          <div className="landing-scene-wrap relative z-10" aria-label="Animated visualization of CiteMint paying article creators">
            <div className="landing-glow" />
            <div className="landing-scene">
              <div className="landing-orbit landing-orbit-one" /><div className="landing-orbit landing-orbit-two" /><div className="landing-orbit landing-orbit-three" />
              <div className="landing-orbit-dot landing-orbit-dot-one" /><div className="landing-orbit-dot landing-orbit-dot-two" />
              <div className="landing-agent-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5"><Image src="/citemint-mark.svg" alt="" width={36} height={36} /><div><p className="text-xs font-semibold text-white">CiteMint agent</p><p className="text-[9px] text-white/35">Ranking paid evidence</p></div></div>
                  <span className="landing-live"><span /> Live</span>
                </div>
                <div className="mt-5 space-y-3"><div className="landing-query-line w-full" /><div className="landing-query-line w-[82%]" /><div className="landing-query-line w-[58%]" /></div>
                <div className="mt-5 flex items-center justify-between rounded-xl border border-white/8 bg-black/15 p-3"><span className="text-[9px] uppercase tracking-[.16em] text-white/35">Budget guardrail</span><strong className="text-xs text-[#baff72]">$0.0100</strong></div>
                <div className="landing-agent-progress"><span /></div><div className="landing-scan-line" />
              </div>
              <div className="landing-source-card landing-source-a"><BookOpen size={14} /><div><p>Local newsroom</p><span>$0.000140</span></div><BadgeCheck size={13} className="ml-auto text-[#baff72]" /></div>
              <div className="landing-source-card landing-source-b"><FileCheck2 size={14} /><div><p>Agent economics</p><span>$0.000100</span></div><BadgeCheck size={13} className="ml-auto text-[#baff72]" /></div>
              <div className="landing-source-card landing-source-c"><ReceiptText size={14} /><div><p>Creator royalties</p><span>$0.000095</span></div><BadgeCheck size={13} className="ml-auto text-[#baff72]" /></div>
              <div className="landing-coin landing-coin-a"><span>$</span></div><div className="landing-coin landing-coin-b"><span>$</span></div>
              <div className="landing-receipt-float"><ReceiptText size={14} /><span>Receipt confirmed</span></div>
            </div>
          </div>
          <div className="landing-scroll-cue"><span>Explore</span><i /></div>
        </section>

        <section className="landing-proof-section relative z-20 px-5 md:px-8">
          <div className="landing-proof-strip mx-auto grid max-w-[1180px] grid-cols-2 gap-2 md:grid-cols-4">
            {proof.map((item) => <div key={item.label} className="landing-proof-item"><span className="landing-proof-icon"><item.icon size={15} /></span><div><p>{item.value}</p><span>{item.label}</span></div></div>)}
          </div>
        </section>

        <section id="how-it-works" className="relative mx-auto grid max-w-[1240px] gap-14 px-5 py-24 md:px-8 md:py-32 lg:grid-cols-[.72fr_1.28fr] lg:gap-24">
          <div className="landing-section-glow" />
          <div className="relative z-10 lg:sticky lg:top-28 lg:self-start">
            <p className="landing-eyebrow">One autonomous loop</p>
            <h2 className="mt-4 text-4xl font-semibold leading-[1.03] tracking-[-.05em] sm:text-5xl">From question to paid proof.</h2>
            <p className="mt-5 max-w-md text-[15px] leading-7 text-emerald-50/45">CiteMint turns research into a transparent exchange: discover useful work, reward it, then show exactly what happened.</p>
            <Link href="/ask" className="landing-text-link mt-8">Run the agent <ArrowRight size={15} /></Link>
          </div>
          <div className="landing-flow relative z-10">
            {steps.map((step) => <article key={step.number} className="landing-flow-step group"><div className="landing-flow-number">{step.number}</div><div className="landing-flow-icon"><step.icon size={20} /></div><div><h3>{step.title}</h3><p>{step.copy}</p></div><ArrowRight className="landing-flow-arrow" size={18} /></article>)}
            <div className="landing-flow-receipt"><Fingerprint size={18} /><div><strong>Proof trail complete</strong><span>Source · reason · amount · receipt</span></div><BadgeCheck size={17} /></div>
          </div>
        </section>

        <section id="for-creators" className="relative mx-auto max-w-[1240px] px-5 pb-24 md:px-8 md:pb-32">
          <div className="landing-creator-panel grid overflow-hidden lg:grid-cols-[.88fr_1.12fr]">
            <div className="landing-creator-copy p-8 sm:p-12 lg:p-14">
              <div className="landing-creator-label"><span /> For independent creators</div>
              <h2 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-[-.05em]">Turn expertise into an income stream.</h2>
              <p className="mt-5 text-[15px] leading-7 text-emerald-50/48">Set your own citation price. Every time your work improves an answer, CiteMint creates attribution, payment, and proof.</p>
              <div className="mt-8 flex flex-wrap gap-2"><span className="creator-benefit">Your price</span><span className="creator-benefit">Public attribution</span><span className="creator-benefit">Instant receipts</span></div>
              <Link href="/register" className="landing-primary-cta mt-9">Register a source <ArrowRight size={15} /></Link>
            </div>
            <div className="creator-stage relative min-h-[470px] overflow-hidden p-7 text-[#10251e] sm:p-10">
              <div className="creator-grid" /><div className="creator-orbit creator-orbit-one" /><div className="creator-orbit creator-orbit-two" />
              <div className="creator-article creator-article-a"><BookOpen size={13} /><span>Independent reporting</span><strong>$0.00014</strong></div>
              <div className="creator-article creator-article-b"><FileCheck2 size={13} /><span>Open-source funding</span><strong>$0.00012</strong></div>
              <div className="relative z-10 mx-auto max-w-md"><div className="creator-window">
                <div className="flex items-center justify-between border-b border-[#163c2f]/10 pb-4"><div><p className="text-xs font-bold">CiteMint earnings</p><p className="mt-1 text-[9px] uppercase tracking-widest opacity-45">Arc demo USDC</p></div><CircleDollarSign size={22} /></div>
                <div className="flex items-end justify-between"><div><p className="mt-7 text-5xl font-semibold tracking-[-.06em]">$0.0018</p><p className="mt-2 text-xs opacity-50">from 17 paid citations</p></div><span className="creator-up">+24%</span></div>
                <div className="creator-chart"><i style={{ height: "28%" }} /><i style={{ height: "46%" }} /><i style={{ height: "39%" }} /><i style={{ height: "68%" }} /><i style={{ height: "58%" }} /><i style={{ height: "88%" }} /><i style={{ height: "76%" }} /></div>
                <div className="mt-5 flex items-center justify-between rounded-xl bg-white/55 px-3.5 py-3 text-[10px] font-semibold"><span>Latest: Agent economics</span><span>+$0.00031</span></div>
              </div></div>
            </div>
          </div>
        </section>

        <section className="relative mx-auto max-w-[1240px] px-5 pb-20 md:px-8 md:pb-28">
          <div className="landing-final-cta relative overflow-hidden px-7 py-12 sm:px-12 lg:flex lg:items-center lg:justify-between lg:gap-16 lg:py-14">
            <div className="landing-final-orbit" /><div className="relative z-10"><p className="landing-eyebrow">See the full loop</p><h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-.045em] sm:text-4xl">Ask better questions. Leave value behind.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/45">Deposit test USDC, authorize one research run, and verify every creator payment on Arc.</p></div>
            <div className="relative z-10 mt-8 flex shrink-0 flex-col gap-3 sm:flex-row lg:mt-0"><Link href="/dashboard" className="landing-primary-cta">Launch CiteMint <ArrowRight size={17} /></Link><Link href="/sources" className="landing-secondary-cta">Browse sources</Link></div>
          </div>
        </section>
      </main>

      <footer className="landing-footer border-t border-white/[.07] px-5 md:px-8">
        <div className="mx-auto grid max-w-[1240px] gap-10 py-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div><Image src="/citemint-logo.svg" alt="CiteMint" width={164} height={40} /><p className="mt-4 max-w-sm text-xs leading-5 text-emerald-50/35">AI agents that mint tiny payments for every useful source. Built for the Lepton Agents Hackathon.</p></div>
          <div><p className="footer-heading">Product</p><div className="footer-links"><Link href="/dashboard">Dashboard</Link><Link href="/ask">Ask agent</Link><Link href="/sources">Source marketplace</Link><Link href="/register">Register source</Link></div></div>
          <div><p className="footer-heading">Policies</p><div className="footer-links"><Link href="/privacy">Privacy policy</Link><Link href="/terms">Terms of use</Link><Link href="/demo-policy">Demo & payment policy</Link></div></div>
        </div>
        <div className="mx-auto flex max-w-[1240px] flex-col justify-between gap-3 border-t border-white/[.07] py-5 text-[10px] text-emerald-50/28 sm:flex-row sm:items-center"><p>© 2026 CiteMint. Hackathon demonstration.</p><p className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-[#baff72]" /> Arc Testnet USDC · No real funds</p></div>
      </footer>
    </div>
  );
}
