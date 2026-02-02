// WEB/src/lib/safety/sqlGuard.ts

export function assertSafeReadOnlySQL(sql: string) {
    let s = (sql || "").trim();
    if (!s) throw new Error("SQL is empty.");
  
    // 1) Remove SQL code fences if the model added them
    // e.g. ```sql ... ```
    s = s.replace(/^```sql\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  
    // 2) Allow ONE trailing semicolon (common in LLM output)
    // but disallow multiple statements.
    // Example allowed: "SELECT ...;"
    // Example blocked: "SET x=1; SELECT ...;"
    const parts = s
      .split(";")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  
    if (parts.length === 0) throw new Error("SQL is empty.");
    if (parts.length > 1) throw new Error("Only single-statement SQL is allowed.");
  
    // Rebuild single statement without semicolon
    s = parts[0];
  
    const lower = s.toLowerCase().trim();
  
    // 3) Block writes / dangerous operations
    const blocked = [
      "insert ",
      "update ",
      "delete ",
      "drop ",
      "alter ",
      "truncate ",
      "create ",
      "grant ",
      "revoke ",
      "copy ",
      "call ",
      "execute ",
      "refresh ",
      "vacuum",
      "analyze",
      "set ", // prevents "SET search_path..." etc.
      "begin",
      "commit",
      "rollback",
    ];
  
    for (const kw of blocked) {
      if (lower.startsWith(kw) || lower.includes(`\n${kw}`) || lower.includes(` ${kw}`)) {
        throw new Error("Write operations are not allowed.");
      }
    }
  
    // 4) Allow only SELECT / WITH
    if (!(lower.startsWith("select") || lower.startsWith("with"))) {
      throw new Error("Only SELECT/WITH queries are allowed.");
    }
  
    return s;
  }  