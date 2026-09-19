"""Emotion analysis: lexicon-driven emotion detection with intensity scoring.

The hybrid design keeps inference fast and explainable on CPU-only machines while
still allowing a transformer zero-shot classifier to refine the labels when
`transformers` is installed (see `classify_with_transformer`).
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Dict, List

from .text_processing import tokenize

EMOTIONS = ["fear", "happiness", "sadness", "anger", "surprise", "neutral"]

NEGATIONS = {"not", "no", "never", "nothing", "nobody", "without", "hardly", "barely", "cannot", "cant", "dont", "didnt"}
INTENSIFIERS = {"very", "extremely", "really", "so", "deeply", "utterly", "completely", "absolutely", "incredibly", "totally"}

# word -> (emotion, weight)
EMOTION_LEXICON: Dict[str, tuple] = {
    # FEAR
    "fear": ("fear", 2.0), "afraid": ("fear", 2.0), "scared": ("fear", 2.0), "terrified": ("fear", 2.6),
    "terror": ("fear", 2.6), "horror": ("fear", 2.4), "dread": ("fear", 2.3), "panic": ("fear", 2.4),
    "scream": ("fear", 2.2), "screams": ("fear", 2.2), "screaming": ("fear", 2.2), "shiver": ("fear", 1.6),
    "tremble": ("fear", 1.6), "shakes": ("fear", 1.4), "shaking": ("fear", 1.4), "shadow": ("fear", 1.2),
    "shadows": ("fear", 1.2), "dark": ("fear", 1.2), "darkness": ("fear", 1.5), "nightmare": ("fear", 2.2),
    "nightmares": ("fear", 2.2), "whisper": ("fear", 1.3), "whispers": ("fear", 1.3), "whispering": ("fear", 1.3),
    "monster": ("fear", 2.2), "ghost": ("fear", 2.0), "blood": ("fear", 1.8), "bleeding": ("fear", 1.8),
    "death": ("fear", 1.8), "dead": ("fear", 1.7), "die": ("fear", 1.7), "dying": ("fear", 1.7),
    "kill": ("fear", 2.0), "killed": ("fear", 2.0), "kills": ("fear", 2.0), "murder": ("fear", 2.3),
    "danger": ("fear", 1.9), "dangerous": ("fear", 1.8), "threat": ("fear", 1.7), "trap": ("fear", 1.7),
    "chase": ("fear", 1.8), "chasing": ("fear", 1.8), "hide": ("fear", 1.4), "hiding": ("fear", 1.4),
    "alone": ("fear", 1.1), "cold": ("fear", 1.0), "breath": ("fear", 0.9), "silence": ("fear", 1.2),
    "creak": ("fear", 1.5), "creaks": ("fear", 1.5), "locked": ("fear", 1.3), "locked door": ("fear", 1.3),
    "anxious": ("fear", 1.7), "anxiety": ("fear", 1.7), "nervous": ("fear", 1.5), "worried": ("fear", 1.4),
    "curse": ("fear", 1.5), "haunted": ("fear", 2.3), "haunt": ("fear", 2.0), "evil": ("fear", 2.0),
    # HAPPINESS
    "happy": ("happiness", 2.0), "happiness": ("happiness", 2.2), "joy": ("happiness", 2.2), "glad": ("happiness", 1.8),
    "smile": ("happiness", 1.7), "smiles": ("happiness", 1.7), "smiling": ("happiness", 1.7), "laugh": ("happiness", 1.9),
    "laughs": ("happiness", 1.9), "laughter": ("happiness", 2.0), "love": ("happiness", 2.0), "loves": ("happiness", 2.0),
    "loved": ("happiness", 1.9), "hope": ("happiness", 1.6), "hopeful": ("happiness", 1.7), "warm": ("happiness", 1.3),
    "beautiful": ("happiness", 1.6), "wonderful": ("happiness", 1.9), "great": ("happiness", 1.4),
    "perfect": ("happiness", 1.7), "peace": ("happiness", 1.6), "peaceful": ("happiness", 1.7),
    "excited": ("happiness", 1.8), "exciting": ("happiness", 1.6), "grateful": ("happiness", 1.7),
    "friend": ("happiness", 1.2), "friends": ("happiness", 1.2), "together": ("happiness", 1.1),
    "wonderful": ("happiness", 1.9), "bliss": ("happiness", 2.1), "delighted": ("happiness", 2.0),
    "celebrate": ("happiness", 1.9), "triumph": ("happiness", 1.9), "win": ("happiness", 1.5),
    # SADNESS
    "sad": ("sadness", 2.0), "sadness": ("sadness", 2.2), "cry": ("sadness", 2.0), "cries": ("sadness", 2.0),
    "crying": ("sadness", 2.0), "tears": ("sadness", 2.0), "grief": ("sadness", 2.3), "mourning": ("sadness", 2.2),
    "loss": ("sadness", 1.6), "lost": ("sadness", 1.4), "lonely": ("sadness", 1.8), "loneliness": ("sadness", 1.9),
    "empty": ("sadness", 1.5), "hopeless": ("sadness", 2.0), "depressed": ("sadness", 2.1), "misery": ("sadness", 2.1),
    "pain": ("sadness", 1.7), "hurt": ("sadness", 1.6), "broken": ("sadness", 1.6), "sorry": ("sadness", 1.3),
    "regret": ("sadness", 1.8), "guilt": ("sadness", 1.8), "ashamed": ("sadness", 1.8), "alone": ("sadness", 1.2),
    "funeral": ("sadness", 2.2), "goodbye": ("sadness", 1.7), "miss": ("sadness", 1.4), "missing": ("sadness", 1.4),
    "weak": ("sadness", 1.2), "tired": ("sadness", 1.1), "exhausted": ("sadness", 1.2), "weep": ("sadness", 2.0),
    # ANGER
    "angry": ("anger", 2.1), "anger": ("anger", 2.2), "rage": ("anger", 2.5), "furious": ("anger", 2.4),
    "hate": ("anger", 2.3), "hates": ("anger", 2.3), "hatred": ("anger", 2.4), "mad": ("anger", 1.7),
    "revenge": ("anger", 2.3), "vengeance": ("anger", 2.4), "kill": ("anger", 1.6), "destroy": ("anger", 1.9),
    "fight": ("anger", 1.7), "fighting": ("anger", 1.7), "attack": ("anger", 1.9), "attacks": ("anger", 1.9),
    "shout": ("anger", 1.8), "shouts": ("anger", 1.8), "screams": ("anger", 1.2), "curse": ("anger", 1.4),
    "betray": ("anger", 2.0), "betrayed": ("anger", 2.1), "betrayal": ("anger", 2.2), "lie": ("anger", 1.5),
    "lied": ("anger", 1.6), "lied to": ("anger", 1.6), "enemy": ("anger", 1.7), "cruel": ("anger", 2.0),
    "violent": ("anger", 2.1), "violence": ("anger", 2.1), "punish": ("anger", 1.8), "threat": ("anger", 1.5),
    # SURPRISE
    "surprise": ("surprise", 2.1), "surprised": ("surprise", 2.1), "surprising": ("surprise", 2.0),
    "shock": ("surprise", 2.2), "shocked": ("surprise", 2.2), "shocking": ("surprise", 2.2),
    "suddenly": ("surprise", 1.9), "sudden": ("surprise", 1.8), "unexpected": ("surprise", 1.9),
    "amazed": ("surprise", 1.9), "astonished": ("surprise", 2.0), "stunned": ("surprise", 2.0),
    "reveal": ("surprise", 1.7), "reveals": ("surprise", 1.7), "revealed": ("surprise", 1.7),
    "discover": ("surprise", 1.6), "discovers": ("surprise", 1.6), "realize": ("surprise", 1.4),
    "realizes": ("surprise", 1.4), "twist": ("surprise", 1.7), "secret": ("surprise", 1.4),
    "wait": ("surprise", 0.9), "what": ("surprise", 0.7), "impossible": ("surprise", 1.8),
    "astounding": ("surprise", 2.0), "gasp": ("surprise", 1.8), "gasps": ("surprise", 1.8),
}

_INTENSITY_RE = re.compile(r"!+")
_CAPS_RE = re.compile(r"\b[A-Z]{3,}\b")


@dataclass
class EmotionResult:
    distribution: Dict[str, float] = field(default_factory=dict)
    intensity: float = 0.0
    dominant: str = "neutral"
    per_scene: List[dict] = field(default_factory=list)


def _score_text(text: str) -> Dict[str, float]:
    tokens = tokenize(text)
    scores = {e: 0.0 for e in EMOTIONS}
    for i, tok in enumerate(tokens):
        entry = EMOTION_LEXICON.get(tok)
        if not entry:
            continue
        emotion, weight = entry
        window = tokens[max(0, i - 3):i]
        if any(w in NEGATIONS for w in window):
            weight *= 0.35
            scores["neutral"] += weight * 0.5
        if any(w in INTENSIFIERS for w in window):
            weight *= 1.45
        scores[emotion] += weight
    return scores


def _intensity_multiplier(text: str) -> float:
    mult = 1.0
    exclamations = len(_INTENSITY_RE.findall(text))
    mult += min(0.45, exclamations * 0.06)
    caps = len(_CAPS_RE.findall(text))
    mult += min(0.35, caps * 0.05)
    if "..." in text or "\u2026" in text:
        mult += 0.12
    return round(mult, 3)


def analyse_emotion(text: str) -> EmotionResult:
    tokens = tokenize(text)
    total_tokens = max(1, len(tokens))
    scores = _score_text(text)
    total = sum(scores.values())
    if total <= 0:
        distribution = {e: (100.0 if e == "neutral" else 0.0) for e in EMOTIONS}
    else:
        neutral_floor = 0.10 * total
        distribution = {}
        for e in EMOTIONS:
            value = scores[e] + (neutral_floor if e == "neutral" else 0.0)
            distribution[e] = round(100 * value / (total + neutral_floor), 2)
    density = (sum(v for k, v in scores.items() if k != "neutral") / total_tokens) * 100
    intensity = min(100.0, round(density * 6.5 * _intensity_multiplier(text), 1))
    dominant = max(distribution, key=lambda k: distribution[k])
    return EmotionResult(distribution=distribution, intensity=intensity, dominant=dominant)


def analyse_emotions_by_scene(scenes) -> EmotionResult:
    per_scene = []
    for scene in scenes:
        res = analyse_emotion(f"{scene.action} {scene.dialogue}")
        per_scene.append(
            {
                "scene": scene.number,
                "location": scene.location,
                "dominant": res.dominant,
                "intensity": res.intensity,
                **{f"pct_{e}": res.distribution[e] for e in EMOTIONS},
            }
        )
    overall = analyse_emotion(" ".join(f"{s.action} {s.dialogue}" for s in scenes))
    overall.per_scene = per_scene
    return overall


def classify_with_transformer(text: str, candidate_labels=None):
    """Optional transformer-based zero-shot emotion classification."""
    try:
        from transformers import pipeline  # type: ignore
    except Exception:
        return None
    try:
        clf = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
        labels = candidate_labels or EMOTIONS
        out = clf(text[:1000], candidate_labels=labels)
        return dict(zip(out["labels"], [round(s * 100, 2) for s in out["scores"]]))
    except Exception:
        return None
