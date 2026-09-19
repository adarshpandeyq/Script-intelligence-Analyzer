"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Loader2,
  Pause,
  Play,
  Presentation,
} from "lucide-react";
import { DECK_TITLE, SLIDES, type SlideDef } from "@/lib/pptContent";

const AUTOPLAY_MS = 6500;

export default function SlideDeck() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"fwd" | "back">("fwd");
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const go = useCallback((next: number) => {
    setIndex((current) => {
      const clamped = Math.min(SLIDES.length - 1, Math.max(0, next));
      setDirection(clamped >= current ? "fwd" : "back");
      return clamped;
    });
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        go(index + 1);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(index - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index]);

  // Autoplay in present mode
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setIndex((current) => {
        if (current >= SLIDES.length - 1) {
          setPlaying(false);
          return current;
        }
        setDirection("fwd");
        return current + 1;
      });
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [playing]);

  // Stop presenting when the user leaves fullscreen
  useEffect(() => {
    function onFullscreenChange() {
      if (!document.fullscreenElement) setPlaying(false);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  async function download() {
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch("/api/ppt");
      if (!response.ok) throw new Error(`Server responded ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "Script_Intelligence_Analyzer.pptx";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setStatus("Download started ✔ — the file includes animated slide transitions.");
    } catch {
      setStatus("Automatic download was blocked — use the direct link below.");
    } finally {
      setBusy(false);
    }
  }

  async function togglePresent() {
    if (playing) {
      setPlaying(false);
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
      } catch {
        /* ignore */
      }
      return;
    }
    setPlaying(true);
    try {
      await canvasRef.current?.requestFullscreen();
    } catch {
      /* fullscreen not permitted — autoplay still runs */
    }
  }

  const slide = SLIDES[index];
  const progress = ((index + 1) / SLIDES.length) * 100;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Presentation size={16} className="animate-pulse-glow text-violet-300" />
          <span>
            {DECK_TITLE} · slide {index + 1} / {SLIDES.length}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={togglePresent}
            className={`btn-ghost text-sm ${playing ? "border-violet-400/70 bg-violet-500/20" : ""}`}
          >
            {playing ? <Pause size={15} /> : <Play size={15} />}
            {playing ? "Pause" : "Present"}
          </button>
          <button type="button" onClick={download} disabled={busy} className="btn-primary text-sm">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            {busy ? "Preparing…" : "Download .pptx"}
          </button>
          <a href="/api/ppt" target="_blank" rel="noreferrer" className="btn-ghost text-sm">
            Direct link
          </a>
          <Link href="/" className="btn-ghost text-sm">
            Back to app
          </Link>
        </div>
      </div>

      {status && <p className="animate-fade-up text-xs text-slate-300">{status}</p>}

      {/* Slide canvas */}
      <div
        ref={canvasRef}
        className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#07061a] p-[3.5%] shadow-2xl shadow-violet-950/50"
      >
        {/* animated background */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet-700/25 blur-3xl animate-glow-drift" />
        <div
          className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-sky-600/20 blur-3xl animate-glow-drift"
          style={{ animationDelay: "-6s" }}
        />
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-30 animate-ken-burns" />

        {/* progress bar */}
        <div className="absolute left-0 top-0 h-1 w-full bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-violet-500 via-indigo-400 to-sky-400 transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="relative flex h-full flex-col">
          <div
            key={index}
            className={
              direction === "fwd" ? "animate-slide-in-right h-full" : "animate-slide-in-left h-full"
            }
          >
            <SlideBody slide={slide} />
          </div>
          <div className="mt-auto flex items-center justify-between pt-3 text-[10px] uppercase tracking-[0.18em] text-slate-500">
            <span>Script Intelligence Analyzer · AI / NLP Project</span>
            <span>{String(index + 1).padStart(2, "0")}</span>
          </div>
        </div>

        {playing && (
          <div className="pointer-events-none absolute bottom-3 right-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-violet-200">
            <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-violet-400" />
            auto-playing
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => go(index - 1)}
          disabled={index === 0}
          className="btn-ghost text-sm disabled:opacity-40"
        >
          <ArrowLeft size={15} /> Prev
        </button>
        <div className="flex flex-wrap justify-center gap-1.5">
          {SLIDES.map((s, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => go(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === index ? "w-7 bg-violet-400" : "w-2 bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => go(index + 1)}
          disabled={index === SLIDES.length - 1}
          className="btn-ghost text-sm disabled:opacity-40"
        >
          Next <ArrowRight size={15} />
        </button>
      </div>
      <p className="text-center text-xs text-slate-500">
        Tip: use ← / → or space to move between slides · <span className="text-violet-300">Present</span>{" "}
        auto-plays the deck ({AUTOPLAY_MS / 1000}s per slide) in fullscreen.
      </p>
    </div>
  );
}

function delay(step: number, base = 140) {
  return { animationDelay: `${base + step * 90}ms` };
}

function SlideBody({ slide }: { slide: SlideDef }) {
  if (slide.type === "title") {
    return (
      <div className="flex h-full flex-col justify-center">
        <span className="chip animate-fade-up w-fit" style={delay(0)}>
          {slide.kicker}
        </span>
        <h1
          className="animate-fade-up mt-5 text-[clamp(1.6rem,4.6vw,3.4rem)] font-black leading-tight text-white"
          style={delay(1)}
        >
          {slide.title}
        </h1>
        <p
          className="animate-fade-up mt-4 max-w-3xl whitespace-pre-line text-[clamp(0.7rem,1.25vw,1.05rem)] leading-relaxed text-slate-300"
          style={delay(2)}
        >
          {slide.subtitle}
        </p>
        <p
          className="animate-fade-up mt-6 text-[clamp(0.6rem,0.95vw,0.8rem)] text-sky-300/90"
          style={delay(3)}
        >
          {slide.stack}
        </p>
      </div>
    );
  }

  const header = (
    <div>
      <p className="animate-fade-up text-[clamp(0.55rem,0.85vw,0.75rem)] font-semibold uppercase tracking-[0.24em] text-sky-300/80">
        {slide.kicker}
      </p>
      <h2 className="animate-fade-up mt-1 text-[clamp(1rem,2.3vw,1.9rem)] font-bold text-white" style={delay(1)}>
        {slide.title}
      </h2>
      <div className="animate-bar-grow mt-2 h-[3px] w-16 rounded-full bg-violet-500" style={delay(2)} />
    </div>
  );

  if (slide.type === "bullets") {
    return (
      <div>
        {header}
        <ul className="mt-4 space-y-[clamp(0.25rem,0.8vw,0.7rem)]">
          {slide.items.map((item, i) => (
            <li
              key={item}
              className="animate-fade-up flex gap-2 text-[clamp(0.6rem,1.05vw,0.92rem)] leading-snug text-slate-200"
              style={delay(i + 2)}
            >
              <span className="text-violet-400">▸</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (slide.type === "cards") {
    const gridCols = slide.cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";
    return (
      <div>
        {header}
        <div className={`mt-4 grid gap-[clamp(0.35rem,0.9vw,0.7rem)] ${gridCols}`}>
          {slide.cards.map((card, i) => (
            <div
              key={card.heading}
              className="animate-fade-up glass-hover rounded-xl border border-violet-400/30 bg-[#161433]/80 p-[clamp(0.4rem,0.9vw,0.8rem)]"
              style={delay(i)}
            >
              <p
                className={`text-[clamp(0.6rem,0.95vw,0.82rem)] font-bold ${
                  i % 2 === 0 ? "text-violet-300" : "text-sky-300"
                }`}
              >
                {card.heading}
              </p>
              <p className="mt-1 text-[clamp(0.55rem,0.85vw,0.75rem)] leading-snug text-slate-300/90">
                {card.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {header}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {slide.steps.map((step, i) => (
          <div key={step} className="animate-fade-up flex items-center gap-2" style={delay(i)}>
            <div className="glass-hover rounded-xl border border-violet-400/40 bg-[#161433]/85 px-3 py-2 text-center text-[clamp(0.55rem,0.9vw,0.78rem)] font-semibold leading-tight text-white">
              {step.split("\n").map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </div>
            {i < slide.steps.length - 1 && (
              <span className="animate-pulse-glow text-sky-400/80">➜</span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {slide.bottom.map((card, i) => (
          <div
            key={card.heading}
            className="animate-fade-up rounded-xl border border-violet-400/30 bg-[#161433]/80 p-3"
            style={delay(i + slide.steps.length)}
          >
            <p className="text-[clamp(0.6rem,0.95vw,0.82rem)] font-bold text-violet-200">
              {card.heading}
            </p>
            <p className="mt-1 text-[clamp(0.55rem,0.85vw,0.75rem)] text-slate-300/90">
              {card.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
