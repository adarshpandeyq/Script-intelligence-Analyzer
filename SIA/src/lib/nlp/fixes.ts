import type { AnalysisResult, Scene } from "./types";
import type { DetectedIssue, IssueType } from "./issues";
import { sentences, tokenize } from "./textProcessing";

export type FixMode = "replace" | "insert-before" | "insert-after" | "append" | "heading";

export interface FixPatch {
  mode: FixMode;
  scene: number;
  /** the exact sentence / heading the modification targets */
  target: string;
  /** text that replaces `target`, or is inserted relative to it */
  text: string;
  kind: "action" | "dialogue" | "transition" | "heading";
}

export interface FixScores {
  storyConsistency: number;
  characterConsistency: number;
  contextSimilarity: number;
  toneCompatibility: number;
  changeAmount: number;
  suitability: number;
}

export interface FixOption {
  id: string;
  label: "OPTION A" | "OPTION B" | "OPTION C";
  summary: string;
  detail: string;
  scores: FixScores;
  patch: FixPatch;
}

export interface Issue extends DetectedIssue {
  options: FixOption[];
  recommendedOptionId: string | null;
  recommendationReason: string;
}

const OPTION_LABELS: FixOption["label"][] = ["OPTION A", "OPTION B", "OPTION C"];

/* ------------------------------------------------------------------ */
/* scoring                                                             */
/* ------------------------------------------------------------------ */
function score(
  patch: FixPatch,
  input: {
    storyConsistency: number;
    characterConsistency: number;
    contextSimilarity: number;
    toneCompatibility: number;
  },
): FixScores {
  // How much text the fix touches -> cost. Rewriting a heading is cheap,
  // inserting a whole new scene is expensive.
  const insertedWords = patch.text.split(/\s+/).length;
  const changeAmount =
    Math.round(
      Math.min(
        100,
        (patch.mode === "replace" ? 26 : 0) +
          insertedWords * (patch.mode === "heading" ? 1.1 : 1.7) +
          (patch.kind === "transition" ? 4 : 0),
      ) * 10,
    ) / 10;

  const suitability =
    Math.round(
      (0.32 * input.storyConsistency +
        0.24 * input.characterConsistency +
        0.18 * input.contextSimilarity +
        0.16 * input.toneCompatibility +
        0.1 * (100 - changeAmount)) *
        10,
    ) / 10;

  return {
    storyConsistency: Math.round(input.storyConsistency * 10) / 10,
    characterConsistency: Math.round(input.characterConsistency * 10) / 10,
    contextSimilarity: Math.round(input.contextSimilarity * 10) / 10,
    toneCompatibility: Math.round(input.toneCompatibility * 10) / 10,
    changeAmount,
    suitability,
  };
}

/** How well the fix language matches the vocabulary already used in this scene. */
function contextSimilarity(scene: Scene | undefined, text: string) {
  if (!scene) return 55;
  const sceneTokens = new Set(tokenize(`${scene.action} ${scene.dialogue}`));
  if (!sceneTokens.size) return 55;
  const fixTokens = tokenize(text).filter((t) => t.length > 3);
  if (!fixTokens.length) return 55;
  const shared = fixTokens.filter((t) => sceneTokens.has(t)).length;
  return Math.min(100, 45 + (shared / fixTokens.length) * 110);
}

function toneCompatibility(result: AnalysisResult, text: string) {
  const dominant = result.emotion.dominant ?? "neutral";
  const toneHints: Record<string, RegExp> = {
    fear: /\b(dark|shadow|whisper|breath|silence|pulse|shiver|cold|door|hush)\b/i,
    happiness: /\b(smile|laugh|warm|light|easy|relief|bright)\b/i,
    sadness: /\b(quiet|slow|heavy|ache|memory|far away|hollow)\b/i,
    anger: /\b(sharp|hard|snaps|heat|jaw|fist)\b/i,
    surprise: /\b(sudden|stops|freezes|turns|reveals)\b/i,
    neutral: /./,
  };
  const hint = toneHints[dominant] ?? toneHints.neutral;
  return hint.test(text) ? 92 : 68;
}

