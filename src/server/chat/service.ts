import { introspectSchema } from "../db/introspect";
import { runQuery } from "../db/pg";
import { assertSafeReadOnlySQL } from "../safety/sqlGuard";
import { llmCall } from "../llm/client";
import { parseJsonRobust } from "./json";
import { ModelOutSchema, type ChatBody } from "./types";
import { systemPrompt, repairPrompt, userPrompt } from "./prompts";

function compactSchema(schemaSummary: any) {
  return {
    tables: (schemaSummary?.tables || []).map((t: any) => ({
      name: t.name,
      columns: (t.columns || []).map((c: any) => ({ name: c.name, type: c.type })),
    })),
  };
}

export async function chatService(body: ChatBody) {
  const { message, resolved, history = [] } = body;

  const schemaSummary = await introspectSchema();
  const schema = compactSchema(schemaSummary);

  const effectiveResolved = { time_range: resolved?.time_range ?? "all_time" };

  const sys = systemPrompt();
  const prompt = userPrompt({ schema, resolved: effectiveResolved, history, message });

  // Attempt 1
  let raw = await llmCall([{ role: "system", content: sys }, { role: "user", content: prompt }]);

  // Parse + validate, else repair once
  let out: any;
  try {
    out = ModelOutSchema.parse(parseJsonRobust(raw));
  } catch {
    const repaired = await llmCall([{ role: "system", content: sys }, { role: "user", content: repairPrompt(raw) }]);
    out = ModelOutSchema.parse(parseJsonRobust(repaired));
  }

  // Clarify
  if (out.type === "clarify") {
    return { ok: true, ...out };
  }

  // Answer
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