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
    "answer": "short business explanation",
    "insights": ["..."],
    "followups": ["..."],
    "visualization": { "type": "line|bar|table", "xKey": "...", "yKey": "..." }
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
  - No write operations
  - Use ONLY the provided schema tables/columns
  `;
  }
  
  export function repairPrompt(badOutput: string) {
    return `
  Your previous output could not be parsed/validated.
  
  Convert it into EXACTLY one of these JSON shapes (and output JSON only):
  
  Answer shape:
  {"type":"answer","sql":"SELECT ...","answer":"...","insights":["..."],"followups":["..."],"visualization":{"type":"line|bar|table","xKey":"...","yKey":"..."}}
  
  Clarify shape:
  {"type":"clarify","clarifying_question":"...","options":["..."]}
  
  BAD_OUTPUT:
  ${badOutput}
  `;
  }
  
  export function userPrompt({ schema, resolved, history, message }: any) {
    return `
  SCHEMA:
  ${JSON.stringify(schema)}
  
  RESOLVED:
  ${JSON.stringify(resolved)}
  
  HISTORY:
  ${JSON.stringify((history || []).slice(-10))}
  
  QUESTION:
  ${message}
  
  Return JSON only.
  `;
  }  