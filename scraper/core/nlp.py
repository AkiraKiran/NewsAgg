"""NLP brain: HF model pipelines + sentiment / NER / toxicity / readability.

Models are loaded lazily (``functools.lru_cache`` singletons) and placed on
GPU automatically when available. Importing this module is cheap; the heavy
torch/transformers load happens on first actual use, so light tools that only
import ``core`` (e.g. cleanup.py) never pay for it.
"""
from __future__ import annotations

import logging
import re
import string
from collections import Counter
from functools import lru_cache
from typing import Optional

from core import config

_log = logging.getLogger(__name__)


# ── Lazy device + NLTK data ─────────────────────────────────────────
@lru_cache(maxsize=1)
def device() -> int:
    """0 = first CUDA GPU, -1 = CPU. Detected once."""
    try:
        import torch
        if torch.cuda.is_available():
            print(f"[nlp] GPU: {torch.cuda.get_device_name(0)}")
            return 0
    except Exception:
        pass
    print("[nlp] device: CPU")
    return -1


@lru_cache(maxsize=1)
def ensure_nltk() -> None:
    import nltk
    for pkg in ("punkt", "punkt_tab", "stopwords"):
        try:
            nltk.download(pkg, quiet=True)
        except Exception as e:                    # noqa: BLE001
            _log.warning("nltk download %s failed: %s", pkg, e)


@lru_cache(maxsize=1)
def stop_words() -> set[str]:
    ensure_nltk()
    from nltk.corpus import stopwords
    return set(stopwords.words("english"))


# ── Lazy model pipelines ────────────────────────────────────────────
@lru_cache(maxsize=1)
def _sentiment_general():
    from transformers import pipeline
    return pipeline("sentiment-analysis", model=config.MODELS["sentiment_general"],
                    truncation=True, max_length=512, top_k=None, device=device())


@lru_cache(maxsize=1)
def _sentiment_finance():
    from transformers import pipeline
    return pipeline("sentiment-analysis", model=config.MODELS["sentiment_finance"],
                    truncation=True, max_length=512, top_k=None, device=device())


@lru_cache(maxsize=1)
def _classifier():
    from transformers import pipeline
    kwargs = {"device": device()}
    tok = config.hf_token()
    if tok:
        kwargs["token"] = tok
    return pipeline("zero-shot-classification", model=config.MODELS["zero_shot"], **kwargs)


@lru_cache(maxsize=1)
def _ner():
    from transformers import pipeline
    return pipeline("ner", model=config.MODELS["ner"], aggregation_strategy="simple", device=device())


@lru_cache(maxsize=1)
def _toxicity():
    from transformers import pipeline
    return pipeline("text-classification", model=config.MODELS["toxicity"],
                    truncation=True, max_length=512, device=device())


def _sentiment_pipe(model_key: str):
    return _sentiment_finance() if model_key == "finance" else _sentiment_general()


# ── Sentiment ───────────────────────────────────────────────────────
def _norm_label(raw: str) -> str:
    s = str(raw).strip().lower()
    if "pos" in s:
        return "positive"
    if "neg" in s:
        return "negative"
    if "neu" in s:
        return "neutral"
    return {"label_0": "negative", "label_1": "neutral", "label_2": "positive"}.get(s, "neutral")


def _extract_probs(raw) -> dict:
    probs = {"positive": 0.0, "neutral": 0.0, "negative": 0.0}
    rows = raw
    if isinstance(rows, list) and rows and isinstance(rows[0], list):
        rows = rows[0]
    for e in rows:
        if not isinstance(e, dict):
            continue
        k = _norm_label(e.get("label", "neutral"))
        try:
            probs[k] = max(0.0, min(1.0, float(e["score"])))
        except Exception:
            pass
    total = sum(probs.values())
    if total > 0:
        probs = {k: v / total for k, v in probs.items()}
    return probs


def _classify(probs: dict) -> tuple:
    pos, neu, neg = probs["positive"], probs["neutral"], probs["negative"]
    pol = pos - neg
    if neu >= config.NEUTRAL_THRESHOLD and abs(pol) <= config.NEUTRAL_POLARITY_CAP:
        label = "neutral"
    elif pol >= config.POLARITY_MARGIN:
        label = "positive"
    elif pol <= -config.POLARITY_MARGIN:
        label = "negative"
    else:
        label = max(probs, key=probs.get)
    return label, round(probs[label], 4), round(pol, 4)


def resolve_sentiment_key(topic: str, language: str = "en") -> str:
    """Pick the sentiment model for an article. FinBERT is English-only, so
    Business articles in any other language route to the multilingual
    general model (XLM-R) instead."""
    key = config.SENTIMENT_MODEL_MAP.get(topic, "general")
    if key == "finance" and not (language or "en").startswith("en"):
        return "general"
    return key


def analyze_sentiment(text: str, topic: str, language: str = "en") -> dict:
    """Return {type, score, comparative, probabilities, model}."""
    model_key = resolve_sentiment_key(topic, language)
    raw = _sentiment_pipe(model_key)(text[:1500])
    probs = _extract_probs(raw)
    label, conf, pol = _classify(probs)
    return {
        "type": label,
        "score": conf,
        "comparative": pol,
        "probabilities": {
            "positive": round(probs["positive"], 4),
            "neutral": round(probs["neutral"], 4),
            "negative": round(probs["negative"], 4),
        },
        # Full HF id so articles.sentiment_model is self-documenting
        # (legacy rows hold the short 'general'/'finance' strings — fine).
        "model": config.MODELS["sentiment_" + model_key],
    }


