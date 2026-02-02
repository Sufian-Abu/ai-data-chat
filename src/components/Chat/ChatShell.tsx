"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import VoiceButton from "@/components/Chat/VoiceButton"; // keep your existing path if you want
import MessageBubble from "./MessageBubble";
import type { ApiResponse, ChatMessage } from "./types";
import { uid } from "./types";

export default function ChatShell() {
  const quickPrompts = useMemo(
    () => [
      "Monthly revenue last 12 months",
      "Top reps by revenue",
      "Campaign ROI: budget vs revenue",
      "Highest deal this month and who closed it",
      "Unpaid commissions per rep",
    ],
    []
  );

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uid(),
      role: "assistant",
      content:
        'Hi! Ask anything about your database. Example: "Top reps by revenue", "Monthly revenue last 12 months", "Campaign ROI".',
      followups: quickPrompts,
    },
  ]);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(text: string) {
    const msg = text.trim();
    if (!msg) return;
    if (sending) return;
    if (inFlightRef.current) return;

    inFlightRef.current = true;

    const userMsg: ChatMessage = { id: uid(), role: "user", content: msg };
    const thinkingMsg: ChatMessage = {
      id: uid(),
      role: "assistant",
      content: "🤔 Thinking…",
      isThinking: true,
    };

    const history = [...messages, userMsg]
      .filter((m) => !m.isThinking)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg, thinkingMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history }),
      });

      const json: ApiResponse = await res.json();

      setMessages((prev) => prev.filter((m) => !m.isThinking));
      setSending(false);
      inFlightRef.current = false;

      if (!json.ok) {
        setMessages((prev) => [
          ...prev,
          { id: uid(), role: "assistant", isError: true, content: `❌ ${json.error}`, followups: quickPrompts },
        ]);
        return;
      }

      if (json.type === "clarify") {
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            content: `🤔 ${json.clarifying_question}`,
            followups: (json.options?.length ? json.options : quickPrompts) as string[],
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          content: json.answer || "Done.",
          sql: json.sql,
          rows: json.result?.rows ?? [],
          fields: json.result?.fields ?? [],
          followups: json.followups?.length ? json.followups : quickPrompts,
          visualization: json.visualization ?? { type: "table" },
        },
      ]);
    } catch (e: any) {
      setMessages((prev) => prev.filter((m) => !m.isThinking));
      setSending(false);
      inFlightRef.current = false;

      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "assistant", isError: true, content: `❌ Request failed: ${e.message}`, followups: quickPrompts },
      ]);
    }
  }

  return (
    <main style={{ display: "flex", height: "100vh", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto" }}>
      {/* Sidebar */}
      <aside style={{ width: 280, borderRight: "1px solid #eee", padding: 14 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>AI Data Chat</div>

        <div style={{ marginTop: 12 }}>
          <button
            onClick={() =>
              setMessages([
                {
                  id: uid(),
                  role: "assistant",
                  content:
                    'Hi! Ask anything about your database. Example: "Top reps by revenue", "Monthly revenue last 12 months", "Campaign ROI".',
                  followups: quickPrompts,
                },
              ])
            }
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 12,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            + New chat
          </button>
        </div>

        <div style={{ marginTop: 16, fontSize: 12, color: "#666" }}>Try these:</div>
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
          {quickPrompts.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              style={{
                textAlign: "left",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #eee",
                background: "#fafafa",
                cursor: "pointer",
              }}
            >
              {q}
            </button>
          ))}
        </div>
      </aside>

      {/* Chat */}
      <section style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, padding: 18, overflowY: "auto", background: "#fff" }}>
          {messages.map((m) => (
            <MessageBubble key={m.id} m={m} onPickFollowup={send} />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div style={{ borderTop: "1px solid #eee", padding: 14, display: "flex", gap: 10, alignItems: "center" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask anything about revenue, deals, reps, campaigns…"
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 12,
              border: "1px solid #ddd",
              fontSize: 14,
            }}
          />

          <VoiceButton
            disabled={sending}
            onPartialText={(t) => setInput(t)}
            onFinalText={(t) => {
              setInput(t);
              setTimeout(() => send(t), 50);
            }}
          />

          <button
            onClick={() => send(input)}
            disabled={sending || !input.trim()}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              cursor: sending ? "not-allowed" : "pointer",
              fontWeight: 900,
            }}
          >
            {sending ? "Thinking…" : "Send"}
          </button>
        </div>
      </section>
    </main>
  );
}