import "server-only";
import { z } from "zod";

const EnvSchema = z.object({
  GROQ_API_KEY: z.string().min(1, "Missing GROQ_API_KEY"),
  // Optional (but recommended for OSS defaults)
  GROQ_MODEL: z.string().optional().default("llama-3.1-8b-instant"),
});

export const env = EnvSchema.parse({
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GROQ_MODEL: process.env.GROQ_MODEL,
});