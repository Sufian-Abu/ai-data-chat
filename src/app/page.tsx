"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import VoiceButton from "../components/Chat/VoiceButton";

type Viz = { type: "line" | "bar" | "table"; xKey?: string; yKey?: string };

type ChatMessage = {
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

type ApiOkAnswer = {
  ok: true;
  type: "answer";
  answer: string;
  sql?: string;
  insights?: string[];
  followups?: string[];
  visualization?: Viz;
  result?: { rows: any[]; fields: string[] };
};

type ApiOkClarify = {
  ok: true;
  type: "clarify";
  clarifying_question: string;
  options?: string[];
};

type ApiErr = { ok: false; error: string; raw?: string };

type ApiResponse = ApiOkAnswer | ApiOkClarify | ApiErr;

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function ResultChart({ rows, viz }: { rows: any[]; viz?: Viz }) {
  if (!viz || viz.type === "table") return null;
  if (!viz.xKey || !viz.yKey) return null;
  if (!rows || rows.length === 0) return null;

  const data = rows.map((r) => {
    const y = r[viz.yKey!];
    const yNum = typeof y === "string" ? Number(y) : y;
    return { ...r, [viz.yKey!]: Number.isFinite(yNum) ? yNum : y };
  });

  return (
    <div style={{ height: 320, width: "100%", marginTop: 10 }}>
      <ResponsiveContainer width="100%" height="100%">
        {viz.type === "line" ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={viz.xKey} />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey={viz.yKey} />
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={viz.xKey} />
            <YAxis />
            <Tooltip />
            <Bar dataKey={viz.yKey} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export default function Home() {
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

  // ✅ Avoid double-send caused by rapid triggers
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
        // ✅ keep history for follow-ups
        body: JSON.stringify({ message: msg, history }),
      });

      const json: ApiResponse = await res.json();

      // remove thinking bubble
      setMessages((prev) => prev.filter((m) => !m.isThinking));
      setSending(false);
      inFlightRef.current = false;

      if (!json.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            isError: true,
            content: `❌ ${json.error}`,
            followups: quickPrompts,
          },
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
        {
          id: uid(),
          role: "assistant",
          isError: true,
          content: `❌ Request failed: ${e.message}`,
          followups: quickPrompts,
        },
      ]);
    }
  }

  function Bubble({ m }: { m: ChatMessage }) {
    const isUser = m.role === "user";
    const bg = isUser ? "#0b0b0b" : m.isError ? "#fff3f3" : "#f3f3f3";
    const color = isUser ? "#fff" : "#000";
    const border = m.isError ? "1px solid #ffb2b2" : "1px solid transparent";

    return (
      <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 12 }}>
        <div
          style={{
            maxWidth: "78%",
            background: bg,
            color,
            border,
            borderRadius: 14,
            padding: "10px 12px",
            whiteSpace: "pre-wrap",
            lineHeight: 1.4,
          }}
        >
          {m.content}

          {/* ✅ CHART */}
          {m.rows && m.rows.length > 0 && m.visualization && m.visualization.type !== "table" && (
            <ResultChart rows={m.rows} viz={m.visualization} />
          )}

          {/* ✅ SQL */}
          {m.sql && (
            <details style={{ marginTop: 10 }}>
              <summary style={{ cursor: "pointer", fontWeight: 700 }}>SQL</summary>
              <pre style={{ background: "#111", color: "#0f0", padding: 10, borderRadius: 10, overflowX: "auto" }}>
                {m.sql}
              </pre>
            </details>
          )}

          {/* ✅ TABLE */}
          {m.fields && m.fields.length > 0 && (
            <details style={{ marginTop: 10 }}>
              <summary style={{ cursor: "pointer", fontWeight: 700 }}>Results table</summary>
              <div style={{ marginTop: 8, overflowX: "auto", border: "1px solid #e5e5e5", borderRadius: 10 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {m.fields.map((f) => (
                        <th
                          key={f}
                          style={{
                            textAlign: "left",
                            padding: 8,
                            borderBottom: "1px solid #e5e5e5",
                            background: "#fafafa",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {f}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(m.rows ?? []).slice(0, 50).map((r, idx) => (
                      <tr key={idx}>
                        {m.fields!.map((f) => (
                          <td key={f} style={{ padding: 8, borderBottom: "1px solid #f1f1f1" }}>
                            {String(r?.[f] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>Showing up to 50 rows</div>
            </details>
          )}

          {/* ✅ followups */}
          {m.followups && m.followups.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {m.followups.slice(0, 6).map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    cursor: "pointer",
                    background: "#fff",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <main style={{ display: "flex", height: "100vh", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto" }}>
      {/* Sidebar */}
      <aside style={{ width: 280, borderRight: "1px solid #eee", padding: 14 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>AI Data Chat MVP</div>

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
            <Bubble key={m.id} m={m} />
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

          {/* ✅ VOICE INPUT */}
          <VoiceButton
            disabled={sending}
            onPartialText={(t) => setInput(t)}
            onFinalText={(t) => {
              setInput(t);

              // ✅ Auto-send after voice finishes (remove this if you don't want auto-send)
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