import type { Scene, SuspensePoint } from "./types";
import { sentences, tokenize } from "./textProcessing";
import { NIGHT_TERMS, SUSPENSE_TERMS } from "./lexicons/suspense";
import { analyzeEmotion } from "./emotion";

interface Signals {
  lexDensity: number;
  shortSentenceRatio: number;
  punctuationPressure: number;
  emotionComponent: number;
}

function rawSceneScore(scene: Scene): { raw: number; signals: Signals } {
  const text = `${scene.action} ${scene.dialogue}`;
  const tokens = tokenize(text);
  const totalTokens = Math.max(1, tokens.length);
  const lowered = ` ${tokens.join(" ")} `;

  let lex = 0;
  Object.entries(SUSPENSE_TERMS).forEach(([term, weight]) => {
    const hits = term.includes(" ")
      ? lowered.split(` ${term} `).length - 1
      : tokens.filter((t) => t === term).length;
    lex += hits * weight;
  });
  const lexDensity = (lex / totalTokens) * 100;

  const sents = sentences(text).length ? sentences(text) : [text];
  const shortRatio = sents.filter((s) => s.split(/\s+/).length <= 6).length / Math.max(1, sents.length);

  const punctuation =
    (text.match(/!/g) ?? []).length * 1.6 +
    (text.match(/\?/g) ?? []).length * 1.1 +
    (text.match(/\.\.\.|…/g) ?? []).length * 2 +
    (text.match(/\s--\s|\s—\s/g) ?? []).length * 1.2;
  const punctuationPressure = (punctuation / Math.max(1, sents.length)) * 10;

  const capsDensity = ((scene.action.match(/\b[A-Z]{3,}\b/g) ?? []).length / totalTokens) * 100;
  const nightBonus = NIGHT_TERMS.has(scene.timeOfDay) ? 6 : 0;
  const brevity = totalTokens < 90 ? 8 : totalTokens < 160 ? 4 : 0;

  const emotion = analyzeEmotion(text);
  const emotionComponent = Math.min(
    45,
    (emotion.distribution.fear + 0.5 * emotion.distribution.surprise) * 0.55,
  );

  const raw = Math.min(
    100,
    0.42 * Math.min(60, lexDensity * 2.4) +
      0.16 * Math.min(40, shortRatio * 55) +
      0.12 * Math.min(30, punctuationPressure) +
      0.08 * Math.min(25, capsDensity * 3) +
      0.1 * emotionComponent +
      nightBonus +
      brevity,
  );

  return {
    raw,
    signals: {
      lexDensity: Math.round(lexDensity * 100) / 100,
      shortSentenceRatio: Math.round(shortRatio * 100) / 100,
      punctuationPressure: Math.round(punctuationPressure * 100) / 100,
      emotionComponent: Math.round(emotionComponent * 100) / 100,
    },
  };
}

export function analyzeSuspense(scenes: Scene[]) {
  if (!scenes.length) {
    return { perScene: [] as SuspensePoint[], peaks: [] as SuspensePoint[], average: 0, maximum: 0, trend: "steady", narrative: "" };
  }

  const details = scenes.map(rawSceneScore);
  const raws = details.map((d) => d.raw);
  const smoothed = raws.map((value, i) => {
    const prev = i > 0 ? raws[i - 1] : value;
    const next = i < raws.length - 1 ? raws[i + 1] : value;
    return 0.25 * prev + 0.5 * value + 0.25 * next;
  });

  const mx = Math.max(...smoothed) || 1;
  const mn = Math.min(...smoothed);
  const span = Math.max(1e-6, mx - mn);
  const normalised = smoothed.map((v) => Math.round((28 + 68 * ((v - mn) / span)) * 10) / 10);

  const perScene: SuspensePoint[] = scenes.map((scene, i) => {
    const score = normalised[i];
    return {
      scene: scene.number,
      location: scene.location,
      heading: scene.heading,
      score,
      level: score >= 70 ? "High" : score >= 45 ? "Moderate" : "Low",
      words: scene.wordCount,
      signals: details[i].signals,
    };
  });

  const ranked = [...perScene].sort((a, b) => b.score - a.score);
  const peaks = ranked.filter((p) => p.score >= 55).slice(0, 4);
  if (!peaks.length) peaks.push(ranked[0]);

  const average = Math.round((perScene.reduce((s, p) => s + p.score, 0) / perScene.length) * 10) / 10;
  const maximum = Math.max(...perScene.map((p) => p.score));

  const half = Math.max(1, Math.floor(perScene.length / 2));
  const firstHalf = perScene.slice(0, half).reduce((s, p) => s + p.score, 0) / half;
  const secondHalf =
    perScene.slice(half).reduce((s, p) => s + p.score, 0) / Math.max(1, perScene.length - half);
  const delta = secondHalf - firstHalf;
  const trend = delta > 6 ? "rising" : delta < -6 ? "falling" : "steady";

  const peakText = peaks.map((p) => `Scene ${p.scene} (${p.location})`).join(", ");
  const narrative =
    `Tension averages ${average}/100 across ${perScene.length} scenes with a ${trend} arc ` +
    `(first half ${firstHalf.toFixed(0)} → second half ${secondHalf.toFixed(0)}). ` +
    `Peak tension occurs at ${peakText}, reaching ${maximum}/100.`;

  return { perScene, peaks, average, maximum, trend, narrative };
}
