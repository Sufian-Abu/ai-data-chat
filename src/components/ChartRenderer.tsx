"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";

export function ChartRenderer({
  rows,
  viz,
}: {
  rows: any[];
  viz: { type: "line" | "bar" | "table"; xKey?: string; yKey?: string };
}) {
  if (!rows?.length) return null;
  if (!viz || viz.type === "table") return null;

  const xKey = viz.xKey;
  const yKey = viz.yKey;
  if (!xKey || !yKey) return null;

  const data = rows.map((r) => ({
    ...r,
    [yKey]: typeof r[yKey] === "string" ? Number(r[yKey]) : r[yKey],
  }));

  return (
    <div style={{ height: 320, width: "100%", marginTop: 12 }}>
      <ResponsiveContainer>
        {viz.type === "line" ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey={yKey} dot={false} />
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Bar dataKey={yKey} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}