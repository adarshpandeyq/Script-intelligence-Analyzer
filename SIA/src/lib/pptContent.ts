export type SlideDef =
  | {
      type: "title";
      kicker: string;
      title: string;
      subtitle: string;
      stack: string;
    }
  | {
      type: "bullets";
      kicker: string;
      title: string;
      items: string[];
      size?: number;
    }
  | {
      type: "cards";
      kicker: string;
      title: string;
      cols: 2 | 3;
      cards: { heading: string; body: string }[];
    }
  | {
      type: "flow";
      kicker: string;
      title: string;
      steps: string[];
      bottom: { heading: string; body: string }[];
    };

export const DECK_TITLE = "Script Intelligence Analyzer";

export const SLIDES: SlideDef[] = [
  {
    type: "title",
    kicker: "AI · NLP · Cinematic Analytics",
    title: "Script Intelligence Analyzer",
    subtitle:
      "Upload a movie or short-film script. Get characters, scenes, emotions, themes, suspense curves and foreshadowing — automatically.",
    stack:
      "Python · Flask · spaCy · NLTK · Transformers · Sentence-Transformers · scikit-learn · PyMuPDF · NetworkX · Plotly",
  },
  {
    type: "bullets",
    kicker: "01 — Why this project",
    title: "Problem Statement",
    items: [
      "Screenplays are unstructured: scene headings, character cues, parentheticals and dialogue are hard to parse at scale.",
      "Manual script coverage is slow and subjective — studios and students spend hours on one draft.",
      "There is no quick way to quantify tension over time or to see whether early scenes set up later payoffs.",
      "Emotion, theme and character prominence are inferred by reading, not measured.",
      "Writers need fast, objective feedback on pacing, suspense peaks and theme consistency.",
    ],
  },
  {
    type: "cards",
    kicker: "02 — Goals",
    title: "Project Objectives",
    cols: 3,
    cards: [
      { heading: "Automate parsing", body: "Robust extraction from PDF & TXT with industry screenplay formatting rules." },
      { heading: "Detect characters", body: "Identify cast, dialogue volume and the protagonist automatically." },
      { heading: "Segment scenes", body: "Split into scenes with location, time, cast and key action." },
      { heading: "Quantify emotion", body: "Score fear, joy, sadness, anger, surprise and neutral per scene." },
      { heading: "Track suspense", body: "Build a scene-by-scene tension curve and flag high-tension peaks." },
      { heading: "Find foreshadowing", body: "Link early setups to later payoffs via semantic similarity." },
    ],
  },
  {
    type: "bullets",
    kicker: "03 — Approach",
    title: "Proposed Solution",
    items: [
      "A modular Python NLP pipeline: upload → extract → clean → analyse → report.",
      "Rule-based screenplay parser (headings, cues, transitions, parentheticals) tuned for real scripts.",
      "Pretrained models instead of training from scratch: transformer embeddings for semantic similarity, zero-shot classification for themes/emotions.",
      "Lexicon + model hybrid scoring keeps results fast, explainable and offline-friendly.",
      "Interactive web UI with glassmorphism cards, charting and a cinematic dark theme.",
      "Every result is stored so analyses can be revisited and compared.",
    ],
  },
  {
    type: "flow",
    kicker: "04 — Pipeline",
    title: "System Architecture",
    steps: ["Upload\nPDF / TXT", "Text\nExtraction", "Cleaning &\nNormalisation", "NLP\nModules", "Intelligence\nReport"],
    bottom: [
      { heading: "NLP Modules", body: "Characters · Scenes · Emotion · Themes · Suspense · Foreshadowing" },
      { heading: "Storage", body: "Analysis records + JSON payloads (PostgreSQL / SQLite)" },
      { heading: "Presentation", body: "Web UI with interactive charts and a JSON API" },
    ],
  },
  {
    type: "cards",
    kicker: "05 — Stack",
    title: "NLP Technologies Used",
    cols: 2,
    cards: [
      { heading: "spaCy", body: "Tokenisation, POS tagging, named entities, sentence segmentation." },
      { heading: "NLTK", body: "Stop-words, tokenisation and lexicon utilities." },
      { heading: "Transformers", body: "Zero-shot classification for emotion & theme labelling." },
      { heading: "Sentence-Transformers", body: "Dense embeddings for scene similarity / foreshadowing." },
      { heading: "scikit-learn", body: "TF-IDF vectors, cosine similarity, clustering." },
      { heading: "PyMuPDF", body: "Fast and reliable PDF text extraction." },
      { heading: "NetworkX", body: "Character co-occurrence / interaction graphs." },
      { heading: "Plotly + Flask", body: "Interactive charts and the web application layer." },
    ],
  },
  {
    type: "bullets",
    kicker: "06 — What it delivers",
    title: "Main Features",
    size: 14.5,
    items: [
      "Script statistics: words, dialogue lines, scenes, characters, estimated runtime.",
      "Character intelligence: dialogue counts, presence map, protagonist detection.",
      "Scene analysis: location, time of day, cast and an AI-generated mini summary.",
      "Emotion analysis with intensity per scene and interactive charts.",
      "Theme detection with relevance scores and supporting keywords.",
      "Suspense & tension meter with peak-scene highlighting for horror/thriller scripts.",
      "Possible foreshadowing pairs with explanations and confidence levels.",
      "One-click final intelligence report plus downloadable markdown / JSON export.",
    ],
  },
  {
    type: "cards",
    kicker: "07 — Step by step",
    title: "Analysis Workflow",
    cols: 2,
    cards: [
      { heading: "Step 1 · Upload", body: "User submits a .txt or .pdf screenplay (with validation & progress)." },
      { heading: "Step 2 · Extract", body: "PDF / text reader pulls raw text; cleaning removes page numbers and artefacts." },
      { heading: "Step 3 · Parse", body: "Screenplay parser separates headings, action, character cues, parentheticals and dialogue." },
      { heading: "Step 4 · Analyse", body: "Six independent NLP modules run over the parsed structure." },
      { heading: "Step 5 · Visualise", body: "Charts render the emotion mix, suspense curve and character presence." },
      { heading: "Step 6 · Report", body: "The report generator merges everything into a concise intelligence brief." },
    ],
  },
  {
    type: "bullets",
    kicker: "08 — Demo outcome",
    title: "Expected Results",
    size: 15,
    items: [
      "Upload a 10-scene horror short → the pipeline returns the full cast and all segmented scenes in seconds.",
      "The protagonist is correctly ranked by dialogue volume, presence and scene coverage.",
      "Suspense curve rises toward the climax; peak scenes are flagged with a tension score above 70.",
      "Emotion profile of a horror script is dominated by fear, surprise and neutral exposition.",
      "Foreshadowing module links the cold-open setup to the final revelation (labelled POSSIBLE).",
      "Final report summarises stats, cast, emotions, themes, tension arc and possible foreshadowing.",
    ],
  },
  {
    type: "bullets",
    kicker: "09 — Roadmap",
    title: "Future Scope",
    size: 15,
    items: [
      "Beat / act structure detection (Save the Cat, three-act) with pacing suggestions.",
      "Character relationship graphs with sentiment-weighted interactions (NetworkX).",
      "Fine-tuned transformer models for screenplay-specific emotion & theme labels.",
      "Dialogue quality scoring, rewrite suggestions and automatic loglines.",
      "Scene-to-shot breakdown with estimated screen time and budget hints.",
      "Comparison mode: track how tension and themes change between draft versions.",
    ],
  },
];
