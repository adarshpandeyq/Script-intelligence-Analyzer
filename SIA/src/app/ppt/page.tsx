import type { Metadata } from "next";
import SlideDeck from "@/components/SlideDeck";
import { DECK_TITLE, SLIDES } from "@/lib/pptContent";

export const metadata: Metadata = {
  title: "Project PPT — Script Intelligence Analyzer",
  description:
    "View or download the 10-slide project presentation: problem statement, objectives, solution, architecture, NLP technologies, features, workflow, results and future scope.",
};

export default function PptPage() {
  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <span className="chip">📊 Project presentation</span>
        <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">{DECK_TITLE} — PPT</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
          The complete {SLIDES.length}-slide deck, fully animated in the browser: slides glide in,
          bullets and cards stagger in sequence, and the background glows drift. Hit
          <span className="text-white"> Present </span> to auto-play the deck fullscreen. Use
          <span className="text-white"> Download .pptx </span>
          for the PowerPoint file — it ships with per-slide animated transitions (fade, wipe, push,
          cover, split, wheel, dissolve). If your browser blocks downloads inside a preview frame,
          the <span className="text-white">Direct link</span> opens the same file in a new tab.
        </p>
      </div>
      <SlideDeck />
    </div>
  );
}
