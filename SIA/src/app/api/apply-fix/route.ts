import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { analyses, appliedFixes } from "@/db/schema";
import type { AnalysisResult } from "@/lib/nlp/types";
import { applyFix, findIssue, findOption, nextOption } from "@/lib/nlp/modify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const analysisId = Number(new URL(request.url).searchParams.get("analysisId"));
  if (!Number.isFinite(analysisId)) {
    return NextResponse.json({ error: "analysisId is required" }, { status: 400 });
  }
  try {
    const rows = await db
      .select()
      .from(appliedFixes)
      .where(eq(appliedFixes.analysisId, analysisId))
      .orderBy(asc(appliedFixes.id));
    return NextResponse.json({ appliedFixes: rows });
  } catch {
    return NextResponse.json({ appliedFixes: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      analysisId?: number;
      issueId?: string;
      optionId?: string;
      tryAnother?: boolean;
      apply?: boolean;
    };
    const analysisId = Number(body.analysisId);
    if (!Number.isFinite(analysisId) || !body.issueId) {
      return NextResponse.json({ error: "analysisId and issueId are required" }, { status: 400 });
    }

    const rows = await db.select().from(analyses).where(eq(analyses.id, analysisId)).limit(1);
    if (!rows.length) return NextResponse.json({ error: "Analysis not found" }, { status: 404 });

    const result = rows[0].payload as AnalysisResult;
    const issue = findIssue(result, body.issueId);
    if (!issue) return NextResponse.json({ error: "Issue not found" }, { status: 404 });

    // "Try Another" cycles to the next option without saving anything.
    const option = body.tryAnother && body.optionId
      ? nextOption(issue, body.optionId)
      : findOption(issue, body.optionId);
    if (!option) return NextResponse.json({ error: "No fix options for this issue" }, { status: 400 });

    const modification = applyFix(result, issue, option);

    if (body.apply && !body.tryAnother) {
      await db.insert(appliedFixes).values({
        analysisId,
        issueId: issue.id,
        optionId: option.id,
        optionLabel: option.label,
        issueTitle: issue.title,
        sceneNumber: modification.sceneNumber,
        original: modification.original,
        modified: modification.modified,
      });
    }

    return NextResponse.json({
      ...modification,
      applied: Boolean(body.apply && !body.tryAnother),
      scores: option.scores,
      recommended: issue.recommendedOptionId === option.id,
      disclaimer:
        "This is an AI-generated suitability recommendation, not an objectively best choice — review the change before using it.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
