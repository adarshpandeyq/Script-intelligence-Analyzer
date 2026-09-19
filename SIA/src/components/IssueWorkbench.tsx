"use client";

import { useState } from "react";
import { Check, Copy, RefreshCw, Sparkles, Undo2, Wand2 } from "lucide-react";
import type { Issue } from "@/lib/nlp/fixes";
import { Badge, Bar, GlassCard } from "@/components/ui";

interface Modification {
  issueId: string;
  optionId: string;
  optionLabel: string;
  summary: string;
  sceneNumber: number;
  sceneHeading: string;
  mode: string;
  field: string;
  original: string;
  modified: string;
  originalScene: string;
  modifiedScene: string;
  preserved: { characters: string[]; tone: string; events: string[]; wordsChanged: number };
  note: string;
  applied: boolean;
  scores?: {
    storyConsistency: number;
    characterConsistency: number;
    contextSimilarity: number;
    toneCompatibility: number;
    changeAmount: number;
    suitability: number;
  };
}

const METRICS: { key: keyof NonNullable<Modification["scores"]>; label: string; invert?: boolean }[] = [
  { key: "storyConsistency", label: "Story consistency" },
  { key: "characterConsistency", label: "Character consistency" },
  { key: "contextSimilarity", label: "Context similarity" },
  { key: "toneCompatibility", label: "Tone compatibility" },
  { key: "changeAmount", label: "Changes required", invert: true },
];

