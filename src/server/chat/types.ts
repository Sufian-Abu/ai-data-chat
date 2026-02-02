import { z } from "zod";

// Request
export const BodySchema = z.object({
  message: z.string().min(1),
  resolved: z.object({
    time_range: z.enum(["calendar_month", "last_30_days", "this_quarter", "all_time"]).optional(),
  }).optional(),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).optional(),
});

export type ChatBody = z.infer<typeof BodySchema>;

// Model output normalization
const TypeSchema = z.string()
  .transform((v) => String(v || "").toLowerCase().trim())
  .transform((v) => (v === "final" || v === "result" ? "answer" : v));

export const ModelAnswerSchema = z.object({
  type: TypeSchema.refine((v) => v === "answer"),
  sql: z.string().min(1),
  answer: z.string().min(1),
  insights: z.array(z.string()).optional().default([]),
  followups: z.array(z.string()).optional().default([]),
  visualization: z.object({
    type: z.enum(["line", "bar", "table"]).optional().default("table"),
    xKey: z.string().optional(),
    yKey: z.string().optional(),
  }).optional(),
});

export const ModelClarifySchema = z.object({
  type: TypeSchema.refine((v) => v === "clarify"),
  clarifying_question: z.string().min(1),
  options: z.array(z.string()).optional().default([]),
});

export const ModelOutSchema = z.union([ModelAnswerSchema, ModelClarifySchema]);
export type ModelOut = z.infer<typeof ModelOutSchema>;