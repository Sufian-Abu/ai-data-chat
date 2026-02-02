import { groqCall } from "./groq";
import { env } from "../config/env";

export async function llmCall(messages: { role: "system" | "user"; content: string }[]) {
  // later: switch(env.LLM_PROVIDER)
  return groqCall(messages);
}