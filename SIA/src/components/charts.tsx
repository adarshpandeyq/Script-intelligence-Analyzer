"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AXIS = { stroke: "#8b87b5", fontSize: 11 };
const TOOLTIP_STYLE = {
  backgroundColor: "rgba(15, 12, 40, 0.95)",
  border: "1px solid rgba(139, 92, 246, 0.4)",
  borderRadius: 12,
  fontSize: 12,
  color: "#e9e7ff",
};

export const EMOTION_COLORS: Record<string, string> = {
  fear: "#f43f5e",
  happiness: "#34d399",
  sadness: "#60a5fa",
  anger: "#fb923c",
  surprise: "#a78bfa",
  neutral: "#94a3b8",
};

const EMOTIONS = ["fear", "happiness", "sadness", "anger", "surprise", "neutral"];

export function EmotionMixChart({ data }: { data: Record<string, number> }) {
  const chartData = EMOTIONS.map((e) => ({
    emotion: e[0].toUpperCase() + e.slice(1),
    value: Number(data[e] ?? 0),
  }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 4, left: -18 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
        <XAxis dataKey="emotion" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} unit="%" />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
          {chartData.map((entry) => (
            <Cell key={entry.emotion} fill={EMOTION_COLORS[entry.emotion.toLowerCase()]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function EmotionSceneChart({ perScene }: { perScene: Record<string, number | string>[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={perScene} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
        <defs>
          {EMOTIONS.map((e) => (
            <linearGradient key={e} id={`grad-${e}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={EMOTION_COLORS[e]} stopOpacity={0.85} />
              <stop offset="100%" stopColor={EMOTION_COLORS[e]} stopOpacity={0.15} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
        <XAxis dataKey="scene" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} unit="%" />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 11, color: "#c7c3ee" }} />
        {EMOTIONS.map((e) => (
          <Area
            key={e}
            type="monotone"
            dataKey={e}
            stackId="1"
            stroke={EMOTION_COLORS[e]}
            fill={`url(#grad-${e})`}
            strokeWidth={1.5}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function EmotionIntensityChart({ perScene }: { perScene: Record<string, number | string>[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={perScene} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
        <defs>
          <linearGradient id="grad-intensity" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
        <XAxis dataKey="scene" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} domain={[0, 100]} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Area
          type="monotone"
          dataKey="intensity"
          stroke="#38bdf8"
          strokeWidth={2}
          fill="url(#grad-intensity)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SuspenseChart({
  perScene,
  peaks,
}: {
  perScene: { scene: number; score: number; location: string }[];
  peaks: { scene: number }[];
}) {
  const average = perScene.length
    ? perScene.reduce((sum, p) => sum + p.score, 0) / perScene.length
    : 0;
  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={perScene} margin={{ top: 12, right: 12, bottom: 0, left: -22 }}>
        <defs>
          <linearGradient id="grad-suspense" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.85} />
            <stop offset="55%" stopColor="#a855f7" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.08} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
        <XAxis dataKey="scene" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} domain={[0, 100]} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value, _name, item) => [
            `${value}/100`,
            `Scene ${item.payload.scene} — ${item.payload.location}`,
          ]}
        />
        <ReferenceLine
          y={average}
          stroke="#94a3b8"
          strokeDasharray="4 4"
          label={{ value: `avg ${average.toFixed(0)}`, fill: "#94a3b8", fontSize: 10, position: "insideTopRight" }}
        />
        {peaks.map((p) => (
          <ReferenceLine key={p.scene} x={p.scene} stroke="#f43f5e" strokeDasharray="3 3" />
        ))}
        <Area
          type="monotone"
          dataKey="score"
          stroke="#c084fc"
          strokeWidth={2.5}
          fill="url(#grad-suspense)"
          dot={{ r: 3, fill: "#c084fc" }}
          activeDot={{ r: 6 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ThemeChart({ themes }: { themes: { theme: string; relevance: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, themes.length * 46)}>
      <BarChart data={themes} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="theme"
          tick={{ ...AXIS, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={130}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="relevance" radius={[0, 8, 8, 0]} barSize={18}>
          {themes.map((t, i) => (
            <Cell key={t.theme} fill="url(#theme-grad)" opacity={1 - i * 0.09} />
          ))}
        </Bar>
        <defs>
          <linearGradient id="theme-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
      </BarChart>
    </ResponsiveContainer>
  );
}

const THEME_LINE_COLORS = ["#a78bfa", "#38bdf8", "#f43f5e", "#34d399", "#fb923c", "#facc15"];

/** Theme strength across the story — where each theme peaks. */
export function ThemeSceneChart({
  themeSceneMap,
}: {
  themeSceneMap: { theme: string; scenes: number[] }[];
}) {
  if (!themeSceneMap.length) return null;
  const sceneCount = Math.max(...themeSceneMap.map((t) => t.scenes.length));
  const data = Array.from({ length: sceneCount }, (_, i) => {
    const row: Record<string, number | string> = { scene: i + 1 };
    themeSceneMap.forEach((t) => {
      row[t.theme] = t.scenes[i] ?? 0;
    });
    return row;
  });
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -22 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
        <XAxis dataKey="scene" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 11, color: "#c7c3ee" }} />
        {themeSceneMap.map((t, i) => (
          <Line
            key={t.theme}
            type="monotone"
            dataKey={t.theme}
            stroke={THEME_LINE_COLORS[i % THEME_LINE_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 2 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Dialogue vs action share per scene — how talky the writing is. */
export function DialogueBalanceChart({
  scenes,
}: {
  scenes: { number: number; dialogueShare: number }[];
}) {
  const data = scenes.map((s) => ({
    scene: s.number,
    dialogue: s.dialogueShare ?? 0,
    action: Math.round((100 - (s.dialogueShare ?? 0)) * 10) / 10,
  }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
        <XAxis dataKey="scene" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} unit="%" />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
        <Legend wrapperStyle={{ fontSize: 11, color: "#c7c3ee" }} />
        <Bar dataKey="dialogue" stackId="a" fill="#8b5cf6" name="Dialogue %" />
        <Bar dataKey="action" stackId="a" fill="#1e293b" name="Action %" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Character × scene presence matrix with hover highlighting. */
export function PresenceMatrix({
  characters,
  scenes,
}: {
  characters: { name: string }[];
  scenes: { number: number; location: string; characters: string[] }[];
}) {
  const [hover, setHover] = useState<{ row: number; col: number } | null>(null);
  const cast = characters.slice(0, 8);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `130px repeat(${scenes.length}, minmax(22px, 1fr))` }}
        >
          <div />
          {scenes.map((s) => (
            <div key={s.number} className="text-center text-[10px] font-semibold text-slate-300">
              {s.number}
            </div>
          ))}

          {cast.map((character, row) => (
            <div key={character.name} className="contents">
              <div
                className="truncate pr-2 text-right text-[11px] text-slate-300"
                title={character.name}
              >
                {character.name}
              </div>
              {scenes.map((scene, col) => {
                const present = scene.characters.some(
                  (c) => c.toLowerCase() === character.name.toLowerCase(),
                );
                const active = hover?.row === row || hover?.col === col;
                return (
                  <div
                    key={`${character.name}-${scene.number}`}
                    onMouseEnter={() => setHover({ row, col })}
                    onMouseLeave={() => setHover(null)}
                    title={`${character.name} — ${scene.location} (scene ${scene.number}): ${
                      present ? "present" : "absent"
                    }`}
                    className={`h-6 rounded-md border transition-all duration-200 ${
                      present
                        ? "border-violet-300/60 bg-gradient-to-br from-violet-500 to-sky-500 shadow-[0_0_12px_-2px_rgba(139,92,246,0.9)]"
                        : "border-white/5 bg-white/5"
                    } ${active ? "scale-110" : ""}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Columns are scenes, rows are the top {cast.length} characters. Hover any cell to highlight
          its row and column — perfect for spotting who carries which stretch of the story.
        </p>
      </div>
    </div>
  );
}

export function CharacterChart({
  characters,
}: {
  characters: { name: string; prominence: number; wordsSpoken: number }[];
}) {
  const data = characters.slice(0, 10);
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 42)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 90 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ ...AXIS, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={120}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="prominence" radius={[0, 8, 8, 0]} barSize={16} fill="#8b5cf6" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LineMiniChart({
  data,
  dataKey,
  color = "#c084fc",
}: {
  data: Record<string, number | string>[];
  dataKey: string;
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -25 }}>
        <defs>
          <linearGradient id={`mini-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.7} />
            <stop offset="100%" stopColor={color} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <XAxis dataKey="scene" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#mini-${dataKey})`} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
