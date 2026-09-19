"use client";

import { useEffect, useState } from "react";

const SECTIONS = [
  { id: "summary", label: "Summary" },
  { id: "characters", label: "Characters" },
  { id: "scenes", label: "Scenes" },
  { id: "emotion", label: "Emotion" },
  { id: "themes", label: "Themes" },
  { id: "suspense", label: "Suspense" },
  { id: "foreshadowing", label: "Foreshadowing" },
  { id: "report", label: "Report" },
];

export default function ResultsNav() {
  const [active, setActive] = useState(SECTIONS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-96px 0px -55% 0px", threshold: [0, 0.25, 0.5] },
    );
    SECTIONS.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="sticky top-[72px] z-30 -mx-4 mb-6 overflow-x-auto border-y border-white/10 bg-[#07061a]/80 px-4 py-2 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border">
      <div className="flex min-w-max items-center gap-1.5">
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
              active === section.id
                ? "bg-gradient-to-r from-violet-600 to-sky-500 text-white shadow-lg shadow-violet-900/40"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            {section.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
