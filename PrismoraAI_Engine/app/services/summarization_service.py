# app/services/summarization_service.py
"""
PODCAST SUMMARIZATION SERVICE  v4.0
Two-stage pipeline:

  Stage 1 — BART  (local, GPU)
    • Cleans + chunks the raw transcript (can be 100,000+ words)
    • Map-reduce: summarise each chunk → combine → summarise again
    • Produces a ~600-word intermediate summary

  Stage 2 — Gemini Flash  (API, as REFINER only)
    • Receives the ~600-word intermediate — NOT the raw transcript
    • Structures it into clean JSON: fullText / keyPoints / topics
    • Uses ~20× fewer tokens than sending the full transcript
    • Much less quota pressure; near-zero chance of 429

  Fallback (Gemini quota exhausted / unavailable):
    • Use the BART intermediate as fullText
    • Extract key points from intermediate with _pick_key_sentences
    • Extract topics from intermediate with TF-IDF
    • All output remains coherent because it's based on the already-summarised text

Why text-only (no segments)?
    Segments are timestamp containers for highlight/clip generation.
    For summarization, segments add zero signal — only the text matters.
    The endpoint must strip segments before calling this service.
"""

import torch
import re
import math
import json
import time
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, pipeline
from collections import Counter
import numpy as np
from typing import Optional

try:
    from groq import Groq as GroqClient
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    print("[Summarizer] ⚠️  groq not installed. Run: pip install groq")

try:
    from google import genai
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

from app.core.config import settings


# ══════════════════════════════════════════════════════════════════════════════
# POST-PROCESSING HELPERS
# ══════════════════════════════════════════════════════════════════════════════

_DECODE_FIXES = [
    (re.compile(r'\bli\.e\.?\b', re.I), 'that is'),
    (re.compile(r'\blie\.\b', re.I),    'life.'),
    (re.compile(r'\blie,\b', re.I),     'life,'),
    (re.compile(r'\s+\.'),              '.'),
    (re.compile(r'\.{2,}'),             '.'),
    (re.compile(r'\s{2,}'),             ' '),
    (re.compile(r'\.\s*\.'),            '.'),
]

_HALLUCINATION_PATTERNS = [
    re.compile(r",?\s*(?:she|he|they)\s+(?:says?|said|adds?|added|told|writes?|wrote|explains?|explained|notes?|noted)\b[^.]*", re.I),
    re.compile(r",?\s*(?:says?|said)\s+CNN'?s?\s+\w+\s*\w*[^.]*", re.I),
    re.compile(r"\baccording to\s+(?:CNN|the\s+\w+)[^.]*", re.I),
    re.compile(r"\bCNN\b", re.I),
    re.compile(r"\b\w+\.com\b[^.]*", re.I),
    re.compile(r"\bsubmit\s+it\s+here[^.]*", re.I),
    re.compile(r"\bfor\s+more\s+(?:information|details)[^.]*", re.I),
    re.compile(r"\bclick\s+here[^.]*", re.I),
    re.compile(r"\bread\s+more[^.]*", re.I),
    re.compile(r"\bvisit\s+(?:our|the)\s+\w+[^.]*", re.I),
    re.compile(r"\bi\.\.\.[^.]*", re.I),
]

_SENT_SPLIT = re.compile(r'(?<=[.!?])\s+')

# Filler words to strip from podcast transcripts before summarising
_FILLER_RE = re.compile(
    r'\b(uh|um|er|ah|hmm|you know|i mean|kind of|sort of|like I said|'
    r'basically|literally|honestly|right\?|okay\?|yeah\?)\b',
    re.IGNORECASE,
)

