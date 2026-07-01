"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpenText, Bot, CircleDollarSign, PlusSquare } from "lucide-react";

const links = [["/dashboard", BarChart3], ["/ask", Bot], ["/sources", BookOpenText], ["/register", PlusSquare], ["/earnings", CircleDollarSign]] as const;

export function MobileNav() {
  const pathname = usePathname();
  if (pathname === "/" || pathname === "/privacy" || pathname === "/terms" || pathname === "/demo-policy") return null;
  return <nav className="fixed inset-x-3 bottom-3 z-50 flex justify-around rounded-2xl border border-white/10 bg-[#0e1c19]/95 px-2 py-2 text-white shadow-2xl backdrop-blur lg:hidden">{links.map(([href, Icon]) => <Link key={href} href={href} className="grid size-10 place-items-center rounded-xl text-emerald-50/65 hover:bg-white/10 hover:text-[#baff72]"><Icon size={18} /></Link>)}</nav>;
}
