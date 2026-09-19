# Script Intelligence Analyzer — Python / Flask build

A modular AI/NLP project that reads a movie or short-film script (`.txt` / `.pdf`) and returns
character intelligence, scene breakdowns, emotion analysis, theme detection, a suspense meter and
possible foreshadowing, combining everything into a final report.

## Project structure

```
python/
├── app.py                     # Flask web app + JSON API (SQLite storage)
├── generate_ppt.py            # Builds the 10-slide project presentation (python-pptx)
├── requirements.txt
├── data/
│   └── sample_horror_script.txt   # Sample script for testing
├── templates/
│   └── index.html             # Minimal Flask UI (Plotly charts)
└── sia/                       # The NLP package
    ├── __init__.py
    ├── text_processing.py     # PDF/TXT extraction, cleaning, screenplay parsing
    ├── character_detection.py # Character cues, dialogue counts, prominence ranking
    ├── scene_analysis.py      # Scene segmentation, locations, extractive summaries
    ├── emotion_analysis.py    # fear / happiness / sadness / anger / surprise / neutral
    ├── theme_detection.py     # Weighted theme scoring with relevance + evidence
    ├── suspense_analysis.py   # Scene-by-scene tension curve and peak detection
    ├── foreshadowing.py       # TF-IDF / embedding similarity: setup → payoff links
    ├── report_generation.py   # Final intelligence report (structured + markdown)
    └── pipeline.py            # Orchestrates every module
```

## Setup

```bash
cd python
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# optional but recommended model downloads
python -m spacy download en_core_web_sm
python -c "import nltk; nltk.download('stopwords'); nltk.download('punkt')"

python app.py       # http://127.0.0.1:5000
```

## Usage

```python
from sia import analyze_script

text = open("data/sample_horror_script.txt").read()
result = analyze_script(text, "The Third Night")

result["protagonist"]        # 'Mara'
result["statistics"]         # words, scenes, characters, runtime
result["emotion"]["overall"] # {'fear': 58.1, 'sadness': 23.2, ...}
result["themes"][0]          # {'theme': 'Fear', 'relevance': 100.0, ...}
result["suspense"]["peaks"]  # highest-tension scenes
result["foreshadowing"]      # POSSIBLE setup → payoff pairs
print(result["report"]["markdown"])
```

### HTTP API

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET`  | `/` | Flask UI |
| `POST` | `/api/analyze` | multipart `file` **or** `text` + `title` → full analysis |
| `GET`  | `/api/analyses` | list stored analyses |
| `GET`  | `/api/analyses/<id>` | full analysis payload |
| `GET`  | `/api/analyses/<id>/report.md` | markdown report download |
| `GET`  | `/health` | health check |

### Rebuild the project PPT

```bash
python generate_ppt.py   # → ../public/downloads/Script_Intelligence_Analyzer.pptx
```

## Notes

* Transformers and Sentence-Transformers are **optional upgrades**: the modules fall back to
  lexicon + TF-IDF scoring when they are not installed, so the project runs on CPU-only machines.
* Foreshadowing output is always labelled **POSSIBLE FORESHADOWING** — it is a similarity signal
  for a human reader, not a statement about authorial intent.
