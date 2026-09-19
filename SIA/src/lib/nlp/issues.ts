import type { AnalysisResult, Character, Scene } from "./types";
import { sentences, tokenize } from "./textProcessing";

export type IssueType =
  | "plot-hole"
  | "timeline"
  | "character"
  | "object-continuity"
  | "unresolved-event"
  | "repetitive-dialogue"
  | "weak-dialogue"
  | "abrupt-transition"
  | "pacing"
  | "missing-setup";

export interface IssueEvidence {
  scene?: number;
  quote: string;
  note?: string;
}

export interface DetectedIssue {
  id: string;
  type: IssueType;
  label: string;
  severity: "High" | "Medium" | "Low";
  title: string;
  explanation: string;
  evidence: IssueEvidence[];
  scenes: number[];
  confidence: number;
  entities: string[];
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */
const PROPS = [
  "key", "keys", "gun", "rifle", "knife", "letter", "phone", "map", "photo",
  "photograph", "music box", "chain", "padlock", "ring", "ticket", "rope",
  "watch", "flashlight", "note", "recording", "tape", "file", "folder",
  "passport", "wallet", "diary", "badge", "glove", "axe", "hammer",
];

const DESTRUCTION = /\b(throws?|threw|destroys?|destroyed|breaks?|broke|smash(?:es|ed)?|burns? down|tears? up|cuts? up|loses?|lost|flushes?|flushed|dumps?|dumped|discards?|discarded)\b/i;
const TIME_MARKERS = /\b(yesterday|tomorrow|last night|this morning|tonight|tonite|last week|next week|three days|two days|a week later|years? ago|minutes? later|hours? later|seconds? later)\b/i;
const DAY_COUNT = /\b(the next day|the following morning|days? later|weeks? later|months? later|years? later|a year later)\b/i;
const GONE_MARKERS = /\b(is dead|was dead|are dead|were dead|dies|died|is killed|was killed|were killed|has been dead|never com(?:e|ing) back|gone forever|we buried|buried (?:him|her|them)|at the funeral|the funeral|left town|leaves town|disappeared for good)\b/i;
const WEAK_LINES = /^(okay|ok|fine|yes|no|what|huh|sure|right|hey|wait|please|thanks|sorry|i know|i guess|maybe|whatever|good|great|alright)\.?$/i;
const EXPOSITION_MARKERS = /\b(as you know|like i said|like i told you|remember when|the truth is|it all started|let me explain|you see)\b/i;
const UNFINISHED_END = /\b(suddenly|when|as|then|but|and then|before|until|just as|while)\b[,.\s]*$/i;

function norm(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function jaccard(a: string, b: string) {
  const A = new Set(norm(a).split(" ").filter((w) => w.length > 2));
  const B = new Set(norm(b).split(" ").filter((w) => w.length > 2));
  if (!A.size || !B.size) return 0;
  let shared = 0;
  A.forEach((w) => {
    if (B.has(w)) shared += 1;
  });
  return shared / (A.size + B.size - shared);
}

function dialogueLines(scene: Scene): string[] {
  return sentences(scene.dialogue)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 2);
}

function propMentions(scene: Scene) {
  const text = `${scene.action} ${scene.dialogue}`.toLowerCase();
  return PROPS.filter((p) => new RegExp(`\\b${p}\\b`).test(text));
}

function quote(sentence: string) {
  const clean = sentence.trim().replace(/\s+/g, " ");
  return clean.length > 190 ? `${clean.slice(0, 187)}…` : clean;
}

function idFor(type: IssueType, key: string | number) {
  return `${type}-${String(key).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

/* ------------------------------------------------------------------ */
/* detectors                                                           */
/* ------------------------------------------------------------------ */
function detectObjectContinuity(scenes: Scene[]): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  PROPS.forEach((prop) => {
    const hits = scenes.filter((s) => new RegExp(`\\b${prop}\\b`, "i").test(`${s.action} ${s.dialogue}`));
    if (hits.length < 2) return;
    const destructionScene = hits.find((s) =>
      sentences(s.action).some((sentence) => {
        const verb = DESTRUCTION.exec(sentence);
        const object = new RegExp(`\\b${prop}\\b`, "i").exec(sentence);
        return Boolean(verb && object && verb.index < object.index);
      }),
    );
    if (!destructionScene) return;
    const later = hits.find((s) => s.number > destructionScene.number);
    if (!later) return;
    const propRe = new RegExp(`\\b${prop}\\b`, "i");
    const evidenceSentence =
      sentences(destructionScene.action).find((sentence) => {
        const verb = DESTRUCTION.exec(sentence);
        const object = propRe.exec(sentence);
        return Boolean(verb && object && verb.index < object.index);
      }) ?? destructionScene.action;
    issues.push({
      id: idFor("object-continuity", `${prop}-${destructionScene.number}`),
      type: "object-continuity",
      label: "Object continuity",
      severity: "High",
      title: `The ${prop} is removed in Scene ${destructionScene.number} but used again in Scene ${later.number}`,
      explanation:
        `Scene ${destructionScene.number} (${destructionScene.location}) disposes of the ${prop}, yet Scene ${later.number} (${later.location}) still references it. ` +
        `Either the disposal must be faked/reversed, or the later appearance needs its own setup.`,
      evidence: [
        { scene: destructionScene.number, quote: quote(evidenceSentence), note: "object removed" },
        {
          scene: later.number,
          quote: quote(
            sentences(`${later.action} ${later.dialogue}`).find((s) => new RegExp(`\\b${prop}\\b`, "i").test(s)) ?? later.summary,
          ),
          note: "object used again",
        },
      ],
      scenes: [destructionScene.number, later.number],
      confidence: 0.72,
      entities: [prop],
    });
  });
  return issues;
}

function detectMissingSetup(scenes: Scene[], characters: Character[]): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  if (scenes.length < 4) return issues;
  const threshold = Math.max(2, Math.floor(scenes.length * 0.6));

  // Entities that only become important late in the story without prior seeding.
  const lateScenes = scenes.slice(threshold);
  lateScenes.forEach((scene) => {
    const props = propMentions(scene);
    const newProps = props.filter((prop) => !scenes.slice(0, threshold).some((s) => new RegExp(`\\b${prop}\\b`, "i").test(`${s.action} ${s.dialogue}`)));
    const isClimactic = scene.wordCount > 60 || (scene.characters.length >= 2 && scene.dialogueLines > 1);
    if (newProps.length && isClimactic) {
      const prop = newProps[0];
      issues.push({
        id: idFor("missing-setup", prop),
        type: "missing-setup",
        label: "Missing setup",
        severity: "Medium",
        title: `The ${prop} appears for the first time in Scene ${scene.number} — very late in the story`,
        explanation:
          `Important story objects usually need an earlier introduction ("Chekhov's gun"). The ${prop} first shows up in Scene ${scene.number} ` +
          `(of ${scenes.length}), so the audience has no prior attachment or context when it matters.`,
        evidence: [
          {
            scene: scene.number,
            quote: quote(
              sentences(`${scene.action} ${scene.dialogue}`).find((s) => new RegExp(`\\b${prop}\\b`, "i").test(s)) ?? scene.summary,
            ),
            note: "first appearance",
          },
        ],
        scenes: [scene.number],
        confidence: 0.6,
        entities: [prop],
      });
    }
  });

  // Late-arriving speaking characters with no earlier mention.
  characters.forEach((character) => {
    const first = character.firstScene ?? 1;
    if (first <= threshold) return;
    if (character.prominence < 8) return;
    issues.push({
      id: idFor("missing-setup", `char-${character.name}`),
      type: "missing-setup",
      label: "Missing setup",
      severity: "Low",
      title: `${character.name} is introduced in Scene ${first} with little prior groundwork`,
      explanation:
        `${character.name} speaks in ${character.sceneCount} scene(s) but is only introduced at Scene ${first} of ${scenes.length}. ` +
        `An earlier mention or off-screen reference would make the arrival feel earned.`,
      evidence: [{ scene: first, quote: quote(scenes[first - 1]?.summary ?? ""), note: "first appearance" }],
      scenes: [first],
      confidence: 0.45,
      entities: [character.name],
    });
  });
  return issues;
}

function detectTimeline(scenes: Scene[]): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  scenes.forEach((scene, index) => {
    const previous = scenes[index - 1];
    if (!previous) return;

    // "CONTINUOUS" / "SAME TIME" after an explicit time jump
    if (/CONTINUOUS|SAME TIME/i.test(scene.heading) && DAY_COUNT.test(`${previous.action} ${previous.dialogue}`)) {
      const marker = DAY_COUNT.exec(`${previous.action} ${previous.dialogue}`)?.[0] ?? "a time jump";
      issues.push({
        id: idFor("timeline", `continuous-${scene.number}`),
        type: "timeline",
        label: "Timeline inconsistency",
        severity: "Medium",
        title: `Scene ${scene.number} is marked CONTINUOUS but Scene ${previous.number} contains "${marker}"`,
        explanation:
          `Scene ${previous.number} moves the story forward in time, so Scene ${scene.number} cannot be continuous with it. ` +
          `Either remove the time jump or change the scene heading to the correct time of day.`,
        evidence: [
          {
            scene: previous.number,
            quote: quote(
              sentences(`${previous.action} ${previous.dialogue}`).find((s) => DAY_COUNT.test(s)) ?? previous.summary,
            ),
            note: "time jump",
          },
          { scene: scene.number, quote: quote(scene.heading), note: "heading claims continuity" },
        ],
        scenes: [previous.number, scene.number],
        confidence: 0.66,
        entities: [marker],
      });
    }

    // Dialogue time reference that conflicts with the scene's stated time
    const timeRef = TIME_MARKERS.exec(`${scene.action} ${scene.dialogue}`)?.[0];
    if (timeRef && scene.timeOfDay !== "UNSPECIFIED") {
      const conflict =
        (/tonight|last night/i.test(timeRef) && scene.timeOfDay === "DAY") ||
        (/this morning|yesterday morning/i.test(timeRef) && scene.timeOfDay === "NIGHT");
      if (conflict) {
        issues.push({
          id: idFor("timeline", `ref-${scene.number}`),
          type: "timeline",
          label: "Timeline inconsistency",
          severity: "Low",
          title: `Scene ${scene.number} is set at ${scene.timeOfDay} but the dialogue refers to "${timeRef}"`,
          explanation:
            `The scene heading places the beat at ${scene.timeOfDay}, while the text references "${timeRef}". ` +
            `Align the dialogue, or adjust the heading so the timeline stays coherent.`,
          evidence: [
            {
              scene: scene.number,
              quote: quote(
                sentences(`${scene.action} ${scene.dialogue}`).find((s) => TIME_MARKERS.test(s)) ?? scene.summary,
              ),
              note: `references "${timeRef}"`,
            },
            { scene: scene.number, quote: quote(scene.heading), note: "scene heading" },
          ],
          scenes: [scene.number],
          confidence: 0.5,
          entities: [timeRef],
        });
      }
    }
  });
  return issues;
}

function detectCharacterIssues(scenes: Scene[], characters: Character[]): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  const names = characters.map((c) => c.name);

  // Alias / spelling variants of the same character
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      const a = names[i];
      const b = names[j];
      const aParts = a.toLowerCase().split(/\s+/);
      const bParts = b.toLowerCase().split(/\s+/);
      const STOP_TOKENS = new Set(["the", "and", "for", "with", "from", "of", "a", "dr", "mr", "mrs", "ms"]);
      const sharesToken = aParts.some(
        (part) => part.length > 2 && !STOP_TOKENS.has(part) && bParts.includes(part),
      );
      if (!sharesToken) continue;
      issues.push({
        id: idFor("character", `alias-${a}-${b}`),
        type: "character",
        label: "Character inconsistency",
        severity: "Low",
        title: `"${a}" and "${b}" may be the same character written two ways`,
        explanation:
          `Both names share a token and are tracked separately, which usually means the character cue was written inconsistently ` +
          `(e.g. "MARA" in some scenes and "MARA BLACKWOOD" in others). Standardise the cue so dialogue counts and presence stay accurate.`,
        evidence: [
          { scene: characters[i].firstScene ?? 1, quote: a, note: "cue variant A" },
          { scene: characters[j].firstScene ?? 1, quote: b, note: "cue variant B" },
        ],
        scenes: [characters[i].firstScene ?? 1, characters[j].firstScene ?? 1],
        confidence: 0.55,
        entities: [a, b],
      });
    }
  }

  // Character declared dead / gone but still present later
  scenes.forEach((scene) => {
    const goneSentence = sentences(`${scene.action} ${scene.dialogue}`).find((s) => GONE_MARKERS.test(s));
    if (!goneSentence) return;
    const mentioned = characters.filter((c) =>
      new RegExp(`\\b${c.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(goneSentence),
    );
    mentioned.forEach((character) => {
      const later = scenes.find(
        (s) => s.number > scene.number && s.characters.some((c) => c.toLowerCase() === character.name.toLowerCase()),
      );
      if (!later) return;
      issues.push({
        id: idFor("character", `gone-${character.name}`),
        type: "character",
        label: "Character inconsistency",
        severity: "High",
        title: `${character.name} is written out in Scene ${scene.number} but appears again in Scene ${later.number}`,
        explanation:
          `Scene ${scene.number} (${scene.location}) states that ${character.name} is dead/gone, yet the same character speaks in Scene ${later.number} ` +
          `(${later.location}). Add an explanation (flashback, dream, reveal) or move/remove the later appearance.`,
        evidence: [
          { scene: scene.number, quote: quote(goneSentence), note: "character written out" },
          { scene: later.number, quote: quote(later.summary), note: "character present again" },
        ],
        scenes: [scene.number, later.number],
        confidence: 0.68,
        entities: [character.name],
      });
    });
  });

  // "I never met him" style contradictions
  const CLAIM = /\b(never met|don'?t know (?:him|her|them)|first time (?:i|we)|who (?:is|are) (?:he|she|they))\b/i;
  scenes.forEach((scene) => {
    const claim = sentences(scene.dialogue).find((s) => CLAIM.test(s));
    if (!claim) return;
    const speaker = scene.characters.find((c) => scene.dialogue.toLowerCase().includes(c.toLowerCase())) ?? scene.characters[0];
    if (!speaker) return;
    const earlier = scenes.find(
      (s) =>
        s.number < scene.number &&
        s.characters.some((c) => c.toLowerCase() === speaker.toLowerCase()) &&
        s.characters.length > 1,
    );
    if (!earlier) return;
    const other = earlier.characters.find((c) => c.toLowerCase() !== speaker.toLowerCase());
    if (!other) return;
    issues.push({
      id: idFor("character", `claim-${scene.number}`),
      type: "character",
      label: "Character inconsistency",
      severity: "Medium",
      title: `Scene ${scene.number}: the line contradicts an earlier meeting`,
      explanation:
        `The dialogue claims no prior acquaintance, but ${speaker} already shares a scene with ${other} in Scene ${earlier.number} ` +
        `(${earlier.location}). Rephrase the line, or add context ("we've never spoken").`,
      evidence: [
        { scene: scene.number, quote: quote(claim), note: "claim of no prior meeting" },
        { scene: earlier.number, quote: quote(earlier.summary), note: `${speaker} and ${other} share this scene` },
      ],
      scenes: [earlier.number, scene.number],
      confidence: 0.5,
      entities: [speaker, other],
    });
  });
  return issues;
}

