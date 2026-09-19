import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { analyses } from "@/db/schema";
import { analyzeScript } from "@/lib/nlp/pipeline";
import { extractTextFromBuffer, ScriptError } from "@/lib/nlp/textProcessing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BYTES = 12 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let rawText = "";
    let title = "Untitled Script";
    let filename: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      title = (form.get("title") as string | null)?.trim() || "";
      if (file && typeof file === "object" && "arrayBuffer" in file) {
        const upload = file as File;
        filename = upload.name || "upload";
        if (upload.size > MAX_BYTES) {
          return NextResponse.json({ error: "File is too large (max 12 MB)." }, { status: 400 });
        }
        rawText = await extractTextFromBuffer(await upload.arrayBuffer(), filename);
        if (!title) {
          title = filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Untitled Script";
        }
      } else {
        rawText = (form.get("text") as string | null) ?? "";
        if (!title) title = "Pasted Script";
      }
    } else {
      const body = (await request.json()) as { text?: string; title?: string };
      rawText = body.text ?? "";
      title = (body.title ?? "").trim() || "Pasted Script";
    }

    if (!rawText.trim()) {
      return NextResponse.json(
        { error: "We could not find any text in that upload. Try a text-based PDF or a .txt file." },
        { status: 400 },
      );
    }

    const result = analyzeScript(rawText, title || "Untitled Script");
    const [row] = await db
      .insert(analyses)
      .values({
        title: result.title,
        filename,
        wordCount: result.statistics.wordCount,
        sceneCount: result.statistics.sceneCount,
        characterCount: result.statistics.characterCount,
        protagonist: result.protagonist,
        payload: result,
      })
      .returning({ id: analyses.id });

    return NextResponse.json({ id: row.id, ...result });
  } catch (error) {
    if (error instanceof ScriptError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Unexpected analysis error.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  const rows = await db
    .select({
      id: analyses.id,
      title: analyses.title,
      filename: analyses.filename,
      wordCount: analyses.wordCount,
      sceneCount: analyses.sceneCount,
      characterCount: analyses.characterCount,
      protagonist: analyses.protagonist,
      createdAt: analyses.createdAt,
    })
    .from(analyses)
    .orderBy(desc(analyses.id))
    .limit(25);
  return NextResponse.json({ analyses: rows });
}
