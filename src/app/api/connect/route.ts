import { NextResponse } from "next/server";
import { getSchemaSummaryCached } from "../../../server/db/schemaCache";

export async function GET() {
  try {
    const schemaSummary = await getSchemaSummaryCached();

    return NextResponse.json({
      ok: true,
      tableCount: schemaSummary.tables.length,
      schemaSummary,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}