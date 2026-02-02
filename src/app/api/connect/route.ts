import { NextResponse } from "next/server";
import { introspectSchema } from "../../../Server/db/introspect";

export async function GET() {
  try {
    const schemaSummary = await introspectSchema();

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