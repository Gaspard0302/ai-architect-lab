# Model and context strategy

Three decisions set what one architecture costs at production volume: which model tier, how much
of the window you plan to use, and by what route context arrives in each call.

## Model tier

Start on the mid tier. Move up when an eval shows a quality gap the prompt cannot close; move down
when an eval confirms the loss is acceptable on every slice that matters. Two facts people forget
when planning a swap:

- Tiers differ in **context window size and feature support**, not only in quality. A smaller
  tier can start rejecting requests the larger one accepted, before quality is even measured.
- A prompt tuned on one tier is only a first draft on another. The unit
  you ship is the **prompt + model pair**, so re-tune before you judge.

The gated change procedure (threshold before the run, per-slice scores, partial migration,
rollback) is in `architect-evals-and-production/reference/model-change.md`.

## Sizing: the working-memory cliff

Inside the window the model can attend to content; outside it, the content does not exist. It is
a cliff: everything works until, abruptly, it does not.

| Symptom | Cause | How it shows up |
|---|---|---|
| Request rejected before generation | Prompt plus history already exceeds the token limit | A 400-class error naming the prompt as too long |
| Request rejected for size | Raw body exceeds the byte limit | A 413-class error |
| Output cut short | Prompt fits, but generation hits the ceiling | Truncated answer with a stop reason indicating the limit was reached — check the current name in the API reference |

Everything counts: system prompt, history, retrieved passages, tool results, and the model's own
replies. Token-per-character ratios vary by language and content, so **measure with the `usage`
field on real responses and the token-counting endpoint**, never by estimating.

**Budget, don't fill.** Plan for the largest realistic conversation + retrieved context + system
prompt + working space + a growth margin. Designing toward the ceiling means hitting it in
production.

## Four ways context reaches the model

| Strategy | Fits | Breaks when |
|---|---|---|
| **Monolithic** — everything in one prompt | Bounded tasks with predictable input; stable prefixes that cache well; single-shot Q&A; reasoning that needs all material at once | Context piles up across turns; cost and latency climb linearly, and attention degrades on very long inputs well before the hard limit |
| **Progressive** — carry only what the next step needs | Multi-turn dialogue, iterative refinement, agent loops driven by recent state, workflows with narrow handoffs — **the default for most production work** | Long-range coherence is needed; a detail dropped early matters later; caching suffers because the carried context mutates; the exact input at step N is not reconstructable for debugging |
| **Retrieval** — fetch relevant chunks per query | Knowledge too large for the window; sources changing faster than deploys; queries touching a small slice; citation requirements | Cross-document synthesis; chunks that cut semantic units; recall misses where the right passage never reaches top-k. Retrieval quality becomes a system to maintain |
| **Compaction** — summarise accumulated context | Long-running agents where the full transcript is dead weight but recent state is essential; phase boundaries that can checkpoint; sessions that would otherwise hit the limit | The summary drops load-bearing detail (identifiers, numbers, earlier decisions, an edge case mentioned once). The summariser is a model call with its own cost and failure modes; compaction is one-way; summary fidelity is hard to measure |

Compaction can be done in your application or, where offered, by the API itself; either way the
fidelity risk is yours to test.

## Layer them

Real workloads use all four. A long-running coding session, by phase:

| Phase | What is happening | Strategy |
|---|---|---|
| Start | Task statement and the few named files | Monolithic prefix — small, stable, cacheable |
| Working | Each tool result appends to context | Progressive — recent state is what the next step needs |
| Exploring | Needs a file never loaded; searches, pulls matches | Retrieval on demand — the repo is too big to preload |
| Filling up | Early exploration wastes space; conclusions matter, raw output does not | Compaction — keep what was tried and learned, drop the transcript |

Ask four separate questions: what must be present from the first call (monolithic baseline)? from the
last few steps (progressive window)? on demand (retrieval layer)? what earlier material compresses
without losing decision-relevant detail (compaction policy)?

Strategy and sizing interact but are different decisions; merging them is the common design error.

## Extended thinking

A reasoning pass before the answer, billed as output tokens and paid in latency. On current
models thinking is **adaptive**: the model decides how much to reason, and you steer that with the
**effort** setting rather than a token budget. Legacy token-budget controls are deprecated or
removed on recent generations, and on the top tier thinking cannot be switched off. Verify current
parameter names and per-model support in the platform docs before writing code.

Design decision: **which effort level per route**, chosen by eval on cost, latency and accuracy —
not "maximum because it can't hurt". Where thinking is optional, get the prompt right first and
raise effort only against a measured accuracy gap.