/* ------------------------------------------------------------------ */
/* option builders per issue type                                      */
/* ------------------------------------------------------------------ */
type Ctx = { result: AnalysisResult; issue: DetectedIssue; scene: Scene | undefined };

function optionsForObjectContinuity({ result, issue, scene }: Ctx): Omit<FixOption, "id" | "label">[] {
  const prop = issue.entities[0] ?? "object";
  const removal = issue.evidence[0]?.quote ?? "";
  const later = issue.evidence[1]?.quote ?? "";
  const subjectMatch = removal.match(/^([A-Z][A-Za-z']+(?:\s[A-Z][A-Za-z']+)?)/);
  const subject = subjectMatch?.[1] ?? (scene?.characters[0] ?? "The character");
  const owner = /she|her/i.test(removal) ? "her" : /he|him|his/i.test(removal) ? "his" : "their";

  const softened = `${subject} pretends to ${lowercaseFirst(stripLeadingSubject(removal)).replace(
    new RegExp(`\\b${prop}\\b`, "i"),
    "it",
  )}, but secretly keeps it in ${owner} pocket.`;

  return [
    {
      summary: `${subject} only pretends to get rid of the ${prop}`,
      detail:
        `Rewrite the beat in Scene ${issue.scenes[0]} so the ${prop} is never actually gone — ${subject.toLowerCase()} fakes the action and keeps it. ` +
        `Scene ${issue.scenes[1]} then needs no changes at all.`,
      patch: {
        mode: "replace",
        scene: issue.scenes[0],
        target: removal,
        text: softened,
        kind: "action",
      },
      scores: score(
        {
          mode: "replace",
          scene: issue.scenes[0],
          target: removal,
          text: softened,
          kind: "action",
        },
        {
          storyConsistency: 92,
          characterConsistency: 88,
          contextSimilarity: contextSimilarity(scene, `${softened} ${removal}`),
          toneCompatibility: toneCompatibility(result, softened),
        },
      ),
    },
    {
      summary: `Show ${subject} recovering the ${prop} before Scene ${issue.scenes[1]}`,
      detail:
        `Keep the removal in Scene ${issue.scenes[0]}, but add a short retrieval beat so the later appearance is earned. ` +
        `This adds one beat and keeps the original emotional beat intact.`,
      patch: {
        mode: "append",
        scene: Math.max(1, issue.scenes[1] - 1),
        target: later,
        text: `Later, ${subject} slips the ${prop} back into ${owner} pocket, unseen.`,
        kind: "action",
      },
      scores: score(
        {
          mode: "append",
          scene: issue.scenes[1] - 1,
          target: later,
          text: `Later, ${subject} slips the ${prop} back into ${owner} pocket, unseen.`,
          kind: "action",
        },
        {
          storyConsistency: 84,
          characterConsistency: 80,
          contextSimilarity: contextSimilarity(scene, `${prop} pocket unseen`),
          toneCompatibility: toneCompatibility(result, "slips back unseen"),
        },
      ),
    },
    {
      summary: `Introduce a second ${prop} earlier in the story`,
      detail:
        `Add a spare ${prop} (drawer, glovebox, under the mat) before Scene ${issue.scenes[1]} so the later beat uses a different object. ` +
        `Most flexible option, but it adds a new element the audience must track.`,
      patch: {
        mode: "insert-before",
        scene: Math.max(1, issue.scenes[1] - 1),
        target: later,
        text: `In the drawer beside the door, a spare ${prop} rests on a folded note.`,
        kind: "action",
      },
      scores: score(
        {
          mode: "insert-before",
          scene: issue.scenes[1] - 1,
          target: later,
          text: `In the drawer beside the door, a spare ${prop} rests on a folded note.`,
          kind: "action",
        },
        {
          storyConsistency: 76,
          characterConsistency: 72,
          contextSimilarity: contextSimilarity(scene, `spare ${prop} drawer`),
          toneCompatibility: toneCompatibility(result, "drawer folded note"),
        },
      ),
    },
  ];
}