export default function IssueWorkbench({
  analysisId,
  issues,
}: {
  analysisId: number;
  issues: Issue[];
}) {
  const [modifications, setModifications] = useState<Record<string, Modification>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function run(issueId: string, optionId: string | undefined, mode: "apply" | "try") {
    setBusy(`${issueId}-${mode}`);
    try {
      const response = await fetch("/api/apply-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId,
          issueId,
          optionId,
          tryAnother: mode === "try",
          apply: mode === "apply",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to generate the fix");
      setModifications((current) => ({ ...current, [issueId]: data }));
    } catch (error) {
      setModifications((current) => ({
        ...current,
        [issueId]: {
          ...(current[issueId] as Modification),
          issueId,
          optionId: optionId ?? "",
          optionLabel: "—",
          summary: error instanceof Error ? error.message : "Could not generate a fix",
          sceneNumber: 0,
          sceneHeading: "",
          mode: "replace",
          field: "action",
          original: "",
          modified: "",
          originalScene: "",
          modifiedScene: "",
          preserved: { characters: [], tone: "", events: [], wordsChanged: 0 },
          note: "",
          applied: false,
        } as Modification,
      }));
    } finally {
      setBusy(null);
    }
  }

  function keepOriginal(issueId: string) {
    setModifications((current) => {
      const next = { ...current };
      delete next[issueId];
      return next;
    });
  }

  async function copy(issueId: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(issueId);
    setTimeout(() => setCopied(null), 1600);
  }

  if (!issues.length) {
    return (
      <GlassCard>
        <p className="text-sm text-slate-300">
          No story or writing problems were flagged in this script by the current detectors. That
          usually means the draft is structurally clean — try a longer or more complex script for a
          deeper pass.
        </p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {issues.map((issue, index) => {
        const modification = modifications[issue.id];
        const activeOptionId = modification?.optionId ?? issue.recommendedOptionId ?? issue.options[0]?.id;
        const activeOption = issue.options.find((o) => o.id === activeOptionId) ?? issue.options[0];

        return (
          <GlassCard key={issue.id} className="animate-fade-up" hover>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    tone={
                      issue.severity === "High" ? "rose" : issue.severity === "Medium" ? "amber" : "slate"
                    }
                  >
                    {issue.severity}
                  </Badge>
                  <Badge tone="violet">{issue.label}</Badge>
                  <span className="text-[11px] text-slate-500">
                    confidence {Math.round(issue.confidence * 100)}% · scenes{" "}
                    {issue.scenes.join(", ")}
                  </span>
                </div>
                <h3 className="mt-2 text-base font-semibold text-white sm:text-lg">
                  {index + 1}. {issue.title}
                </h3>
              </div>
              {activeOption && (
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                    suitability
                  </p>
                  <p className="text-2xl font-bold text-violet-200">
                    {activeOption.scores.suitability}
                  </p>
                </div>
              )}
            </div>

            <p className="mt-3 text-sm leading-relaxed text-slate-300">{issue.explanation}</p>

            {issue.evidence.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                  Evidence from the script
                </p>
                {issue.evidence.map((evidence, i) => (
                  <div
                    key={`${issue.id}-evidence-${i}`}
                    className="rounded-xl border border-white/10 bg-black/25 p-3"
                  >
                    <p className="text-[11px] text-violet-300">
                      Scene {evidence.scene ?? "—"}
                      {evidence.note ? ` · ${evidence.note}` : ""}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-200">
                      “{evidence.quote}”
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Options */}
            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              {issue.options.map((option) => {
                const selected = option.id === activeOptionId;
                return (
                  <div
                    key={option.id}
                    className={`rounded-xl border p-4 transition ${
                      selected
                        ? "border-violet-400/70 bg-violet-500/10 shadow-[0_0_28px_-14px_rgba(139,92,246,0.9)]"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold tracking-[0.14em] text-violet-200">
                        {option.label}
                      </span>
                      {issue.recommendedOptionId === option.id && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-100">
                          ⭐ RECOMMENDED
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-medium text-white">{option.summary}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-300/90">
                      {option.detail}
                    </p>

                    <div className="mt-3 space-y-1.5">
                      {METRICS.map((metric) => {
                        const value = option.scores[metric.key] ?? 0;
                        return (
                          <div key={metric.key}>
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span>{metric.label}</span>
                              <span className="text-slate-200">{value}</span>
                            </div>
                            <Bar
                              value={value}
                              color={
                                metric.invert
                                  ? "from-slate-500 to-slate-300"
                                  : "from-violet-500 to-sky-400"
                              }
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Suitability</span>
                      <span className="font-bold text-violet-200">{option.scores.suitability}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {issue.recommendedOptionId && (
              <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-200">
                  ⭐ RECOMMENDED OPTION
                </p>
                <p className="mt-1 text-sm text-white">
                  {issue.options.find((o) => o.id === issue.recommendedOptionId)?.label} —{" "}
                  {issue.options.find((o) => o.id === issue.recommendedOptionId)?.summary}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-amber-100/90">
                  Reason: {issue.recommendationReason}
                </p>
                <p className="mt-1 text-[11px] italic text-amber-100/70">
                  AI-generated suitability recommendation — not an objectively “best” answer.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => run(issue.id, activeOptionId, "apply")}
                disabled={busy !== null}
                className="btn-primary text-xs"
              >
                {busy === `${issue.id}-apply` ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Wand2 size={14} />
                )}
                Apply Fix
              </button>
              <button
                type="button"
                onClick={() => run(issue.id, modification?.optionId ?? issue.recommendedOptionId ?? undefined, "try")}
                disabled={busy !== null}
                className="btn-ghost text-xs"
              >
                <RefreshCw size={14} /> Try Another
              </button>
              <button
                type="button"
                onClick={() => keepOriginal(issue.id)}
                className="btn-ghost text-xs"
              >
                <Undo2 size={14} /> Keep Original
              </button>
            </div>

            {/* Modification result */}
            {modification && modification.modified && (
              <div className="animate-fade-up mt-5 rounded-xl border border-violet-400/30 bg-[#0d0b22]/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-[0.16em] text-violet-300">
                    {modification.optionLabel} · Scene {modification.sceneNumber} ·{" "}
                    {modification.field}
                  </p>
                  {modification.applied ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] text-emerald-200">
                      <Check size={12} /> Fix applied & saved
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">preview — not saved yet</span>
                  )}
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="mb-1 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                      ORIGINAL
                    </p>
                    <pre className="whitespace-pre-wrap rounded-lg border border-white/10 bg-black/35 p-3 text-xs leading-relaxed text-slate-300">
                      {modification.original}
                    </pre>
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] uppercase tracking-[0.16em] text-violet-300">
                      AI MODIFIED
                    </p>
                    <pre className="whitespace-pre-wrap rounded-lg border border-violet-400/30 bg-violet-500/10 p-3 text-xs leading-relaxed text-violet-50">
                      {modification.modified}
                    </pre>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-400">
                  {modification.preserved.characters.length > 0 && (
                    <Badge tone="sky">characters: {modification.preserved.characters.join(", ")}</Badge>
                  )}
                  <Badge tone="violet">tone: {modification.preserved.tone}</Badge>
                  {modification.preserved.events.length > 0 && (
                    <Badge tone="slate">events: {modification.preserved.events.join(", ")}</Badge>
                  )}
                  <Badge tone="slate">{modification.preserved.wordsChanged} words touched</Badge>
                </div>
                <p className="mt-2 text-[11px] italic text-slate-400">{modification.note}</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => copy(issue.id, modification.modifiedScene || modification.modified)}
                    className="btn-ghost text-xs"
                  >
                    {copied === issue.id ? <Check size={13} /> : <Copy size={13} />}
                    {copied === issue.id ? "Copied" : "Copy modified scene"}
                  </button>
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                    <Sparkles size={12} /> only the highlighted beat was rewritten
                  </span>
                </div>
              </div>
            )}
          </GlassCard>
        );
      })}
    </div>
  );
}
