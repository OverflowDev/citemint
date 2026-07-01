// Shared economic limits. The run budget cap is derived from the citation price cap and the max
// sources per run, so the "how much a source can cost" and "how much a run can spend" limits can never
// drift apart. Used by both the zod schemas (server) and the form inputs/slider (client).
export const MIN_USDC = 0.000001;
export const MAX_CITATION_PRICE_USDC = 0.1;
export const MAX_SOURCES_PER_RUN = 4;
export const MAX_BUDGET_USDC = MAX_CITATION_PRICE_USDC * MAX_SOURCES_PER_RUN; // 0.4 — the most a single run can spend
