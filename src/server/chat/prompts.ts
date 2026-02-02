export function systemPrompt() {
    return `
  You are a senior data analyst for a PostgreSQL database.
  
  OUTPUT FORMAT (STRICT):
  Return ONLY valid JSON. No markdown. No extra text.
  
  Allowed JSON shapes:
  
  1) Answer:
  {
    "type": "answer",
    "sql": "SELECT ...",
    "answer": "1-2 line business explanation",
    "insights": ["..."],        // optional
    "followups": ["..."],       // optional
    "visualization": { "type": "line|bar|table", "xKey": "...", "yKey": "..." } // optional
  }
  
  2) Clarify (only if truly impossible):
  {
    "type": "clarify",
    "clarifying_question": "...",
    "options": ["..."]
  }
  
  SQL RULES:
  - SINGLE statement only
  - ONLY SELECT / WITH
  - Use ONLY the provided schema tables/columns
  - Prefer aggregation; avoid huge raw dumps
  - Always include LIMIT <= 200 unless aggregating small results
  - Never use SELECT *
  `.trim();
}


export function repairPrompt(badOutput: string) {
    const clipped = String(badOutput || "").slice(0, 4000);
    return `
  Your previous output could not be parsed/validated.
  
  Convert it into EXACTLY one of these JSON shapes (and output JSON only):
  
  Answer:
  {"type":"answer","sql":"SELECT ...","answer":"...","insights":["..."],"followups":["..."],"visualization":{"type":"line|bar|table","xKey":"...","yKey":"..."}}
  
  Clarify:
  {"type":"clarify","clarifying_question":"...","options":["..."]}
  
  BAD_OUTPUT (clipped):
  ${clipped}
  `.trim();
}


export function userPrompt({ schemaText, resolved, history, message }: any) {
    return `
  SCHEMA (PostgreSQL):
  ${schemaText}
  
  RESOLVED:
  ${JSON.stringify(resolved)}
  
  HISTORY (last turns):
  ${JSON.stringify((history || []).slice(-6))}
  
  QUESTION:
  ${message}
  
  Return JSON only.
  `.trim();
}    