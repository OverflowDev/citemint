"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpenText, Bot, CircleDollarSign, PlusSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/ask", label: "Ask Agent", icon: Bot },
  { href: "/sources", label: "Sources", icon: BookOpenText },
  { href: "/register", label: "Register Source", icon: PlusSquare },
  { href: "/earnings", label: "Earnings", icon: CircleDollarSign }
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[250px] border-r border-white/10 bg-[#0e1c19] text-white lg:flex lg:flex-col">
      <Link href="/" className="flex h-28 items-center gap-3 px-7">
        <Image src="/citemint-mark.svg" alt="" width={40} height={40} priority />
        <div><p className="font-semibold tracking-tight">CiteMint</p><p className="text-xs text-emerald-100/50">Pay-per-proof research</p></div>
      </Link>
      <nav className="space-y-1 px-4">
        {nav.map((item) => {
          const active = pathname.startsWith(item.href);
          return <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition", active ? "bg-white/10 text-white shadow-inner" : "text-emerald-50/55 hover:bg-white/5 hover:text-white")}><item.icon size={18} className={active ? "text-[#baff72]" : "text-emerald-100/40"} />{item.label}</Link>;
        })}
      </nav>
      <div className="mt-auto p-5">
        <div className="rounded-2xl border border-white/10 bg-white/[.045] p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-[#baff72]"><span className="size-1.5 rounded-full bg-[#baff72]" />LEPTON HACKATHON</div>
          <p className="text-xs leading-5 text-emerald-50/55">Autonomous paying agents × creator monetization on Arc.</p>
        </div>
      </div>
    </aside>
  );
}
