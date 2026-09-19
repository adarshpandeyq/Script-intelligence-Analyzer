"""Foreshadowing detection: semantic similarity between earlier and later scenes.

The module compares each scene against later scenes using TF-IDF cosine similarity
(Sentence-Transformers embeddings are used automatically when available, giving
true semantic - not just lexical - matching).

Results are ALWAYS returned as *possible* foreshadowing: this is a decision-support
signal for a human reader, never a definitive statement about authorial intent.
"""
from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from typing import Dict, List, Sequence

from .text_processing import content_tokens, STOPWORDS

try:  # scikit-learn (preferred)
    from sklearn.feature_extraction.text import TfidfVectorizer  # type: ignore
    from sklearn.metrics.pairwise import cosine_similarity  # type: ignore
except Exception:  # pragma: no cover
    TfidfVectorizer = None
    cosine_similarity = None

SETUP_MARKERS = [
    "dream", "nightmare", "warning", "warned", "promise", "remember", "later",
    "one day", "before it happens", "if anything happens", "third night", "never",
    "always", "again", "curse", "legend", "story", "told you", "locked", "secret",
    "strange", "odd", "wrong", "music box", "scratch", "scratches", "voice",
]
PAYOFF_MARKERS = [
    "reveals", "reveal", "realize", "realizes", "truth", "was him", "was her",
    "all along", "now", "finally", "understand", "remember", "it was", "dead",
    "alive", "found", "discovered", "twist",
]


@dataclass
class ForeshadowingPair:
    setup_scene: int
    payoff_scene: int
    similarity: float
    confidence: str
    shared_terms: List[str] = field(default_factory=list)
    explanation: str = ""
    setup_summary: str = ""
    payoff_summary: str = ""

    def to_dict(self) -> dict:
        return {
            "setup_scene": self.setup_scene,
            "payoff_scene": self.payoff_scene,
            "similarity": round(self.similarity, 3),
            "confidence": self.confidence,
            "shared_terms": self.shared_terms,
            "explanation": self.explanation,
            "setup_summary": self.setup_summary,
            "payoff_summary": self.payoff_summary,
            "label": "POSSIBLE FORESHADOWING",
        }


# --------------------------------------------------------------------------- #
# Similarity back-ends
# --------------------------------------------------------------------------- #
def _manual_tfidf_cosine(docs: Sequence[str]) -> List[List[float]]:
    tokenised = [set(content_tokens(d)) for d in docs]
    n = len(docs)
    df: Dict[str, int] = {}
    for toks in tokenised:
        for t in toks:
            df[t] = df.get(t, 0) + 1
    vectors = []
    for i, doc in enumerate(docs):
        counts = {}
        for t in content_tokens(doc):
            counts[t] = counts.get(t, 0) + 1
        total = max(1, sum(counts.values()))
        vec = {
            t: (0.5 + 0.5 * (c / total)) * math.log((1 + n) / (1 + df.get(t, 0))) + 1.0
            for t, c in counts.items()
        }
        vectors.append(vec)
    sim = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i == j:
                sim[i][j] = 1.0
                continue
            common = set(vectors[i]) & set(vectors[j])
            num = sum(vectors[i][t] * vectors[j][t] for t in common)
            di = math.sqrt(sum(v * v for v in vectors[i].values())) or 1.0
            dj = math.sqrt(sum(v * v for v in vectors[j].values())) or 1.0
            sim[i][j] = num / (di * dj)
    return sim


def _sklearn_similarity(docs: Sequence[str]) -> List[List[float]]:
    if not any(d.strip() for d in docs):
        return [[0.0] * len(docs) for _ in range(len(docs))]
    vec = TfidfVectorizer(stop_words=list(STOPWORDS)[:300], ngram_range=(1, 2), min_df=1)
    matrix = vec.fit_transform([d if d.strip() else "empty scene" for d in docs])
    return cosine_similarity(matrix).tolist()