# Podcast-specific stopwords for topic extraction
_STOP_WORDS = frozenset({
    'a', 'an', 'the', 'and', 'or', 'but', 'if', 'in', 'on', 'at', 'to',
    'for', 'of', 'with', 'by', 'from', 'is', 'it', 'as', 'be', 'was',
    'are', 'were', 'been', 'am', 'has', 'had', 'have', 'do', 'does', 'did',
    'not', 'no', 'so', 'up', 'out', 'all', 'can', 'will', 'just', 'its',
    'he', 'she', 'we', 'you', 'they', 'me', 'my', 'your', 'his', 'her',
    'our', 'us', 'them', 'who', 'what', 'when', 'where', 'how', 'why',
    'this', 'that', 'these', 'those', 'which', 'there', 'their', 'here',
    'than', 'then', 'into', 'some', 'such', 'only', 'over', 'very',
    'also', 'more', 'most', 'other', 'about', 'would', 'could', 'should',
    'like', 'know', 'think', 'going', 'want', 'need', 'make', 'made',
    'through', 'back', 'get', 'got', 'being', 'come', 'came',
    'said', 'say', 'says', 'went', 'go', 'goes', 'still', 'even',
    'right', 'well', 'now', 'really', 'people', 'thing', 'things',
    'much', 'because', 'way', 'give', 'gave', 'let', 'man',
    'many', 'new', 'one', 'two', 'first', 'time', 'times', 'every',
    'never', 'always', 'hard', 'again', 'lot', 'became', 'start',
    'keep', 'look', 'take', 'long', 'real', 'part', 'put', 'day',
    'tell', 'told', 'found', 'kind', 'sort', 'talk', 'feel', 'left',
    'work', 'life', 'sure', 'try', 'trying', 'maybe', 'little', 'big',
    'great', 'good', 'see', 'bit', 'done', 'mean', 'point',
    'end', 'set', 'own', 'place', 'person', 'year', 'years',
    'today', 'pretty', 'three', 'company', 'question',
    'actually', 'especially', 'incredible', 'something', 'help',
    'world', 'show', 'next', 'believe', 'call', 'called', 'making',
    # Transcript filler that leaks through
    'yeah', 'yes', 'okay', 'oh', 'wow', 'right', 'uh', 'um',
    'just', 'got', 'get', 'know', 'think', 'said', 'like',
})


def _fix_artifacts(text: str) -> str:
    for pattern, replacement in _DECODE_FIXES:
        text = pattern.sub(replacement, text)
    for pattern in _HALLUCINATION_PATTERNS:
        text = pattern.sub('', text)
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'[,.]\s*[,.]', '.', text)
    text = re.sub(r'\s+([.,!?])', r'\1', text)
    text = re.sub(r'\s+[a-zA-Z]{1,2}\.\s*$', '.', text)
    return text.strip()


def _remove_repeated_sentences(text: str) -> str:
    sentences = _SENT_SPLIT.split(text)
    seen, result = [], []
    for sent in sentences:
        sent = sent.strip()
        if not sent:
            continue
        norm = re.sub(r'[^a-z0-9 ]', '', sent.lower()).strip()
        if not norm:
            continue
        is_dup = any(
            len(set(norm.split()) & set(p.split())) / max(len(set(norm.split())), len(set(p.split())), 1) > 0.75
            for p in seen
        )
        if not is_dup:
            seen.append(norm)
            result.append(sent)
    return ' '.join(result)


def _tfidf_topics(text: str, top_n: int = 8) -> list:
    sentences = _SENT_SPLIT.split(text)
    if len(sentences) < 3:
        sentences = [text[i:i+200] for i in range(0, len(text), 200)]
    n_docs = max(len(sentences), 1)

    doc_freqs = Counter()
    tf_total  = Counter()

    for sent in sentences:
        words  = re.findall(r'\b[a-z]{3,}\b', sent.lower())
        unique = set(words)
        for w in unique:
            if w not in _STOP_WORDS:
                doc_freqs[w] += 1
        for w in words:
            if w not in _STOP_WORDS:
                tf_total[w] += 1

    scores = {}
    for word, tf in tf_total.items():
        df  = doc_freqs.get(word, 1)
        idf = math.log(n_docs / (1 + df)) + 1.0
        scores[word] = tf * idf

    bigram_scores = Counter()
    _BIGRAM_STOP = _STOP_WORDS | {'month', 'place', 'again', 'start', 'keep', 'look',
                                   'take', 'long', 'hard', 'real', 'part', 'lot', 'put',
                                   'day', 'tell', 'told', 'found', 'kind', 'sort', 'talk',
                                   'feel', 'left'}
    for bg in re.findall(r'\b([a-z]{3,}\s+[a-z]{3,})\b', text.lower()):
        ws = bg.split()
        if ws[0] not in _BIGRAM_STOP and ws[1] not in _BIGRAM_STOP:
            bigram_scores[bg] += 1

    final_topics, used_words = [], set()
    for bg, count in bigram_scores.most_common(15):
        if count >= 3:
            ws = bg.split()
            final_topics.append(bg.title())
            used_words.update(ws)
            if len(final_topics) >= top_n // 2:
                break

    for word, score in sorted(scores.items(), key=lambda x: x[1], reverse=True):
        if word in used_words or score < 2.0:
            continue
        final_topics.append(word.title())
        used_words.add(word)
        if len(final_topics) >= top_n:
            break

    return final_topics[:top_n]


