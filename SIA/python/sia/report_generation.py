"""Final intelligence report generation (structured data + readable markdown)."""
from __future__ import annotations

from typing import Dict, List

from .emotion_analysis import EmotionResult
from .suspense_analysis import SuspenseResult
from .theme_detection import Theme


def build_report(stats: dict, title: str, characters, scenes, emotions: EmotionResult,
                 themes: List[Theme], suspense: SuspenseResult, foreshadowing) -> Dict:
    main = characters[0] if characters else None
    supporting = characters[1:6]

    dominant_emotions = sorted(emotions.distribution.items(), key=lambda kv: -kv[1])[:3]
    important_scenes = sorted(
        scenes,
        key=lambda s: -(s.word_count + 40 * len(s.characters)),
    )[:3]

    sections: Dict[str, object] = {
        "title": title,
        "statistics": {
            **stats,
            "scene_count": len(scenes),
            "character_count": len(characters),
            "dialogue_lines": sum(s.dialogue_lines for s in scenes),
        },
        "main_characters": [c.to_dict() for c in characters[:5]],
        "protagonist": main.to_dict() if main else None,
        "supporting_cast": [c.to_dict() for c in supporting],
        "important_scenes": [
            {
                "number": s.number,
                "heading": s.heading,
                "location": s.location,
                "characters": s.characters,
                "summary": s.summary,
            }
            for s in important_scenes
        ],
        "main_emotions": [
            {"emotion": e, "share": round(v, 1)} for e, v in dominant_emotions
        ],
        "emotion_intensity": emotions.intensity,
        "major_themes": [t.to_dict() for t in themes],
        "suspense": {
            "average": suspense.average,
            "maximum": suspense.maximum,
            "trend": suspense.trend,
            "peaks": [
                {"scene": p["scene"], "location": p["location"], "score": p["score"]}
                for p in suspense.peaks
            ],
            "narrative": suspense.narrative,
        },
        "possible_foreshadowing": [f.to_dict() for f in foreshadowing],
        "story_summary": _story_summary(title, scenes, characters, emotions, themes, suspense),
    }
    sections["markdown"] = to_markdown(sections)
    return sections


def _story_summary(title, scenes, characters, emotions, themes, suspense) -> str:
    if not scenes:
        return "No analysable content was found in the uploaded script."
    cast = ", ".join(c.name for c in characters[:3]) if characters else "an unseen cast"
    top_theme = themes[0].name if themes else "an unclear subject"
    dom = max(emotions.distribution, key=lambda k: emotions.distribution[k])
    first = scenes[0].location
    last = scenes[-1].location
    return (
        f"\"{title}\" is a {len(scenes)}-scene screenplay driven primarily by {cast}. "
        f"It opens in {first} and closes in {last}, with tension that reads as "
        f"{suspense.trend} (peaking at {suspense.maximum}/100). "
        f"The dominant emotional register is {dom}, and the strongest thematic current is "
        f"{top_theme.lower()}. Overall the script reads as a "
        f"{_tone_label(emotions, suspense)} piece with an emotional intensity of "
        f"{emotions.intensity}/100."
    )


def _tone_label(emotions: EmotionResult, suspense: SuspenseResult) -> str:
    fear = emotions.distribution.get("fear", 0)
    sad = emotions.distribution.get("sadness", 0)
    happy = emotions.distribution.get("happiness", 0)
    if suspense.average >= 60 and fear >= 25:
        return "horror/thriller"
    if sad >= 30:
        return "dramatic"
    if happy >= 30:
        return "uplifting"
    return "character-driven"


def to_markdown(report: Dict) -> str:
    stats = report["statistics"]
    lines = [
        f"# Script Intelligence Report — {report['title']}",
        "",
        "## 1. Script statistics",
        f"- Words: {stats['word_count']} | Unique words: {stats['unique_word_count']}",
        f"- Scenes: {stats['scene_count']} | Characters: {stats['character_count']}",
        f"- Dialogue lines: {stats['dialogue_lines']}",
        f"- Estimated runtime: {stats['estimated_runtime_minutes']} minutes",
        f"- Lexical diversity: {stats['lexical_diversity']}",
        "",
        "## 2. Main characters",
    ]
    for c in report["main_characters"]:
        lines.append(
            f"- **{c['name']}** — {c['dialogue_lines']} dialogue lines, "
            f"{c['words_spoken']} words, {c['scene_count']} scenes "
            f"(prominence {c['prominence']}/100)"
        )
    lines += ["", "## 3. Important scenes"]
    for s in report["important_scenes"]:
        lines.append(f"- **Scene {s['number']} — {s['location']}**: {s['summary']}")
    lines += ["", "## 4. Main emotions"]
    for e in report["main_emotions"]:
        lines.append(f"- {e['emotion'].title()}: {e['share']}%")
    lines.append(f"- Overall emotional intensity: {report['emotion_intensity']}/100")
    lines += ["", "## 5. Major themes"]
    for t in report["major_themes"]:
        lines.append(f"- **{t['theme']}** — relevance {t['relevance']}/100 ({', '.join(t['keywords'][:4])})")
    lines += ["", "## 6. Suspense progression"]
    lines.append(f"- {report['suspense']['narrative']}")
    lines += ["", "## 7. Possible foreshadowing"]
    if report["possible_foreshadowing"]:
        for f in report["possible_foreshadowing"]:
            lines.append(
                f"- **Possible foreshadowing**: Scene {f['setup_scene']} → Scene "
                f"{f['payoff_scene']} (similarity {f['similarity']}, {f['confidence']} confidence). "
                f"{f['explanation']}"
            )
    else:
        lines.append("- No strong setup/payoff pairs detected.")
    lines += ["", "## 8. Overall story summary", report["story_summary"]]
    return "\n".join(lines)
