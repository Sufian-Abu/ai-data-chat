import { runQuery } from "./pg";
import type { SchemaSummary } from "../types/schema";

export async function introspectSchema(): Promise<SchemaSummary> {
  // tables
  const tablesRes = await runQuery<{ table_name: string }>(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
    ORDER BY table_name;
  `);

  const tables = [];

  for (const t of tablesRes.rows) {
    const colsRes = await runQuery<{ column_name: string; data_type: string }>(
      `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1
      ORDER BY ordinal_position;
    `,
      [t.table_name]
    );

    tables.push({
      name: t.table_name,
      columns: colsRes.rows.map((c) => ({ name: c.column_name, type: c.data_type })),
    });
  }

  return { tables };
}