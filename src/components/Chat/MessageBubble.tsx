"use client";

import type { ChatMessage } from "./types";
import ResultChart from "./ResultChart";

export default function MessageBubble({
  m,
  onPickFollowup,
}: {
  m: ChatMessage;
  onPickFollowup: (q: string) => void;
}) {
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

        {/* chart */}
        {m.rows && m.rows.length > 0 && m.visualization && m.visualization.type !== "table" && (
          <ResultChart rows={m.rows} viz={m.visualization} />
        )}

        {/* sql */}
        {m.sql && (
          <details style={{ marginTop: 10 }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>SQL</summary>
            <pre style={{ background: "#111", color: "#0f0", padding: 10, borderRadius: 10, overflowX: "auto" }}>
              {m.sql}
            </pre>
          </details>
        )}

        {/* table */}
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

        {/* followups */}
        {m.followups && m.followups.length > 0 && (
          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {m.followups.slice(0, 6).map((q) => (
              <button
                key={q}
                onClick={() => onPickFollowup(q)}
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