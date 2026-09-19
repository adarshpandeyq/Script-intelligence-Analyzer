"""Suspense / tension analysis: scene-by-scene tension scoring and peak detection."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List

from .text_processing import sentences, tokenize
from .emotion_analysis import analyse_emotion

SUSPENSE_TERMS = {
    "suddenly": 2.4, "whisper": 1.6, "whispers": 1.6, "whispering": 1.6, "shadow": 1.4,
    "shadows": 1.4, "dark": 1.3, "darkness": 1.5, "silence": 1.5, "silent": 1.4,
    "scream": 2.4, "screams": 2.4, "screaming": 2.4, "blood": 2.0, "bleeding": 2.0,
    "chase": 2.2, "chasing": 2.2, "runs": 1.5, "running": 1.5, "escape": 1.8,
    "trap": 2.0, "trapped": 2.1, "locked": 1.6, "door": 0.9, "stairs": 1.1,
    "cellar": 1.5, "basement": 1.5, "attic": 1.5, "footsteps": 1.9, "breath": 1.2,
    "breathing": 1.3, "heart": 1.0, "pounding": 1.8, "cold": 1.0, "shiver": 1.6,
    "tremble": 1.6, "shakes": 1.3, "shake": 1.3, "knife": 2.0, "gun": 1.8,
    "dead": 1.7, "die": 1.6, "death": 1.7, "kill": 2.0, "killed": 2.0, "kills": 2.0,
    "monster": 2.0, "ghost": 1.8, "figure": 1.2, "voice": 1.1, "voices": 1.3,
    "nightmare": 2.0, "dream": 1.0, "wakes": 1.4, "wake": 1.2, "music box": 1.4,
    "scratch": 1.8, "scratches": 1.9, "creak": 1.7, "creaks": 1.7, "groan": 1.5,
    "slowly": 1.3, "stares": 1.3, "stare": 1.3, "watches": 1.4, "waiting": 1.3,
    "flicker": 1.6, "flickers": 1.6, "dies": 1.5, "darkness": 1.5, "thunder": 1.5,
    "storm": 1.3, "warning": 1.5, "condemned": 1.4, "midnight": 1.6, "third": 1.0,
    "hidden": 1.4, "secret": 1.3, "chain": 1.7, "padlock": 1.7, "mud": 1.0,
    "flashlight": 1.3, "dead battery": 1.4, "no signal": 1.7, "whispering": 1.6,
}
ANTICIPATION_TERMS = {
    "will": 0.6, "before": 0.9, "promise": 1.6, "remember": 1.2, "if anything": 1.8,
    "warning": 1.6, "do not": 1.4, "never": 1.2, "always": 1.1, "one day": 1.3,
    "soon": 1.2, "later": 0.8, "wait": 1.0, "hurry": 1.3, "time": 0.7,
}
NIGHT_TERMS = {"NIGHT", "DUSK", "DAWN", "MIDNIGHT"}

_QUESTION_RE = re.compile(r"\?")
_EXCLAIM_RE = re.compile(r"!")
_ELLIPSIS_RE = re.compile(r"\.\.\.|\u2026")
_CAPS_RE = re.compile(r"\b[A-Z]{3,}\b")
_DASH_RE = re.compile(r"\s--\s|\s—\s")


@dataclass
class SuspenseResult:
    per_scene: List[dict] = field(default_factory=list)
    peaks: List[dict] = field(default_factory=list)
    average: float = 0.0
    maximum: float = 0.0
    trend: str = "steady"
    narrative: str = ""

    def to_dict(self) -> dict:
        return {
            "per_scene": self.per_scene,
            "peaks": self.peaks,
            "average": self.average,
            "maximum": self.maximum,
            "trend": self.trend,
            "narrative": self.narrative,
        }


def _raw_scene_score(scene) -> dict:
    text = f"{scene.action} {scene.dialogue}"
    tokens = tokenize(text)
    total_tokens = max(1, len(tokens))
    lowered = " ".join(tokens)

    lex = 0.0
    for term, weight in SUSPENSE_TERMS.items():
        hits = lowered.count(" " + term + " ") if " " in term else len(
            [1 for t in lowered.split() if t == term]
        )
        lex += hits * weight

    lex_density = lex / total_tokens * 100.0

    sents = sentences(text) or [text]
    short_ratio = sum(1 for s in sents if len(s.split()) <= 6) / max(1, len(sents))

    punct = (
        len(_EXCLAIM_RE.findall(text)) * 1.6
        + len(_QUESTION_RE.findall(text)) * 1.1
        + len(_ELLIPSIS_RE.findall(text)) * 2.0
        + len(_DASH_RE.findall(text)) * 1.2
    )
    punct_density = punct / max(1, len(sents)) * 10

    caps_density = len(_CAPS_RE.findall(scene.action)) / total_tokens * 100
    night_bonus = 6.0 if scene.time_of_day in NIGHT_TERMS else 0.0
    brevity = 8.0 if total_tokens < 90 else (4.0 if total_tokens < 160 else 0.0)

    emotion = analyse_emotion(text)
    fear_component = emotion.distribution.get("fear", 0) + 0.5 * emotion.distribution.get("surprise", 0)
    fear_component = min(45.0, fear_component * 0.55)

    raw = (
        0.42 * min(60.0, lex_density * 2.4)
        + 0.16 * min(40.0, short_ratio * 55)
        + 0.12 * min(30.0, punct_density)
        + 0.08 * min(25.0, caps_density * 3)
        + 0.10 * fear_component
        + night_bonus
        + brevity
    )
    return {
        "lex_density": round(lex_density, 2),
        "short_sentence_ratio": round(short_ratio, 2),
        "punctuation_pressure": round(punct_density, 2),
        "emotion_component": round(fear_component, 2),
        "raw": min(100.0, raw),
    }


def analyse_suspense(scenes) -> SuspenseResult:
    if not scenes:
        return SuspenseResult()

    details = [_raw_scene_score(s) for s in scenes]
    raws = [d["raw"] for d in details]

    smoothed = []
    n = len(raws)
    for i, value in enumerate(raws):
        prev = raws[i - 1] if i > 0 else value
        nxt = raws[i + 1] if i < n - 1 else value
        smoothed.append(0.25 * prev + 0.5 * value + 0.25 * nxt)

    mx = max(smoothed) or 1.0
    mn = min(smoothed)
    span = max(1e-6, mx - mn)
    normalised = [round(28 + 68 * ((v - mn) / span), 1) for v in smoothed]

    per_scene = []
    for i, scene in enumerate(scenes):
        score = normalised[i]
        level = "High" if score >= 70 else ("Moderate" if score >= 45 else "Low")
        per_scene.append(
            {
                "scene": scene.number,
                "location": scene.location,
                "heading": scene.heading,
                "score": score,
                "level": level,
                "words": scene.word_count,
                "signals": details[i],
            }
        )

    peaks = sorted(per_scene, key=lambda p: -p["score"])[: max(1, min(4, len(per_scene)))]
    peaks = [p for p in peaks if p["score"] >= 55] or [max(per_scene, key=lambda p: p["score"])]

    average = round(sum(p["score"] for p in per_scene) / len(per_scene), 1)
    maximum = max(p["score"] for p in per_scene)

    half = max(1, len(per_scene) // 2)
    first_half = sum(p["score"] for p in per_scene[:half]) / half
    second_half = sum(p["score"] for p in per_scene[half:]) / max(1, len(per_scene) - half)
    delta = second_half - first_half
    trend = "rising" if delta > 6 else ("falling" if delta < -6 else "steady")

    peak_nos = ", ".join(f"Scene {p['scene']} ({p['location']})" for p in peaks)
    narrative = (
        f"Tension averages {average}/100 across {len(per_scene)} scenes with a "
        f"{trend} arc (first half {first_half:.0f} → second half {second_half:.0f}). "
        f"Peak tension occurs at {peak_nos}, reaching {maximum}/100."
    )
    return SuspenseResult(
        per_scene=per_scene, peaks=peaks, average=average, maximum=maximum,
        trend=trend, narrative=narrative,
    )


def high_tension_scenes(result: SuspenseResult, threshold: float = 70.0) -> List[dict]:
    return [p for p in result.per_scene if p["score"] >= threshold]
