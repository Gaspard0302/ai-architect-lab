---
name: architect-evals-and-production
description: >-
  Take a Claude-powered system from proof-of-concept to production — build the eval suite,
  gate model and prompt changes, model cost and latency at real volume, judge feasibility,
  add reliability controls, design the enterprise integration layers, and instrument
  observability and A/B or shadow tests. Invoke explicitly (the user asks about evals, "is
  this production ready", swapping a model, cost or latency modelling, feasibility, integration
  layers, observability, or testing an LLM change). Do not self-invoke during ordinary
  implementation.
---

# Evals and production readiness

Two bars, both required: **output quality**, shown by evals, and **system reliability**, shown by
architecture controls. Passing one is not readiness.

## Before you start

Read what exists: where the model is called (SDK import / model id), the prompts, tool
definitions, any `evals/`, `tests/` or fixtures, the deploy config that pins the model version and
route, and whatever logging already runs. Ask for the numbers the repo cannot give you: daily
volume today and at target, the latency deadline users notice, the monthly cost ceiling, and who
signs off when output is wrong.

**If the system exists and has no evals**, do not lecture about evals-first — build the first
suite from production: pull 50–100 real inputs stratified by input type, label expected outputs
(with the domain owner, not alone), start with code-graded checks, and add a judge only for
behaviours code cannot grade. That suite becomes the gate for every change from here on.

Do not invoke sibling skills yourself; name the one that applies and let the user choose.

## 1 — Evals

An eval is a repeatable test that the system returns the expected output. Writing it before (or
as the first step of) the build forces success to be stated measurably, exposes assumptions while
they are cheap to change, and gives you the only instrument that can say whether a change helped.
**A behaviour you cannot write an eval for is a requirement you have not finished stating.**

| Step | Do | Produces |
|---|---|---|
| Define | State the behaviour in measurable terms; write the prompt that exercises it | Task spec with pass criteria |
| Dataset | Collect inputs the system will really see — edge cases and counterexamples included, stratified by type | Labelled golden set |
| Code checks | Format, schema, exact values, lookups against a source of truth | Pass/fail per item |
| Judge | Only for interpretation: tone, reasoning quality, appropriateness | Score + reason per item |
| Read | Overall *and* per-category. A change that lifts the mean and drops a category has not improved the system | Decision |

**Grading ladder — cheapest reliable method first.** Code (fast, free, never drifts) → LLM judge
(rubric, small fixed label set, a *different* model than the one under test) → humans (only where
neither is trustworthy yet; does not scale past sampling).

**Calibrate any judge before trusting it.** Score a human-labelled sample with the judge; require
agreement at least as high as two humans achieve on the same labels. An uncalibrated judge is
worse than none — it produces confident wrong numbers. Prefer many cheaply-graded cases to a few
hand-graded ones; coverage is what catches regressions.

