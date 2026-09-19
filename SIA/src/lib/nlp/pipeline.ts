import type { AnalysisResult } from "./types";
import { basicStats, cleanText, parseScreenplay, tokenize } from "./textProcessing";
import { buildScenes, sceneImportance } from "./scenes";
import { detectCharacters } from "./characters";
import { analyzeEmotion, analyzeEmotionsByScene } from "./emotion";
import { detectThemes, themeSceneMap } from "./themes";
import { analyzeSuspense } from "./suspense";
import { findForeshadowing } from "./foreshadowing";
import { buildReport } from "./report";
import { detectIssues } from "./issues";
import { attachFixOptions } from "./fixes";

const MIN_WORDS = 40;

export function analyzeScript(rawText: string, title = "Untitled Script"): AnalysisResult {
  const cleaned = cleanText(rawText);
  const wordCount = cleaned ? cleaned.split(/\s+/).length : 0;
  if (wordCount < MIN_WORDS) {
    throw new Error(
      "The script is too short to analyse — we need at least ~40 words of story text.",
    );
  }

  const parsed = parseScreenplay(cleaned);
  const stats = basicStats(cleaned);

  const scenes = buildScenes(parsed);
  const sceneCharacters: Record<number, string[]> = {};
  scenes.forEach((s) => {
    sceneCharacters[s.number] = s.characters;
  });
  const characters = detectCharacters(parsed, sceneCharacters);

  const rank: Record<string, number> = {};
  characters.forEach((c) => {
    rank[c.name] = c.prominence / 100;
  });
  const importance = sceneImportance(scenes, rank);
  const scenesWithImportance = scenes.map((s, i) => ({ ...s, importance: importance[i] }));

  const perSceneEmotion = analyzeEmotionsByScene(scenesWithImportance);
  const overallEmotion = analyzeEmotion(cleaned);
  const themes = detectThemes(cleaned);
  const suspense = analyzeSuspense(scenesWithImportance);
  const foreshadowing = findForeshadowing(scenesWithImportance);

  const dialogueWords = tokenize(scenesWithImportance.map((s) => s.dialogue).join(" ")).length;
  const totalSceneWords = scenesWithImportance.reduce((sum, s) => sum + s.wordCount, 0);
  const dialogueShare =
    totalSceneWords > 0
      ? Math.round((dialogueWords / totalSceneWords) * 1000) / 10
      : 0;

  const statistics = {
    ...stats,
    sceneCount: scenes.length,
    characterCount: characters.length,
    dialogueLines: scenes.reduce((sum, s) => sum + s.dialogueLines, 0),
    dialogueShare,
  };

  const emotionBundle = {
    overall: overallEmotion.distribution,
    intensity: overallEmotion.intensity,
    dominant: overallEmotion.dominant,
    perScene: perSceneEmotion.perScene,
  };

  const detectedIssues = detectIssues({
    title,
    statistics,
    characters,
    scenes: scenesWithImportance,
    emotion: emotionBundle,
    themes,
    suspense,
    foreshadowing,
  } as AnalysisResult);
  const issues = attachFixOptions(
    {
      title,
      statistics,
      characters,
      scenes: scenesWithImportance,
      emotion: emotionBundle,
      themes,
      suspense,
      foreshadowing,
    } as AnalysisResult,
    detectedIssues,
  );

  const report = buildReport(
    statistics,
    title,
    characters,
    scenesWithImportance,
    emotionBundle,
    themes,
    suspense,
    foreshadowing,
  );

  return {
    title,
    issues,
    statistics,
    characters,
    protagonist: characters[0]?.name ?? null,
    scenes: scenesWithImportance,
    emotion: emotionBundle,
    themes,
    themeSceneMap: themeSceneMap(themes, scenesWithImportance),
    suspense,
    foreshadowing,
    report,
    disclaimer:
      "Emotion, theme, suspense and foreshadowing results are probabilistic NLP estimates. Foreshadowing links are labelled POSSIBLE and should be verified by a human reader.",
  };
}
