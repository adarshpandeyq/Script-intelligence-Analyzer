import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { analyses } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: "Invalid analysis id" }, { status: 400 });
  }
  const rows = await db.select().from(analyses).where(eq(analyses.id, numericId)).limit(1);
  if (!rows.length) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }
  const row = rows[0];
  return NextResponse.json({ id: row.id, createdAt: row.createdAt, filename: row.filename, ...row.payload });
}