function detectDialogueProblems(scenes: Scene[]): DetectedIssue[] {
  const issues: DetectedIssue[] = [];

  scenes.forEach((scene) => {
    const lines = dialogueLines(scene);

    // repetitive dialogue inside a scene
    for (let i = 0; i < lines.length; i += 1) {
      for (let j = i + 1; j < lines.length; j += 1) {
        const similarity = jaccard(lines[i], lines[j]);
        if (similarity >= 0.72 && lines[i].split(/\s+/).length >= 5) {
          issues.push({
            id: idFor("repetitive-dialogue", `${scene.number}-${i}-${j}`),
            type: "repetitive-dialogue",
            label: "Repetitive dialogue",
            severity: "Low",
            title: `Scene ${scene.number} repeats nearly the same line twice`,
            explanation:
              `Two lines in Scene ${scene.number} (${scene.location}) are ${Math.round(similarity * 100)}% similar. ` +
              `Unless the repetition is intentional, cut one line or vary the wording so the beat keeps moving.`,
            evidence: [
              { scene: scene.number, quote: quote(lines[i]), note: "first line" },
              { scene: scene.number, quote: quote(lines[j]), note: "repeated line" },
            ],
            scenes: [scene.number],
            confidence: 0.4 + similarity * 0.3,
            entities: [],
          });
          i = lines.length; // one report per scene
          break;
        }
      }
    }

    // weak / unclear dialogue
    const weak = lines.filter((line) => WEAK_LINES.test(line.trim()));
    if (lines.length >= 4 && weak.length / lines.length >= 0.5) {
      issues.push({
        id: idFor("weak-dialogue", scene.number),
        type: "weak-dialogue",
        label: "Weak / unclear dialogue",
        severity: "Medium",
        title: `Scene ${scene.number} leans on filler lines (${weak.length}/${lines.length})`,
        explanation:
          `Most lines in Scene ${scene.number} (${scene.location}) are one-word reactions. They carry no information, subtext or character voice. ` +
          `Give at least one line an objective, a secret, or an action beat that shows what the character wants.`,
        evidence: weak.slice(0, 3).map((line) => ({ scene: scene.number, quote: quote(line), note: "filler line" })),
        scenes: [scene.number],
        confidence: 0.58,
        entities: scene.characters.slice(0, 2),
      });
    }

    // on-the-nose exposition
    const exposition = lines.find((line) => EXPOSITION_MARKERS.test(line) || line.split(/\s+/).length > 55);
    if (exposition) {
      issues.push({
        id: idFor("weak-dialogue", `expo-${scene.number}`),
        type: "weak-dialogue",
        label: "Weak / unclear dialogue",
        severity: "Low",
        title: `Scene ${scene.number} contains on-the-nose exposition`,
        explanation:
          `A line in Scene ${scene.number} explains information the characters already know, or runs very long. ` +
          `Break it into conflict, or move the information into action so it can be dramatised instead of reported.`,
        evidence: [{ scene: scene.number, quote: quote(exposition), note: "expository line" }],
        scenes: [scene.number],
        confidence: 0.46,
        entities: scene.characters.slice(0, 2),
      });
    }
  });
  return issues;
}

