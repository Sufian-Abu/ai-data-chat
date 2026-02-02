"use client";

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
import type { Viz } from "./types";

export default function ResultChart({ rows, viz }: { rows: any[]; viz?: Viz }) {
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