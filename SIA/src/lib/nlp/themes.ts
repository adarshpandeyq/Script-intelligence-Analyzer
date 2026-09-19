import type { Scene, Theme } from "./types";
import { tokenize } from "./textProcessing";
import { THEME_KEYWORDS } from "./lexicons/themes";

function countOccurrences(joinedTokens: string, keyword: string): number {
  if (keyword.includes(" ")) {
    return joinedTokens.split(` ${keyword} `).length - 1;
  }
  return joinedTokens.split(" ").filter((t) => t === keyword).length;
}

function describe(name: string, keywords: string[]): string {
  if (!keywords.length) return `${name} appears as a background current in the writing.`;
  return `${name} is carried through the script by recurring signals such as ${keywords
    .map((k) => `'${k}'`)
    .join(", ")}.`;
}

export function detectThemes(text: string, topN = 6): Theme[] {
  const tokens = tokenize(text);
  const joined = tokens.join(" ");
  const raw: { score: number; name: string; matched: string[] }[] = [];

  Object.entries(THEME_KEYWORDS).forEach(([name, keywords]) => {
    let score = 0;
    const matched: string[] = [];
    Object.entries(keywords).forEach(([kw, weight]) => {
      const hits = countOccurrences(joined, kw);
      if (hits) {
        score += hits * weight;
        matched.push(kw);
      }
    });
    if (score > 0) {
      matched.sort((a, b) => keywords[b] - keywords[a]);
      raw.push({ score, name, matched });
    }
  });

  if (!raw.length) {
    return [
      {
        theme: "Undetermined",
        relevance: 0,
        score: 0,
        keywords: [],
        description: "Not enough signal in the script to infer themes.",
      },
    ];
  }

  const topScore = Math.max(...raw.map((r) => r.score));
  return raw
    .map(({ score, name, matched }) => {
      const relative = score / topScore;
      const absolute = Math.min(1, score / 8);
      return {
        theme: name,
        score: Math.round(score * 100) / 100,
        relevance: Math.round(Math.min(100, 100 * (0.6 * relative + 0.4 * absolute)) * 10) / 10,
        keywords: matched.slice(0, 6),
        description: describe(name, matched.slice(0, 3)),
      };
    })
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, topN);
}

export function themeSceneMap(themes: Theme[], scenes: Scene[]) {
  return themes.map((theme) => ({
    theme: theme.theme,
    scenes: scenes.map((scene) => {
      const text = `${scene.action} ${scene.dialogue}`.toLowerCase();
      const hits = theme.keywords.reduce(
        (sum, k) => sum + (text.split(k).length - 1),
        0,
      );
      return Math.round(Math.min(100, hits * 25) * 10) / 10;
    }),
  }));
}
