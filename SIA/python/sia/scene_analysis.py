"""Scene analysis: segmentation, location/time extraction and scene summaries."""
from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass, field
from typing import List

from .text_processing import ParsedScript, content_tokens, sentences, tokenize

TIME_OF_DAY = [
    "NIGHT", "DAY", "DUSK", "DAWN", "MORNING", "AFTERNOON", "EVENING",
    "CONTINUOUS", "LATER", "MAGIC HOUR", "SAME TIME",
]
STOP_LOC = {"INT", "EXT", "EST", "I/E", "INT./EXT.", "EXT./INT.", "SCENE", "SHOT"}


@dataclass
class Scene:
    number: int
    heading: str
    location: str
    time_of_day: str
    characters: List[str] = field(default_factory=list)
    action: str = ""
    dialogue: str = ""
    word_count: int = 0
    dialogue_lines: int = 0
    summary: str = ""
    keywords: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "number": self.number,
            "heading": self.heading,
            "location": self.location,
            "time_of_day": self.time_of_day,
            "characters": self.characters,
            "word_count": self.word_count,
            "dialogue_lines": self.dialogue_lines,
            "summary": self.summary,
            "keywords": self.keywords,
            "action_preview": self.action[:260],
        }


def _split_location(heading: str):
    body = re.sub(r"^\s*(INT|EXT|EST|I/E|INT\./EXT\.|EXT\./INT\.)\.?\s*", "", heading, flags=re.I)
    body = re.sub(r"^\s*[-:]?\s*", "", body).strip()
    time_of_day = "UNSPECIFIED"
    for t in TIME_OF_DAY:
        if re.search(rf"\b{re.escape(t)}\b", body, re.I):
            time_of_day = t
            body = re.sub(rf"\s*[-–—]\s*{re.escape(t)}\b.*$", "", body, flags=re.I)
            body = re.sub(rf"\b{re.escape(t)}\b", "", body, flags=re.I)
            break
    location = re.sub(r"\s*[-–—:]\s*$", "", body).strip(" -–—:.")
    location = " ".join(w for w in location.split() if w.upper().strip('.') not in STOP_LOC)
    return (location.title() or "Unknown Location"), time_of_day


def build_scenes(parsed: ParsedScript) -> List[Scene]:
    scenes: List[Scene] = []
    current: Scene | None = None

    blocks = parsed.blocks
    first_heading = next((i for i, b in enumerate(blocks) if b.kind == "heading"), None)
    if first_heading is not None:
        blocks = blocks[first_heading:]  # ignore title-page material before scene 1

    for block in blocks:
        if block.kind == "heading":
            if current:
                scenes.append(current)
            location, tod = _split_location(block.text)
            current = Scene(
                number=len(scenes) + 1,
                heading=block.text.strip(),
                location=location,
                time_of_day=tod,
            )
            continue
        if current is None:
            # Script starts without a heading - create an implicit scene
            location, tod = "Opening", "UNSPECIFIED"
            current = Scene(1, "INT. UNTITLED - UNSPECIFIED", location, tod)
        if block.kind == "character":
            name = re.sub(r"\s*\(.*?\)\s*", "", block.text).strip()
            name = re.sub(r"\s*\((cont'?d|v\.o\.|o\.s\.)\).*$", "", name, flags=re.I).strip()
            name = name.title() if name.isupper() else name
            if name and not any(name.lower() == c.lower() for c in current.characters):
                current.characters.append(name)
            current.dialogue_lines += 1
        elif block.kind == "dialogue" or block.kind == "parenthetical":
            if block.kind == "dialogue":
                current.dialogue += " " + block.text
        elif block.kind == "action":
            current.action += " " + block.text
    if current:
        scenes.append(current)

    for scene in scenes:
        scene.word_count = len(tokenize(scene.action + " " + scene.dialogue))
        scene.action = re.sub(r"\s{2,}", " ", scene.action).strip()
        scene.dialogue = re.sub(r"\s{2,}", " ", scene.dialogue).strip()
        toks = content_tokens(scene.action + " " + scene.dialogue)
        scene.keywords = [w for w, _ in Counter(toks).most_common(6)]
        scene.summary = summarize_scene(scene)
    return scenes


ACTION_VERBS = re.compile(
    r"\b(enters|runs|screams|whispers|opens|closes|discovers|grabs|falls|"
    r"reveals|attacks|chases|hides|finds|turns|stares|appears|wakes|kills|"
    r"escapes|locks|listens|dials|reads|remembers)\w*\b", re.I
)


def summarize_scene(scene: Scene) -> str:
    """Extractive summary: highest-scoring action/dialogue sentence + context."""
    text = (scene.action + " " + scene.dialogue).strip()
    if not text:
        return f"Scene {scene.number} — {scene.location}. No descriptive text available."
    sents = [s for s in sentences(text) if len(s.split()) >= 4]
    if not sents:
        sents = [text[:180]]
    freq = Counter(content_tokens(text))
    max_freq = max(freq.values()) if freq else 1

    def score(s: str) -> float:
        toks = content_tokens(s)
        base = sum(freq[t] for t in set(toks)) / (max_freq * max(1, len(set(toks))))
        if ACTION_VERBS.search(s):
            base += 0.35
        if len(s.split()) < 6:
            base -= 0.25
        if re.match(r"^(she|he|it|they|her|his|him)\b", s, re.I):
            base -= 0.3
        if scene.characters and any(c.lower() in s.lower() for c in scene.characters):
            base += 0.2
        return base

    best = max(sents, key=score)
    best = best.strip().rstrip(".")
    who = ", ".join(scene.characters[:2]) if scene.characters else "The story"
    where = scene.location or "the location"
    return f"In {where}, {who}: {best[0].upper() + best[1:] if best else ''}."


def scene_importance(scenes: List[Scene], character_rank: dict) -> List[float]:
    """Heuristic importance: length, cast weight and keyword density."""
    if not scenes:
        return []
    max_words = max(s.word_count for s in scenes) or 1
    scores = []
    for s in scenes:
        cast_weight = sum(character_rank.get(c, 0.0) for c in s.characters)
        scores.append(
            0.45 * (s.word_count / max_words)
            + 0.35 * min(1.0, cast_weight)
            + 0.20 * min(1.0, len(s.dialogue.split()) / 120)
        )
    mx = max(scores) or 1
    return [round(100 * v / mx, 1) for v in scores]
