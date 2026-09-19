"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import PptButton from "./PptButton";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/analyze", label: "Analyze Script" },
  { href: "/results", label: "Results" },
  { href: "/doctor", label: "Script Doctor" },
  { href: "/about", label: "About Project" },
];

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07061a]/70 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-sky-500 text-lg font-black text-white shadow-lg shadow-violet-900/50">
            SI
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-bold tracking-wide text-white sm:text-base">
              Script Intelligence
            </span>
            <span className="block text-[11px] uppercase tracking-[0.2em] text-violet-300/80">
              Analyzer
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => {
            const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-white/10 text-white shadow-inner shadow-violet-500/20"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <PptButton className="btn-primary ml-2 text-sm" label="📊 Project PPT" />
        </div>

        <button
          type="button"
          aria-label="Toggle navigation"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-white/15 p-2 text-slate-200 md:hidden"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </nav>

      {open && (
        <div className="animate-fade-up border-t border-white/10 bg-[#0b0a20]/95 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
              >
                {link.label}
              </Link>
            ))}
            <PptButton className="btn-primary mt-2 justify-center text-sm" label="📊 Project PPT" />
          </div>
        </div>
      )}
    </header>
  );
}