function optionsForMissingSetup({ result, issue, scene }: Ctx): Omit<FixOption, "id" | "label">[] {
  const entity = issue.entities[0] ?? "element";
  const target = issue.evidence[0]?.quote ?? "";
  const earlyScene = Math.max(1, Math.floor((issue.scenes[0] ?? 2) / 2));

  return [
    {
      summary: `Plant the ${entity} in an earlier scene (Scene ${earlyScene})`,
      detail:
        `Add one short beat in Scene ${earlyScene} that shows the ${entity} in the background. The audience registers it subconsciously, ` +
        `so the later appearance lands as a payoff instead of a surprise.`,
      patch: {
        mode: "insert-before",
        scene: earlyScene,
        target: sentences(scene?.action ?? "").slice(-1)[0] ?? target,
        text: `On the table, half-hidden under a coat, sits the ${entity}.`,
        kind: "action",
      },
      scores: score(
        {
          mode: "insert-before",
          scene: earlyScene,
          target: target,
          text: `On the table, half-hidden under a coat, sits the ${entity}.`,
          kind: "action",
        },
        {
          storyConsistency: 90,
          characterConsistency: 82,
          contextSimilarity: contextSimilarity(scene, `${entity} table coat`),
          toneCompatibility: toneCompatibility(result, "table coat half-hidden"),
        },
      ),
    },
    {
      summary: `Have a character mention the ${entity} in dialogue first`,
      detail:
        `A single line of dialogue in an earlier scene establishes the ${entity} without showing it. Cheapest change, ` +
        `but it can feel like exposition if the line has no other dramatic purpose.`,
      patch: {
        mode: "insert-before",
        scene: earlyScene,
        target: target,
        text: `${(scene?.characters[0] ?? "A character").toUpperCase()}\nDo you still keep the ${entity}?`,
        kind: "dialogue",
      },
      scores: score(
        {
          mode: "insert-before",
          scene: earlyScene,
          target: target,
          text: `Do you still keep the ${entity}?`,
          kind: "dialogue",
        },
        {
          storyConsistency: 80,
          characterConsistency: 86,
          contextSimilarity: contextSimilarity(scene, `keep the ${entity}`),
          toneCompatibility: toneCompatibility(result, "do you still keep"),
        },
      ),
    },
    {
      summary: `Move the ${entity}'s introduction earlier by reordering the beat`,
      detail:
        `Relocate the existing beat that introduces the ${entity} so it happens before the midpoint. No new material is written, ` +
        `but surrounding scenes may need small continuity adjustments.`,
      patch: {
        mode: "insert-before",
        scene: earlyScene,
        target: target,
        text: `(Moved beat) The ${entity} is established here instead of later in the story.`,
        kind: "action",
      },
      scores: score(
        {
          mode: "insert-before",
          scene: earlyScene,
          target: target,
          text: `The ${entity} is established here.`,
          kind: "action",
        },
        {
          storyConsistency: 72,
          characterConsistency: 70,
          contextSimilarity: contextSimilarity(scene, `${entity}`),
          toneCompatibility: toneCompatibility(result, "established"),
        },
      ),
    },
  ];
}

