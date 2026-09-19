import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { analyses } from "@/db/schema";
import { GlassCard, SectionTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  let rows: {
    id: number;
    title: string;
    filename: string | null;
    wordCount: number;
    sceneCount: number;
    characterCount: number;
    protagonist: string | null;
    createdAt: Date;
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
        protagonist: analyses.protagonist,
        createdAt: analyses.createdAt,
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
        <span className="chip">Saved analyses</span>
        <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">Results</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
          Every script you analyze is stored with its full intelligence payload. Open any record to
          explore characters, scenes, emotions, themes, suspense and possible foreshadowing.
        </p>
      </div>

      {dbError && (
        <GlassCard>
          <p className="text-sm text-rose-200">
            Could not reach the analysis database. Make sure PostgreSQL is running and the schema has
            been pushed (<code className="text-xs">npx drizzle-kit push</code>).
          </p>
        </GlassCard>
      )}

      {!dbError && rows.length === 0 && (
        <GlassCard>
          <p className="text-sm text-slate-300">
            No analyses yet.{" "}
            <Link href="/analyze" className="text-violet-300 underline underline-offset-4">
              Analyze your first script
            </Link>{" "}
            or load the bundled sample.
          </p>
        </GlassCard>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((row, i) => (
          <Link key={row.id} href={`/results/${row.id}`} className="block">
            <GlassCard hover className={`animate-fade-up delay-${(i % 5) + 1}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">{row.title}</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    {row.filename ?? "pasted text"} ·{" "}
                    {new Date(row.createdAt).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <span className="chip">#{row.id}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <Stat label="Words" value={row.wordCount} />
                <Stat label="Scenes" value={row.sceneCount} />
                <Stat label="Characters" value={row.characterCount} />
                <Stat label="Lead" value={row.protagonist ?? "—"} />
              </div>
            </GlassCard>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="truncate text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
