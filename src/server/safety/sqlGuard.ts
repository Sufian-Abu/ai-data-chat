// src/server/safety/sqlGuard.ts
//
// Purpose (MVP guardrails):
// This function takes SQL produced by the LLM and ensures it is safe enough to run.
// We do NOT try to be perfect SQL parsers here (that needs a real SQL AST parser),
// but we do enforce strong constraints to avoid obvious dangerous / expensive queries.
//
// What it enforces:
// 1) Only ONE statement (no multi-statement chaining)
// 2) Only SELECT / WITH queries (read-only)
// 3) Blocks common write / admin keywords (INSERT/UPDATE/DELETE/DROP/etc.)
// 4) Blocks some dangerous Postgres functions often used for exfiltration
// 5) Blocks `SELECT *` to reduce accidental data dumping
// 6) Enforces LIMIT (adds default LIMIT if missing, caps if too high)
// 7) Optional: blocks common PII/contact columns like email/phone (accident prevention)
//
// NOTE: This is MVP-level. For stronger security, use a SQL parser + allow-listing.

export type SqlGuardOptions = {
  // Default LIMIT if query has no LIMIT.
  defaultLimit?: number;

  // Maximum allowed LIMIT (if user/LLM requests higher, we clamp it).
  maxLimit?: number;

  // If true, block SELECT *.
  disallowSelectStar?: boolean;

  // If true, block common PII column tokens (email/phone/etc.) in SQL text.
  // This is best-effort “accident prevention”, not a guarantee.
  blockPIIColumns?: boolean;

  // Extra blocked keywords (optional).
  extraBlockedKeywords?: string[];
};

// Sensible defaults for your MVP
const DEFAULTS: Required<SqlGuardOptions> = {
  defaultLimit: 200,
  maxLimit: 500,
  disallowSelectStar: true,
  blockPIIColumns: true,
  extraBlockedKeywords: [],
};

export function assertSafeReadOnlySQL(sql: string, opts: SqlGuardOptions = {}) {
  const options = { ...DEFAULTS, ...opts };

  let s = String(sql || "").trim();
  if (!s) throw new Error("SQL is empty.");

  // ------------------------------------------------------------
  // 1) Remove Markdown code fences if the LLM included them
  // ------------------------------------------------------------
  // Example:
  // ```sql
  // SELECT ...
  // ```
  s = s
    .replace(/^```sql\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  // ------------------------------------------------------------
  // 2) Remove SQL comments
  // ------------------------------------------------------------
  // This reduces bypass tricks like hiding keywords in comments.
  // -- line comments
  s = s.replace(/--.*$/gm, "");
  // /* block comments */
  s = s.replace(/\/\*[\s\S]*?\*\//g, "");
  s = s.trim();

  if (!s) throw new Error("SQL is empty after removing comments.");

  // ------------------------------------------------------------
  // 3) Enforce single statement (no chaining with ;)
  // ------------------------------------------------------------
  // We allow at most one trailing semicolon, but not multiple statements.
  const parts = s
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length !== 1) {
    throw new Error("Only single-statement SQL is allowed.");
  }

  // Use the single statement without semicolon.
  s = parts[0];

  const lower = s.toLowerCase().trim();

  // ------------------------------------------------------------
  // 4) Only allow SELECT / WITH
  // ------------------------------------------------------------
  // Blocks stuff like:
  // - SET search_path ...
  // - DO $$ ...
  // - COPY ...
  if (!(lower.startsWith("select") || lower.startsWith("with"))) {
    throw new Error("Only SELECT/WITH queries are allowed.");
  }

  // ------------------------------------------------------------
  // 5) Block dangerous keywords (best-effort)
  // ------------------------------------------------------------
  // We use word-boundary regex to reduce false positives on column/table names.
  // Example: column named "updated_at" should not trigger "update".
  const blockedKeywords = [
    // Writes / DDL / permissions
    "insert",
    "update",
    "delete",
    "drop",
    "alter",
    "truncate",
    "create",
    "grant",
    "revoke",

    // Bulk / programmatic execution / procedures
    "copy",
    "call",
    "execute",
    "prepare",
    "deallocate",

    // Maintenance / operations
    "refresh",
    "vacuum",
    "analyze",

    // Transaction control (we want a single query only)
    "begin",
    "commit",
    "rollback",

    // Session-level changes
    "set",

    // Some other risky commands
    "listen",
    "notify",
  ].concat(options.extraBlockedKeywords || []);

  for (const kw of blockedKeywords) {
    const re = new RegExp(`\\b${escapeRegExp(kw)}\\b`, "i");
    if (re.test(s)) {
      throw new Error("Write/admin operations are not allowed.");
    }
  }

  // ------------------------------------------------------------
  // 6) Block some dangerous Postgres functions (exfiltration vectors)
  // ------------------------------------------------------------
  // Not exhaustive, but blocks obvious “read files / run programs / external access”.
  const blockedFunctions = [
    "pg_read_file",
    "pg_read_binary_file",
    "pg_ls_dir",
    "pg_stat_file",
    "lo_import",
    "lo_export",
    "dblink",
    "postgres_fdw",
  ];

  for (const fn of blockedFunctions) {
    const re = new RegExp(`\\b${escapeRegExp(fn)}\\s*\\(`, "i");
    if (re.test(s)) {
      throw new Error("Dangerous functions are not allowed.");
    }
  }

  // ------------------------------------------------------------
  // 7) Disallow SELECT * (accident prevention)
  // ------------------------------------------------------------
  if (options.disallowSelectStar) {
    // This blocks the simple form "SELECT * FROM ..."
    // It won't catch every complex case, but it prevents most accidental dumps.
    if (/\bselect\s+\*\b/i.test(s)) {
      throw new Error("SELECT * is not allowed. Please select specific columns.");
    }
  }

  // ------------------------------------------------------------
  // 8) Optional: block common PII/contact columns (accident prevention)
  // ------------------------------------------------------------
  // This is a simple text match — not perfect.
  // But it prevents the most common “oops, leaked emails/phones” scenario.
  if (options.blockPIIColumns) {
    const piiTokens = [
      "email",
      "e_mail",
      "phone",
      "mobile",
      "contact",
      "nid",
      "ssn",
      "passport",
      "dob", // date of birth
      "address",
    ];

    for (const tok of piiTokens) {
      const re = new RegExp(`\\b${escapeRegExp(tok)}\\b`, "i");
      if (re.test(s)) {
        throw new Error(
          `Query references sensitive field '${tok}'. Not allowed in chat queries.`
        );
      }
    }
  }

  // ------------------------------------------------------------
  // 9) Enforce LIMIT
  // ------------------------------------------------------------
  // Why: prevents huge result sets from killing API + wasting tokens/UI.
  // Strategy:
  // - If LIMIT missing => add default LIMIT
  // - If LIMIT exists but too high => clamp to maxLimit
  //
  // Note: this is simplistic (could be wrong for subqueries), but works for MVP.
  const limitMatch = s.match(/\blimit\s+(\d+)\b/i);

  if (!limitMatch) {
    // Add a LIMIT at the end
    s = `${s} LIMIT ${options.defaultLimit}`;
  } else {
    const requested = parseInt(limitMatch[1], 10);
    if (Number.isFinite(requested) && requested > options.maxLimit) {
      // Replace LIMIT value with maxLimit
      s = s.replace(/\blimit\s+\d+\b/i, `LIMIT ${options.maxLimit}`);
    }
  }

  return s.trim();
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}