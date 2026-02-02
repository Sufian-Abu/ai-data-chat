# AI Data Chat

AI Data Chat is a small experimental app that lets you ask questions about a PostgreSQL database using natural language.

It translates questions into **safe, read-only SQL**, executes them on the server, and returns results as tables or charts with short explanations and optional follow-up questions.

This project is intentionally minimal and opinionated, built as a foundation for data exploration—not a full BI tool.

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

---

## What this project does NOT do

- No write operations (INSERT / UPDATE / DELETE)
- No authentication or multi-tenant support
- No dashboard builder or saved reports
- No direct LLM → database access
- No attempt to replace BI tools

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
   - Introspects database schema
   - Sends schema + question to the LLM
3. LLM returns structured JSON:
   - SQL query
   - Short explanation
   - Visualization suggestion
4. SQL is validated for safety
5. Query is executed
6. Results are returned to the UI

The LLM **never** connects to the database directly.

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