function optionsForTimeline({ result, issue, scene }: Ctx): Omit<FixOption, "id" | "label">[] {
  const heading = issue.evidence.find((e) => e.note?.includes("heading"))?.quote ?? scene?.heading ?? "";
  const quote = issue.evidence[0]?.quote ?? "";
  const targetScene = issue.scenes[issue.scenes.length - 1];

  return [
    {
      summary: `Fix the Scene ${targetScene} heading`,
      detail: `Change the heading of Scene ${targetScene} so it no longer claims continuity with the previous beat. One-line change, zero new material.`,
      patch: {
        mode: "heading",
        scene: targetScene,
        target: heading,
        text: `${heading.replace(/-\s*(CONTINUOUS|SAME TIME).*$/i, "- LATER")}`,
        kind: "heading",
      },
      scores: score(
        { mode: "heading", scene: targetScene, target: heading, text: heading, kind: "heading" },
        {
          storyConsistency: 94,
          characterConsistency: 90,
          contextSimilarity: 88,
          toneCompatibility: 84,
        },
      ),
    },
    {
      summary: `Add a transition line that makes the jump explicit`,
      detail: `Keep both scenes as they are and insert an explicit time transition ("LATER THAT NIGHT"). The reader is never confused about when we are.`,
      patch: {
        mode: "insert-before",
        scene: targetScene,
        target: heading,
        text: "CUT TO:",
        kind: "transition",
      },
      scores: score(
        { mode: "insert-before", scene: targetScene, target: heading, text: "CUT TO:", kind: "transition" },
        {
          storyConsistency: 86,
          characterConsistency: 88,
          contextSimilarity: 82,
          toneCompatibility: 80,
        },
      ),
    },
    {
      summary: `Adjust the dialogue reference instead of the structure`,
      detail: `Rewrite the line in Scene ${targetScene} so it matches the stated time of day. Keeps the schedule intact but changes a line of dialogue.`,
      patch: {
        mode: "replace",
        scene: targetScene,
        target: quote,
        text: `${quote.replace(/\.$/, "")} — or so it feels right now.`,
        kind: "dialogue",
      },
      scores: score(
        { mode: "replace", scene: targetScene, target: quote, text: quote, kind: "dialogue" },
        {
          storyConsistency: 70,
          characterConsistency: 74,
          contextSimilarity: contextSimilarity(scene, quote),
          toneCompatibility: toneCompatibility(result, quote),
        },
      ),
    },
  ];
}

function optionsForCharacter({ result, issue, scene }: Ctx): Omit<FixOption, "id" | "label">[] {
  const quote = issue.evidence[0]?.quote ?? "";
  const first = issue.entities[0] ?? "the character";
  const second = issue.entities[1] ?? "";
  const targetScene = issue.scenes[0] ?? 1;

  if (issue.title.toLowerCase().includes("same character")) {
    return [
      {
        summary: `Standardise both cues to "${first}"`,
        detail: `Rename every occurrence of "${second}" to "${first}" so dialogue counts, presence and the prominence ranking all merge into one character.`,
        patch: {
          mode: "replace",
          scene: targetScene,
          target: second || first,
          text: first,
          kind: "dialogue",
        },
        scores: score(
          { mode: "replace", scene: targetScene, target: second, text: first, kind: "dialogue" },
          { storyConsistency: 88, characterConsistency: 96, contextSimilarity: 90, toneCompatibility: 86 },
        ),
      },
      {
        summary: `Standardise both cues to "${second || first}"`,
        detail: `Use the fuller form everywhere. Slightly more formal, but it removes any ambiguity for the reader and the parser.`,
        patch: {
          mode: "replace",
          scene: targetScene,
          target: first,
          text: second || first,
          kind: "dialogue",
        },
        scores: score(
          { mode: "replace", scene: targetScene, target: first, text: second || first, kind: "dialogue" },
          { storyConsistency: 84, characterConsistency: 92, contextSimilarity: 88, toneCompatibility: 84 },
        ),
      },
    ];
  }

  return [
    {
      summary: `Add a bridging line that explains the reappearance`,
      detail: `Insert one line in Scene ${issue.scenes[issue.scenes.length - 1]} that clarifies how ${first} is present (flashback, recording, dream, or a reveal).`,
      patch: {
        mode: "insert-before",
        scene: issue.scenes[issue.scenes.length - 1] ?? targetScene,
        target: quote,
        text: `A beat later, the room answers: this is a recording. ${first}'s voice, not ${first}.`,
        kind: "action",
      },
      scores: score(
        {
          mode: "insert-before",
          scene: issue.scenes[issue.scenes.length - 1] ?? targetScene,
          target: quote,
          text: `A beat later, the room answers: this is a recording.`,
          kind: "action",
        },
        {
          storyConsistency: 86,
          characterConsistency: 84,
          contextSimilarity: contextSimilarity(scene, "recording voice beat"),
          toneCompatibility: toneCompatibility(result, "room answers recording"),
        },
      ),
    },
    {
      summary: `Soften the earlier line so it stops contradicting later scenes`,
      detail: `Rewrite the claim in Scene ${targetScene} so it no longer rules out a later appearance — the smallest possible change and it keeps every other scene intact.`,
      patch: {
        mode: "replace",
        scene: targetScene,
        target: quote,
        text: `${quote.replace(/\.$/, "")} — at least, that is what everyone believes.`,
        kind: "dialogue",
      },
      scores: score(
        {
          mode: "replace",
          scene: targetScene,
          target: quote,
          text: `${quote} — at least, that is what everyone believes.`,
          kind: "dialogue",
        },
        {
          storyConsistency: 82,
          characterConsistency: 80,
          contextSimilarity: contextSimilarity(scene, quote),
          toneCompatibility: toneCompatibility(result, quote),
        },
      ),
    },
    {
      summary: `Reframe the later appearance as a memory or dream`,
      detail: `Convert Scene ${issue.scenes[issue.scenes.length - 1]}'s beat into an explicit dream/memory so the timeline stays intact. Strongest continuity, largest change.`,
      patch: {
        mode: "insert-before",
        scene: issue.scenes[issue.scenes.length - 1] ?? targetScene,
        target: quote,
        text: `DREAM SEQUENCE — the light is wrong, the sound is too close.`,
        kind: "action",
      },
      scores: score(
        {
          mode: "insert-before",
          scene: issue.scenes[issue.scenes.length - 1] ?? targetScene,
          target: quote,
          text: `DREAM SEQUENCE — the light is wrong, the sound is too close.`,
          kind: "action",
        },
        {
          storyConsistency: 92,
          characterConsistency: 76,
          contextSimilarity: contextSimilarity(scene, "dream light sound"),
          toneCompatibility: toneCompatibility(result, "dream light sound"),
        },
      ),
    },
  ];
}

