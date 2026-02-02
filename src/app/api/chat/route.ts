import { NextResponse } from "next/server";
import { BodySchema } from "@/server/chat/types";
import { chatService } from "@/server/chat/service";

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());
    const out = await chatService(body);
    return NextResponse.json(out);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}