function detectTransitions(scenes: Scene[], suspense: AnalysisResult["suspense"]): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  scenes.forEach((scene, index) => {
    const next = scenes[index + 1];
    if (!next) return;

    const sharedCharacters = scene.characters.filter((c) => next.characters.includes(c));
    const sharedKeywords = scene.keywords.filter((k) => next.keywords.includes(k));
    const lastAction = sentences(scene.action).slice(-1)[0] ?? "";
    const endsMidBeat = UNFINISHED_END.test(lastAction.trim());
    const tensionJump = Math.abs(
      (suspense.perScene[index + 1]?.score ?? 0) - (suspense.perScene[index]?.score ?? 0),
    );

    if (!sharedCharacters.length && !sharedKeywords.length && (endsMidBeat || tensionJump > 34)) {
      issues.push({
        id: idFor("abrupt-transition", `${scene.number}-${next.number}`),
        type: "abrupt-transition",
        label: "Abrupt scene transition",
        severity: tensionJump > 45 ? "Medium" : "Low",
        title: `Scene ${scene.number} → ${next.number} cuts with no shared character, keyword or bridge`,
        explanation:
          `Nothing carries the reader across the cut: no shared character, no shared keyword, and the tension jumps ${tensionJump.toFixed(0)} points ` +
          `(${scene.location} → ${next.location}). Add a bridging beat, a transition line, or a call-back so the cut reads as intentional.`,
        evidence: [
          { scene: scene.number, quote: quote(lastAction || scene.summary), note: "scene ends here" },
          { scene: next.number, quote: quote(next.heading), note: "next scene heading" },
        ],
        scenes: [scene.number, next.number],
        confidence: 0.5 + Math.min(0.25, tensionJump / 200),
        entities: [],
      });
    }
  });
  return issues;
}

