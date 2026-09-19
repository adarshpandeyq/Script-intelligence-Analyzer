import type { BlockKind, ParsedScript, ScriptBlock } from "./types";
import { STOPWORDS } from "./lexicons/stopwords";

export class ScriptError extends Error {}

const SCENE_HEADING_RE = /^\s*(INT|EXT|EST|I\/E|INT\.?\/EXT\.?|EXT\.?\/INT\.?)\b[\.\s:].*/i;
const TRANSITION_RE =
  /^\s*(CUT TO|FADE (IN|OUT)|SMASH CUT TO|DISSOLVE TO|MATCH CUT TO|CONTINUOUS|INTERCUT WITH|FADE TO BLACK)\b.*$/i;
const CHARACTER_CUE_RE = /^\s*([A-Z][A-Z0-9 .'\-]{1,34})\s*(\(.*\))?\s*$/;
const PARENTHETICAL_RE = /^\s*\(.*\)\s*$/;
const PAGE_NUMBER_RE = /^\s*\d{1,4}\s*[\.\)\s]*$/;

// --------------------------------------------------------------------------- #
// Extraction (PDF / TXT)
// --------------------------------------------------------------------------- #
export async function extractTextFromBuffer(
  buffer: ArrayBuffer,
  filename: string,
): Promise<string> {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") {
    try {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const result = await extractText(pdf, { mergePages: true });
      const text = Array.isArray(result.text) ? result.text.join("\n") : result.text;
      if (!text || !text.trim()) {
        throw new ScriptError(
          "No readable text layer found in this PDF. Export the script as a text-based PDF or upload the .txt file.",
        );
      }
      return text;
    } catch (error) {
      if (error instanceof ScriptError) throw error;
      throw new ScriptError(
        "We could not read this PDF. Make sure it is a valid, text-based PDF file.",
      );
    }
  }
  if (["txt", "text", "fountain", "md", "markdown"].includes(ext)) {
    return new TextDecoder("utf-8").decode(buffer);
  }
  throw new ScriptError("Unsupported file type. Please upload a .txt or .pdf script.");
}

// --------------------------------------------------------------------------- #
// Cleaning
// --------------------------------------------------------------------------- #
export function cleanText(raw: string): string {
  let text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  text = text
    .replace(/ /g, " ")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/[—–]/g, "-");

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return true;
      if (PAGE_NUMBER_RE.test(line)) return false;
      if (/^(CONTINUED:|CONTINUED|\(\s*CONTINUED\s*\))$/i.test(line)) return false;
      return true;
    });
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function parseScreenplay(text: string): ParsedScript {
  const blocks: ScriptBlock[] = [];
  const lines = text.split("\n");
  let inDialogue = false;

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) {
      inDialogue = false;
      return;
    }
    if (SCENE_HEADING_RE.test(line)) {
      blocks.push({ kind: "heading", text: line.toUpperCase(), line: index });
      inDialogue = false;
      return;
    }
    if (TRANSITION_RE.test(line)) {
      blocks.push({ kind: "transition", text: line, line: index });
      inDialogue = false;
      return;
    }
    if (PARENTHETICAL_RE.test(line)) {
      blocks.push({ kind: "parenthetical", text: line, line: index });
      return;
    }
    if (inDialogue) {
      blocks.push({ kind: "dialogue", text: line, line: index });
      return;
    }
    const letters = line.replace(/[^A-Za-z]/g, "");
    const upperRatio = letters.length
      ? letters.replace(/[^A-Z]/g, "").length / letters.length
      : 0;
    const looksLikeCue =
      CHARACTER_CUE_RE.test(line) &&
      line.length <= 38 &&
      line.split(/\s+/).length <= 5 &&
      upperRatio > 0.8 &&
      !line.endsWith(".");
    const next = lines[index + 1]?.trim() ?? "";
    if (looksLikeCue && next && !SCENE_HEADING_RE.test(next)) {
      blocks.push({ kind: "character", text: line, line: index });
      inDialogue = true;
    } else {
      blocks.push({ kind: "action" as BlockKind, text: line, line: index });
    }
  });

  return { cleanText: text, blocks };
}

// --------------------------------------------------------------------------- #
// Helpers
// --------------------------------------------------------------------------- #
export function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z']+/g) ?? [];
}

export function contentTokens(text: string): string[] {
  return tokenize(text).filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

export function basicStats(text: string) {
  const words = tokenize(text);
  const unique = new Set(words);
  return {
    wordCount: words.length,
    uniqueWordCount: unique.size,
    sentenceCount: sentences(text).length,
    charCount: text.length,
    estimatedRuntimeMinutes: Math.round((words.length / 130) * 10) / 10,
    lexicalDiversity: words.length ? Math.round((unique.size / words.length) * 1000) / 1000 : 0,
  };
}
