"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { Sidebar } from "@/components/sidebar";
import { GlobalWalletHeader } from "@/components/global-wallet-header";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const publicPage = pathname === "/" || pathname === "/privacy" || pathname === "/terms" || pathname === "/demo-policy";

  if (publicPage) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-[#172033]">
      <Sidebar />
      <div className="lg:pl-[250px]">
        <DemoBanner />
        <GlobalWalletHeader />
        <main className="mx-auto max-w-[1440px] px-5 py-7 md:px-8 md:py-9">{children}</main>
      </div>
    </div>
  );
}
