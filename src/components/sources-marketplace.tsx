"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, ExternalLink, Plus, Search } from "lucide-react";
import { Badge, Card, EmptyState, PageIntro } from "@/components/ui";
import { formatUsdc, shortWallet } from "@/lib/money";

type Source = {
  id: string; title: string; url: string; excerpt: string; tags: string;
  citationPriceMicros: number; timesCited: number; totalEarnedMicros: number;
  creator: { name: string; walletAddress: string; walletVerifiedAt: string | null; walletVerificationMethod: string | null };
};

export function SourcesMarketplace() {
  const [sources, setSources] = useState<Source[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(true);
      fetch(`/api/sources?q=${encodeURIComponent(query)}`).then((response) => response.json()).then(setSources).finally(() => setLoading(false));
    }, 180);
    return () => clearTimeout(timeout);
  }, [query]);

  return <>
    <PageIntro eyebrow="Evidence marketplace" title="Sources the agent can buy." description="Real public research and guides—priced per citation and linked to a verified or clearly labeled test wallet." action={<Link href="/register" className="button button-dark"><Plus size={15} />Register source</Link>} />
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between"><div className="relative max-w-md flex-1"><Search size={15} className="absolute left-3 top-3.5 text-slate-400" /><input className="input pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by topic, creator, or title…" /></div><div className="text-xs text-slate-400">{sources.length} indexed sources</div></div>
      {loading ? <div className="grid gap-4 p-5 md:grid-cols-2">{[1,2,3,4].map((number) => <div key={number} className="h-40 animate-pulse rounded-xl bg-slate-100" />)}</div> : sources.length ?
      <div className="table-wrap"><table><thead><tr><th>Source</th><th>Creator</th><th>Price</th><th>Citations</th><th>Earned</th><th /></tr></thead><tbody>{sources.map((source) => <tr key={source.id}>
        <td className="min-w-[320px]"><p className="font-semibold text-slate-750">{source.title}</p><p className="mt-1 line-clamp-1 max-w-md text-xs text-slate-400">{source.excerpt}</p><div className="mt-2 flex flex-wrap gap-1">{source.tags.split(",").slice(0, 3).map((tag) => <Badge key={tag}>{tag.trim()}</Badge>)}</div></td>
        <td><p className="font-semibold text-slate-650">{source.creator.name}</p><p className="mt-1 font-mono text-[10px] text-slate-400">{shortWallet(source.creator.walletAddress)}</p>{source.creator.walletVerifiedAt && <div className="mt-2"><Badge tone="green"><BadgeCheck size={11} /><span className="hidden sm:inline">{source.creator.walletVerificationMethod === "eip191" ? "wallet verified" : "test wallet"}</span></Badge></div>}</td>
        <td className="font-bold text-[#39745e]">{formatUsdc(source.citationPriceMicros)}</td><td>{source.timesCited}</td><td>{formatUsdc(source.totalEarnedMicros)}</td><td><a href={source.url} target="_blank" rel="noreferrer" className="grid size-8 place-items-center rounded-lg border text-slate-400 hover:text-slate-700"><ExternalLink size={13} /></a></td>
      </tr>)}</tbody></table></div> : <EmptyState title="No matching sources" copy="Try a broader search or register a new article." />}
    </Card>
  </>;
}