function detectPacing(scenes: Scene[], suspense: AnalysisResult["suspense"]): DetectedIssue[] {
  const issues: DetectedIssue[] = [];

  scenes.forEach((scene) => {
    if (scene.wordCount > 185 && (scene.dialogueShare ?? 0) < 25) {
      issues.push({
        id: idFor("pacing", `expo-${scene.number}`),
        type: "pacing",
        label: "Pacing problem",
        severity: "Medium",
        title: `Scene ${scene.number} is a ${scene.wordCount}-word description block with almost no dialogue`,
        explanation:
          `Long, talk-free description slows the read. Split Scene ${scene.number} (${scene.location}) into beats, cut it into two scenes, or intercut a line of dialogue so the information arrives in motion.`,
        evidence: [{ scene: scene.number, quote: quote(scene.action.slice(0, 190)), note: "description block" }],
        scenes: [scene.number],
        confidence: 0.6,
        entities: [],
      });
    }
  });

  // dialogue-heavy stretch: three talky scenes in a row with little action
  for (let i = 0; i + 3 <= scenes.length; i += 1) {
    const window = scenes.slice(i, i + 3);
    if (window.every((s) => (s.dialogueShare ?? 0) >= 78)) {
      issues.push({
        id: idFor("pacing", `talky-${window[0].number}`),
        type: "pacing",
        label: "Pacing problem",
        severity: "Low",
        title: `Scenes ${window[0].number}–${window[2].number} are almost entirely dialogue`,
        explanation:
          `Three consecutive scenes are ${window.map((s) => Math.round(s.dialogueShare ?? 0)).join("% / ")}% dialogue. ` +
          `Without action beats the stretch reads as static; intercut movement or compress the scenes.`,
        evidence: window.map((s) => ({
          scene: s.number,
          quote: quote(s.heading),
          note: `${Math.round(s.dialogueShare ?? 0)}% dialogue`,
        })),
        scenes: window.map((s) => s.number),
        confidence: 0.5,
        entities: [],
      });
      break;
    }
  }

  // rapid-fire short scenes
  for (let i = 0; i < scenes.length - 2; i += 1) {
    const window = scenes.slice(i, i + 3);
    if (window.every((s) => s.wordCount < 45)) {
      issues.push({
        id: idFor("pacing", `short-${window[0].number}`),
        type: "pacing",
        label: "Pacing problem",
        severity: "Low",
        title: `Scenes ${window[0].number}–${window[2].number} are extremely short in a row`,
        explanation:
          `Three consecutive scenes run under 45 words each, which can feel like a montage with no breathing room. ` +
          `Consider merging them, or give one of them a beat that lets the audience catch up.`,
        evidence: window.map((s) => ({ scene: s.number, quote: quote(s.heading), note: `${s.wordCount} words` })),
        scenes: window.map((s) => s.number),
        confidence: 0.48,
        entities: [],
      });
      break;
    }
  }

  // flat stretch of tension
  const scores = suspense.perScene.map((p) => p.score);
  for (let i = 0; i + 3 <= scores.length; i += 1) {
    const window = scores.slice(i, i + 3);
    const spread = Math.max(...window) - Math.min(...window);
    const average = window.reduce((a, b) => a + b, 0) / window.length;
    if (spread < 6 && average < 48) {
      issues.push({
        id: i === 0 ? "pacing-flat" : idFor("pacing", `flat-${i}`),
        type: "pacing",
        label: "Pacing problem",
        severity: "Medium",
        title: `Scenes ${i + 1}–${i + 3} flat-line (avg tension ${average.toFixed(0)}/100)`,
        explanation:
          `Tension barely moves across three consecutive scenes, so the middle of the story may sag. ` +
          `Raise a stake, shorten one scene, or move a revelatory beat earlier.`,
        evidence: suspense.perScene.slice(i, i + 3).map((p) => ({
          scene: p.scene,
          quote: quote(p.location),
          note: `tension ${p.score}`,
        })),
        scenes: [i + 1, i + 2, i + 3],
        confidence: 0.55,
        entities: [],
      });
      break;
    }
  }
  return issues;
}

