"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, FileText, Loader2, Sparkles, Upload, Wand2 } from "lucide-react";

const STAGES = [
  { at: 5, label: "Uploading script…" },
  { at: 22, label: "Extracting text (PDF / TXT)…" },
  { at: 40, label: "Parsing screenplay structure…" },
  { at: 56, label: "Detecting characters…" },
  { at: 68, label: "Segmenting scenes…" },
  { at: 78, label: "Scoring emotion & themes…" },
  { at: 88, label: "Measuring suspense & foreshadowing…" },
  { at: 96, label: "Generating intelligence report…" },
];

export default function AnalyzeClient() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [pasted, setPasted] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const stage = STAGES.filter((s) => progress >= s.at).pop();

  function acceptFile(candidate: File | undefined | null) {
    if (!candidate) return;
    const ext = candidate.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["txt", "pdf", "text", "md"].includes(ext)) {
      setError("Only .txt and .pdf scripts are supported.");
      return;
    }
    setError(null);
    setFile(candidate);
    if (!title) setTitle(candidate.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
  }

  function runProgress() {
    setProgress(4);
    const timer = setInterval(() => {
      setProgress((p) => (p >= 92 ? p : p + Math.max(1, (92 - p) * 0.12)));
    }, 260);
    return () => clearInterval(timer);
  }

  async function submit(payload: FormData) {
    setError(null);
    setLoading(true);
    const stop = runProgress();
    try {
      const response = await fetch("/api/analyze", { method: "POST", body: payload });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Analysis failed. Please try another file.");
        setLoading(false);
        setProgress(0);
        return;
      }
      setProgress(100);
      router.push(`/results/${data.id}`);
    } catch {
      setError("Network error while analyzing the script. Please try again.");
      setLoading(false);
      setProgress(0);
    } finally {
      stop();
    }
  }

  function handleAnalyze() {
    const form = new FormData();
    if (file) form.append("file", file);
    else if (pasted.trim().length > 20) form.append("text", pasted);
    else {
      setError("Upload a .txt/.pdf script, paste script text, or load the sample script.");
      return;
    }
    if (title.trim()) form.append("title", title.trim());
    void submit(form);
  }

  async function loadSample() {
    const res = await fetch("/samples/sample_horror_script.txt");
    const text = await res.text();
    setFile(null);
    setPasted(text);
    setTitle("The Third Night");
    setError(null);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="animate-fade-up">
        <span className="chip">
          <Sparkles size={12} /> Step 1 — Upload
        </span>
        <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">Analyze a Script</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
          Upload a screenplay in <strong className="text-white">PDF</strong> or{" "}
          <strong className="text-white">TXT</strong> format. The pipeline extracts the text,
          cleans it, then runs character detection, scene analysis, emotion scoring, theme
          detection, suspense measurement and foreshadowing discovery.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          acceptFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`glass glass-hover animate-fade-up delay-1 cursor-pointer rounded-2xl border-dashed p-10 text-center transition ${
          dragging ? "border-violet-400/80 bg-violet-500/10" : "border-white/15"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.pdf,.text,.md"
          className="hidden"
          onChange={(e) => acceptFile(e.target.files?.[0])}
        />
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600/70 to-sky-500/60">
          <Upload size={26} className="text-white" />
        </div>
        <p className="mt-5 text-lg font-semibold text-white">
          Drag & drop your script here, or click to browse
        </p>
        <p className="mt-2 text-sm text-slate-400">Supported: .pdf, .txt · Maximum size 12 MB</p>
        {file && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-violet-400/40 bg-violet-500/15 px-4 py-1.5 text-sm text-violet-100">
            <FileText size={14} /> {file.name} · {(file.size / 1024).toFixed(0)} KB
          </p>
        )}
      </div>

      <div className="glass animate-fade-up delay-2 space-y-4 p-5">
        <label className="block">
          <span className="text-xs uppercase tracking-[0.18em] text-slate-400">Script title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. The Third Night"
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-400/60"
          />
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
            Or paste script text
          </span>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={6}
            placeholder="INT. ROOM - NIGHT&#10;&#10;              MARA&#10;    It is always the same dream."
            className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-xs leading-relaxed text-white outline-none placeholder:text-slate-500 focus:border-violet-400/60"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={loading}
            className="btn-primary disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? "Analyzing…" : "Run Analysis"}
          </button>
          <button type="button" onClick={loadSample} className="btn-ghost">
            <Wand2 size={15} /> Load sample horror script
          </button>
          {file && (
            <button
              type="button"
              onClick={() => setFile(null)}
              className="text-sm text-slate-400 underline-offset-4 hover:text-white hover:underline"
            >
              Clear file
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="animate-fade-up flex items-start gap-3 rounded-xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-100">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {loading && (
        <div className="glass animate-fade-up space-y-3 p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-200">{stage?.label ?? "Starting…"}</span>
            <span className="font-mono text-violet-200">{Math.round(progress)}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="progress-shimmer h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <ul className="grid gap-1.5 text-xs text-slate-400 sm:grid-cols-2">
            {STAGES.map((s) => (
              <li
                key={s.label}
                className={`flex items-center gap-2 ${progress >= s.at ? "text-violet-200" : ""}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    progress >= s.at ? "bg-violet-400 animate-pulse-glow" : "bg-white/20"
                  }`}
                />
                {s.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