**Thresholds come from the requirement, not the prototype.** Name the behaviour precisely ("extract
filer, reference number, incident date, amount from each document"), set the bar from the business
need (100% on structured fields, under 2% unsupported claims, in-schema 99.5%), list the failure
modes — each becomes a dataset category — and include the ugly inputs: missing fields, handwriting,
odd layouts. A clean-only golden set predicts nothing.

**Every change goes through the suite before production** — prompt edits, context changes,
retrieval reconfiguration, model swaps. Keep the suite current with the system; a revised prompt
scored against a stale set is the classic way a regression reaches users. **Multi-turn behaviour
needs its own suite** of full transcripts: does it keep prior context straight, answer follow-ups
without inventing, and hold quality as the conversation grows?

**Model changes** follow the runbook in `reference/model-change.md`: threshold fixed before the
run, per-slice scores, window and feature parity checked, prompt re-tuned for the target, partial
migration as a valid outcome, rollback trigger named.

## 2 — The POC-to-production gap

A demo proves capability at low volume, on clean inputs, for a patient user. Production exposes
four things the demo cannot show:

| Dimension | Hidden because | Fails as |
|---|---|---|
| Cost | Tens of requests a day cost nothing | The bill exceeds what was approved; architecture renegotiated after launch |
| Latency | One request at a time, median under no load | p95 under concurrency breaks the SLA |
| Reliability | No retries, no fallback — the developer refreshes | One transient API error takes the workflow down instead of degrading it |
| Failure modes | Tested only on expected inputs | Quiet degradation, invented output on edge cases, hard failure on an unseen input class |

Also check, on the POC sample, whether the **business metric** the system exists to improve actually moved. A
system within budget that does not move the metric is still a failed deployment.

### Cost and latency, modelled before the architecture is final

Four inputs: **volume** (from the business owner, not a guess), **tokens per request as a
distribution** (input + output; the tail, not the mean), **model tier**, **sensitivity** (volume
×2, tail shift). Multiply out; compare to the ceiling; if it does not fit, the architecture changes
now, not after launch. Averages understate cost two- or three-fold on skewed workloads.
**Design latency against p95**, because SLA breaches live in the tail.

Levers: **prompt caching** when the prefix is long, stable and reused within the cache lifetime
(writes cost more than reads; content that must reflect live state should not be cached);
**batch processing** when the SLA permits asynchronous work (confirm compliance coverage before
routing governed data through it); **tiering** by route once per-slice evals allow it.

### Reliability controls, and where each lives

| Control | Does | Layer | Rule |
|---|---|---|---|
| Backoff with jitter | Retries transient errors (429, timeouts, 5xx) with growing delays; cap attempts and total wait by what the user tolerates | Around the API call | Never retry non-idempotent tool actions blindly |
| Fallback chain | Serves an alternate tier or a cached response when the primary is down | Orchestration | **May route around a model or tool; may never route around a control point** — a failing guardrail degrades the response, it does not unlock an unscreened path |
| Circuit breaker | Fails fast once a dependency's error rate crosses a threshold | Service boundary | Test the open-circuit behaviour in the eval suite |

A control in the wrong layer protects the wrong thing.

### What breaks first, by architecture

| Architecture | First failure | Mitigation |
|---|---|---|
| Agent | Tool use and context grow until one request blows the budget | Per-turn budget, max tool calls, stopping criteria, minimal tool set — **eval the stopping behaviour** |
| RAG | Retrieval drifts: stale index, query/doc representations diverge | Retrieval metrics in the eval loop; separate live-state questions from static knowledge |
| Document pipeline | No exception path; low-confidence extractions pass as clean | Confidence-score, route low scores to review, put hard documents in the golden set |
| Orchestrator–workers | Fragmented traces; a dropped worker vanishes silently at synthesis | Recoverable vs unrecoverable defined; one trace ID; coverage check — results must equal dispatches |

**Pin model versions in config**, watch deprecations, keep an update runbook. An unpinned model
that rolls forward without re-validation is an audit finding in waiting.

## 3 — Sizing, feasibility, value

Procedure in `reference/sizing-and-roi.md`. Outline: cost model from the four inputs → four
scoping steps (requirement → capability list → owner per capability → boundary conditions → SOW) →
one of three verdicts — **feasible as scoped** (state assumptions; expires when they change),
**feasible with constraints** (each constraint is architecture, documented with its failure mode),
**not feasible** (name the disqualifier; offer the scope change that would flip it) → value
statement built on the same run-cost numbers.

## 4 — Enterprise integration

Order of operations: **compliance filters routes and entry points first**; then identity is
established server-side; authorization is inherited from the systems the model reaches into; PII is
minimised to what the output needs; audit can reconstruct any path. The five layers, the
constraint-to-integration matrix (privilege, HIPAA, GDPR/residency, FedRAMP, internal policy) and
the standing rules are in `reference/integration-layers.md`. The rules people break most:

- Role and data scope come from the auth layer, never from the user's message.
- The context window is not a governance boundary — whatever goes in is in your logs.
- Every tool is attack surface: remove the merely convenient, record why each was removed.

## 5 — Observability

An LLM system does not crash; it returns a plausible wrong answer. Ordinary error logging misses
that entirely, so log **four things per request**: the request (model version, prompt id, input
tokens), the response (output tokens, latency, stop reason), the calling context (role, session id,
cache hit), and the outcome (did the downstream system accept it; any rejection signal). Security
review increasingly treats an unlogged agent action as a forbidden one — confirm what each surface
you use actually records.

Four instrumentation layers: per-request tracing → aggregates (cost/request, p50/p95, task
success, error rate by type) → anomaly alerts (cost spike above a rolling baseline, p95 over the
SLA; drift needs periodic distribution comparison, not a threshold) → change attribution.
**Aggregates catch obvious failures; per-request decomposition catches the small fraction that
burns the budget and answers wrong.**

**Attribute before fixing:**

| Class | Signature | Fix lives in |
|---|---|---|
| Prompt failure | Ambiguous instruction; the model filled the gap | The prompt |
| Ungrounded output | Fluent content not supported by input or source | Grounding — retrieval, tools, verification. **Not a stronger instruction** |
| Model mismatch | Tier too weak for the task, or changed without re-running the suite | Tier choice, via the model-change runbook |
| Orchestration | Worker failure vs orchestrator failure look different | A trace spanning both |

Distinguish **model drift** (behaviour changed on stable inputs), **data drift** (inputs changed)
and **model update effects** (a new version behaves differently). Different causes, different
fixes.

**Testing a change on traffic** — A/B design, the hypothesis template, sample size, shadow testing
and when it is the only acceptable option: `reference/ab-and-shadow.md`.

**Build the business translation at design time**: task success → first-contact resolution,
latency → handle time. Unmapped, the first business review becomes a forensic exercise instead of
a query.

## Artifacts — only when asked

- **Eval plan** — behaviours, thresholds and their source, dataset composition including
  adversarial categories, grading method per behaviour with judge-calibration evidence, gate rule.
- **Cost and latency model** — volume, token distribution, tier, projected monthly cost vs ceiling,
  sensitivity, caching assumptions.
- **Feasibility verdict** — verdict, constraints with failure modes, invalidating assumptions.
- **Model-change record** — per `reference/model-change.md`.
- **Production readiness checklist** — quality bar, reliability controls by layer, observability
  fields, pinned version, runbook.

## Hand-offs

Name the skill; do not invoke it.

- Pattern, architecture, model and context strategy → `architect-solution-design`
- Guardrails, fail-closed rule, human-review routing, control register →
  `architect-responsible-ai`
- SLAs and the feedback loop above observability, business-case presentation, handoff
  documentation → `architect-discovery-and-tradeoffs`
- Runbooks and team support after launch → `architect-team-enablement`