function detectUnresolved(scenes: Scene[]): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  const lastThird = Math.max(1, Math.floor(scenes.length * 0.66));

  scenes.forEach((scene) => {
    if (scene.number > lastThird) return;
    const questions = sentences(scene.dialogue).filter((s) => s.trim().endsWith("?"));
    const promise = questions.find((q) => /\b(promise|swear|will you|won'?t you|remember|don'?t forget|must|have to|until|before)\b/i.test(q));
    if (!promise) return;

    const tokens = new Set(
      tokenize(promise)
        .filter((t) => t.length > 4)
        .slice(0, 6),
    );
    const resolved = scenes
      .slice(scene.number)
      .some((s) => [...tokens].filter((t) => new RegExp(`\\b${t}\\b`, "i").test(`${s.action} ${s.dialogue}`)).length >= 2);

    if (!resolved) {
      issues.push({
        id: idFor("unresolved-event", scene.number),
        type: "unresolved-event",
        label: "Unresolved story event",
        severity: "Medium",
        title: `A promise raised in Scene ${scene.number} is never paid off`,
        explanation:
          `Scene ${scene.number} (${scene.location}) sets up an obligation or question that the later scenes never answer. ` +
          `Unresolved setups read as plot holes unless they are deliberately left open.`,
        evidence: [{ scene: scene.number, quote: quote(promise), note: "unresolved setup" }],
        scenes: [scene.number],
        confidence: 0.52,
        entities: [...tokens].slice(0, 4),
      });
    }
  });

  // open questions in the final scene with no answer anywhere
  const finalScene = scenes[scenes.length - 1];
  if (finalScene) {
    const finalQuestions = sentences(finalScene.dialogue).filter((s) => s.trim().endsWith("?"));
    if (finalQuestions.length >= 2) {
      issues.push({
        id: "plot-hole-final",
        type: "plot-hole",
        label: "Plot hole",
        severity: "Low",
        title: `Scene ${finalScene.number} ends on ${finalQuestions.length} unanswered questions`,
        explanation:
          `Ending on several open questions can be intentional, but if they were never set up earlier the audience experiences them as loose ends ` +
          `rather than theme. Confirm each question has groundwork, or answer the most important one.`,
        evidence: finalQuestions.slice(0, 2).map((q) => ({ scene: finalScene.number, quote: quote(q), note: "open question" })),
        scenes: [finalScene.number],
        confidence: 0.4,
        entities: [],
      });
    }
  }
  return issues;
}

const SEVERITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

/** Runs every detector and returns issues ordered by severity, then confidence. */
export function detectIssues(result: AnalysisResult): DetectedIssue[] {
  const { scenes, characters, suspense } = result;
  if (!scenes.length) return [];

  const found: DetectedIssue[] = [
    ...detectObjectContinuity(scenes),
    ...detectCharacterIssues(scenes, characters),
    ...detectTimeline(scenes),
    ...detectUnresolved(scenes),
    ...detectMissingSetup(scenes, characters),
    ...detectTransitions(scenes, suspense),
    ...detectPacing(scenes, suspense),
    ...detectDialogueProblems(scenes),
  ];

  const seen = new Set<string>();
  return found
    .filter((issue) => {
      if (seen.has(issue.id)) return false;
      seen.add(issue.id);
      return true;
    })
    .sort(
      (a, b) =>
        SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.confidence - a.confidence,
    )
    .slice(0, 14);
}
