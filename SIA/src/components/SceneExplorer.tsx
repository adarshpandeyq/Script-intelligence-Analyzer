"use client";

import { useMemo, useState } from "react";
import { Filter, Search, X } from "lucide-react";
import { Badge } from "@/components/ui";

export interface ExplorerScene {
  number: number;
  heading: string;
  location: string;
  timeOfDay: string;
  characters: string[];
  action: string;
  dialogue: string;
  wordCount: number;
  dialogueLines: number;
  dialogueShare: number;
  keywords: string[];
  summary: string;
  importance: number;
}

type SortKey = "order" | "importance" | "length";

export default function SceneExplorer({
  scenes,
  cast,
}: {
  scenes: ExplorerScene[];
  cast: string[];
}) {
  const [query, setQuery] = useState("");
  const [character, setCharacter] = useState("all");
  const [sort, setSort] = useState<SortKey>("order");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let list = scenes.filter((scene) => {
      const matchesCharacter =
        character === "all" ||
        scene.characters.some((c) => c.toLowerCase() === character.toLowerCase());
      if (!matchesCharacter) return false;
      if (!needle) return true;
      return (
        scene.heading.toLowerCase().includes(needle) ||
        scene.location.toLowerCase().includes(needle) ||
        scene.summary.toLowerCase().includes(needle) ||
        scene.action.toLowerCase().includes(needle) ||
        scene.dialogue.toLowerCase().includes(needle) ||
        scene.keywords.join(" ").includes(needle)
      );
    });
    if (sort === "importance") list = [...list].sort((a, b) => b.importance - a.importance);
    if (sort === "length") list = [...list].sort((a, b) => b.wordCount - a.wordCount);
    return list;
  }, [scenes, query, character, sort]);

  return (
    <div className="space-y-4">
      <div className="glass flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search scenes (text, location, keyword…)"
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-400/60"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-slate-400" />
          <select
            value={character}
            onChange={(e) => setCharacter(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#12102b] px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-violet-400/60"
          >
            <option value="all">All characters</option>
            {cast.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-xl border border-white/10 bg-[#12102b] px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-violet-400/60"
          >
            <option value="order">Scene order</option>
            <option value="importance">Importance</option>
            <option value="length">Length</option>
          </select>
        </div>
        {(query || character !== "all") && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCharacter("all");
            }}
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"
          >
            <X size={13} /> Clear
          </button>
        )}
        <span className="ml-auto text-xs text-slate-400">
          {filtered.length} / {scenes.length} scenes
        </span>
      </div>

      {!filtered.length && (
        <div className="glass p-6 text-sm text-slate-300">
          No scenes match those filters. Try another keyword or character.
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((scene, i) => (
          <details
            key={scene.number}
            className="glass group animate-fade-up p-4 sm:p-5"
            style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
          >
            <summary className="cursor-pointer list-none">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600/70 to-sky-500/60 text-xs font-bold text-white">
                    {scene.number}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{scene.heading}</p>
                    <p className="text-xs text-slate-400">
                      {scene.timeOfDay} · {scene.wordCount} words · {scene.dialogueLines} dialogue
                      lines · {scene.dialogueShare ?? 0}% dialogue
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {scene.characters.slice(0, 4).map((c) => (
                    <Badge key={c} tone="sky">
                      {c}
                    </Badge>
                  ))}
                  <Badge tone="slate">imp {Math.round(scene.importance)}</Badge>
                </div>
              </div>
            </summary>
            <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm text-slate-300">
              <p className="text-slate-100">{scene.summary}</p>
              {scene.keywords.length > 0 && (
                <p className="text-xs text-slate-400">
                  Keywords: <span className="text-violet-200">{scene.keywords.join(", ")}</span>
                </p>
              )}
              {scene.action && (
                <p className="whitespace-pre-wrap rounded-xl border border-white/10 bg-black/25 p-3 text-xs leading-relaxed text-slate-300">
                  {scene.action.slice(0, 700)}
                  {scene.action.length > 700 ? "…" : ""}
                </p>
              )}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
