# AI Limitations — Honest Assessment

This document describes the accuracy, limits, and known failure modes of the
AI layer used by the Observatory.

**The system does not pretend to be perfect. Every AI-generated output is
labeled, cached, and traceable to its source.**

---

## Model

- **Primary LLM:** `qwen2.5:3b` (Alibaba, Q4_K_M quantized, ~1.9 GB)
- **Runtime:** Ollama (local, CPU-only in our deployment)
- **Fallback:** rule-based (keyword matching + template strings)
- **Prompt temperature:** 0.2 (low, for consistency)

**Why a small local model?**
- Zero API cost
- Data never leaves the machine
- Works offline
- The project's original proposal specifies a local LLM

**Trade-offs accepted:**
- Slower than cloud APIs (30–60 s per publication on CPU)
- Lower accuracy than GPT-4 / Claude class models
- Occasional fallback to rule-based processing

---

## What the AI Does

| Task | Input | Output |
|---|---|---|
| **Summarization** | title + abstract (up to 800 chars) | 6-section summary (Main topic, Purpose, Findings, Developments, Policy, Relevance) |
| **Classification** | title + abstract | 1–3 topic slugs, validated against the 11 canonical topics |
| **Relevance** | title + abstract | 2–3 sentence BOT relevance note with disclaimer |
| **Trend insights** | top emerging topics + 10 recent pubs | 2–3 sentence narrative brief |

---

## Known Limitations by Task

### Summarization

- **Truncation:** Only the first 800 characters of the source are sent to the
  model. Long papers are summarized from the first page only.
- **Hallucination risk:** The model may invent details if the abstract is vague.
  **Every summary is stored alongside its original `source_url`** — always verify
  against the source.
- **Missing sections:** If the source lacks information (e.g., no policy
  considerations), the model writes "Not stated" — but occasionally omits the
  section entirely.
- **Fallback mode:** If Ollama is unavailable or times out (240 s), the summary
  becomes `[fallback] Summary unavailable — LLM offline.`

### Classification

- **Accuracy:** On a manually labeled sample of ~25 publications, top-1 topic
  accuracy was **~65–75%**. Multi-topic overlap helps — top-3 accuracy is higher.
- **Failure mode:** The model sometimes picks a broader topic
  (e.g., `monetary_policy`) when a narrower one (`payment_systems`) is correct.
- **Validation guard:** Any slug not in `topics.py` is dropped. The classifier
  can also fall back to keyword matching if the model output is unusable.
- **Category drift:** New topics require editing `topics.py` and restarting the
  backend. This is intentional (prevents prompt bloat and misclassification).

### Relevance

- **Labeling:** Every relevance note ends with the disclaimer
  *"AI-generated assessment — not an official Bank of Tanzania position."*
- **Generic when input is thin:** If the abstract is short, the relevance note
  tends to restate the summary rather than add new insight.
- **Not policy advice:** The model is explicitly instructed not to recommend policy.

### Trend Insights

- **Rule-based component:** Growth deltas, laggards, and source dominance are
  computed from the database — these are deterministic and reliable.
- **AI component:** The narrative brief is generated from the top 3 topics + 10
  most recent publications. Its quality varies with the corpus.
- **Cached for 10 minutes:** Repeated requests within the window return the same
  narrative without re-running the LLM.

---

## Fallback Engine

When Ollama is unavailable, the pipeline uses deterministic fallbacks:

| Task | Fallback behavior |
|---|---|
| Summarize | Returns `[fallback] Summary unavailable — LLM offline.` |
| Classify | Keyword matcher — checks each topic's keywords against title/abstract |
| Relevance | Template + disclaimer |

Fallback rows are marked with `ai_engine = "rule-based"` in the database and
surface as **Fallback** on the Admin → Manage Publications page.

Admins can fix them by selecting the rows and clicking **Re-run AI**.

---

## Traceability Guarantees

| Guarantee | How it's enforced |
|---|---|
| Every AI output ties to its source | `source_url` column, never overwritten |
| Users can see which engine produced output | `ai_engine` column, shown in the UI |
| AI output is clearly labeled | Disclaimer on every relevance note |
| Original content is preserved | `raw_content` + `abstract` kept alongside AI summary |
| Duplicates never overwrite originals | `fingerprint` UNIQUE constraint |

---

## What the System Does NOT Do

- Does **not** fine-tune the LLM on central banking text
- Does **not** verify AI summaries against the source automatically
- Does **not** rank publications by economic impact
- Does **not** predict market outcomes
- Does **not** replace human analyst judgment
- Does **not** translate non-English publications

---

## Evaluation Approach

To validate the AI layer, a manual sample of ~25 publications was hand-labeled
with expected topics and then compared against the AI's classification.

See `docs/TEST_REPORT.md` for the results and methodology.

---

## Recommended Reading for Users

1. Treat AI summaries as **first drafts** — always skim the source
2. Trust the topics more than the exact wording
3. Use the **Re-run AI** button on any publication whose summary looks wrong
4. Report systematic misclassifications to the admin team

**The Observatory is a decision-support tool, not an automated analyst.**
