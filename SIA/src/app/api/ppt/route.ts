import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { buildProjectPptx } from "@/lib/ppt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILE_NAME = "Script_Intelligence_Analyzer.pptx";
const MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

let cached: Buffer | null = null;

function isZip(buffer: Buffer) {
  return buffer.length > 12000 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}

async function loadStatic(): Promise<Buffer | null> {
  try {
    const file = path.join(process.cwd(), "public", "downloads", FILE_NAME);
    const data = await fs.readFile(file);
    return isZip(data) ? data : null;
  } catch {
    return null;
  }
}

async function getDeck(): Promise<Buffer> {
  if (cached) return cached;
  const fromDisk = await loadStatic();
  if (fromDisk) {
    cached = fromDisk;
    return fromDisk;
  }
  const generated = await buildProjectPptx();
  cached = generated;
  return generated;
}

export async function GET() {
  try {
    const data = await getDeck();
    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": MIME,
        "Content-Length": String(data.byteLength),
        "Content-Disposition": `attachment; filename="${FILE_NAME}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Could not generate the presentation: ${message}` },
      { status: 500 },
    );
  }
}

export async function HEAD() {
  const data = await getDeck();
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Content-Type": MIME,
      "Content-Length": String(data.byteLength),
    },
  });
}
