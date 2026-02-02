import { getSchemaSummaryCached } from "../db/schemaCache";
import { runQuery } from "../db/pg";
import { assertSafeReadOnlySQL } from "../safety/sqlGuard";
import { llmCall } from "../llm/client";
import { parseJsonRobust } from "./json";
import { ModelOutSchema, type ChatBody } from "./types";
import { systemPrompt, repairPrompt, userPrompt } from "./prompts";

function shortlistSchema(schemaSummary: any, question: string, maxTables = 8) {
  const q = question.toLowerCase();
  const tokens = Array.from(new Set(q.split(/[^a-z0-9_]+/).filter(w => w.length >= 3)));

  const scored = (schemaSummary?.tables || []).map((t: any) => {
    const tableName = String(t.name || "").toLowerCase();
    const cols = (t.columns || []).map((c: any) => String(c.name || "").toLowerCase());

    let score = 0;
    for (const tok of tokens) {
      if (tableName.includes(tok)) score += 5;
      for (const col of cols) if (col.includes(tok)) score += 1;
    }
    return { t, score };
  });

  const selected = scored.sort((a, b) => b.score - a.score).slice(0, maxTables).map(x => x.t);
  return { tables: selected.length ? selected : (schemaSummary?.tables || []).slice(0, maxTables) };
}

function schemaToText(shortlisted: any) {
  return (shortlisted?.tables || []).map((t: any) => {
    const cols = (t.columns || [])
      .slice(0, 50)
      .map((c: any) => `${c.name}:${c.type}`)
      .join(", ");
    return `${t.name}(${cols})`;
  }).join("\n");
}

export async function chatService(body: ChatBody) {
  const { message, resolved, history = [] } = body;

  const schemaSummary = await getSchemaSummaryCached();
  const shortlisted = shortlistSchema(schemaSummary, message, 8);
  const schemaText = schemaToText(shortlisted);

  const effectiveResolved = { time_range: resolved?.time_range ?? "all_time" };
  const historyForPrompt = (history || []).slice(-6);

  const sys = systemPrompt();
  const prompt = userPrompt({ schemaText, resolved: effectiveResolved, history: historyForPrompt, message });

  let raw = await llmCall([{ role: "system", content: sys }, { role: "user", content: prompt }]);

  let out: any;
  try {
    out = ModelOutSchema.parse(parseJsonRobust(raw));
  } catch {
    const repaired = await llmCall([{ role: "system", content: sys }, { role: "user", content: repairPrompt(raw) }]);
    out = ModelOutSchema.parse(parseJsonRobust(repaired));
  }

  if (out.type === "clarify") return { ok: true, ...out };

  const safeSql = assertSafeReadOnlySQL(out.sql);
  const result = await runQuery(safeSql);

  return {
    ok: true,
    type: "answer",
    sql: safeSql,
    answer: out.answer,
    insights: out.insights ?? [],
    followups: out.followups ?? [],
    visualization: out.visualization ?? { type: "table" },
    result,
  };
}