# ── NER ─────────────────────────────────────────────────────────────
def run_ner(text: str) -> dict:
    entities = {"persons": [], "organizations": [], "locations": [], "misc": []}
    type_map = {"PER": "persons", "ORG": "organizations", "LOC": "locations", "MISC": "misc"}
    try:
        raw = _ner()(text[:1500])
        for ent in raw:
            key = type_map.get(ent["entity_group"])
            word = (ent.get("word") or "").strip()
            if key and word and word not in entities[key]:
                entities[key].append(word)
    except Exception as e:                         # noqa: BLE001
        _log.debug("NER failed: %s", e)
    return entities


# ── Toxicity ────────────────────────────────────────────────────────
def run_toxicity(text: str, language: str = "en") -> dict:
    """toxic-bert is English-only: non-EN articles get NULLs instead of
    garbage scores (a multilingual replacement is ~2.2GB for a low-value
    signal on news prose — deliberately skipped)."""
    if not (language or "en").startswith("en"):
        return {"label": None, "score": None}
    label, score = "non-toxic", 0.0
    try:
        tox = _toxicity()(text[:512])
        if isinstance(tox, list) and tox:
            label = tox[0].get("label", "non-toxic").lower()
            score = round(float(tox[0].get("score", 0.0)), 4)
    except Exception as e:                         # noqa: BLE001
        _log.debug("toxicity failed: %s", e)
    return {"label": label, "score": score}


# ── Zero-shot relevance filter ──────────────────────────────────────
def zero_shot_filter(candidates: list[dict], threshold: float = config.ZS_THRESHOLD) -> list[dict]:
    """Keep candidates whose title relates to their topic; annotate relevance.

    All candidates must share the same ``topic`` (callers batch per category).
    Adds ai_relevance_score / ai_top_label / ai_label_scores to survivors.
    """
    from core.cleaner import PHOTO_RE
    if not candidates:
        return []
    valid, titles = [], []
    for item in candidates:
        t = item["title_hint"]
        if not PHOTO_RE.search(t) and len(t) >= 15:
            valid.append(item)
            titles.append(t)
    if not valid:
        return []
    labels = config.CATEGORY_LABELS[valid[0]["topic"]]
    try:
        out = _classifier()(titles, candidate_labels=labels, multi_label=True)
        if isinstance(out, dict):
            out = [out]
        result = []
        for item, res in zip(valid, out):
            if res["scores"][0] >= threshold:
                item["ai_relevance_score"] = round(res["scores"][0], 4)
                item["ai_top_label"] = res["labels"][0]
                item["ai_label_scores"] = dict(zip(res["labels"][:5], [round(s, 4) for s in res["scores"][:5]]))
                result.append(item)
        return result
    except Exception as e:                         # noqa: BLE001
        print(f"  zero-shot filter error: {e}")
        return valid


# ── Keywords / readability / language ───────────────────────────────
def _keyword_ok(tok: str, sw: set[str]) -> bool:
    """Keep only meaningful keyword tokens: ≥4 chars, no digits, not a
    stopword (NLTK + the project's news-prose stoplist)."""
    return len(tok) > 3 and tok not in sw and not any(c.isdigit() for c in tok)


def extract_keywords(text: str, np_kw: list, entities: dict,
                     top_n: int = config.KEYWORDS_TOP_N) -> list[str]:
    sw = stop_words() | config.KEYWORD_STOPWORDS
    combined: dict[str, int] = {}
    for kw in np_kw:
        k = kw.lower().strip()
        if _keyword_ok(k, sw):
            combined[k] = combined.get(k, 0) + 3
    for elist in entities.values():
        for ent in elist:
            for tok in ent.lower().split():
                tok = tok.strip(string.punctuation)
                if _keyword_ok(tok, sw):
                    combined[tok] = combined.get(tok, 0) + 2
    words = re.findall(r"\b[a-zA-Z]{4,}\b", text.lower())
    freq = Counter(w for w in words if w not in sw)
    for w, cnt in freq.most_common(80):
        if w not in combined:
            combined[w] = cnt
    seen, result = set(), []
    for kw, _ in sorted(combined.items(), key=lambda x: -x[1]):
        if kw not in seen:
            seen.add(kw)
            result.append(kw)
        if len(result) >= top_n:
            break
    return result


def reading_metrics(text: str) -> dict:
    import textstat
    words = len(text.split())
    return {
        "word_count": words,
        "reading_time_min": max(1, round(words / 200)),
        "flesch_score": round(textstat.flesch_reading_ease(text), 2),
        "flesch_kincaid": round(textstat.flesch_kincaid_grade(text), 2),
        "smog_index": round(textstat.smog_index(text), 2),
    }


def detect_language(text: str) -> str:
    try:
        import langdetect
        return langdetect.detect(text[:1000])
    except Exception:
        return "en"
