import OpenAI from "openai";
import type { Creator, Source } from "@prisma/client";

export type RankedSource = Source & { creator: Creator; score: number; reason: string };

const STOP_WORDS = new Set(["a", "an", "and", "are", "as", "at", "be", "by", "can", "for", "from", "how", "in", "is", "it", "of", "on", "or", "the", "to", "what", "with"]);

function terms(value: string) {
  return value.toLowerCase().match(/[a-z0-9]+/g)?.filter((word) => word.length > 1 && !STOP_WORDS.has(word)) ?? [];
}

export function rankSources(question: string, sources: (Source & { creator: Creator })[]): RankedSource[] {
  const query = new Set(terms(question));
  return sources
    .map((source) => {
      const title = terms(source.title);
      const tags = terms(source.tags);
      const body = terms(`${source.excerpt} ${source.content}`);
      const titleHits = title.filter((term) => query.has(term)).length;
      const tagHits = tags.filter((term) => query.has(term)).length;
      const bodyHits = body.filter((term) => query.has(term)).length;
      const score = titleHits * 5 + tagHits * 3 + Math.min(bodyHits, 8);
      const matches = [...new Set([...title, ...tags].filter((term) => query.has(term)))];
      const reason = matches.length
        ? `Strong match for ${matches.slice(0, 3).join(", ")}; adds a ${source.tags.split(",")[0].toLowerCase()} perspective.`
        : `Adds a distinct ${source.tags.split(",")[0].toLowerCase()} perspective to the research.`;
      return { ...source, score, reason };
    })
    .sort((a, b) => b.score - a.score || a.citationPriceMicros - b.citationPriceMicros);
}

export async function generateAnswer(question: string, selected: RankedSource[]) {
  if (process.env.OPENAI_API_KEY) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const context = selected.map((source, index) => `[${index + 1}] ${source.title}\n${source.content}`).join("\n\n");
    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: `Answer the question using only the supplied sources. Cite claims inline as [1], [2], etc. Be concise and practical.\n\nQuestion: ${question}\n\nSources:\n${context}`
    });
    if (response.output_text) return response.output_text;
  }

  const insights = selected.map((source, index) => `${source.excerpt.replace(/[.!?]+$/, "")} [${index + 1}]`);
  return `Nanopayments create a direct value exchange between AI agents and independent creators. ${insights.join(" ")}\n\nIn practice, an agent can rank evidence, enforce a strict spending cap, pay only the creators whose work improves the answer, and attach receipts to every citation. That turns attribution from a courtesy into measurable revenue while keeping research fast and affordable.`;
}
