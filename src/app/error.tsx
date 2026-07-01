"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <div className="grid min-h-[60vh] place-items-center text-center"><div><p className="text-2xl font-semibold text-slate-800">Something slipped through the toll gate.</p><p className="mt-2 text-sm text-slate-500">The app hit an unexpected error. Your stored receipts are safe.</p><button onClick={reset} className="button button-dark mt-5">Try again</button></div></div>;
}