function optionsForDialogue({ result, issue, scene }: Ctx): Omit<FixOption, "id" | "label">[] {
  const quote = issue.evidence[0]?.quote ?? "";
  const repeated = issue.evidence[1]?.quote ?? "";
  const targetScene = issue.scenes[0] ?? 1;
  const speaker = scene?.characters[0] ?? "The character";

  if (issue.type === "repetitive-dialogue") {
    return [
      {
        summary: "Cut the repeated line and let the silence play",
        detail: `Delete the second, near-identical line in Scene ${targetScene}. Removing it tightens the beat and trusts the first line to land.`,
        patch: {
          mode: "replace",
          scene: targetScene,
          target: repeated,
          text: "(She doesn't repeat herself. The look does the work.)",
          kind: "action",
        },
        scores: score(
          {
            mode: "replace",
            scene: targetScene,
            target: repeated,
            text: "(She doesn't repeat herself. The look does the work.)",
            kind: "action",
          },
          {
            storyConsistency: 88,
            characterConsistency: 86,
            contextSimilarity: contextSimilarity(scene, `${quote} ${repeated}`),
            toneCompatibility: toneCompatibility(result, "silence look"),
          },
        ),
      },
      {
        summary: "Vary the second line so it escalates instead of echoing",
        detail: `Keep both lines but change the second so it raises the stakes rather than restating them. Preserves the rhythm of the exchange.`,
        patch: {
          mode: "replace",
          scene: targetScene,
          target: repeated,
          text: `${repeated.replace(/\.$/, "")} — and this time, she means it.`,
          kind: "dialogue",
        },
        scores: score(
          {
            mode: "replace",
            scene: targetScene,
            target: repeated,
            text: `${repeated} — and this time, she means it.`,
            kind: "dialogue",
          },
          {
            storyConsistency: 80,
            characterConsistency: 84,
            contextSimilarity: contextSimilarity(scene, repeated),
            toneCompatibility: toneCompatibility(result, repeated),
          },
        ),
      },
    ];
  }

  return [
    {
      summary: "Give the line a want (subtext)",
      detail: `Keep the words but add an action beat in Scene ${targetScene} that shows what ${speaker} actually wants, so the short line reads as choice rather than filler.`,
      patch: {
        mode: "insert-before",
        scene: targetScene,
        target: quote,
        text: `${speaker} looks at the door before answering.`,
        kind: "action",
      },
      scores: score(
        {
          mode: "insert-before",
          scene: targetScene,
          target: quote,
          text: `${speaker} looks at the door before answering.`,
          kind: "action",
        },
        {
          storyConsistency: 86,
          characterConsistency: 92,
          contextSimilarity: contextSimilarity(scene, "door answering"),
          toneCompatibility: toneCompatibility(result, "looks at the door"),
        },
      ),
    },
    {
      summary: "Add a parenthetical that sharpens the delivery",
      detail: `Add a parenthetical under the cue in Scene ${targetScene}. One word changes the meaning without rewriting a single spoken line.`,
      patch: {
        mode: "replace",
        scene: targetScene,
        target: quote,
        text: `${speaker.toUpperCase()}\n(flat)\n${quote}`,
        kind: "dialogue",
      },
      scores: score(
        {
          mode: "replace",
          scene: targetScene,
          target: quote,
          text: `(flat)\n${quote}`,
          kind: "dialogue",
        },
        {
          storyConsistency: 82,
          characterConsistency: 90,
          contextSimilarity: contextSimilarity(scene, quote),
          toneCompatibility: toneCompatibility(result, quote),
        },
      ),
    },
    {
      summary: "Replace the filler with a line that carries information",
      detail: `Swap the weakest line in Scene ${targetScene} for one that reveals character or moves the plot. Most impactful, but it changes what is said.`,
      patch: {
        mode: "replace",
        scene: targetScene,
        target: quote,
        text: `${quote.replace(/\.$/, "")} — but not before I know what you're not telling me.`,
        kind: "dialogue",
      },
      scores: score(
        {
          mode: "replace",
          scene: targetScene,
          target: quote,
          text: `${quote} — but not before I know what you're not telling me.`,
          kind: "dialogue",
        },
        {
          storyConsistency: 76,
          characterConsistency: 84,
          contextSimilarity: contextSimilarity(scene, quote),
          toneCompatibility: toneCompatibility(result, quote),
        },
      ),
    },
  ];
}

