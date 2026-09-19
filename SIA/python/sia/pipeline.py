"""End-to-end analysis pipeline: raw text -> full intelligence payload."""
from __future__ import annotations

from typing import Dict

from .character_detection import detect_characters
from .emotion_analysis import analyse_emotions_by_scene, analyse_emotion
from .foreshadowing import find_foreshadowing
from .report_generation import build_report
from .scene_analysis import build_scenes, scene_importance
from .suspense_analysis import analyse_suspense
from .text_processing import basic_stats, clean_text, parse_screenplay
from .theme_detection import detect_themes, theme_scene_map

MIN_WORDS = 40


def analyze_script(raw_text: str, title: str = "Untitled Script") -> Dict:
    """Run every module and return a JSON-serialisable intelligence payload."""
    cleaned = clean_text(raw_text)
    if len(cleaned.split()) < MIN_WORDS:
        raise ValueError(
            "The uploaded script is too short to analyse (minimum ~40 words of text)."
        )

    parsed = parse_screenplay(cleaned)
    stats = basic_stats(cleaned)

    scenes = build_scenes(parsed)
    scene_characters = {s.number: s.characters for s in scenes}
    characters = detect_characters(parsed, scene_characters)

    rank = {c.name: c.prominence / 100.0 for c in characters}
    importance = scene_importance(scenes, rank)

    emotions = analyse_emotions_by_scene(scenes)
    overall_emotion = analyse_emotion(cleaned)
    themes = detect_themes(cleaned, scenes)
    suspense = analyse_suspense(scenes)
    foreshadowing = find_foreshadowing(scenes)
    report = build_report(stats, title, characters, scenes, emotions, themes, suspense, foreshadowing)

    return {
        "title": title,
        "statistics": {
            **stats,
            "scene_count": len(scenes),
            "character_count": len(characters),
            "dialogue_lines": sum(s.dialogue_lines for s in scenes),
        },
        "characters": [c.to_dict() for c in characters],
        "protagonist": characters[0].name if characters else None,
        "scenes": [
            {**s.to_dict(), "importance": importance[idx]}
            for idx, s in enumerate(scenes)
        ],
        "emotion": {
            "overall": overall_emotion.distribution,
            "intensity": overall_emotion.intensity,
            "dominant": overall_emotion.dominant,
            "per_scene": emotions.per_scene,
        },
        "themes": [t.to_dict() for t in themes],
        "theme_scene_map": theme_scene_map(themes, scenes),
        "suspense": suspense.to_dict(),
        "foreshadowing": [f.to_dict() for f in foreshadowing],
        "report": report,
        "disclaimer": (
            "Emotion, theme, suspense and foreshadowing results are probabilistic NLP "
            "estimates produced by pretrained models and lexicons. Foreshadowing links are "
            "labelled POSSIBLE and should be verified by a human reader."
        ),
    }
