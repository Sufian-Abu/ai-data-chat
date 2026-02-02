// import Groq from "groq-sdk";

// export const groq = new Groq({
//   apiKey: process.env.GROQ_API_KEY!,
// });

import "server-only";
import Groq from "groq-sdk";
import { env } from "@/server/config/env";

export const groq = new Groq({
  apiKey: env.GROQ_API_KEY,
});

export async function groqCall(messages: { role: "system" | "user"; content: string }[]) {
  const completion = await groq.chat.completions.create({
    model: env.GROQ_MODEL, // default: llama-3.1-8b-instant
    temperature: 0,
    max_tokens: 1400,
    response_format: { type: "json_object" } as any,
    messages,
  });

  return completion.choices[0]?.message?.content || "";
}
