import type { ForeshadowingPair, Scene } from "./types";
import { contentTokens } from "./textProcessing";
import { PAYOFF_MARKERS, SETUP_MARKERS } from "./lexicons/suspense";

/**
 * Foreshadowing detection.
 *
 * Each scene is compared against later scenes with TF-IDF cosine similarity over
 * content tokens (the Python package upgrades this to Sentence-Transformer
 * embeddings when they are installed). Results are always returned as POSSIBLE
 * foreshadowing - a similarity signal for a human reader, never a certainty.
 */
function buildVectors(docs: string[]) {
  const tokenised = docs.map((d) => new Set(contentTokens(d)));
  const n = docs.length;
  const df = new Map<string, number>();
  tokenised.forEach((toks) => toks.forEach((t) => df.set(t, (df.get(t) ?? 0) + 1)));

  const vectors = docs.map((doc) => {
    const counts = new Map<string, number>();
    contentTokens(doc).forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1));
    const total = Math.max(1, [...counts.values()].reduce((a, b) => a + b, 0));
    const vec = new Map<string, number>();
    counts.forEach((c, t) => {
      const tf = 0.5 + 0.5 * (c / total);
      const idf = Math.log((1 + n) / (1 + (df.get(t) ?? 0))) + 1;
      vec.set(t, tf * idf);
    });
    return vec;
  });

  return vectors.map((vi) =>
    vectors.map((vj) => {
      let dot = 0;
      vi.forEach((value, key) => {
        const other = vj.get(key);
        if (other) dot += value * other;
      });
      const normI = Math.sqrt([...vi.values()].reduce((a, v) => a + v * v, 0)) || 1;
      const normJ = Math.sqrt([...vj.values()].reduce((a, v) => a + v * v, 0)) || 1;
      return dot / (normI * normJ);
    }),
  );
}

function markersIn(text: string, markers: string[]) {
  const lowered = text.toLowerCase();
  return markers.filter((m) => lowered.includes(m));
}

function explain(
  setup: Scene,
  payoff: Scene,
  shared: string[],
  setupMarkers: string[],
  payoffMarkers: string[],
  sim: number,
): string {
  const parts = [
    `Scene ${setup.number} (${setup.location}) and Scene ${payoff.number} (${payoff.location}) share a semantic similarity of ${sim.toFixed(2)}.`,
  ];
  if (shared.length) {
    parts.push(`Recurring distinctive language: ${shared.slice(0, 6).join(", ")}.`);
  }
  if (setupMarkers.length) {
    parts.push(
      `The earlier scene contains anticipatory markers (${setupMarkers
        .slice(0, 3)
        .join(", ")}) that typically set up a later event.`,
    );
  }
  if (payoffMarkers.length) {
    parts.push(
      `The later scene contains payoff markers (${payoffMarkers
        .slice(0, 3)
        .join(", ")}) that resolve an earlier setup.`,
    );
  }
  parts.push(
    "This is flagged as POSSIBLE foreshadowing — a similarity signal for a human reader to verify, not a confirmed authorial intent.",
  );
  return parts.join(" ");
}

export function findForeshadowing(scenes: Scene[], topK = 5, minSimilarity = 0.1): ForeshadowingPair[] {
  if (scenes.length < 3) return [];
  const docs = scenes.map((s) => `${s.location}. ${s.action} ${s.dialogue}`);
  const matrix = buildVectors(docs);
  const n = scenes.length;
  const maxGap = Math.max(3, Math.floor(n / 2) + 2);

  type Candidate = {
    score: number;
    sim: number;
    i: number;
    j: number;
    shared: string[];
    setupMarkers: string[];
    payoffMarkers: string[];
  };
  const candidates: Candidate[] = [];

  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const gap = j - i;
      if (gap < 1 || gap > maxGap) continue;
      const sim = matrix[i][j];
      if (sim < minSimilarity) continue;
      const aTokens = new Set(contentTokens(docs[i]));
      const bTokens = new Set(contentTokens(docs[j]));
      const shared = [...aTokens].filter((t) => bTokens.has(t)).sort();
      const setupMarkers = markersIn(docs[i], SETUP_MARKERS);
      const payoffMarkers = markersIn(docs[j], PAYOFF_MARKERS);
      const bonus = 0.05 * Math.min(3, setupMarkers.length) + 0.04 * Math.min(3, payoffMarkers.length);
      const penalty = 0.012 * (gap - 1);
      candidates.push({
        score: Math.max(0, sim + bonus - penalty),
        sim,
        i,
        j,
        shared,
        setupMarkers,
        payoffMarkers,
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const pairs: ForeshadowingPair[] = [];
  const used = new Map<number, number>();
  for (const c of candidates) {
    if (pairs.length >= topK) break;
    if ((used.get(c.i) ?? 0) >= 2 || (used.get(c.j) ?? 0) >= 2) continue;
    used.set(c.i, (used.get(c.i) ?? 0) + 1);
    used.set(c.j, (used.get(c.j) ?? 0) + 1);
    const setup = scenes[c.i];
    const payoff = scenes[c.j];
    pairs.push({
      setupScene: setup.number,
      payoffScene: payoff.number,
      similarity: Math.round(c.score * 1000) / 1000,
      confidence: c.score >= 0.42 ? "High" : c.score >= 0.24 ? "Medium" : "Low",
      sharedTerms: c.shared.slice(0, 10),
      explanation: explain(setup, payoff, c.shared, c.setupMarkers, c.payoffMarkers, c.sim),
      setupSummary: setup.summary,
      payoffSummary: payoff.summary,
      label: "POSSIBLE FORESHADOWING",
    });
  }

  return pairs.sort((a, b) => a.setupScene - b.setupScene);
}
