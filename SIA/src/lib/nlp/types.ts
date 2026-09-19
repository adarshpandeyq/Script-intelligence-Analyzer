export type BlockKind =
  | "heading"
  | "action"
  | "character"
  | "parenthetical"
  | "dialogue"
  | "transition";

export interface ScriptBlock {
  kind: BlockKind;
  text: string;
  line: number;
}

export interface ParsedScript {
  cleanText: string;
  blocks: ScriptBlock[];
}

export interface Scene {
  number: number;
  heading: string;
  location: string;
  timeOfDay: string;
  characters: string[];
  action: string;
  dialogue: string;
  wordCount: number;
  dialogueLines: number;
  dialogueShare: number;
  keywords: string[];
  summary: string;
  importance: number;
}

export interface Character {
  name: string;
  dialogueLines: number;
  wordsSpoken: number;
  sceneCount: number;
  firstScene: number | null;
  prominence: number;
}

export interface EmotionPoint {
  scene: number;
  location: string;
  dominant: string;
  intensity: number;
  fear: number;
  happiness: number;
  sadness: number;
  anger: number;
  surprise: number;
  neutral: number;
}

export interface Theme {
  theme: string;
  relevance: number;
  score: number;
  keywords: string[];
  description: string;
}

export interface SuspensePoint {
  scene: number;
  location: string;
  heading: string;
  score: number;
  level: "Low" | "Moderate" | "High";
  words: number;
  signals: {
    lexDensity: number;
    shortSentenceRatio: number;
    punctuationPressure: number;
    emotionComponent: number;
  };
}

export interface ForeshadowingPair {
  setupScene: number;
  payoffScene: number;
  similarity: number;
  confidence: "Low" | "Medium" | "High";
  sharedTerms: string[];
  explanation: string;
  setupSummary: string;
  payoffSummary: string;
  label: string;
}

export interface ScriptStatistics {
  wordCount: number;
  uniqueWordCount: number;
  sentenceCount: number;
  charCount: number;
  sceneCount: number;
  characterCount: number;
  dialogueLines: number;
  dialogueShare: number;
  estimatedRuntimeMinutes: number;
  lexicalDiversity: number;
}

import type { Issue } from "./fixes";

export type { Issue };

export interface AnalysisResult {
  title: string;
  issues: Issue[];
  statistics: ScriptStatistics;
  characters: Character[];
  protagonist: string | null;
  scenes: Scene[];
  emotion: {
    overall: Record<string, number>;
    intensity: number;
    dominant: string;
    perScene: EmotionPoint[];
  };
  themes: Theme[];
  themeSceneMap: { theme: string; scenes: number[] }[];
  suspense: {
    perScene: SuspensePoint[];
    peaks: SuspensePoint[];
    average: number;
    maximum: number;
    trend: string;
    narrative: string;
  };
  foreshadowing: ForeshadowingPair[];
  report: {
    markdown: string;
    storySummary: string;
    mainEmotions: { emotion: string; share: number }[];
    importantScenes: {
      number: number;
      heading: string;
      location: string;
      characters: string[];
      summary: string;
    }[];
    suspense: {
      average: number;
      maximum: number;
      trend: string;
      peaks: { scene: number; location: string; score: number }[];
      narrative: string;
    };
  };
  disclaimer: string;
}