def _pick_key_sentences(text: str, n: int = 5) -> list:
    sentences = [s.strip() for s in _SENT_SPLIT.split(text) if len(s.split()) >= 6]
    if len(sentences) <= n:
        return sentences

    insight_words = {
        'important', 'key', 'learn', 'lesson', 'realize', 'truth',
        'secret', 'discover', 'understand', 'fundamental', 'power',
        'believe', 'purpose', 'passion', 'overcome', 'strength',
        'mindset', 'control', 'brain', 'mind', 'adapt', 'research',
        'study', 'found', 'shows', 'evidence', 'proven', 'fact',
    }
    filler_words = {'um', 'uh', 'like', 'basically', 'literally', 'honestly'}

    scored = []
    for i, sent in enumerate(sentences):
        words   = sent.lower().split()
        wc      = len(words)
        pos     = i / len(sentences)
        pos_sc  = 0.3 if pos < 0.15 else (0.2 if pos > 0.90 else 0.0)
        len_sc  = min(1.0, wc / 25) if wc <= 40 else max(0.3, 1.0 - (wc - 40) / 40)
        kw_sc   = min(1.0, sum(1 for w in words if w in insight_words) / 2.0)
        fill_sc = max(0.5, 1.0 - sum(1 for w in words if w in filler_words) / max(wc, 1) * 5)
        scored.append((0.35 * kw_sc + 0.25 * len_sc + 0.20 * pos_sc + 0.20 * fill_sc, i, sent))

    scored.sort(reverse=True)
    selected, used_regions = [], set()
    for _, idx, sent in scored:
        region = int(idx / len(sentences) * 10)
        if region not in used_regions or len(selected) < n - 1:
            selected.append((idx, sent))
            used_regions.add(region)
        if len(selected) >= n:
            break

    selected.sort(key=lambda x: x[0])
    return [s for _, s in selected]


# ══════════════════════════════════════════════════════════════════════════════
# MAIN SERVICE
# ══════════════════════════════════════════════════════════════════════════════

