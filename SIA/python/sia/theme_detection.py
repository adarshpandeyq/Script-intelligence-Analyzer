"""Theme detection: keyword-weighted theme scoring with supporting evidence."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Dict, List

from .text_processing import tokenize

THEME_KEYWORDS: Dict[str, Dict[str, float]] = {
    "Fear": {"fear": 1.4, "afraid": 1.3, "terror": 1.5, "horror": 1.5, "dread": 1.4, "nightmare": 1.4,
             "nightmares": 1.4, "scream": 1.3, "screams": 1.3, "screaming": 1.3, "dark": 0.8,
             "darkness": 0.9, "shadow": 0.9, "shadows": 0.9, "haunted": 1.4, "monster": 1.3,
             "whisper": 0.9, "whispers": 0.9, "whispering": 0.9, "cellar": 1.0, "figure": 0.8,
             "scratch": 1.0, "scratches": 1.0, "chain": 0.9, "padlock": 1.0},
    "Revenge": {"revenge": 2.0, "vengeance": 2.0, "payback": 1.8, "settle": 0.8, "punish": 1.4,
                "get back": 1.5, "owe": 0.9, "justice": 1.0, "enemy": 1.0, "destroy": 1.1},
    "Love": {"love": 1.8, "loves": 1.7, "beloved": 1.7, "romance": 1.8, "kiss": 1.4, "heart": 1.1,
             "marry": 1.6, "together": 0.9, "darling": 1.5, "forever": 1.2},
    "Betrayal": {"betray": 2.0, "betrayal": 2.0, "betrayed": 1.9, "lied": 1.5, "lie": 1.3, "deceive": 1.8,
                 "deception": 1.8, "trust": 1.0, "stabbed": 1.5, "secret": 1.0, "double-cross": 2.0},
    "Friendship": {"friend": 1.8, "friends": 1.8, "friendship": 2.0, "buddy": 1.5, "partner": 1.0,
                   "together": 0.9, "loyal": 1.6, "loyalty": 1.7, "help": 0.7, "trust": 0.9},
    "Identity": {"identity": 2.0, "who am i": 2.2, "myself": 1.2, "memory": 1.1, "memories": 1.1,
                 "real name": 1.6, "pretend": 1.2, "mask": 1.3, "truth about": 1.4, "remember": 1.0},
    "Death & Mortality": {"death": 1.8, "die": 1.7, "dead": 1.7, "dying": 1.7, "funeral": 1.8, "grave": 1.7,
                          "corpse": 1.8, "buried": 1.6, "mortality": 2.0, "ghost": 1.2},
    "Survival": {"survive": 2.0, "survival": 2.0, "escape": 1.6, "escapes": 1.6, "alive": 1.5, "trapped": 1.6,
                 "stranded": 1.7, "rescue": 1.5, "run": 1.0, "hide": 1.2, "shelter": 1.4},
    "Isolation": {"alone": 1.7, "lonely": 1.8, "loneliness": 1.9, "isolation": 2.0, "abandoned": 1.8,
                  "empty": 1.2, "nobody": 1.3, "silence": 1.1, "solitude": 1.8, "cut off": 1.5},
    "Mystery & Secrets": {"mystery": 2.0, "secret": 1.6, "secrets": 1.6, "hidden": 1.4, "clue": 1.7,
                          "investigate": 1.6, "detect": 1.2, "detective": 1.6, "unknown": 1.3, "riddle": 1.6,
                          "reveal": 1.2},
    "Guilt & Redemption": {"guilt": 2.0, "guilty": 1.9, "regret": 1.8, "forgive": 1.8, "forgiveness": 1.9,
                           "redeem": 1.9, "redemption": 2.0, "sorry": 1.3, "sin": 1.5, "confess": 1.6},
    "Family": {"family": 1.9, "father": 1.5, "mother": 1.5, "brother": 1.6, "sister": 1.6, "son": 1.4,
               "daughter": 1.4, "dad": 1.5, "mom": 1.5, "inherited": 1.2, "home": 1.0},
    "Power & Control": {"power": 1.6, "control": 1.5, "rule": 1.3, "king": 1.3, "boss": 1.2, "command": 1.4,
                        "obey": 1.4, "prison": 1.3, "locked": 1.1, "own": 1.0},
    "Hope": {"hope": 1.9, "hopeful": 1.9, "future": 1.1, "believe": 1.2, "tomorrow": 1.3,
             "start over": 1.7, "second chance": 1.8, "better": 1.0, "save": 1.1},
    "Madness": {"madness": 2.0, "insane": 1.9, "crazy": 1.6, "losing my mind": 2.0, "hallucination": 1.9,
                "voices": 1.4, "asylum": 1.8, "therapy": 1.4, "dream": 1.1, "dreams": 1.1,
                "wakes": 1.0, "wake": 0.9, "nightmare": 1.0, "sleep": 0.8},
    "Technology & AI": {"robot": 1.9, "android": 1.9, "ai": 1.8, "machine": 1.3, "computer": 1.3,
                        "algorithm": 1.7, "data": 1.1, "system": 1.0, "network": 1.1, "simulation": 1.8},
    "Justice & Morality": {"justice": 1.8, "law": 1.2, "moral": 1.6, "right": 0.8, "wrong": 0.9, "truth": 1.2,
                           "court": 1.4, "crime": 1.5, "innocent": 1.5, "lawyer": 1.2},
    "War & Conflict": {"war": 1.9, "battle": 1.7, "soldier": 1.7, "army": 1.6, "attack": 1.5, "enemy": 1.4,
                       "fight": 1.3, "bomb": 1.7, "mission": 1.2, "gun": 1.3},
    "Coming of Age": {"growing up": 1.8, "childhood": 1.6, "school": 1.2, "teen": 1.5, "first time": 1.4,
                      "learn": 1.0, "become": 0.9, "young": 1.2, "adult": 1.3},
    "Obsession": {"obsessed": 2.0, "obsession": 2.0, "cannot stop": 1.8, "every night": 1.4,
                  "again and again": 1.6, "need": 1.0, "must": 0.9, "haunt": 1.3},
}


@dataclass
class Theme:
    name: str
    score: float
    relevance: float
    keywords: List[str] = field(default_factory=list)
    description: str = ""

    def to_dict(self) -> dict:
        return {
            "theme": self.name,
            "relevance": round(self.relevance, 1),
            "score": round(self.score, 2),
            "keywords": self.keywords,
            "description": self.description,
        }


def detect_themes(text: str, scenes=None, top_n: int = 6) -> List[Theme]:
    tokens = tokenize(text)
    joined = " ".join(tokens)
    detector = _build_detector(joined)

    raw_themes: List[tuple] = []
    for name, keywords in THEME_KEYWORDS.items():
        score = 0.0
        matched: List[str] = []
        for kw, weight in keywords.items():
            hits = detector(kw)
            if hits:
                score += hits * weight
                matched.append(kw)
        if score <= 0:
            continue
        matched.sort(key=lambda k: -keywords[k])
        raw_themes.append((score, name, matched))

    if not raw_themes:
        return [Theme(
            name="Undetermined", score=0.0, relevance=0.0, keywords=[],
            description="Not enough signal in the script to infer themes.",
        )]

    top_score = max(s for s, _, _ in raw_themes)
    themes: List[Theme] = []
    for score, name, matched in raw_themes:
        relative = score / top_score             # strongest detected theme = 1.0
        absolute = min(1.0, score / 8.0)         # 8 weighted points = strong presence
        relevance = round(min(100.0, 100 * (0.6 * relative + 0.4 * absolute)), 1)
        themes.append(
            Theme(
                name=name,
                score=score,
                relevance=relevance,
                keywords=matched[:6],
                description=_describe(name, matched[:3]),
            )
        )
    themes.sort(key=lambda t: -t.relevance)
    return themes[:top_n]


def _build_detector(joined_tokens: str):
    def detector(keyword: str) -> int:
        if " " in keyword:
            return joined_tokens.count(" " + keyword + " ")
        return len([1 for t in joined_tokens.split() if t == keyword])
    return detector


def _describe(name: str, keywords: List[str]) -> str:
    if not keywords:
        return f"{name} appears as a background current in the writing."
    return (
        f"{name} is carried through the script by recurring signals such as "
        + ", ".join(f"'{k}'" for k in keywords)
        + "."
    )


def theme_scene_map(themes: List[Theme], scenes) -> List[dict]:
    """Where is each theme strongest? (scene index -> normalised strength)."""
    out = []
    for theme in themes:
        row = {"theme": theme.name, "scenes": []}
        kws = theme.keywords or []
        for scene in scenes:
            text = (scene.action + " " + scene.dialogue).lower()
            hits = sum(text.count(k) for k in kws)
            row["scenes"].append(round(min(100.0, hits * 25.0), 1))
        out.append(row)
    return out