def _transformer_similarity(docs: Sequence[str]) -> List[List[float]] | None:
    try:
        from sentence_transformers import SentenceTransformer, util  # type: ignore
    except Exception:
        return None
    try:
        model = SentenceTransformer("all-MiniLM-L6-v2")
        embeddings = model.encode(list(docs), convert_to_tensor=True)
        return util.cos_sim(embeddings, embeddings).cpu().tolist()
    except Exception:
        return None


def similarity_matrix(docs: Sequence[str], use_embeddings: bool = True) -> List[List[float]]:
    if use_embeddings:
        matrix = _transformer_similarity(docs)
        if matrix:
            return matrix
    if TfidfVectorizer is not None:
        try:
            return _sklearn_similarity(docs)
        except Exception:
            pass
    return _manual_tfidf_cosine(docs)


# --------------------------------------------------------------------------- #
# Detection
# --------------------------------------------------------------------------- #
def _has_marker(text: str, markers) -> List[str]:
    lowered = text.lower()
    return [m for m in markers if m in lowered]


def find_foreshadowing(scenes, top_k: int = 5, min_similarity: float = 0.10) -> List[ForeshadowingPair]:
    if len(scenes) < 3:
        return []
    docs = [f"{s.location}. {s.action} {s.dialogue}" for s in scenes]
    matrix = similarity_matrix(docs)
    n = len(scenes)

    candidates = []
    for i in range(n):
        for j in range(i + 1, n):
            gap = j - i
            if gap < 1 or gap > max(3, n // 2 + 2):
                continue
            sim = float(matrix[i][j])
            if sim < min_similarity:
                continue
            a_tokens = set(content_tokens(docs[i]))
            b_tokens = set(content_tokens(docs[j]))
            shared = sorted(a_tokens & b_tokens)
            setup_markers = _has_marker(docs[i], SETUP_MARKERS)
            payoff_markers = _has_marker(docs[j], PAYOFF_MARKERS)

            bonus = 0.05 * min(3, len(setup_markers)) + 0.04 * min(3, len(payoff_markers))
            distance_penalty = 0.012 * (gap - 1)
            score = max(0.0, sim + bonus - distance_penalty)
            candidates.append((score, sim, i, j, shared, setup_markers, payoff_markers))

    candidates.sort(key=lambda c: -c[0])
    picked: List[ForeshadowingPair] = []
    used: Dict[int, int] = {}
    for score, sim, i, j, shared, setup_markers, payoff_markers in candidates:
        if used.get(i, 0) >= 2 or used.get(j, 0) >= 2:
            continue
        if len(picked) >= top_k:
            break
        used[i] = used.get(i, 0) + 1
        used[j] = used.get(j, 0) + 1
        confidence = "High" if score >= 0.42 else ("Medium" if score >= 0.24 else "Low")
        setup_scene = scenes[i]
        payoff_scene = scenes[j]
        explanation = _explain(setup_scene, payoff_scene, shared, setup_markers, payoff_markers, sim)
        picked.append(
            ForeshadowingPair(
                setup_scene=setup_scene.number,
                payoff_scene=payoff_scene.number,
                similarity=score,
                confidence=confidence,
                shared_terms=shared[:10],
                explanation=explanation,
                setup_summary=setup_scene.summary,
                payoff_summary=payoff_scene.summary,
            )
        )
    picked.sort(key=lambda p: p.setup_scene)
    return picked


def _explain(setup, payoff, shared, setup_markers, payoff_markers, sim) -> str:
    bits = [f"Scene {setup.number} ({setup.location}) and Scene {payoff.number} "
            f"({payoff.location}) share a semantic similarity of {sim:.2f}."]
    if shared:
        bits.append("Recurring distinctive language: " + ", ".join(shared[:6]) + ".")
    if setup_markers:
        bits.append("The earlier scene contains anticipatory markers ("
                    + ", ".join(setup_markers[:3]) + ") that typically set up a later event.")
    if payoff_markers:
        bits.append("The later scene contains payoff markers ("
                    + ", ".join(payoff_markers[:3]) + ") that resolve an earlier setup.")
    bits.append("This is flagged as POSSIBLE foreshadowing - a similarity signal for a "
                "human reader to verify, not a confirmed authorial intent.")
    return " ".join(bits)