class SummarizationService:

    # ── BART target for the intermediate summary (Stage 1 output) ─────────
    _INTERMEDIATE_TARGET_WORDS = 600

    def __init__(self):
        self.device   = "cuda" if torch.cuda.is_available() else "cpu"
        self.use_fp16 = self.device == "cuda"

        # ── Shared result cache ───────────────────────────────────────────
        self._result_cache = {}        # hash(text[:500]) → structured dict

        # ── Groq (primary Stage 2 refiner — 14,400 req/day free) ─────────
        self.groq_client    = None
        self._groq_disabled = False
        groq_key = getattr(settings, 'GROQ_API_KEY', None)
        if groq_key and GROQ_AVAILABLE:
            try:
                self.groq_client = GroqClient(api_key=groq_key)
                print("[Summarizer] ✅ Groq API connected (primary Stage 2 refiner)")
                print("[Summarizer]    Model: llama-3.3-70b-versatile | 14,400 req/day free")
            except Exception as e:
                print(f"[Summarizer] ⚠️  Groq init failed: {e}")
        else:
            reason = "no GROQ_API_KEY in .env" if not groq_key else "groq not installed (pip install groq)"
            print(f"[Summarizer] ⚠️  Groq disabled ({reason})")

        # ── Gemini (secondary Stage 2 refiner — 15 req/day free) ─────────
        self.gemini_client    = None
        self._gemini_disabled = False
        gemini_key = getattr(settings, 'GEMINI_API_KEY', None)
        if gemini_key and GENAI_AVAILABLE:
            try:
                self.gemini_client = genai.Client(api_key=gemini_key)
                print("[Summarizer] ✅ Gemini Flash connected (secondary refiner)")
            except Exception as e:
                print(f"[Summarizer] ⚠️  Gemini init failed: {e}")
        else:
            print("[Summarizer] ℹ️  Gemini disabled — no key or google-genai not installed")

        # ── BART  (Stage 1: heavy summarisation) ─────────────────────────
        model_name = "philschmid/bart-large-cnn-samsum"
        print(f"[Summarizer] Loading BART ({model_name}) on {self.device}")

        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model     = AutoModelForSeq2SeqLM.from_pretrained(model_name)
        if self.use_fp16:
            self.model = self.model.half()
        self.model.to(self.device)
        self.model.eval()

        self.bart_pipeline = pipeline(
            "summarization",
            model=self.model,
            tokenizer=self.tokenizer,
            device=0 if self.device == "cuda" else -1,
            framework="pt",
        )
        print(f"[Summarizer] ✅ BART loaded on {self.device} (fp16={self.use_fp16})")

    # ──────────────────────────────────────────────────────────────────────
    # STAGE 1 HELPERS
    # ──────────────────────────────────────────────────────────────────────

    def _clean_transcript(self, text: str) -> str:
        """Strip filler words and repeated tokens from raw transcript."""
        text = _FILLER_RE.sub('', text)
        text = re.sub(r'\b(\w+)( \1\b)+', r'\1', text)   # "work work" → "work"
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def _chunk_text(self, text: str, max_tokens: int = 900) -> list:
        """Split text into BART-safe chunks (≤ max_tokens each)."""
        sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])', text)
        chunks, current, current_len = [], [], 0

        for sent in sentences:
            tlen = len(self.tokenizer.encode(sent, add_special_tokens=False))
            if tlen > max_tokens:
                if current:
                    chunks.append(' '.join(current))
                    current, current_len = [], 0
                for clause in re.split(r'[,;:]', sent):
                    if clause.strip():
                        chunks.append(clause.strip())
                continue
            if current_len + tlen > max_tokens:
                chunks.append(' '.join(current))
                current, current_len = [sent], tlen
            else:
                current.append(sent)
                current_len += tlen

        if current:
            chunks.append(' '.join(current))
        return chunks or [text]

    def _summarize_chunk(self, text: str, max_length: int = 200, min_length: int = 60) -> str:
        """Summarise a single BART-safe chunk."""
        if not text.strip() or len(text.split()) < 10:
            return ""
        try:
            # Cap max_length to actual input length to suppress BART warning
            input_tokens = len(self.tokenizer.encode(text, add_special_tokens=False))
            safe_max     = min(max_length, max(input_tokens - 10, min_length + 5))
            safe_min     = min(min_length, safe_max - 5)

            result = self.bart_pipeline(
                text,
                max_length          = safe_max,
                min_length          = safe_min,
                do_sample           = False,
                truncation          = True,
                clean_up_tokenization_spaces = True,
                no_repeat_ngram_size= 3,
                repetition_penalty  = 2.5,
                length_penalty      = 1.2,
            )
            summary = result[0]['summary_text']
            summary = re.sub(r'\s+', ' ', summary)
            summary = re.sub(r'([a-z])([A-Z])', r'\1. \2', summary)
            summary = _fix_artifacts(summary)
            return summary.strip()
        except Exception as e:
            print(f"[Summarizer] BART chunk error: {e}")
            return ""

    def _bart_map_reduce(self, text: str) -> str:
        """
        Stage 1: BART map-reduce on the full transcript.

        Map:    summarise each chunk (900 tokens) → chunk_summary
        Reduce: if chunk summaries still too long, summarise them again
        Output: ~600 word intermediate summary
        """
        cleaned = self._clean_transcript(text)
        wc      = len(cleaned.split())

        # Very short text — direct pass
        if wc < 400:
            return self._summarize_chunk(cleaned, max_length=300, min_length=80) or cleaned

        # ── Map pass ──────────────────────────────────────────────────────
        chunks  = self._chunk_text(cleaned, max_tokens=900)
        n       = len(chunks)
        print(f"[Summarizer] Stage 1 (BART map-reduce): {n} chunks")

        chunk_summaries = []
        # Give each chunk generous room — min 80 words, scaling up for fewer chunks.
        # Dividing by n//3 avoids over-compression when n is large (e.g. n=20 → 90 each).
        per_chunk_max = max(80, min(200, self._INTERMEDIATE_TARGET_WORDS // max(n // 3, 1)))
        for i, chunk in enumerate(chunks):
            s = self._summarize_chunk(chunk, max_length=per_chunk_max, min_length=30)
            if s:
                chunk_summaries.append(s)
                print(f"[Summarizer]   Chunk {i+1}/{n} ✓")

        if not chunk_summaries:
            return "Unable to generate summary."
        if len(chunk_summaries) == 1:
            return chunk_summaries[0]

        combined    = ' '.join(chunk_summaries)
        combined_wc = len(combined.split())

        # ── Skip reduce if combined is already a reasonable length ────────
        # Groq/Gemini handle up to 1500 words easily — no need to compress
        # further unless the combined is truly bloated (>1500 words).
        if combined_wc <= 1500:
            return _remove_repeated_sentences(combined)

        # ── Reduce pass (only for very long combined summaries) ───────────
        print(f"[Summarizer]   Reduce pass ({combined_wc} words → ~{self._INTERMEDIATE_TARGET_WORDS})")
        reduce_chunks = self._chunk_text(combined, max_tokens=900)
        n_rc = max(len(reduce_chunks), 1)
        # Each reduce chunk should contribute ~200 words minimum
        r_max = max(200, self._INTERMEDIATE_TARGET_WORDS // n_rc + 100)
        final_summaries = []
        for chunk in reduce_chunks:
            s = self._summarize_chunk(chunk, max_length=r_max, min_length=60)
            if s:
                final_summaries.append(s)

        return _remove_repeated_sentences(' '.join(final_summaries))

    # ──────────────────────────────────────────────────────────────────────
    # STAGE 2A: GROQ REFINES THE INTERMEDIATE (primary)
    # ──────────────────────────────────────────────────────────────────────

    def _build_refine_prompt(self, intermediate: str) -> str:
        return f"""You are a podcast content analyst. You have been given a summary of a podcast episode.
Structure it into three sections. Respond ONLY with valid JSON — no markdown, no backticks, no explanation.

Rules:
- Only use information present in the summary provided
- Do NOT add information not in the summary
- Do NOT hallucinate names, websites, organizations, or events
- Key points must be specific insights, not generic statements
- Topics must be specific noun phrases (e.g. "Brain Plasticity", "Anxiety Treatment") — never single filler words like "life", "world", "yeah", "yes"
- fullText must read as 2-4 coherent paragraphs, not bullet points

JSON format:
{{
  "fullText": "2-4 paragraph coherent summary of the episode.",
  "keyPoints": "1. [Specific insight]\n2. [Specific insight]\n3. [Specific insight]\n4. [Specific insight]\n5. [Specific insight]",
  "topics": "Topic1, Topic2, Topic3, Topic4, Topic5, Topic6"
}}

Podcast summary to structure:
{intermediate}"""

    def _parse_refine_response(self, raw: str) -> dict:
        """Parse and validate JSON from any LLM refiner."""
        raw = raw.strip()
        if raw.startswith('```'):
            raw = re.sub(r'^```(?:json)?\s*', '', raw)
            raw = re.sub(r'\s*```$', '', raw)
        result = json.loads(raw)
        for key in ('fullText', 'keyPoints', 'topics'):
            if key not in result:
                raise ValueError(f"LLM response missing '{key}'")
        return result

    def _groq_refine(self, intermediate: str) -> dict:
        """
        Primary Stage 2 refiner using Groq + Llama 3.3 70B.
        14,400 requests/day free. ~1-2 second response time.
        Raises on failure — caller falls through to Gemini or local.
        """
        prompt = self._build_refine_prompt(intermediate)
        response = self.groq_client.chat.completions.create(
            model    = "llama-3.3-70b-versatile",
            messages = [{"role": "user", "content": prompt}],
            temperature      = 0.2,
            max_tokens       = 1024,
            response_format  = {"type": "json_object"},  # forces JSON output
        )
        raw = response.choices[0].message.content
        return self._parse_refine_response(raw)

    # ──────────────────────────────────────────────────────────────────────
    # STAGE 2B: GEMINI REFINES THE INTERMEDIATE (secondary)
    # ──────────────────────────────────────────────────────────────────────

    def _gemini_refine(self, intermediate: str) -> dict:
        """
        Secondary Stage 2 refiner using Gemini 2.0 Flash.
        Only called if Groq is unavailable/quota-exhausted.
        15 requests/day on free tier.
        """
        prompt = self._build_refine_prompt(intermediate)
        last_err = None
        for attempt in range(3):
            try:
                response = self.gemini_client.models.generate_content(
                    model    = "gemini-2.0-flash",
                    contents = prompt,
                )
                break
            except Exception as e:
                last_err = e
                if "429" in str(e) and attempt < 2:
                    wait = 30 * (attempt + 1)
                    print(f"[Summarizer] ⏳ Gemini rate limited, retrying in {wait}s...")
                    time.sleep(wait)
                else:
                    raise
        else:
            raise last_err
        return self._parse_refine_response(response.text)

    # ──────────────────────────────────────────────────────────────────────
    # STAGE 2 FALLBACK: structure locally without any LLM API
    # ──────────────────────────────────────────────────────────────────────

    def _local_structure(self, intermediate: str) -> dict:
        full_text  = _remove_repeated_sentences(intermediate)
        key_sents  = _pick_key_sentences(full_text, n=5)
        bullets    = []
        for i, sent in enumerate(key_sents, 1):
            sent = sent.strip()
            if not sent.endswith(('.', '!', '?')):
                sent += '.'
            bullets.append(f"{i}. {sent}")
        topics = _tfidf_topics(full_text, top_n=6)
        return {
            "fullText":  full_text,
            "keyPoints": '\n'.join(bullets) or "1. No key points extracted.",
            "topics":    ', '.join(topics) or "Discussion, Insights",
        }

    # ──────────────────────────────────────────────────────────────────────
    # MAIN PUBLIC METHOD
    # ──────────────────────────────────────────────────────────────────────

    def summarize(self, text: str, duration_seconds: Optional[float] = None) -> dict:
        """
        Full 2-stage pipeline. Accepts ONLY text (no segments needed).

        Stage 1: BART map-reduce → ~600 word intermediate
        Stage 2: Groq (primary) → Gemini (secondary) → local (final fallback)

        Returns: { keyPoints, fullText, topics, duration }
        """
        if not text or len(text.strip()) < 50:
            return {
                "keyPoints": "No content to summarize.",
                "fullText":  "Transcript was too short or empty.",
                "topics":    "",
                "duration":  f"{duration_seconds:.2f} seconds" if duration_seconds else None,
            }

        cache_key = hash(text[:500])
        if cache_key in self._result_cache:
            print("[Summarizer] ♻️  Using cached result")
            structured = self._result_cache[cache_key]
        else:
            # ── Stage 1: BART ─────────────────────────────────────────────
            print("[Summarizer] 🔄 Stage 1: BART map-reduce…")
            intermediate = self._bart_map_reduce(text)
            print(f"[Summarizer] ✅ Stage 1 complete — {len(intermediate.split())} word intermediate")

            # ── Stage 2: try Groq → Gemini → local ────────────────────────
            structured = None

            # 2a. Groq (primary — 14,400 req/day)
            if self.groq_client and not self._groq_disabled:
                try:
                    print("[Summarizer] 🚀 Stage 2a: Groq (Llama 3.3 70B) refining…")
                    structured = self._groq_refine(intermediate)
                    print("[Summarizer] ✅ Stage 2a (Groq) complete")
                except Exception as e:
                    err_str = str(e)
                    print(f"[Summarizer] ⚠️  Groq failed: {err_str[:150]}")
                    if "429" in err_str or "rate" in err_str.lower() or "quota" in err_str.lower():
                        self._groq_disabled = True
                        print("[Summarizer] 🔒 Groq quota — trying Gemini next")

            # 2b. Gemini (secondary — 15 req/day)
            if structured is None and self.gemini_client and not self._gemini_disabled:
                try:
                    print("[Summarizer] 🚀 Stage 2b: Gemini refining…")
                    structured = self._gemini_refine(intermediate)
                    print("[Summarizer] ✅ Stage 2b (Gemini) complete")
                except Exception as e:
                    err_str = str(e)
                    print(f"[Summarizer] ⚠️  Gemini failed: {err_str[:150]}")
                    if "429" in err_str or "quota" in err_str.lower() or "PerDay" in err_str:
                        self._gemini_disabled = True
                        print("[Summarizer] 🔒 Gemini quota exhausted")

            # 2c. Local fallback
            if structured is None:
                print("[Summarizer] ℹ️  Stage 2c: local structuring (no LLM API)")
                structured = self._local_structure(intermediate)

            self._result_cache[cache_key] = structured

        return {
            "keyPoints": structured.get("keyPoints", ""),
            "fullText":  structured.get("fullText",  ""),
            "topics":    structured.get("topics",    ""),
            "duration":  f"{duration_seconds:.2f} seconds" if duration_seconds else None,
        }

    # ── Backwards-compatible shim methods ────────────────────────────────

    def summarize_full(self, text: str, target_length: int = 300) -> str:
        return self.summarize(text).get("fullText", "")

    def extract_key_points(self, text: str, num_points: int = 5) -> str:
        return self.summarize(text).get("keyPoints", "")

    def extract_topics(self, text: str) -> str:
        return self.summarize(text).get("topics", "")

    def clean_transcript(self, text: str) -> str:
        return self._clean_transcript(text)

    def chunk_text_hierarchical(self, text: str, max_tokens: int = 1000) -> list:
        return self._chunk_text(text, max_tokens)


# Singleton
summarizer = SummarizationService()