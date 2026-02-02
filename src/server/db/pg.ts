import { Pool, QueryResultRow } from "pg";

let pool: Pool | null = null;

function getPool() {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is missing");

  const ssl =
    process.env.PG_ALLOW_SELF_SIGNED === "1" ||
    process.env.PG_ALLOW_SELF_SIGNED === "true"
      ? { rejectUnauthorized: false }
      : undefined;

  pool = new Pool({
    connectionString,
    ssl,
    max: 10,                 // basic
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  return pool;
}

export async function runQuery<T extends QueryResultRow = any>(
  sql: string,
  params: any[] = []
) {
  const p = getPool();
  const client = await p.connect();

  try {
    // Basic safety: timeout + readonly transaction
    await client.query("BEGIN READ ONLY");
    await client.query("SET LOCAL statement_timeout = '5000ms'");

    const res = await client.query<T>(sql, params);

    await client.query("COMMIT");

    return {
      rows: res.rows,
      rowCount: res.rowCount,
      fields: res.fields.map((f) => f.name),
    };
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    throw e;
  } finally {
    client.release();
  }
}