export default function Loading() {
  return <div className="animate-pulse space-y-6"><div className="h-12 w-72 rounded-xl bg-slate-200" /><div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-44 rounded-2xl bg-white" />)}</div><div className="h-96 rounded-2xl bg-white" /></div>;
}
