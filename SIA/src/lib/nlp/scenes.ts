import type { ParsedScript, Scene } from "./types";
import { contentTokens, sentences, tokenize } from "./textProcessing";

const TIME_OF_DAY = [
  "NIGHT", "DAY", "DUSK", "DAWN", "MORNING", "AFTERNOON", "EVENING",
  "CONTINUOUS", "LATER", "MAGIC HOUR", "SAME TIME",
];
const STOP_LOC = new Set(["INT", "EXT", "EST", "I/E", "INT./EXT.", "EXT./INT.", "SCENE", "SHOT"]);

function splitLocation(heading: string): { location: string; timeOfDay: string } {
  let body = heading
    .replace(/^\s*(INT|EXT|EST|I\/E|INT\.\/EXT\.|EXT\.\/INT\.)\.?\s*/i, "")
    .replace(/^\s*[-:]?\s*/, "")
    .trim();
  let timeOfDay = "UNSPECIFIED";
  for (const t of TIME_OF_DAY) {
    const re = new RegExp(`\\b${t.replace(".", "\\.")}\\b`, "i");
    if (re.test(body)) {
      timeOfDay = t;
      body = body
        .replace(new RegExp(`\\s*[-–—]\\s*${t.replace(".", "\\.")}\\b.*$`, "i"), "")
        .replace(re, "");
      break;
    }
  }
  const location =
    body
      .replace(/\s*[-–—:]\s*$/, "")
      .trim()
      .split(/\s+/)
      .filter((w) => !STOP_LOC.has(w.toUpperCase().replace(/\.$/, "")))
      .join(" ")
      .replace(/^[-–—:.\s]+|[-–—:.\s]+$/g, "") || "Unknown Location";
  const titled = location
    .toLowerCase()
    .replace(/(^|\s|-)\w/g, (m) => m.toUpperCase());
  return { location: titled, timeOfDay };
}

const ACTION_VERBS =
  /\b(enters|runs|screams|whispers|opens|closes|discovers|grabs|falls|reveals|attacks|chases|hides|finds|turns|stares|appears|wakes|kills|escapes|locks|listens|dials|reads|remembers|steps|descends|sinks|freezes|trembles)\w*/i;

export function summarizeScene(scene: Omit<Scene, "summary">): string {
  const text = `${scene.action} ${scene.dialogue}`.trim();
  if (!text) return `Scene ${scene.number} — ${scene.location}. No descriptive text available.`;
  let sents = sentences(text).filter((s) => s.split(/\s+/).length >= 4);
  if (!sents.length) sents = [text.slice(0, 180)];

  const freq = new Map<string, number>();
  contentTokens(text).forEach((t) => freq.set(t, (freq.get(t) ?? 0) + 1));
  const maxFreq = Math.max(...freq.values(), 1);

  const score = (s: string) => {
    const toks = new Set(contentTokens(s));
    let base = toks.size
      ? [...toks].reduce((sum, t) => sum + (freq.get(t) ?? 0), 0) / (maxFreq * toks.size)
      : 0;
    if (ACTION_VERBS.test(s)) base += 0.35;
    if (s.split(/\s+/).length < 6) base -= 0.25;
    if (/^(she|he|it|they|her|his|him)\b/i.test(s)) base -= 0.3;
    if (scene.characters.some((c) => s.toLowerCase().includes(c.toLowerCase()))) base += 0.2;
    return base;
  };

  const best = sents.reduce((a, b) => (score(b) > score(a) ? b : a)).trim().replace(/\.$/, "");
  const who = scene.characters.length ? scene.characters.slice(0, 2).join(" and ") : "The story";
  const where = scene.location || "the location";
  return `In ${where}, ${who}: ${best.charAt(0).toUpperCase()}${best.slice(1)}.`;
}

export function buildScenes(parsed: ParsedScript): Scene[] {
  const scenes: Omit<Scene, "summary">[] = [];
  let current: Omit<Scene, "summary"> | null = null;

  const firstHeading = parsed.blocks.findIndex((b) => b.kind === "heading");
  const blocks = firstHeading >= 0 ? parsed.blocks.slice(firstHeading) : parsed.blocks;

  for (const block of blocks) {
    if (block.kind === "heading") {
      if (current) scenes.push(current);
      const { location, timeOfDay } = splitLocation(block.text);
      current = {
        number: scenes.length + 1,
        heading: block.text.trim(),
        location,
        timeOfDay,
        characters: [],
        action: "",
        dialogue: "",
        wordCount: 0,
        dialogueLines: 0,
        dialogueShare: 0,
        keywords: [],
        importance: 0,
      };
      continue;
    }
    if (!current) {
      current = {
        number: 1,
        heading: "INT. UNTITLED - UNSPECIFIED",
        location: "Opening",
        timeOfDay: "UNSPECIFIED",
        characters: [],
        action: "",
        dialogue: "",
        wordCount: 0,
        dialogueLines: 0,
        dialogueShare: 0,
        keywords: [],
        importance: 0,
      };
    }
    if (block.kind === "character") {
      const name = block.text
        .replace(/\s*\([^)]*\)\s*/g, "")
        .replace(/\s*\((cont'?d|v\.o\.|o\.s\.)\).*$/i, "")
        .trim();
      const titled = name === name.toUpperCase() && /[A-Z]/.test(name)
        ? name.toLowerCase().replace(/(^|\s|\.)\w/g, (m) => m.toUpperCase())
        : name;
      if (titled && !current.characters.some((c) => c.toLowerCase() === titled.toLowerCase())) {
        current.characters.push(titled);
      }
      current.dialogueLines += 1;
    } else if (block.kind === "dialogue") {
      current.dialogue += ` ${block.text}`;
    } else if (block.kind === "action") {
      current.action += ` ${block.text}`;
    }
  }
  if (current) scenes.push(current);

  const withSummary: Scene[] = scenes.map((scene) => {
    const action = scene.action.replace(/\s{2,}/g, " ").trim();
    const dialogue = scene.dialogue.replace(/\s{2,}/g, " ").trim();
    const counts = new Map<string, number>();
    contentTokens(`${action} ${dialogue}`).forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1));
    const keywords = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([w]) => w);
    const actionWords = tokenize(action).length;
    const dialogueWords = tokenize(dialogue).length;
    const totalWords = Math.max(1, actionWords + dialogueWords);
    const base = {
      ...scene,
      action,
      dialogue,
      wordCount: totalWords,
      dialogueShare: Math.round((dialogueWords / totalWords) * 1000) / 10,
      keywords,
    };
    return { ...base, summary: summarizeScene(base) };
  });

  return withSummary;
}

export function sceneImportance(
  scenes: Scene[],
  characterRank: Record<string, number>,
): number[] {
  if (!scenes.length) return [];
  const maxWords = Math.max(...scenes.map((s) => s.wordCount)) || 1;
  const scores = scenes.map((s) => {
    const castWeight = s.characters.reduce((sum, c) => sum + (characterRank[c] ?? 0), 0);
    return (
      0.45 * (s.wordCount / maxWords) +
      0.35 * Math.min(1, castWeight) +
      0.2 * Math.min(1, s.dialogue.split(/\s+/).length / 120)
    );
  });
  const max = Math.max(...scores) || 1;
  return scores.map((v) => Math.round((100 * v) / max * 10) / 10);
}