function optionsForTransition({ result, issue, scene }: Ctx): Omit<FixOption, "id" | "label">[] {
  const from = issue.scenes[0] ?? 1;
  const to = issue.scenes[1] ?? from + 1;
  const lastBeat = issue.evidence[0]?.quote ?? "";
  const targetScene = to;

  return [
    {
      summary: `Add a bridging beat at the end of Scene ${from}`,
      detail: `Extend Scene ${from} by one line that hands the reader across the cut, so the jump to ${scene?.location ?? "the next location"} feels deliberate.`,
      patch: {
        mode: "append",
        scene: from,
        target: lastBeat,
        text: "The sound follows her out of the room and into the dark.",
        kind: "action",
      },
      scores: score(
        {
          mode: "append",
          scene: from,
          target: lastBeat,
          text: "The sound follows her out of the room and into the dark.",
          kind: "action",
        },
        {
          storyConsistency: 88,
          characterConsistency: 84,
          contextSimilarity: contextSimilarity(scene, "sound follows dark"),
          toneCompatibility: toneCompatibility(result, "sound follows dark"),
        },
      ),
    },
    {
      summary: `Insert an explicit transition (CUT TO / SMASH CUT)`,
      detail: `A single transition line before Scene ${targetScene} signals the jump. Cheapest possible fix, and it keeps every existing line unchanged.`,
      patch: {
        mode: "insert-before",
        scene: targetScene,
        target: issue.evidence[1]?.quote ?? "",
        text: "CUT TO:",
        kind: "transition",
      },
      scores: score(
        {
          mode: "insert-before",
          scene: targetScene,
          target: "",
          text: "CUT TO:",
          kind: "transition",
        },
        {
          storyConsistency: 80,
          characterConsistency: 82,
          contextSimilarity: 78,
          toneCompatibility: 76,
        },
      ),
    },
    {
      summary: `Carry one element across the cut`,
      detail: `Open Scene ${targetScene} with the same object, sound or line that closed Scene ${from}. Strongest sense of flow, but it requires a new opening beat.`,
      patch: {
        mode: "insert-before",
        scene: targetScene,
        target: issue.evidence[1]?.quote ?? "",
        text: "The same sound, closer now.",
        kind: "action",
      },
      scores: score(
        {
          mode: "insert-before",
          scene: targetScene,
          target: "",
          text: "The same sound, closer now.",
          kind: "action",
        },
        {
          storyConsistency: 84,
          characterConsistency: 80,
          contextSimilarity: contextSimilarity(scene, "same sound closer"),
          toneCompatibility: toneCompatibility(result, "sound closer"),
        },
      ),
    },
  ];
}

