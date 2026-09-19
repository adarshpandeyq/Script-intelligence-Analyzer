import type {
  AnalysisResult,
  Character,
  ForeshadowingPair,
  Scene,
  ScriptStatistics,
  Theme,
} from "./types";

type EmotionBundle = AnalysisResult["emotion"];
type SuspenseBundle = AnalysisResult["suspense"];

function toneLabel(emotion: EmotionBundle, suspense: SuspenseBundle): string {
  const fear = emotion.overall.fear ?? 0;
  const sad = emotion.overall.sadness ?? 0;
  const happy = emotion.overall.happiness ?? 0;
  if (suspense.average >= 60 && fear >= 25) return "horror/thriller";
  if (sad >= 30) return "dramatic";
  if (happy >= 30) return "uplifting";
  return "character-driven";
}

function storySummary(
  title: string,
  scenes: Scene[],
  characters: Character[],
  emotion: EmotionBundle,
  themes: Theme[],
  suspense: SuspenseBundle,
): string {
  if (!scenes.length) return "No analysable content was found in the uploaded script.";
  const cast = characters.length ? characters.slice(0, 3).map((c) => c.name).join(", ") : "an unseen cast";
  const topTheme = themes.length ? themes[0].theme.toLowerCase() : "an unclear subject";
  const dominant = Object.entries(emotion.overall).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "neutral";
  return (
    `"${title}" is a ${scenes.length}-scene screenplay driven primarily by ${cast}. ` +
    `It opens in ${scenes[0].location} and closes in ${scenes[scenes.length - 1].location}, with tension that reads as ` +
    `${suspense.trend} (peaking at ${suspense.maximum}/100). The dominant emotional register is ${dominant}, ` +
    `and the strongest thematic current is ${topTheme}. Overall the script reads as a ` +
    `${toneLabel(emotion, suspense)} piece with an emotional intensity of ${emotion.intensity}/100.`
  );
}

export function buildReport(
  stats: ScriptStatistics,
  title: string,
  characters: Character[],
  scenes: Scene[],
  emotion: EmotionBundle,
  themes: Theme[],
  suspense: SuspenseBundle,
  foreshadowing: ForeshadowingPair[],
): AnalysisResult["report"] {
  const mainEmotions = Object.entries(emotion.overall)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([emotionName, share]) => ({ emotion: emotionName, share: Math.round(share * 10) / 10 }));

  const importantScenes = [...scenes]
    .sort((a, b) => b.wordCount + 40 * b.characters.length - (a.wordCount + 40 * a.characters.length))
    .slice(0, 3)
    .map((s) => ({
      number: s.number,
      heading: s.heading,
      location: s.location,
      characters: s.characters,
      summary: s.summary,
    }));

  const summary = storySummary(title, scenes, characters, emotion, themes, suspense);

  const markdown = [
    `# Script Intelligence Report — ${title}`,
    "",
    "## 1. Script statistics",
    `- Words: ${stats.wordCount} | Unique words: ${stats.uniqueWordCount}`,
    `- Scenes: ${stats.sceneCount} | Characters: ${stats.characterCount}`,
    `- Dialogue lines: ${stats.dialogueLines} · Dialogue share: ${stats.dialogueShare ?? 0}%`,
    `- Estimated runtime: ${stats.estimatedRuntimeMinutes} minutes`,
    `- Lexical diversity: ${stats.lexicalDiversity}`,
    "",
    "## 2. Main characters",
    ...characters
      .slice(0, 5)
      .map(
        (c) =>
          `- **${c.name}** — ${c.dialogueLines} dialogue lines, ${c.wordsSpoken} words, ${c.sceneCount} scenes (prominence ${c.prominence}/100)`,
      ),
    "",
    "## 3. Important scenes",
    ...importantScenes.map((s) => `- **Scene ${s.number} — ${s.location}**: ${s.summary}`),
    "",
    "## 4. Main emotions",
    ...mainEmotions.map((e) => `- ${e.emotion[0].toUpperCase()}${e.emotion.slice(1)}: ${e.share}%`),
    `- Overall emotional intensity: ${emotion.intensity}/100`,
    "",
    "## 5. Major themes",
    ...themes.map(
      (t) => `- **${t.theme}** — relevance ${t.relevance}/100 (${t.keywords.slice(0, 4).join(", ")})`,
    ),
    "",
    "## 6. Suspense progression",
    `- ${suspense.narrative}`,
    "",
    "## 7. Possible foreshadowing",
    ...(foreshadowing.length
      ? foreshadowing.map(
          (f) =>
            `- **Possible foreshadowing**: Scene ${f.setupScene} → Scene ${f.payoffScene} (similarity ${f.similarity}, ${f.confidence} confidence). ${f.explanation}`,
        )
      : ["- No strong setup/payoff pairs detected."]),
    "",
    "## 8. Overall story summary",
    summary,
  ].join("\n");

  return {
    markdown,
    storySummary: summary,
    mainEmotions,
    importantScenes,
    suspense: {
      average: suspense.average,
      maximum: suspense.maximum,
      trend: suspense.trend,
      peaks: suspense.peaks.map((p) => ({ scene: p.scene, location: p.location, score: p.score })),
      narrative: suspense.narrative,
    },
  };
}
