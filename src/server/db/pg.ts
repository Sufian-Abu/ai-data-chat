import { Client, QueryResultRow } from "pg";

export async function runQuery<T extends QueryResultRow = any>(
  sql: string,
  params: any[] = [],
) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is missing");

  const ssl =
    process.env.PG_ALLOW_SELF_SIGNED === "1" ||
    process.env.PG_ALLOW_SELF_SIGNED === "true"
      ? { rejectUnauthorized: false }
      : undefined;

  const client = new Client({ connectionString, ssl });
  await client.connect();

  try {
    const res = await client.query<T>(sql, params);
    return {
      rows: res.rows,
      rowCount: res.rowCount,
      fields: res.fields.map((f) => f.name),
    };
  } finally {
    await client.end();
  }
}