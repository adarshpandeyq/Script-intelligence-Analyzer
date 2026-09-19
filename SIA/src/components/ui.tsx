import type { ReactNode } from "react";

export function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-8 max-w-2xl">
      {eyebrow && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-sky-300/80">
          {eyebrow}
        </p>
      )}
      <h2 className="text-2xl font-bold text-white sm:text-3xl">{title}</h2>
      {subtitle && <p className="mt-3 text-sm leading-relaxed text-slate-300/90">{subtitle}</p>}
    </div>
  );
}

export function GlassCard({
  children,
  className = "",
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div className={`glass p-5 sm:p-6 ${hover ? "glass-hover" : ""} ${className}`}>{children}</div>
  );
}

export function Stat({
  label,
  value,
  hint,
  accent = "violet",
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "violet" | "sky" | "emerald" | "amber";
}) {
  const accents: Record<string, string> = {
    violet: "from-violet-500/25 to-fuchsia-500/5 text-violet-200",
    sky: "from-sky-500/25 to-cyan-500/5 text-sky-200",
    emerald: "from-emerald-500/25 to-teal-500/5 text-emerald-200",
    amber: "from-amber-500/25 to-orange-500/5 text-amber-200",
  };
  return (
    <div className={`glass rounded-2xl bg-gradient-to-br p-4 ${accents[accent]}`}>
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300/80">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function Badge({
  children,
  tone = "violet",
}: {
  children: ReactNode;
  tone?: "violet" | "sky" | "emerald" | "amber" | "rose" | "slate";
}) {
  const tones: Record<string, string> = {
    violet: "border-violet-400/40 bg-violet-500/15 text-violet-200",
    sky: "border-sky-400/40 bg-sky-500/15 text-sky-200",
    emerald: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
    amber: "border-amber-400/40 bg-amber-500/15 text-amber-200",
    rose: "border-rose-400/40 bg-rose-500/15 text-rose-200",
    slate: "border-white/20 bg-white/5 text-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Bar({ value, color = "from-violet-500 to-sky-400" }: { value: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
        style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
      />
    </div>
  );
}
