import type { Character, ParsedScript } from "./types";
import { tokenize } from "./textProcessing";

const GENERIC_CUES = new Set([
  "CUT TO", "FADE IN", "FADE OUT", "FADE TO BLACK", "THE END", "CONTINUED",
  "CONTINUOUS", "MONTAGE", "TITLE", "SCENE", "ACT", "OPENING CREDITS",
  "CLOSING CREDITS", "DISSOLVE TO", "SMASH CUT TO", "FLASHBACK", "DREAM",
  "DAY", "NIGHT", "MORNING", "LATER", "SAME", "END", "BEGIN", "INTERCUT",
  "INSERT", "CLOSE ON", "ANGLE ON", "WIDE", "SERIES OF SHOTS", "BACK TO",
  "VOICE", "VOICES", "ALL", "EVERYONE", "CROWD", "GROUP",
]);

export function normalizeName(cue: string): string {
  let name = cue
    .replace(/\s*\((?:cont'?d|continued|v\.o\.|o\.s\.|vo|os|subtitle|whispering|on the phone|pre-lap|filtered)\)\s*$/i, "")
    .replace(/\s*\([^)]*\)\s*/g, "")
    .replace(/’/g, "'")
    .replace(/\s{2,}/g, " ")
    .replace(/[.:,;-]+$/, "")
    .trim();
  if (name && name === name.toUpperCase() && /[A-Z]/.test(name)) {
    name = name
      .toLowerCase()
      .replace(/(^|\s|\.)\w/g, (m) => m.toUpperCase());
  }
  return name;
}

function isValidName(name: string): boolean {
  if (!name || name.length > 34) return false;
  if (GENERIC_CUES.has(name.toUpperCase())) return false;
  if (!/[A-Za-z]/.test(name)) return false;
  if (name.split(/\s+/).length > 4) return false;
  return true;
}

export function detectCharacters(
  parsed: ParsedScript,
  sceneCharacters: Record<number, string[]> = {},
): Character[] {
  const map = new Map<string, Character & { sceneSet: Set<number> }>();
  let currentScene = 0;

  parsed.blocks.forEach((block, index) => {
    if (block.kind === "heading") {
      currentScene += 1;
      return;
    }
    if (block.kind !== "character") return;
    const name = normalizeName(block.text);
    if (!isValidName(name)) return;

    const spoken: string[] = [];
    let j = index + 1;
    while (j < parsed.blocks.length) {
      const next = parsed.blocks[j];
      if (next.kind === "parenthetical") {
        j += 1;
        continue;
      }
      if (next.kind === "dialogue") {
        spoken.push(next.text);
        j += 1;
        continue;
      }
      break;
    }
    const words = spoken.reduce((sum, line) => sum + tokenize(line).length, 0);
    const key = name.toLowerCase();
    const entry =
      map.get(key) ??
      {
        name,
        dialogueLines: 0,
        wordsSpoken: 0,
        sceneCount: 0,
        firstScene: null,
        prominence: 0,
        sceneSet: new Set<number>(),
      };
    entry.dialogueLines += spoken.length ? 1 : 0;
    entry.wordsSpoken += words;
    entry.sceneSet.add(currentScene || 1);
    map.set(key, entry);
  });

  Object.entries(sceneCharacters).forEach(([sceneNo, names]) => {
    names.forEach((rawName) => {
      const name = normalizeName(rawName);
      if (!isValidName(name)) return;
      const key = name.toLowerCase();
      const entry =
        map.get(key) ??
        {
          name,
          dialogueLines: 0,
          wordsSpoken: 0,
          sceneCount: 0,
          firstScene: null,
          prominence: 0,
          sceneSet: new Set<number>(),
        };
      entry.sceneSet.add(Number(sceneNo));
      map.set(key, entry);
    });
  });

  const results = [...map.values()];
  if (!results.length) return [];

  const maxWords = Math.max(...results.map((c) => c.wordsSpoken)) || 1;
  const maxLines = Math.max(...results.map((c) => c.dialogueLines)) || 1;
  const maxScenes = Math.max(...results.map((c) => c.sceneSet.size)) || 1;

  return results
    .map((c) => {
      const scenes = [...c.sceneSet].sort((a, b) => a - b);
      const prominence =
        100 *
        (0.55 * (c.wordsSpoken / maxWords) +
          0.25 * (c.dialogueLines / maxLines) +
          0.2 * (c.sceneSet.size / maxScenes));
      return {
        name: c.name,
        dialogueLines: c.dialogueLines,
        wordsSpoken: c.wordsSpoken,
        sceneCount: c.sceneSet.size,
        firstScene: scenes[0] ?? null,
        prominence: Math.round(prominence * 10) / 10,
      };
    })
    .sort((a, b) => b.prominence - a.prominence);
}
