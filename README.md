# Script-intelligence-Analyzer
🎬 Script Intelligence Analyzer
> **Upload a movie or short-film script (PDF / TXT) and get an AI-powered intelligence report: characters, scenes, emotions, themes, a suspense curve, possible foreshadowing — plus a Script Doctor that finds story problems and generates ranked fixes.**
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-App%20Router-black?logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Drizzle%20ORM-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![NLP](https://img.shields.io/badge/NLP-spaCy%20%7C%20Transformers%20%7C%20scikit--learn-8B5CF6)](https://spacy.io/)
---

---
## 🧠 Overview
Screenplays are **unstructured**. Manual script coverage is slow and subjective, and there is no quick way to measure how tension evolves, which themes dominate, or whether early scenes actually set up later payoffs.
**Script Intelligence Analyzer** parses a screenplay into its structural parts (scene headings, action, character cues, parentheticals, dialogue), runs seven independent NLP modules over that structure, and presents everything in a cinematic dark-mode dashboard — then goes one step further and acts as a **Script Doctor**, detecting story problems and proposing ranked, minimally-invasive fixes.
```
Upload (.pdf/.txt) → Text extraction → Cleaning → Screenplay parsing → 7 NLP modules → Interactive report → Script Doctor (detect → rank → fix)
```
---
## ✨ Key features
### Analysis engine
| Feature | What you get |
| --- | --- |
| 📄 **Script upload** | PDF (PyMuPDF) & TXT support, automatic cleaning, page-number removal, invalid-file handling, staged progress indicator |
| 📊 **Script statistics** | Word count, unique words, sentences, scenes, characters, dialogue lines, **dialogue share %**, estimated runtime, lexical diversity |
| 👤 **Character detection** | Speaking characters, dialogue lines, words spoken, scene coverage, prominence score, protagonist detection, **character × scene presence matrix** |
| 🎬 **Scene analysis** | Auto-segmentation with location, time of day, cast, keywords, importance score, AI-generated summary — plus live search / filter / sort |
| ❤️ **Emotion analysis** | Fear, happiness, sadness, anger, surprise, neutral — per scene and overall, with emotional **intensity (0–100)** and interactive stacked / area charts |
| 🏷️ **Theme detection** | Top themes with **relevance scores**, supporting keywords and a "theme strength across the story" line chart |
| 🎢 **Suspense / tension meter** | Scene-by-scene tension curve, peak highlighting, trend (rising / falling / steady), full per-scene table — ideal for horror & thriller scripts |
| 🔗 **Foreshadowing detection** | Earlier ↔ later scene similarity (TF-IDF cosine, upgradeable to Sentence-Transformer embeddings) with shared terms, confidence and explanation — always labelled **POSSIBLE** |
| 📝 **Final intelligence report** | Markdown brief with statistics, cast, key scenes, emotions, themes, suspense arc and foreshadowing — downloadable as Markdown, JSON or copy-to-clipboard |
### Script Doctor (problem → fix → modify)
Detects **plot holes, timeline inconsistencies, character inconsistencies, object continuity errors, unresolved events, repetitive dialogue, weak dialogue, abrupt transitions, pacing problems and missing setups** — then offers **2–3 scored solutions** per problem and rewrites **only the affected beat** when you apply one. See [The Script Doctor](#-the-script-doctor).
### Interface
- Dark cinematic background with purple/blue accents, glassmorphism cards, smooth animations, clean typography
- Fully responsive; main navigation: **Home | Analyze Script | Results | Script Doctor | About Project**
- Persistent storage (PostgreSQL + Drizzle ORM) so every report can be revisited
---
## 📊 PROJECT PPT — what's inside
The project ships with a **10-slide, AI-themed PowerPoint deck** matching the website's visual style (dark `#07061A` background, violet `#8B5CF6` / sky `#38BDF8` accents, glass-style panels).
**File:** `public/downloads/Script_Intelligence_Analyzer.pptx` (16:9, ~44 KB)
### Ways to get it
| Method | How |
| --- | --- |
| **In-app button** | Click **📊 PROJECT PPT** in the nav / home / About page → opens the in-app slide viewer at **`/ppt`** |
| **In-app viewer** | `/ppt` — animated slideshow (slide transitions, staggered entrances, progress bar, **Present** autoplay mode) |
| **Download endpoint** | `GET /api/ppt` → streams the file with `application/vnd.openxmlformats-officedocument.presentationml.presentation` |
| **Direct file** | `/downloads/Script_Intelligence_Analyzer.pptx` |
| **Regenerate (Python)** | `cd python && python generate_ppt.py` |
| **Regenerate (runtime)** | `GET /api/ppt` auto-generates the deck with `pptxgenjs` if the file is ever missing |
### Slide-by-slide contents
| # | Slide | Contents |
| --- | --- | --- |
| 1 | **Title — Script Intelligence Analyzer** | Tagline "AI · NLP · Cinematic Analytics", one-line value proposition, and the full technology row (Python · Flask · spaCy · NLTK · Transformers · Sentence-Transformers · scikit-learn · PyMuPDF · NetworkX · Plotly) |
| 2 | **Problem Statement** | Screenplays are unstructured · manual coverage is slow and subjective · no way to quantify tension over time · emotion/theme/prominence are guessed, not measured · writers need fast objective feedback |
| 3 | **Project Objectives** | 6 cards: automate parsing · detect characters · segment scenes · quantify emotion · track suspense · find foreshadowing |
| 4 | **Proposed Solution** | Modular Python NLP pipeline · rule-based screenplay parser · pretrained models instead of training from scratch · lexicon + model hybrid scoring · interactive web UI · persistent results |
| 5 | **System Architecture** | End-to-end flow boxes **Upload → Text Extraction → Cleaning & Normalisation → NLP Modules → Intelligence Report**, plus Storage / NLP Modules / Presentation panels |
| 6 | **NLP Technologies Used** | 8 cards: spaCy · NLTK · Transformers · Sentence-Transformers · scikit-learn · PyMuPDF · NetworkX · Plotly + Flask |
| 7 | **Main Features** | Script statistics · character intelligence · scene analysis · emotion analysis · theme detection · suspense meter · possible foreshadowing · one-click final report & exports |
| 8 | **Analysis Workflow** | 6 numbered steps: Upload → Extract → Parse → Analyse → Visualise → Report |
| 9 | **Expected Results** | What the demo produces: cast + scene segmentation in seconds, correctly ranked protagonist, rising suspense curve with >70 peaks, fear-dominated emotion profile, foreshadowing links between cold open and finale |
| 10 | **Future Scope** | Beat / act structure detection · character relationship graphs · fine-tuned screenplay models · dialogue scoring & loglines · shot breakdown · draft comparison mode |
### Presentation extras
- Each slide carries **animated transitions** injected directly into the OOXML (title: slow fade; then wipe →, push ←, cover ←, split, randomBars, circle, blinds, wheel, dissolve), with a 7-second advance timing on slides 2–10 for kiosk playback.
- The same content powers the **in-app `/ppt` viewer**, so the deck is viewable even in browsers that block downloads inside preview frames.
---
## 🚀 Live demo walkthrough
1. Open **Home** → click **Analyze a Script**.
2. Drag in a `.txt` / `.pdf` screenplay — or click **Load sample horror script**.
3. Watch the staged progress indicator (upload → extract → parse → characters → scenes → emotion/themes → suspense/foreshadowing → report).
4. Land on the **Results dashboard**: statistics, protagonist, scene explorer, emotion charts, themes, suspense curve, possible foreshadowing, final report.
5. Click **Script Doctor** to get detected problems, evidence quotes, 2–3 scored fix options, and the ORIGINAL vs AI MODIFIED diff.
6. Grab the deck from **📊 PROJECT PPT**.
---
## 🛠 Tech stack
**Web application (this deployment)**
- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS 4 (custom cinematic theme, glassmorphism, animations)
- Recharts (interactive charts), Lucide (icons)
- PostgreSQL + Drizzle ORM (analysis records, applied fixes)
- `unpdf` (PDF text extraction), `pptxgenjs` + JSZip (PPT generation & transitions)
**Python / NLP package**
- Python 3.10+, Flask, PyMuPDF
- spaCy, NLTK, Transformers, Sentence-Transformers (optional upgrades), scikit-learn
- Pandas, NumPy, NetworkX, Plotly, python-pptx
---
## 📁 Project structure
```
.
├── README.md                     ← you are here
├── public/
│   ├── downloads/Script_Intelligence_Analyzer.pptx
│   └── samples/sample_horror_script.txt
├── src/
│   ├── app/
│   │   ├── page.tsx              # Home
│   │   ├── analyze/              # Upload + progress
│   │   ├── results/              # Saved analyses + full dashboard
│   │   ├── doctor/               # Script Doctor (issues + fixes)
│   │   ├── ppt/                  # In-app slide viewer
│   │   ├── about/                # About the project
│   │   └── api/
│   │       ├── analyze/          # POST script → full analysis
│   │       ├── analyses/[id]/    # GET stored analysis
│   │       ├── apply-fix/        # POST apply / try-another fix, GET applied fixes
│   │       ├── ppt/              # GET project presentation
│   │       └── health/
│   ├── components/               # Nav, charts, IssueWorkbench, SlideDeck, SceneExplorer…
│   ├── db/                       # Drizzle schema (analyses, applied_fixes)
│   └── lib/nlp/                  # the NLP engine
│       ├── textProcessing.ts     # PDF/TXT extraction, cleaning, screenplay parser
│       ├── characters.ts         # character detection & prominence
│       ├── scenes.ts             # scene segmentation & summaries
│       ├── emotion.ts            # emotion scoring + intensity
│       ├── themes.ts             # theme detection
│       ├── suspense.ts           # tension curve & peaks
│       ├── foreshadowing.ts      # setup → payoff similarity
│       ├── issues.ts             # Script Doctor: problem detection
│       ├── fixes.ts              # Script Doctor: option generation & scoring
│       ├── modify.ts             # Script Doctor: modification engine
│       ├── report.ts             # final intelligence report
│       ├── pipeline.ts           # orchestrator
│       └── lexicons/             # emotion / theme / suspense lexicons
└── python/
    ├── README.md
    ├── requirements.txt
    ├── app.py                    # Flask app + JSON API (SQLite)
    ├── generate_ppt.py           # builds the 10-slide deck
    ├── templates/index.html      # Flask UI (Plotly)
    ├── data/sample_horror_script.txt
    └── sia/                      # modular Python package (same pipeline)
        ├── text_processing.py · character_detection.py · scene_analysis.py
        ├── emotion_analysis.py · theme_detection.py · suspense_analysis.py
        ├── foreshadowing.py · report_generation.py · pipeline.py
```
---
## ⚙️ Getting started (web app)
```bash
# 1. Install dependencies
npm install
# 2. Configure the database (.env)
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
# 3. Create the tables
npx drizzle-kit push
# 4. Run
npm run dev          # http://localhost:3000
npm run build && npm run start   # production
```
---
## 🐍 Getting started (Python / Flask build)
```bash
cd python
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# optional model downloads
python -m spacy download en_core_web_sm
python -c "import nltk; nltk.download('stopwords'); nltk.download('punkt')"
python app.py                 # http://127.0.0.1:5000
python generate_ppt.py        # rebuild ../public/downloads/Script_Intelligence_Analyzer.pptx
```
Usage as a library:
```python
from sia import analyze_script
text = open("data/sample_horror_script.txt").read()
result = analyze_script(text, "The Third Night")
result["protagonist"]                 # 'Mara'
result["statistics"]                  # words, scenes, characters, dialogue share, runtime
result["emotion"]["overall"]          # {'fear': 58.1, 'sadness': 23.3, ...}
result["themes"][0]                   # {'theme': 'Fear', 'relevance': 100.0, ...}
result["suspense"]["peaks"]           # highest-tension scenes
result["foreshadowing"]               # POSSIBLE setup → payoff pairs
print(result["report"]["markdown"])
```
> The heavy libraries (Transformers, Sentence-Transformers) are **optional upgrades** — the modules fall back to lexicon + TF-IDF scoring so the project runs on CPU-only machines.
---
## 🔌 REST API
| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/analyze` | multipart `file` **or** `{ text, title }` → full analysis (saved to DB) |
| `GET` | `/api/analyze` | latest 25 analyses (summary) |
| `GET` | `/api/analyses/[id]` | full stored analysis payload |
| `POST` | `/api/apply-fix` | `{ analysisId, issueId, optionId, apply }` → ORIGINAL / AI MODIFIED (`tryAnother: true` cycles options) |
| `GET` | `/api/apply-fix?analysisId=N` | applied fixes for an analysis |
| `GET` | `/api/ppt` | download the project presentation (auto-generates if missing) |
| `GET` | `/api/health` | health check |
The Flask build exposes the same surface at `/api/analyze`, `/api/analyses`, `/api/analyses/<id>`, `/api/analyses/<id>/report.md` and `/health`.
---
## 🔬 How the NLP pipeline works
1. **Extraction & cleaning** — PyMuPDF / `unpdf` pulls the text layer; page numbers, `CONTINUED` markers and unicode artefacts are removed.
2. **Screenplay parsing** — a state-machine parser labels every line as `heading`, `action`, `character`, `parenthetical`, `dialogue` or `transition` using industry formatting conventions (uppercase cues ≤ 5 words, `INT./EXT.` headings, parentheticals, transitions).
3. **Character detection** — cues are normalised (`MARA (CONT'D)` → `Mara`), dialogue volume, line count and scene coverage combine into a prominence score.
4. **Scene analysis** — scenes are split on headings; location and time of day are parsed from the slugline; summaries are generated extractively (term frequency + action-verb bonus + character bonus − pronoun penalty).
5. **Emotion analysis** — a weighted emotion lexicon with negation handling, intensifiers, ALL-CAPS and punctuation multipliers produces per-scene distributions plus an intensity index.
6. **Theme detection** — weighted keyword models per theme; relevance blends *relative* strength (vs. the dominant theme) with an *absolute* presence score.
7. **Suspense** — combines lexicon density, short-sentence ratio, punctuation pressure, night-setting bonus, scene brevity and the fear/surprise component, then smooths across neighbours and flags peaks.
8. **Foreshadowing** — TF-IDF cosine similarity between earlier and later scenes, boosted by setup/payoff markers, penalised by distance; always labelled **POSSIBLE FORESHADOWING**.
---
## 🩺 The Script Doctor
**Detect** → story problems are found with evidence quotes (see the detection table in `src/lib/nlp/issues.ts`).
**Suggest** → each problem gets 2–3 options, e.g. for an object-continuity error:
```
OPTION A   Mara only pretends to get rid of the key
OPTION B   Show Mara recovering the key before Scene 11
OPTION C   Introduce a spare key earlier in the story
```
Each option is scored on **story consistency, character consistency, context similarity, tone compatibility and amount of change required**, producing a **suitability score**. The highest-scoring option is marked **⭐ RECOMMENDED OPTION** with a generated reason — explicitly labelled as an *AI-generated suitability recommendation, not an objectively best answer*.
**Modify** → clicking **Apply Fix** rewrites only the affected beat:
```
ORIGINAL     Rahul throws the key into the river.
AI MODIFIED  Rahul pretends to throw the key into the river, but secretly keeps it in his pocket.
```
Buttons: **[Apply Fix]** (persisted to the `applied_fixes` table) · **[Try Another]** (next option, nothing saved) · **[Keep Original]** (discard). Characters, story context, tone and surrounding events are preserved — only the highlighted beat changes.
---
## 🎃 Sample script & expected output
Test with `public/samples/sample_horror_script.txt` (**"The Third Night"** — a 10-scene horror short with deliberate foreshadowing).
Typical result:
| Metric | Value |
| --- | --- |
| Words | 1,435 · unique 503 · diversity 0.351 |
| Scenes / characters / dialogue lines | 10 / 5 / 44 |
| Protagonist | **Mara** (prominence 100) |
| Emotion | fear 58.1% · sadness 23.3% · neutral 10.2% · intensity 32.2 |
| Top themes | Fear (100) · Madness (62.3) · Death & Mortality (55.9) · Isolation (35.1) |
| Suspense | avg ~63/100, **rising** arc, peak **96/100 at Scene 9 (Cellar Stairs)** |
| Foreshadowing | Scene 1 → 4, 4 → 7, 7 → 9, 9 → 10 (all labelled POSSIBLE) |
| Script Doctor | e.g. "The phone appears for the first time in Scene 7 — very late in the story" with 3 scored fixes |
---
## ⚠️ Limitations & disclaimer
- Emotion, theme, suspense and foreshadowing outputs are **probabilistic NLP estimates**, not ground truth.
- Foreshadowing links are **POSSIBLE**, never certain — they are similarity signals for a human reader to verify.
- The Script Doctor's recommendations are **suitability scores**, not objectively correct answers; always review before rewriting.
- Detection quality depends on screenplay formatting: heavily non-standard scripts parse less accurately.

---
**Built as an AI / NLP project demonstration.** Upload a script, read the story's numbers, then let the Script Doctor tell you what to fix. 🎬

## For more detail Visit - 
https://script-intelligence-five.vercel.app/

## Check PPT at the above URl For the Clear Explanation oF the Project     

Thank You



