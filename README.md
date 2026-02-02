# AI Data Chat

AI Data Chat is a small experimental app that lets you ask questions about a **PostgreSQL** database using natural language.

It translates questions into **safe, read-only SQL**, executes them on the server, and returns results as tables or charts with short explanations and optional follow-up questions.

This project is intentionally minimal and opinionated—built for fast data exploration, not as a full BI tool.

---

## What this project does

- Accepts text or voice questions
- Converts questions into SQL using an LLM
- Executes **only SELECT / WITH queries**
- Renders results as:
  - Tables
  - Line charts
  - Bar charts
- Optionally asks clarifying questions when needed
- Keeps database access fully server-side
- **Optimizes token usage** by:
  - Caching schema introspection (TTL)
  - Sending a **compact schema prompt** (text, not full JSON)
  - **Shortlisting relevant tables** per question

---

## What this project does NOT do

- No write operations (INSERT / UPDATE / DELETE)
- No authentication or multi-tenant support
- No dashboard builder or saved reports
- No direct LLM → database access
- No attempt to replace BI tools
- No production-grade PII governance (only basic “accident prevention”)

---

## Tech stack

- Next.js (App Router)
- TypeScript
- PostgreSQL
- Groq (Llama 3.1)
- Recharts

---

## How it works (high level)

1. User asks a question (text or voice)
2. Server:
   - Introspects database schema (cached with TTL)
   - Shortlists likely relevant tables/columns for the question
   - Builds a compact schema prompt (text format)
   - Sends schema + question to the LLM
3. LLM returns structured JSON:
   - SQL query
   - Short explanation
   - Visualization suggestion (optional)
   - Insights/follow-ups (optional)
4. SQL is validated for safety via `sqlGuard`
5. Query is executed **server-side** using a pooled connection with:
   - Read-only transaction
   - Statement timeout
6. Results are returned to the UI

The LLM **never** connects to the database directly.

---

## Safety model (MVP guardrails)

Before execution, generated SQL is validated to enforce:

- Single statement only
- Only `SELECT` / `WITH`
- Blocks common write/admin keywords (INSERT/UPDATE/DELETE/DROP/etc.)
- Blocks `SELECT *` (accident prevention)
- Enforces `LIMIT` (adds default if missing, clamps max)
- Optional: blocks common PII/contact tokens like `email`, `phone` (accident prevention)

> Note: This is MVP-level safety. Production systems should use a proper SQL parser + allow-listing.

---

## Performance and token optimizations

To keep responses fast and costs low:

- **Schema introspection is cached** for a short TTL instead of running on every request
- The prompt uses **compact schema text** rather than full schema JSON
- Only **relevant tables** (shortlisted per question) are included in the prompt
- Only recent conversation turns are included (bounded history)

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### Configure environment variables
- Create a `.env.local` file in the project root:

```bash
DATABASE_URL=postgresql://user@localhost:5432/ai_chat
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.1-8b-instant
AI_PROVIDER=groq
PG_ALLOW_SELF_SIGNED=0
```

### Run locally
```bash
npm run dev
```

