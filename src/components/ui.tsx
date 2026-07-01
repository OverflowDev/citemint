import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageIntro({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em] text-[#14211d] md:text-[38px]">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 md:text-[15px]">{description}</p></div>{action}</div>;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("card", className)}>{children}</div>;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "green" | "amber" | "purple" }) {
  return <span className={cn("badge", tone === "green" && "badge-green", tone === "amber" && "badge-amber", tone === "purple" && "badge-purple")}>{children}</span>;
}

export function EmptyState({ title, copy }: { title: string; copy: string }) {
  return <div className="grid min-h-52 place-items-center px-5 text-center"><div><div className="mx-auto mb-3 size-10 rounded-full bg-slate-100" /><p className="font-semibold text-slate-700">{title}</p><p className="mt-1 text-sm text-slate-400">{copy}</p></div></div>;
}