function optionsForPacing({ result, issue, scene }: Ctx): Omit<FixOption, "id" | "label">[] {
  const targetScene = issue.scenes[0] ?? 1;
  const quote = issue.evidence[0]?.quote ?? "";

  return [
    {
      summary: `Split Scene ${targetScene} with a cut`,
      detail: `Break the long stretch in Scene ${targetScene} into two beats with a cut. Nothing is deleted — the same information arrives in a faster rhythm.`,
      patch: {
        mode: "insert-after",
        scene: targetScene,
        target: quote,
        text: "CUT TO:",
        kind: "transition",
      },
      scores: score(
        { mode: "insert-after", scene: targetScene, target: quote, text: "CUT TO:", kind: "transition" },
        {
          storyConsistency: 90,
          characterConsistency: 86,
          contextSimilarity: 80,
          toneCompatibility: 80,
        },
      ),
    },
    {
      summary: `Intercut a line of dialogue inside the block`,
      detail: `Add one short spoken line in the middle of Scene ${targetScene} so the description is broken up by character. Keeps all the information, adds motion.`,
      patch: {
        mode: "insert-after",
        scene: targetScene,
        target: quote,
        text: `${(scene?.characters[0] ?? "A character").toUpperCase()}\nWe shouldn't be here.`,
        kind: "dialogue",
      },
      scores: score(
        {
          mode: "insert-after",
          scene: targetScene,
          target: quote,
          text: `We shouldn't be here.`,
          kind: "dialogue",
        },
        {
          storyConsistency: 82,
          characterConsistency: 88,
          contextSimilarity: contextSimilarity(scene, "shouldn't be here"),
          toneCompatibility: toneCompatibility(result, "shouldn't be here"),
        },
      ),
    },
    {
      summary: `Raise the stake in the middle of the stretch`,
      detail: `Add a ticking-clock element in Scene ${targetScene} (a sound, a phone, a deadline) so the flat stretch gains pressure without cutting material.`,
      patch: {
        mode: "insert-after",
        scene: targetScene,
        target: quote,
        text: "Somewhere behind the wall, a phone starts to ring.",
        kind: "action",
      },
      scores: score(
        {
          mode: "insert-after",
          scene: targetScene,
          target: quote,
          text: "Somewhere behind the wall, a phone starts to ring.",
          kind: "action",
        },
        {
          storyConsistency: 78,
          characterConsistency: 78,
          contextSimilarity: contextSimilarity(scene, "phone ring wall"),
          toneCompatibility: toneCompatibility(result, "phone ring wall"),
        },
      ),
    },
  ];
}

