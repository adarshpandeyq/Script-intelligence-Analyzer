import Link from "next/link";
import { desc } from "drizzle-orm";
import { Stethoscope } from "lucide-react";
import { db } from "@/db";
import { analyses } from "@/db/schema";
import { GlassCard } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DoctorIndexPage() {
  let rows: {
    id: number;
    title: string;
    filename: string | null;
    wordCount: number;
    sceneCount: number;
    characterCount: number;
    createdAt: Date;
    payload: { issues?: unknown[] };
  }[] = [];
  let dbError = false;

  try {
    rows = await db
      .select({
        id: analyses.id,
        title: analyses.title,
        filename: analyses.filename,
        wordCount: analyses.wordCount,
        sceneCount: analyses.sceneCount,
        characterCount: analyses.characterCount,
        createdAt: analyses.createdAt,
        payload: analyses.payload,
      })
      .from(analyses)
      .orderBy(desc(analyses.id))
      .limit(30);
  } catch {
    dbError = true;
  }

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <span className="chip">
          <Stethoscope size={12} /> Script Doctor · problem detection & fix engine
        </span>
        <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">Script Doctor</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
          Pick an analyzed script. The engine scans it for plot holes, timeline and character
          inconsistencies, object continuity errors, unresolved events, repetitive or weak dialogue,
          abrupt transitions, pacing problems and missing setups — then offers 2–3 scored solutions
          per problem and rewrites only the affected beat when you apply one.
        </p>
      </div>

      {dbError && (
        <GlassCard>
          <p className="text-sm text-rose-200">
            Could not reach the analysis database. Please verify PostgreSQL is running.
          </p>
        </GlassCard>
      )}

      {!dbError && rows.length === 0 && (
        <GlassCard>
          <p className="text-sm text-slate-300">
            No scripts analyzed yet.{" "}
            <Link href="/analyze" className="text-violet-300 underline underline-offset-4">
              Analyze a script first
            </Link>
            .
          </p>
        </GlassCard>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((row, i) => {
          const issues = (row.payload?.issues as unknown[]) ?? [];
          const high = issues.filter((issue) => (issue as { severity?: string }).severity === "High").length;
          return (
            <Link key={row.id} href={`/doctor/${row.id}`} className="block">
              <GlassCard hover className={`animate-fade-up delay-${(i % 5) + 1}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">{row.title}</h2>
                    <p className="mt-1 text-xs text-slate-400">
                      {row.filename ?? "pasted text"} · {row.wordCount} words · {row.sceneCount}{" "}
                      scenes · {row.characterCount} characters
                    </p>
                  </div>
                  <span className="chip">#{row.id}</span>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                    <Stethoscope size={12} className="text-violet-300" />
                    {issues.length} issue{issues.length === 1 ? "" : "s"} detected
                  </span>
                  {high > 0 && (
                    <span className="rounded-full border border-rose-400/40 bg-rose-500/15 px-3 py-1 text-xs text-rose-200">
                      {high} high severity
                    </span>
                  )}
                </div>
              </GlassCard>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
