"""Script Intelligence Analyzer - modular NLP package.

Modules
-------
text_processing      : PDF/TXT extraction, cleaning, screenplay parsing
character_detection  : speaking-character detection and prominence ranking
scene_analysis       : scene segmentation, locations, extractive summaries
emotion_analysis     : fear / happiness / sadness / anger / surprise / neutral
theme_detection      : weighted theme scoring with supporting keywords
suspense_analysis    : scene-by-scene tension curve and peak detection
foreshadowing        : semantic setup -> payoff linking (TF-IDF / embeddings)
report_generation    : final intelligence report (structured + markdown)
pipeline             : orchestrates all of the above
"""
from .pipeline import analyze_script  # noqa: F401

__version__ = "1.0.0"
__all__ = ["analyze_script"]
