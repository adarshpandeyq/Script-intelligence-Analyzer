import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { AlertTriangle, ArrowLeft, Stethoscope } from "lucide-react";
import { db } from "@/db";
import { analyses } from "@/db/schema";
import type { AnalysisResult } from "@/lib/nlp/types";
import { Badge, GlassCard, Stat } from "@/components/ui";
import IssueWorkbench from "@/components/IssueWorkbench";

export const dynamic = "force-dynamic";

export default async function DoctorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) notFound();

  let rows: (typeof analyses.$inferSelect)[] = [];
  let dbError = false;
  try {
    rows = await db.select().from(analyses).where(eq(analyses.id, numericId)).limit(1);
  } catch {
    dbError = true;
  }
  if (dbError) {
    return (
      <GlassCard>
        <p className="text-sm text-rose-200">Could not reach the analysis database.</p>
      </GlassCard>
    );
  }
  if (!rows.length) notFound();

  const row = rows[0];
  const result = row.payload as AnalysisResult;
  const issues = result.issues ?? [];
  const high = issues.filter((issue) => issue.severity === "High").length;
  const medium = issues.filter((issue) => issue.severity === "Medium").length;
  const low = issues.filter((issue) => issue.severity === "Low").length;

  const byType = issues.reduce<Record<string, number>>((acc, issue) => {
    acc[issue.label] = (acc[issue.label] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <Link href="/doctor" className="btn-ghost text-xs">
          <ArrowLeft size={14} /> All scripts
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
          <Stethoscope size={26} className="mr-2 inline text-violet-300" />
          Diagnosis — {result.title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
          {issues.length
            ? `${issues.length} potential problems were detected across ${result.statistics.sceneCount} scenes. Each one includes evidence from the script and 2–3 possible fixes with suitability scores.`
            : "No problems were detected for this script with the current detectors."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Issues" value={issues.length} />
        <Stat label="High" value={high} accent="amber" />
        <Stat label="Medium" value={medium} accent="violet" />
        <Stat label="Low" value={low} accent="sky" />
        <Stat label="Scenes" value={result.statistics.sceneCount} accent="emerald" />
        <Stat label="Fix options" value={issues.reduce((sum, i) => sum + i.options.length, 0)} />
      </div>

      {Object.keys(byType).length > 0 && (
        <GlassCard>
          <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-slate-400">
            Problem categories
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(byType).map(([label, count]) => (
              <Badge key={label} tone="violet">
                {label} · {count}
              </Badge>
            ))}
          </div>
        </GlassCard>
      )}

      <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-100">
        <AlertTriangle size={12} className="mr-1 inline" />
        Every recommendation below is an AI-generated suitability score, not an objective verdict.
        Options are generated from the detected evidence — review each change before using it, and
        treat foreshadowing and plot-hole signals as prompts for a human rewrite.
      </div>

      <IssueWorkbench analysisId={row.id} issues={issues} />

      <div className="flex flex-wrap gap-3">
        <Link href={`/results/${row.id}`} className="btn-ghost">
          Full analysis dashboard
        </Link>
        <Link href="/analyze" className="btn-primary">
          Analyze another script
        </Link>
      </div>
    </div>
  );
}
