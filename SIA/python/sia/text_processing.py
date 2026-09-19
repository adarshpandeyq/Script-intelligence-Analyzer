"""Text processing: file extraction (PDF/TXT), cleaning and screenplay parsing."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List

try:  # PyMuPDF
    import fitz  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    fitz = None

try:  # NLTK (optional, graceful fallback)
    import nltk  # type: ignore
    from nltk.corpus import stopwords  # type: ignore

    try:
        _STOPWORDS = set(stopwords.words("english"))
    except Exception:  # corpus not downloaded yet
        _STOPWORDS = set()
except Exception:  # pragma: no cover
    nltk = None
    _STOPWORDS = set()

FALLBACK_STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "of", "to", "in", "on", "at", "is", "it",
    "he", "she", "they", "we", "you", "i", "his", "her", "their", "him", "them",
    "this", "that", "these", "those", "for", "with", "as", "from", "was", "were",
    "be", "been", "are", "am", "into", "out", "up", "down", "over", "under", "then",
    "there", "here", "what", "when", "where", "who", "how", "why", "all", "any",
    "not", "no", "so", "if", "do", "does", "did", "have", "has", "had", "will",
    "would", "can", "could", "should", "s", "t", "re", "ve", "ll", "d", "m",
}
STOPWORDS = _STOPWORDS or FALLBACK_STOPWORDS

SCENE_HEADING_RE = re.compile(
    r"^\s*(INT|EXT|EST|I/E|INT\.?/EXT\.?|EXT\.?/INT\.?)\b[\.\s:].*", re.IGNORECASE
)
TRANSITION_RE = re.compile(
    r"^\s*(CUT TO|FADE (IN|OUT)|SMASH CUT TO|DISSOLVE TO|MATCH CUT TO|CONTINUOUS|"
    r"INTERCUT WITH|FADE TO BLACK)\b.*$", re.IGNORECASE
)
CHARACTER_CUE_RE = re.compile(
    r"^\s*([A-Z][A-Z0-9 .'\-]{1,34})\s*(\(.*\))?\s*$"
)
PARENTHETICAL_RE = re.compile(r"^\s*\(.*\)\s*$")
PAGE_NUMBER_RE = re.compile(r"^\s*\d{1,4}\s*[\.\)\s]*$")
CUE_SUFFIX_RE = re.compile(
    r"\s*\((?:cont'?d|continued|v\.o\.|o\.s\.|vo|os|subtitle|whispering|"
    r"on the phone|pre-lap|filtered)\)\s*$",
    re.IGNORECASE,
)
MULTISPACE_RE = re.compile(r"[ \t]{2,}")


class ScriptError(Exception):
    """Raised when an uploaded script cannot be processed."""


@dataclass
class ScriptBlock:
    kind: str          # heading | action | character | parenthetical | dialogue | transition
    text: str
    line_no: int


@dataclass
class ParsedScript:
    raw_text: str
    clean_text: str
    blocks: List[ScriptBlock] = field(default_factory=list)

    def blocks_of(self, kind: str) -> List[ScriptBlock]:
        return [b for b in self.blocks if b.kind == kind]


# --------------------------------------------------------------------------- #
# Extraction
# --------------------------------------------------------------------------- #
def extract_text_from_txt(path: str) -> str:
    for encoding in ("utf-8", "utf-8-sig", "latin-1", "cp1252"):
        try:
            with open(path, "r", encoding=encoding) as fh:
                return fh.read()
        except UnicodeDecodeError:
            continue
    raise ScriptError("Could not decode the text file (unsupported encoding).")


def extract_text_from_pdf(path: str) -> str:
    if fitz is None:
        raise ScriptError(
            "PyMuPDF (fitz) is not installed. Run `pip install PyMuPDF` to enable PDF upload."
        )
    try:
        doc = fitz.open(path)
    except Exception as exc:  # pragma: no cover
        raise ScriptError(f"Could not open the PDF file: {exc}") from exc
    pages = []
    try:
        if doc.is_encrypted and not doc.authenticate(""):
            raise ScriptError("This PDF is encrypted and cannot be read.")
        for page in doc:
            pages.append(page.get_text("text"))
    finally:
        doc.close()
    return "\n".join(pages)


def extract_text(file_path: str, filename: str) -> str:
    ext = (filename or file_path).rsplit(".", 1)[-1].lower()
    if ext == "pdf":
        return extract_text_from_pdf(file_path)
    if ext in {"txt", "text", "fountain", "md"}:
        return extract_text_from_txt(file_path)
    raise ScriptError("Unsupported file type. Please upload a .txt or .pdf script.")


# --------------------------------------------------------------------------- #
# Cleaning
# --------------------------------------------------------------------------- #
def clean_text(raw: str) -> str:
    text = raw.replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("\u00a0", " ").replace("\u2019", "'").replace("\u2018", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = text.replace("\u2026", "...").replace("\u2014", "-").replace("\u2013", "-")
    lines = []
    for line in text.split("\n"):
        stripped = line.strip()
        if PAGE_NUMBER_RE.match(stripped):
            continue  # page numbers
        if re.match(r"^\s*(CONTINUED:|CONTINUED|\(\s*CONTINUED\s*\))\s*$", stripped, re.I):
            continue
        lines.append(stripped)
    text = "\n".join(lines)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def parse_screenplay(text: str) -> ParsedScript:
    """Turn cleaned text into labelled blocks (screenplay structure)."""
    blocks: List[ScriptBlock] = []
    lines = text.split("\n")
    in_dialogue = False
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        if not stripped:
            in_dialogue = False
            i += 1
            continue
        if SCENE_HEADING_RE.match(stripped):
            blocks.append(ScriptBlock("heading", stripped.upper(), i))
            in_dialogue = False
        elif TRANSITION_RE.match(stripped):
            blocks.append(ScriptBlock("transition", stripped, i))
            in_dialogue = False
        elif PARENTHETICAL_RE.match(stripped):
            blocks.append(ScriptBlock("parenthetical", stripped, i))
        elif in_dialogue:
            blocks.append(ScriptBlock("dialogue", stripped, i))
        else:
            letters = [c for c in stripped if c.isalpha()]
            upper_ratio = (
                sum(1 for c in letters if c.isupper()) / len(letters) if letters else 0
            )
            looks_like_cue = (
                bool(CHARACTER_CUE_RE.match(stripped))
                and len(stripped) <= 38
                and len(stripped.split()) <= 5
                and upper_ratio > 0.8
                and not stripped.endswith(".")
            )
            nxt = lines[i + 1].strip() if i + 1 < len(lines) else ""
            if looks_like_cue and nxt and not SCENE_HEADING_RE.match(nxt):
                blocks.append(ScriptBlock("character", stripped, i))
                in_dialogue = True
            else:
                blocks.append(ScriptBlock("action", stripped, i))
        i += 1
    return ParsedScript(raw_text=text, clean_text=text, blocks=blocks)


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def tokenize(text: str) -> List[str]:
    return re.findall(r"[a-zA-Z']+", text.lower())


def content_tokens(text: str) -> List[str]:
    return [t for t in tokenize(text) if t not in STOPWORDS and len(t) > 2]


def sentences(text: str) -> List[str]:
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return [p.strip() for p in parts if len(p.strip()) > 1]


def basic_stats(text: str) -> dict:
    words = tokenize(text)
    sentences_list = sentences(text)
    unique_words = {w for w in words}
    return {
        "word_count": len(words),
        "unique_word_count": len(unique_words),
        "sentence_count": len(sentences_list),
        "char_count": len(text),
        "estimated_runtime_minutes": round(len(words) / 130.0, 1),
        "lexical_diversity": round(
            (len(unique_words) / len(words)) if words else 0.0, 3
        ),
    }
