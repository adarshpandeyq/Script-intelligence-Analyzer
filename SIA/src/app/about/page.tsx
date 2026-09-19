import Link from "next/link";
import { Boxes, Cpu, Database, FlaskConical, Target, Workflow } from "lucide-react";
import PptButton from "@/components/PptButton";
import { GlassCard, SectionTitle } from "@/components/ui";

const OBJECTIVES = [
  "Automate screenplay parsing from unstructured PDF / TXT files.",
  "Detect characters, dialogue volume and the protagonist without manual tagging.",
  "Segment the script into scenes with location, time of day and cast.",
  "Quantify emotion, themes and suspense instead of guessing them.",
  "Surface possible foreshadowing links between early and late scenes.",
  "Deliver everything as one concise, readable intelligence report.",
];

const MODULES = [
  ["text_processing.py", "PDF/TXT extraction, cleaning and screenplay structure parsing"],
  ["character_detection.py", "Character cue detection, dialogue counting, prominence ranking"],
  ["scene_analysis.py", "Scene segmentation, location/time extraction, extractive summaries"],
  ["emotion_analysis.py", "Emotion lexicon + intensity scoring (transformer option)"],
  ["theme_detection.py", "Weighted theme models with relevance scores and evidence"],
  ["suspense_analysis.py", "Tension curve, pacing signals and peak detection"],
  ["foreshadowing.py", "TF-IDF / embedding similarity between earlier and later scenes"],
  ["report_generation.py", "Final intelligence report (structured data + markdown)"],
];

const STACK = [
  ["Python 3.10+", "Primary language for the whole NLP pipeline"],
  ["Flask", "Web application + JSON API for the Python build"],
  ["PyMuPDF", "Fast PDF text extraction"],
  ["spaCy / NLTK", "Tokenisation, POS tagging, entities, stop-words"],
  ["Transformers", "Zero-shot emotion & theme classification (optional upgrade)"],
  ["Sentence-Transformers", "Dense embeddings for semantic similarity (optional upgrade)"],
  ["scikit-learn", "TF-IDF vectorisation and cosine similarity"],
  ["NetworkX / Pandas / Plotly", "Graphs, dataframes and interactive charts"],
  ["Next.js + PostgreSQL", "Production web UI, storage and API for this deployment"],
];

const PIPELINE = [
  "Upload (.pdf / .txt)",
  "Text extraction",
  "Cleaning & normalisation",
  "Screenplay parsing",
  "Character detection",
  "Scene analysis",
  "Emotion + theme scoring",
  "Suspense + foreshadowing",
  "Final report",
];

