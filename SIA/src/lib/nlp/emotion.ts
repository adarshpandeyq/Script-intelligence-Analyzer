import type { EmotionPoint, Scene } from "./types";
import { tokenize } from "./textProcessing";
import { EMOTIONS, EMOTION_LEXICON, INTENSIFIERS, NEGATIONS, type EmotionName } from "./lexicons/emotion";

function scoreText(text: string): Record<EmotionName, number> {
  const tokens = tokenize(text);
  const scores = Object.fromEntries(EMOTIONS.map((e) => [e, 0])) as Record<EmotionName, number>;
  tokens.forEach((tok, i) => {
    const entry = EMOTION_LEXICON[tok];
    if (!entry) return;
    const [emotion, weightRaw] = entry;
    let weight = weightRaw;
    const window = tokens.slice(Math.max(0, i - 3), i);
    if (window.some((w) => NEGATIONS.has(w))) {
      weight *= 0.35;
      scores.neutral += weight * 0.5;
    }
    if (window.some((w) => INTENSIFIERS.has(w))) weight *= 1.45;
    scores[emotion] += weight;
  });
  return scores;
}

function intensityMultiplier(text: string): number {
  let mult = 1;
  const exclamations = (text.match(/!+/g) ?? []).length;
  mult += Math.min(0.45, exclamations * 0.06);
  const caps = (text.match(/\b[A-Z]{3,}\b/g) ?? []).length;
  mult += Math.min(0.35, caps * 0.05);
  if (text.includes("...") || text.includes("…")) mult += 0.12;
  return Math.round(mult * 1000) / 1000;
}

export function analyzeEmotion(text: string) {
  const tokens = tokenize(text);
  const totalTokens = Math.max(1, tokens.length);
  const scores = scoreText(text);
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const distribution: Record<string, number> = {};
  if (total <= 0) {
    EMOTIONS.forEach((e) => (distribution[e] = e === "neutral" ? 100 : 0));
  } else {
    const neutralFloor = 0.1 * total;
    EMOTIONS.forEach((e) => {
      const value = scores[e] + (e === "neutral" ? neutralFloor : 0);
      distribution[e] = Math.round((100 * value) / (total + neutralFloor) * 100) / 100;
    });
  }
  const density =
    (EMOTIONS.filter((e) => e !== "neutral").reduce((sum, e) => sum + scores[e], 0) / totalTokens) * 100;
  const intensity = Math.min(100, Math.round(density * 6.5 * intensityMultiplier(text) * 10) / 10);
  const dominant = EMOTIONS.reduce((best, e) => (distribution[e] > distribution[best] ? e : best), EMOTIONS[0]);
  return { distribution, intensity, dominant };
}

export function analyzeEmotionsByScene(scenes: Scene[]) {
  const perScene: EmotionPoint[] = scenes.map((scene) => {
    const res = analyzeEmotion(`${scene.action} ${scene.dialogue}`);
    return {
      scene: scene.number,
      location: scene.location,
      dominant: res.dominant,
      intensity: res.intensity,
      fear: res.distribution.fear,
      happiness: res.distribution.happiness,
      sadness: res.distribution.sadness,
      anger: res.distribution.anger,
      surprise: res.distribution.surprise,
      neutral: res.distribution.neutral,
    };
  });
  const overall = analyzeEmotion(scenes.map((s) => `${s.action} ${s.dialogue}`).join(" "));
  return { ...overall, perScene };
}
