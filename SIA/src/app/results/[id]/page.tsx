import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import {
  Activity,
  AlertTriangle,
  Clapperboard,
  GitBranch,
  HeartPulse,
  Sparkles,
  Stethoscope,
  Tags,
  Users,
} from "lucide-react";
import { db } from "@/db";
import { analyses } from "@/db/schema";
import type { AnalysisResult } from "@/lib/nlp/types";
import { Badge, Bar, GlassCard, Stat } from "@/components/ui";
import {
  CharacterChart,
  DialogueBalanceChart,
  EMOTION_COLORS,
  EmotionIntensityChart,
  EmotionMixChart,
  EmotionSceneChart,
  PresenceMatrix,
  SuspenseChart,
  ThemeChart,
  ThemeSceneChart,
} from "@/components/charts";
import ReportActions from "@/components/ReportActions";
import SceneExplorer from "@/components/SceneExplorer";
import ResultsNav from "@/components/ResultsNav";

export const dynamic = "force-dynamic";

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
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
        <p className="text-sm text-rose-200">
          Could not reach the analysis database. Please verify PostgreSQL is running.
        </p>
      </GlassCard>
    );
  }
  if (!rows.length) notFound();

  const row = rows[0];
  const result = row.payload as AnalysisResult;
  const { statistics, characters, scenes, emotion, themes, suspense, foreshadowing } = result;
  const peaks = suspense.peaks.map((p) => ({ scene: p.scene }));
  const cast = characters.map((c) => c.name);

  return (
    <div className="space-y-12">
      {/* Header */}
      <section id="overview" className="animate-fade-up">
        <div className="glass p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <span className="chip">
                <Sparkles size={12} /> Intelligence Report #{row.id}
              </span>
              <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">{result.title}</h1>
              <p className="mt-2 text-sm text-slate-400">
                {row.filename ?? "pasted text"} · analyzed{" "}
                {new Date(row.createdAt).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
            <div className="flex flex-wrap flex-col items-end gap-2">
              <ReportActions id={row.id} markdown={result.report.markdown} jsonPayload={result} />
              <Link
                href={`/doctor/${row.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-violet-400/40 bg-violet-500/15 px-4 py-2 text-xs font-semibold text-violet-100 transition hover:bg-violet-500/25"
              >
                <Stethoscope size={14} />
                Script Doctor · {(result.issues ?? []).length} issue
                {(result.issues ?? []).length === 1 ? "" : "s"} detected
              </Link>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <Stat label="Words" value={statistics.wordCount} />
            <Stat label="Scenes" value={statistics.sceneCount} accent="sky" />
            <Stat label="Characters" value={statistics.characterCount} accent="emerald" />
            <Stat label="Dialogue lines" value={statistics.dialogueLines} accent="amber" />
            <Stat label="Dialogue share" value={`${statistics.dialogueShare ?? 0}%`} accent="violet" />
            <Stat label="Runtime" value={`${statistics.estimatedRuntimeMinutes} min`} />
            <Stat label="Diversity" value={statistics.lexicalDiversity} accent="sky" />
          </div>
        </div>
      </section>

      <ResultsNav />

      {/* Story summary */}
      <section id="summary" className="animate-fade-up scroll-mt-32">
        <GlassCard>
          <h2 className="text-lg font-semibold text-white">Overall story summary</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-200">{result.report.storySummary}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {result.report.importantScenes.map((s) => (
              <div key={s.number} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-violet-300">
                  Key scene {s.number}
                </p>
                <p className="mt-1 text-sm font-medium text-white">{s.location}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-300/90">{s.summary}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-100">
            <AlertTriangle size={12} className="mr-1 inline" />
            {result.disclaimer}
          </p>
        </GlassCard>
      </section>

      {/* Characters */}
      <section id="characters" className="animate-fade-up scroll-mt-32">
        <SectionHeader
          icon={Users}
          title="Character detection"
          subtitle="Speaking characters ranked by dialogue volume, presence and scene coverage."
        />
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <GlassCard>
            <div className="max-h-[380px] overflow-y-auto pr-1">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-[#12102b]/90 text-[11px] uppercase tracking-[0.14em] text-slate-400">
                  <tr>
                    <th className="py-2">Character</th>
                    <th className="py-2">Lines</th>
                    <th className="py-2">Words</th>
                    <th className="py-2">Scenes</th>
                    <th className="py-2">Prominence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {characters.map((c, i) => (
                    <tr key={c.name} className="text-slate-200">
                      <td className="py-2.5 pr-2">
                        <span className="font-medium text-white">{c.name}</span>
                        {i === 0 && (
                          <span className="ml-2">
                            <Badge tone="violet">Main</Badge>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5">{c.dialogueLines}</td>
                      <td className="py-2.5">{c.wordsSpoken}</td>
                      <td className="py-2.5">{c.sceneCount}</td>
                      <td className="w-40 py-2.5">
                        <div className="flex items-center gap-2">
                          <Bar value={c.prominence} />
                          <span className="w-10 text-right text-xs text-slate-300">
                            {c.prominence.toFixed(0)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
          <GlassCard>
            <h3 className="mb-3 text-sm font-semibold text-slate-200">Prominence ranking</h3>
            <CharacterChart characters={characters} />
            {result.protagonist && (
              <p className="mt-3 text-xs text-slate-400">
                Detected protagonist:{" "}
                <span className="font-semibold text-violet-200">{result.protagonist}</span>
              </p>
            )}
          </GlassCard>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <GlassCard>
            <h3 className="mb-3 text-sm font-semibold text-slate-200">
              Character × scene presence matrix
            </h3>
            <PresenceMatrix characters={characters} scenes={scenes} />
          </GlassCard>
          <GlassCard>
            <h3 className="mb-3 text-sm font-semibold text-slate-200">
              Dialogue vs action balance per scene
            </h3>
            <DialogueBalanceChart scenes={scenes} />
          </GlassCard>
        </div>
      </section>

      {/* Scenes */}
      <section id="scenes" className="animate-fade-up scroll-mt-32">
        <SectionHeader
          icon={Clapperboard}
          title="Scene analysis"
          subtitle={`${scenes.length} scenes detected with location, time of day, cast and generated summaries — search and filter them live.`}
        />
        <SceneExplorer scenes={scenes} cast={cast} />
      </section>

      {/* Emotion */}
      <section id="emotion" className="animate-fade-up scroll-mt-32">
        <SectionHeader
          icon={HeartPulse}
          title="Emotion analysis"
          subtitle={`Dominant emotion: ${emotion.dominant} · overall intensity ${emotion.intensity}/100`}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <GlassCard>
            <h3 className="mb-2 text-sm font-semibold text-slate-200">Overall emotion mix</h3>
            <EmotionMixChart data={emotion.overall} />
            <div className="mt-3 flex flex-wrap gap-2">
              {result.report.mainEmotions.map((e) => (
                <span
                  key={e.emotion}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: EMOTION_COLORS[e.emotion] ?? "#94a3b8" }}
                  />
                  {e.emotion} {e.share}%
                </span>
              ))}
            </div>
          </GlassCard>
          <GlassCard>
            <h3 className="mb-2 text-sm font-semibold text-slate-200">
              Emotional intensity per scene
            </h3>
            <EmotionIntensityChart perScene={emotion.perScene as unknown as Record<string, number | string>[]} />
          </GlassCard>
          <GlassCard className="lg:col-span-2">
            <h3 className="mb-2 text-sm font-semibold text-slate-200">
              Scene-by-scene emotion distribution
            </h3>
            <EmotionSceneChart perScene={emotion.perScene as unknown as Record<string, number | string>[]} />
          </GlassCard>
        </div>
      </section>

      {/* Themes */}
      <section id="themes" className="animate-fade-up scroll-mt-32">
        <SectionHeader
          icon={Tags}
          title="Theme detection"
          subtitle="Top themes with relevance scores, supporting keywords and where each theme peaks."
        />
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <GlassCard>
            <ThemeChart themes={themes} />
          </GlassCard>
          <div className="grid gap-3 sm:grid-cols-2">
            {themes.map((theme) => (
              <GlassCard key={theme.theme} hover>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-white">{theme.theme}</h3>
                  <span className="text-sm font-bold text-violet-200">{theme.relevance}</span>
                </div>
                <div className="mt-2">
                  <Bar value={theme.relevance} />
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-300/90">{theme.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {theme.keywords.map((k) => (
                    <Badge key={k} tone="violet">
                      {k}
                    </Badge>
                  ))}
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
        <GlassCard className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-200">
            Theme strength across the story
          </h3>
          <ThemeSceneChart themeSceneMap={result.themeSceneMap} />
        </GlassCard>
      </section>

      {/* Suspense */}
      <section id="suspense" className="animate-fade-up scroll-mt-32">
        <SectionHeader
          icon={Activity}
          title="Suspense / tension meter"
          subtitle={`Average ${suspense.average}/100 · peak ${suspense.maximum}/100 · ${suspense.trend} arc`}
        />
        <GlassCard>
          <SuspenseChart perScene={suspense.perScene} peaks={peaks} />
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{suspense.narrative}</p>
        </GlassCard>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {suspense.peaks.map((peak) => (
            <GlassCard key={peak.scene} hover>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Scene {peak.scene}</p>
                <Badge tone={peak.score >= 70 ? "rose" : "amber"}>{peak.level}</Badge>
              </div>
              <p className="mt-1 truncate text-xs text-slate-400">{peak.location}</p>
              <p className="mt-3 text-2xl font-bold text-rose-200">{peak.score}</p>
              <div className="mt-2">
                <Bar value={peak.score} color="from-rose-500 to-violet-500" />
              </div>
            </GlassCard>
          ))}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
              <tr>
                <th className="py-2">Scene</th>
                <th className="py-2">Location</th>
                <th className="py-2">Tension</th>
                <th className="py-2">Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {suspense.perScene.map((p) => (
                <tr key={p.scene} className="text-slate-200">
                  <td className="py-2">{p.scene}</td>
                  <td className="py-2">{p.location}</td>
                  <td className="w-48 py-2">
                    <div className="flex items-center gap-2">
                      <Bar
                        value={p.score}
                        color={
                          p.score >= 70
                            ? "from-rose-500 to-violet-500"
                            : p.score >= 45
                              ? "from-amber-400 to-orange-500"
                              : "from-sky-500 to-cyan-400"
                        }
                      />
                      <span className="w-10 text-right text-xs">{p.score.toFixed(0)}</span>
                    </div>
                  </td>
                  <td className="py-2">
                    <Badge tone={p.score >= 70 ? "rose" : p.score >= 45 ? "amber" : "slate"}>
                      {p.level}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Foreshadowing */}
      <section id="foreshadowing" className="animate-fade-up scroll-mt-32">
        <SectionHeader
          icon={GitBranch}
          title="Possible foreshadowing"
          subtitle="Earlier scenes are compared with later scenes using TF-IDF / embedding cosine similarity. These are signals for a reader — not certainties."
        />
        {!foreshadowing.length && (
          <GlassCard>
            <p className="text-sm text-slate-300">
              No strong setup → payoff pairs were detected in this script.
            </p>
          </GlassCard>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {foreshadowing.map((pair) => (
            <GlassCard key={`${pair.setupScene}-${pair.payoffScene}`} hover>
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-200">
                  ⚠ {pair.label}
                </span>
                <Badge
                  tone={
                    pair.confidence === "High" ? "rose" : pair.confidence === "Medium" ? "amber" : "slate"
                  }
                >
                  {pair.confidence} confidence
                </Badge>
              </div>
              <p className="mt-4 text-2xl font-bold text-white">
                Scene {pair.setupScene} <span className="text-violet-400">→</span> Scene{" "}
                {pair.payoffScene}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                similarity {pair.similarity.toFixed(3)} · shared terms:{" "}
                {pair.sharedTerms.slice(0, 6).join(", ") || "—"}
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-violet-400/20 bg-violet-500/5 p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-violet-300">
                    Setup — Scene {pair.setupScene}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-200">{pair.setupSummary}</p>
                </div>
                <div className="rounded-xl border border-sky-400/20 bg-sky-500/5 p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-sky-300">
                    Payoff — Scene {pair.payoffScene}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-200">{pair.payoffSummary}</p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-300/90">{pair.explanation}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Final report */}
      <section id="report" className="animate-fade-up scroll-mt-32">
        <SectionHeader
          icon={Sparkles}
          title="Final intelligence report"
          subtitle="The generated brief combining every module of the pipeline."
        />
        <GlassCard>
          <div className="mb-4 flex flex-wrap gap-3">
            {result.report.mainEmotions.map((e) => (
              <Badge key={e.emotion} tone="violet">
                {e.emotion} {e.share}%
              </Badge>
            ))}
            <Badge tone="sky">
              {themes[0]?.theme} · {themes[0]?.relevance}
            </Badge>
            <Badge tone="rose">Peak tension {suspense.maximum}</Badge>
          </div>
          <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/30 p-4 font-mono text-xs leading-relaxed text-slate-200">
            {result.report.markdown}
          </pre>
        </GlassCard>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/analyze" className="btn-primary">
          Analyze another script
        </Link>
        <Link href="/results" className="btn-ghost">
          All results
        </Link>
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Users;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/70 to-sky-500/60">
        <Icon size={18} className="text-white" />
      </span>
      <div>
        <h2 className="text-xl font-bold text-white sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-slate-300/90">{subtitle}</p>}
      </div>
    </div>
  );
}