function optionsForUnresolved({ result, issue, scene }: Ctx): Omit<FixOption, "id" | "label">[] {
  const quote = issue.evidence[0]?.quote ?? "";
  const targetScene = issue.scenes[0] ?? 1;
  const laterScene = Math.min(
    (scene?.number ?? result.scenes.length) + 2,
    result.scenes.length,
  );

  return [
    {
      summary: `Pay the promise off in Scene ${laterScene}`,
      detail: `Add a short beat in Scene ${laterScene} that answers the setup from Scene ${targetScene}. Closes the loop without touching the original line.`,
      patch: {
        mode: "append",
        scene: laterScene,
        target: quote,
        text: "Later, the promise is kept — quietly, and far too late.",
        kind: "action",
      },
      scores: score(
        {
          mode: "append",
          scene: laterScene,
          target: quote,
          text: "Later, the promise is kept.",
          kind: "action",
        },
        {
          storyConsistency: 92,
          characterConsistency: 86,
          contextSimilarity: contextSimilarity(scene, quote),
          toneCompatibility: toneCompatibility(result, "promise kept"),
        },
      ),
    },
    {
      summary: `Make the unresolved state the point`,
      detail: `Add one line in Scene ${targetScene} that signals the open question is deliberate — the audience reads it as theme rather than as a dropped thread.`,
      patch: {
        mode: "insert-after",
        scene: targetScene,
        target: quote,
        text: "No one answers. The question is the answer.",
        kind: "action",
      },
      scores: score(
        {
          mode: "insert-after",
          scene: targetScene,
          target: quote,
          text: "No one answers. The question is the answer.",
          kind: "action",
        },
        {
          storyConsistency: 78,
          characterConsistency: 82,
          contextSimilarity: contextSimilarity(scene, "no one answers"),
          toneCompatibility: toneCompatibility(result, "no one answers"),
        },
      ),
    },
    {
      summary: `Cut the setup line entirely`,
      detail: `Remove the promise from Scene ${targetScene} if it is never going to matter. Cleanest way to remove a loose end, but it loses the beat's emotion.`,
      patch: {
        mode: "replace",
        scene: targetScene,
        target: quote,
        text: "(The promise is never made. The moment passes in silence.)",
        kind: "action",
      },
      scores: score(
        {
          mode: "replace",
          scene: targetScene,
          target: quote,
          text: "(The moment passes in silence.)",
          kind: "action",
        },
        {
          storyConsistency: 84,
          characterConsistency: 68,
          contextSimilarity: contextSimilarity(scene, quote),
          toneCompatibility: toneCompatibility(result, "silence"),
        },
      ),
    },
  ];
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */
function lowercaseFirst(text: string) {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function stripLeadingSubject(text: string) {
  return text.replace(/^[A-Z][A-Za-z']+(\s[A-Z][A-Za-z']+)?\s/, "");
}

const BUILDERS: Record<IssueType, (ctx: Ctx) => Omit<FixOption, "id" | "label">[]> = {
  "object-continuity": optionsForObjectContinuity,
  "missing-setup": optionsForMissingSetup,
  timeline: optionsForTimeline,
  character: optionsForCharacter,
  "repetitive-dialogue": optionsForDialogue,
  "weak-dialogue": optionsForDialogue,
  "abrupt-transition": optionsForTransition,
  pacing: optionsForPacing,
  "unresolved-event": optionsForUnresolved,
  "plot-hole": optionsForUnresolved,
};

function reasonFor(option: FixOption, issue: DetectedIssue) {
  const { scores } = option;
  const best = [
    ["story consistency", scores.storyConsistency],
    ["character consistency", scores.characterConsistency],
    ["context similarity", scores.contextSimilarity],
    ["tone compatibility", scores.toneCompatibility],
    ["a small amount of change", 100 - scores.changeAmount],
  ].sort((a, b) => (b[1] as number) - (a[1] as number))[0][0];

  return (
    `Suitability score ${scores.suitability}/100 — strongest on ${best}. ` +
    `It addresses the ${issue.label.toLowerCase()} issue in Scene ${option.patch.scene}` +
    (scores.changeAmount < 35
      ? " while requiring minimal changes to the existing story."
      : scores.changeAmount > 60
        ? ", at the cost of adding new material that must be tracked."
        : " with a moderate, contained change.")
  );
}

/** Builds 2–3 scored options per issue and flags the recommended one. */
export function generateFixOptions(result: AnalysisResult, issue: DetectedIssue): Issue {
  const scene = result.scenes.find((s) => s.number === issue.scenes[0]);
  const builder = BUILDERS[issue.type] ?? optionsForUnresolved;
  const raw = builder({ result, issue, scene }).slice(0, 3);

  const options: FixOption[] = raw.map((option, index) => ({
    ...option,
    id: `${issue.id}-${String.fromCharCode(97 + index)}`,
    label: OPTION_LABELS[index] ?? "OPTION C",
  }));

  const recommended = [...options].sort((a, b) => b.scores.suitability - a.scores.suitability)[0];

  return {
    ...issue,
    options,
    recommendedOptionId: recommended?.id ?? null,
    recommendationReason: recommended ? reasonFor(recommended, issue) : "",
  };
}

export function attachFixOptions(result: AnalysisResult, issues: DetectedIssue[]): Issue[] {
  return issues.map((issue) => generateFixOptions(result, issue));
}