export default function AboutPage() {
  return (
    <div className="space-y-14">
      <section className="animate-fade-up">
        <span className="chip">About the project</span>
        <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
          Script Intelligence Analyzer
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
          An end-to-end AI / NLP project that turns an unstructured screenplay into structured
          story intelligence. Upload a movie or short-film script and the pipeline returns
          characters, scene breakdowns, emotion curves, theme relevance, a suspense meter and
          possible foreshadowing — then merges everything into a single intelligence report.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <PptButton label="📊 Download project PPT" />
          <Link href="/analyze" className="btn-ghost">
            Try the analyzer
          </Link>
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="01" title="Problem & objectives" />
        <div className="grid gap-4 md:grid-cols-2">
          <GlassCard hover>
            <div className="flex items-center gap-3">
              <Target size={18} className="text-violet-300" />
              <h3 className="text-lg font-semibold text-white">Problem</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-300/90">
              Screenplays are unstructured and manual script coverage is slow and subjective. There
              is no quick way to measure how tension evolves, which themes dominate, or whether
              early scenes set up later payoffs.
            </p>
          </GlassCard>
          <GlassCard hover>
            <div className="flex items-center gap-3">
              <Boxes size={18} className="text-sky-300" />
              <h3 className="text-lg font-semibold text-white">Objectives</h3>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-slate-300/90">
              {OBJECTIVES.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                  {item}
                </li>
              ))}
            </ul>
          </GlassCard>
        </div>
      </section>

      <section>
        <SectionTitle
          eyebrow="02"
          title="Analysis workflow"
          subtitle="Every stage is an independent component, so the pipeline is easy to extend or replace."
        />
        <div className="flex flex-wrap gap-2">
          {PIPELINE.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <span className="glass animate-fade-up rounded-xl px-3 py-2 text-xs text-slate-200">
                <span className="mr-1.5 text-violet-300">{i + 1}.</span>
                {step}
              </span>
              {i < PIPELINE.length - 1 && <span className="text-violet-400/70">→</span>}
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="03" title="Modular Python package" subtitle="python/sia/ — one module per analysis concern." />
        <div className="glass overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-[11px] uppercase tracking-[0.14em] text-slate-400">
              <tr>
                <th className="px-4 py-3">Module</th>
                <th className="px-4 py-3">Responsibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {MODULES.map(([name, desc]) => (
                <tr key={name}>
                  <td className="px-4 py-3 font-mono text-xs text-violet-200">{name}</td>
                  <td className="px-4 py-3 text-slate-300">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <SectionTitle
          eyebrow="04"
          title="NLP technologies"
          subtitle="Pretrained models and battle-tested NLP libraries are used instead of training large models from scratch."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STACK.map(([tech, desc]) => (
            <GlassCard key={tech} hover>
              <div className="flex items-center gap-2">
                <Cpu size={15} className="text-sky-300" />
                <h3 className="text-sm font-semibold text-white">{tech}</h3>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-300/90">{desc}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="05" title="Architecture & deployment" />
        <div className="grid gap-4 md:grid-cols-3">
          <GlassCard>
            <Workflow size={18} className="text-violet-300" />
            <h3 className="mt-3 text-base font-semibold text-white">Web layer</h3>
            <p className="mt-2 text-sm text-slate-300/90">
              Next.js App Router UI (dark cinematic glassmorphism) with route handlers for upload,
              analysis and retrieval.
            </p>
          </GlassCard>
          <GlassCard>
            <Database size={18} className="text-sky-300" />
            <h3 className="mt-3 text-base font-semibold text-white">Storage</h3>
            <p className="mt-2 text-sm text-slate-300/90">
              PostgreSQL via Drizzle ORM stores each analysis with its full JSON payload so reports
              can be revisited and compared.
            </p>
          </GlassCard>
          <GlassCard>
            <FlaskConical size={18} className="text-emerald-300" />
            <h3 className="mt-3 text-base font-semibold text-white">Python build</h3>
            <p className="mt-2 text-sm text-slate-300/90">
              The <code className="text-xs text-violet-200">python/</code> directory contains the
              Flask + spaCy/Transformers implementation of the same pipeline with Plotly charts.
            </p>
          </GlassCard>
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="06" title="Setup instructions" />
        <div className="grid gap-4 lg:grid-cols-2">
          <GlassCard>
            <h3 className="text-base font-semibold text-white">Web app (this deployment)</h3>
            <pre className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-4 font-mono text-xs leading-relaxed text-slate-200">
{`npm install
npx drizzle-kit push      # create tables
npm run dev               # http://localhost:3000`}
            </pre>
          </GlassCard>
          <GlassCard>
            <h3 className="text-base font-semibold text-white">Python / Flask build</h3>
            <pre className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-4 font-mono text-xs leading-relaxed text-slate-200">
{`cd python
pip install -r requirements.txt
python -m spacy download en_core_web_sm
python app.py             # http://127.0.0.1:5000
python generate_ppt.py    # rebuild the PPT`}
            </pre>
          </GlassCard>
        </div>
        <p className="mt-4 text-sm text-slate-300">
          Sample horror script for testing:{" "}
          <a
            href="/samples/sample_horror_script.txt"
            className="text-violet-300 underline underline-offset-4"
            download
          >
            sample_horror_script.txt
          </a>
          .
        </p>
      </section>

      <section>
        <GlassCard>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Project presentation</h3>
              <p className="mt-1 text-sm text-slate-300">
                10-slide deck: problem statement, objectives, solution, architecture, technologies,
                features, workflow, expected results and future scope.
              </p>
            </div>
            <PptButton label="📊 PROJECT PPT" />
          </div>
        </GlassCard>
      </section>
    </div>
  );
}
