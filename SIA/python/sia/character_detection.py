"""Character detection: identify speaking characters and rank prominence."""
from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass, field
from typing import Dict, List

from .text_processing import ParsedScript, CUE_SUFFIX_RE, tokenize

GENERIC_CUES = {
    "CUT TO", "FADE IN", "FADE OUT", "FADE TO BLACK", "THE END", "CONTINUED",
    "CONTINUOUS", "MONTAGE", "TITLE", "SCENE", "ACT", "OPENING CREDITS",
    "CLOSING CREDITS", "DISSOLVE TO", "SMASH CUT TO", "FLASHBACK", "DREAM",
    "DAY", "NIGHT", "MORNING", "LATER", "SAME", "END", "BEGIN", "INTERCUT",
    "INSERT", "CLOSE ON", "ANGLE ON", "WIDE", "SERIES OF SHOTS", "BACK TO",
    "VOICE", "VOICES", "ALL", "EVERYONE", "CROWD", "GROUP", "OFFICER",
}


@dataclass
class Character:
    name: str
    dialogue_lines: int = 0
    words_spoken: int = 0
    scenes: List[int] = field(default_factory=list)
    prominence: float = 0.0

    @property
    def scene_count(self) -> int:
        return len(set(self.scenes))

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "dialogue_lines": self.dialogue_lines,
            "words_spoken": self.words_spoken,
            "scene_count": self.scene_count,
            "first_scene": min(self.scenes) if self.scenes else None,
            "prominence": round(self.prominence, 1),
        }


def normalize_name(cue: str) -> str:
    name = CUE_SUFFIX_RE.sub("", cue).strip()
    name = re.sub(r"\s*\(.*?\)\s*", "", name).strip()
    name = name.replace("\u2019", "'")
    name = re.sub(r"\s{2,}", " ", name)
    name = name.rstrip(".:,;-")
    return name.title() if name.isupper() else name


def is_valid_name(name: str) -> bool:
    if not name or len(name) > 34:
        return False
    if name.upper() in GENERIC_CUES:
        return False
    if not re.search(r"[A-Za-z]", name):
        return False
    if len(name.split()) > 4:
        return False
    return True


def detect_characters(parsed: ParsedScript, scene_characters: Dict[int, List[str]] | None = None) -> List[Character]:
    """Collect character cues and count dialogue volume per character."""
    characters: Dict[str, Character] = {}
    total_words = 0
    current_scene = 0

    for idx, block in enumerate(parsed.blocks):
        if block.kind == "heading":
            current_scene += 1
            continue
        if block.kind != "character":
            continue
        name = normalize_name(block.text)
        if not is_valid_name(name):
            continue
        # gather following dialogue until next heading/character
        spoken: List[str] = []
        j = idx + 1
        while j < len(parsed.blocks) and parsed.blocks[j].kind in {
            "parenthetical",
            "dialogue",
            "action",
        }:
            nxt = parsed.blocks[j]
            if nxt.kind == "action" and spoken:
                break
            if nxt.kind == "dialogue" or (nxt.kind == "action" and not spoken):
                spoken.append(nxt.text)
            j += 1
            if j < len(parsed.blocks) and parsed.blocks[j].kind in {"character", "heading"}:
                break
        word_count = sum(len(tokenize(t)) for t in spoken)

        char = characters.setdefault(name, Character(name=name))
        char.dialogue_lines += 1 if spoken else 0
        char.words_spoken += word_count
        total_words += word_count
        char.scenes.append(current_scene if current_scene else 1)

    if scene_characters:
        for scene_no, names in scene_characters.items():
            for name in names:
                characters.setdefault(name, Character(name=name)).scenes.append(scene_no)

    results = list(characters.values())
    if not results:
        return results

    max_words = max(c.words_spoken for c in results) or 1
    max_lines = max(c.dialogue_lines for c in results) or 1
    max_scenes = max(c.scene_count for c in results) or 1
    for c in results:
        c.prominence = 100 * (
            0.55 * (c.words_spoken / max_words)
            + 0.25 * (c.dialogue_lines / max_lines)
            + 0.20 * (c.scene_count / max_scenes)
        )
    results.sort(key=lambda c: -c.prominence)
    return results


def main_character(characters: List[Character]) -> Character | None:
    return characters[0] if characters else None


def character_mentions(text: str, characters: List[Character]) -> Counter:
    lowered = text.lower()
    counter = Counter()
    for c in characters:
        counter[c.name] = lowered.count(c.name.lower())
    return counter
