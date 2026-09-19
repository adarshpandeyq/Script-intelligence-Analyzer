import type { Metadata } from "next";
import type { ReactNode } from "react";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Script Intelligence Analyzer — AI Script Analysis",
  description:
    "Upload a movie or short-film script and get AI-powered character detection, scene analysis, emotion profiling, theme detection, suspense curves and foreshadowing insights.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <div className="grid-lines pointer-events-none fixed inset-0 -z-10 opacity-40" />
        <Nav />
        <main className="mx-auto w-full max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">{children}</main>
        <footer className="border-t border-white/10 py-8 text-center text-xs text-slate-400">
          <p>
            Script Intelligence Analyzer · NLP pipeline for screenplays · Results are
            probabilistic estimates, foreshadowing links are labelled POSSIBLE.
          </p>
        </footer>
      </body>
    </html>
  );
}
