import Link from "next/link";
import {
  Activity,
  Clapperboard,
  FileText,
  GitBranch,
  HeartPulse,
  Presentation,
  Sparkles,
  Tags,
  Upload,
  Users,
} from "lucide-react";
import { GlassCard, SectionTitle } from "@/components/ui";
import PptButton from "@/components/PptButton";

const FEATURES = [
  {
    icon: Users,
    title: "Character Detection",
    body: "Speaking characters are extracted from screenplay cues, ranked by dialogue volume, presence and scene coverage to reveal the protagonist.",
  },
  {
    icon: Clapperboard,
    title: "Scene Analysis",
    body: "Automatic scene segmentation with location, time of day, cast and an AI-generated summary for every scene.",
  },
  {
    icon: HeartPulse,
    title: "Emotion Analysis",
    body: "Fear, happiness, sadness, anger, surprise and neutral are scored per scene with an emotional intensity index.",
  },
  {
    icon: Tags,
    title: "Theme Detection",
    body: "Weighted theme models surface the major themes of the story with relevance scores and supporting keywords.",
  },
  {
    icon: Activity,
    title: "Suspense Meter",
    body: "A scene-by-scene tension curve with peak detection — perfect for spotting the horror/thriller high points.",
  },
  {
    icon: GitBranch,
    title: "Foreshadowing",
    body: "Earlier scenes are compared with later scenes using semantic similarity to surface possible setup → payoff links.",
  },
];

const PIPELINE = [
  { icon: Upload, label: "Upload", detail: "PDF or TXT script" },
  { icon: FileText, label: "Extract", detail: "Clean & normalise text" },
  { icon: Sparkles, label: "Analyze", detail: "6 NLP modules run" },
  { icon: Presentation, label: "Report", detail: "Interactive intelligence report" },
];

export default function HomePage() {
  return (
    <div className="space-y-20">
      {/* Hero */}
      <section className="relative pt-6">
        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="animate-fade-up">
            <span className="chip">
              <Sparkles size={12} /> AI · NLP · Screenplay Intelligence
            </span>
            <h1 className="mt-5 text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              <span className="text-gradient">Understand any screenplay</span>
              <br />
              <span className="text-white">in one upload.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Script Intelligence Analyzer reads your movie or short-film script and returns
              characters, scenes, emotion curves, themes, a suspense meter and possible
              foreshadowing — presented in a cinematic dashboard.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/analyze" className="btn-primary">
                <Upload size={16} /> Analyze a Script
              </Link>
              <PptButton className="btn-ghost" label="📊 Project PPT" />
            </div>
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-400">
              <span>✓ PDF & TXT support</span>
              <span>✓ Pretrained NLP models</span>
              <span>✓ Interactive charts</span>
            </div>
          </div>

          <div className="animate-fade-up delay-2">
            <div className="glass animate-float p-6">
              <p className="text-[11px] uppercase tracking-[0.22em] text-sky-300/80">
                Live pipeline output
              </p>
              <p className="mt-3 text-lg font-semibold text-white">The Third Night — horror short</p>
              <div className="mt-5 space-y-4">
                {[
                  { label: "Protagonist", value: "Mara Blackwood", pct: 100 },
                  { label: "Dominant emotion", value: "Fear · 58%", pct: 58 },
                  { label: "Peak tension", value: "Scene 9 · Cellar Stairs", pct: 96 },
                  { label: "Top theme", value: "Fear · 100 relevance", pct: 100 },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-slate-400">{row.label}</span>
                      <span className="font-medium text-slate-100">{row.value}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-400 to-sky-400"
                        style={{ width: `${row.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-xs leading-relaxed text-slate-400">
                Example output from the bundled sample script. Upload your own to generate a full
                intelligence report.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pipeline */}
      <section>
        <SectionTitle
          eyebrow="Workflow"
          title="From raw script to story intelligence"
          subtitle="A modular pipeline: every stage is an independent NLP component that can be swapped, extended or reused."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PIPELINE.map((step, i) => (
            <GlassCard key={step.label} hover className={`animate-fade-up delay-${i + 1}`}>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/70 to-sky-500/60">
                  <step.icon size={18} className="text-white" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Step {i + 1}
                  </p>
                  <p className="font-semibold text-white">{step.label}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-300/90">{step.detail}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Features */}
      <section>
        <SectionTitle
          eyebrow="Core features"
          title="Six NLP engines, one report"
          subtitle="Each engine is implemented as its own module so results stay explainable and easy to improve."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <GlassCard key={feature.title} hover className={`animate-fade-up delay-${(i % 5) + 1}`}>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/60 to-sky-500/50">
                <feature.icon size={20} className="text-white" />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300/90">{feature.body}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="pb-4">
        <div className="glass relative overflow-hidden p-8 sm:p-10">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-violet-600/20 blur-3xl" />
          <div className="relative grid gap-6 lg:grid-cols-[1.4fr_0.6fr] lg:items-center">
            <div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                Ready to analyze your script?
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
                Drop in a .txt or .pdf screenplay — or start with the bundled horror sample — and
                get a complete intelligence report with interactive charts in seconds.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link href="/analyze" className="btn-primary">
                Start analyzing
              </Link>
              <PptButton className="btn-ghost" label="📊 Project PPT" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
