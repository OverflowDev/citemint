import { FlaskConical } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="flex min-h-10 items-center justify-center gap-2 bg-[#163c2f] px-4 py-2 text-center text-xs font-medium text-emerald-50 sm:text-sm">
      <FlaskConical size={15} className="shrink-0 text-[#8dffc7]" />
      <span><strong className="text-white">Arc Testnet:</strong> Wallet deposits and creator citation payments settle through the CiteMint escrow contract. Test USDC has no real-world value.</span>
    </div>
  );
}
