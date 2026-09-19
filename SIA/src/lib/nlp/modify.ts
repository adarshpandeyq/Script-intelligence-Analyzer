import type { AnalysisResult, Scene } from "./types";
import type { FixOption, FixPatch, Issue } from "./fixes";
import { sentences } from "./textProcessing";

export interface ModificationResult {
  issueId: string;
  issueTitle: string;
  optionId: string;
  optionLabel: string;
  summary: string;
  sceneNumber: number;
  sceneHeading: string;
  mode: FixPatch["mode"];
  field: "action" | "dialogue" | "heading";
  /** the affected beat, exactly as written now */
  original: string;
  /** the same beat after the AI modification */
  modified: string;
  /** full scene field before / after, so the change can be reviewed in context */
  originalScene: string;
  modifiedScene: string;
  preserved: {
    characters: string[];
    tone: string;
    events: string[];
    wordsChanged: number;
  };
  note: string;
}

function fieldFor(patch: FixPatch): "action" | "dialogue" | "heading" {
  if (patch.kind === "heading") return "heading";
  if (patch.kind === "dialogue") return "dialogue";
  return "action";
}

function sceneField(scene: Scene, field: "action" | "dialogue" | "heading") {
  if (field === "heading") return scene.heading;
  if (field === "dialogue") return scene.dialogue;
  return scene.action;
}

function findSentence(text: string, target: string): string | null {
  if (!target.trim()) return null;
  const list = sentences(text);
  const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  const wanted = normalise(target);
  const exact = list.find((sentence) => normalise(sentence) === wanted);
  if (exact) return exact;
  const partial = list.find(
    (sentence) => wanted && (normalise(sentence).includes(wanted.slice(0, 40)) || wanted.includes(normalise(sentence).slice(0, 40))),
  );
  return partial ?? null;
}

/**
 * Applies a chosen fix option to the smallest possible unit of the script.
 * Everything outside the target beat (characters, surrounding context, tone and
 * the events of the scene) is preserved verbatim.
 */
export function applyFix(
  result: AnalysisResult,
  issue: Issue,
  option: FixOption,
): ModificationResult {
  const patch = option.patch;
  const scene = result.scenes.find((s) => s.number === patch.scene) ?? result.scenes[0];
  const field = fieldFor(patch);
  const base = scene ? sceneField(scene, field) : "";
  const matched = scene ? findSentence(base, patch.target) : null;

  let original = "";
  let modified = "";
  let modifiedScene = base;

  if (field === "heading") {
    original = base;
    modified = patch.text;
    modifiedScene = patch.text;
  } else if (patch.mode === "replace") {
    const target = matched ?? (base ? sentences(base)[0] ?? base : "");
    original = target;
    modified = patch.text;
    modifiedScene = target ? base.replace(target, patch.text) : patch.text;
  } else if (patch.mode === "append") {
    const last = sentences(base).slice(-1)[0] ?? base;
    original = last;
    modified = `${last}\n${patch.text}`;
    modifiedScene = `${base.trim()}\n${patch.text}`;
  } else if (patch.mode === "insert-before") {
    const target = matched ?? (sentences(base)[0] ?? base);
    original = target;
    modified = `${patch.text}\n${target}`;
    modifiedScene = target ? base.replace(target, `${patch.text}\n${target}`) : `${patch.text}\n${base}`;
  } else {
    // insert-after
    const target = matched ?? (sentences(base).slice(-1)[0] ?? base);
    original = target;
    modified = `${target}\n${patch.text}`;
    modifiedScene = target ? base.replace(target, `${target}\n${patch.text}`) : `${base.trim()}\n${patch.text}`;
  }

  const emotionPoint = result.emotion.perScene.find((p) => p.scene === scene?.number);
  const tone = emotionPoint?.dominant ?? result.emotion.dominant ?? "neutral";

  return {
    issueId: issue.id,
    issueTitle: issue.title,
    optionId: option.id,
    optionLabel: option.label,
    summary: option.summary,
    sceneNumber: scene?.number ?? patch.scene,
    sceneHeading: scene?.heading ?? "",
    mode: patch.mode,
    field,
    original: original.trim(),
    modified: modified.trim(),
    originalScene: base.trim(),
    modifiedScene: modifiedScene.trim(),
    preserved: {
      characters: scene?.characters ?? [],
      tone,
      events: scene?.keywords.slice(0, 5) ?? [],
      wordsChanged: Math.max(1, patch.text.split(/\s+/).length),
    },
    note:
      "Characters, story context, tone and the surrounding events of this scene are preserved — only the highlighted beat is modified.",
  };
}

export function findIssue(result: AnalysisResult, issueId: string) {
  return result.issues?.find((issue) => issue.id === issueId) ?? null;
}

export function findOption(issue: Issue, optionId?: string) {
  if (!issue.options.length) return null;
  return issue.options.find((option) => option.id === optionId) ?? issue.options[0];
}

/** Cycles to the next option for "Try Another". */
export function nextOption(issue: Issue, currentOptionId: string) {
  const index = issue.options.findIndex((option) => option.id === currentOptionId);
  return issue.options[(index + 1) % issue.options.length];
}
