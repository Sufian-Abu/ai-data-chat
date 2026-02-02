export type Viz = { type: "line" | "bar" | "table"; xKey?: string; yKey?: string };

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sql?: string;
  rows?: any[];
  fields?: string[];
  followups?: string[];
  visualization?: Viz;
  isThinking?: boolean;
  isError?: boolean;
};

export type ApiOkAnswer = {
  ok: true;
  type: "answer";
  answer: string;
  sql?: string;
  insights?: string[];
  followups?: string[];
  visualization?: Viz;
  result?: { rows: any[]; fields: string[] };
};

export type ApiOkClarify = {
  ok: true;
  type: "clarify";
  clarifying_question: string;
  options?: string[];
};

export type ApiErr = { ok: false; error: string; raw?: string };

export type ApiResponse = ApiOkAnswer | ApiOkClarify | ApiErr;

export function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}