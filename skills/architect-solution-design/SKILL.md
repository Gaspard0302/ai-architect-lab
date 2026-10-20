---
name: architect-solution-design
description: >-
  Design the shape of a Claude-powered feature — split the work between the model, existing
  systems and humans, pick augmented-call vs workflow vs agent, choose the model and context
  strategy, and place the entry point. Invoke explicitly (the user asks to "design",
  "architect", or "review the architecture of" an AI feature, or asks whether something should
  be an agent). Do not self-invoke during ordinary implementation.
---

# Solution design for Claude-powered systems

A procedure, not a checklist. Work the phases in order; each phase narrows the options for the
next. State which phase you are in, the decision, and the reason it beat the alternative. A
decision with no stated reason is not a design.

## Before you start

**If the system already exists**, read before designing: every place the model is called (search
for the SDK import or model id), the system prompt(s), tool definitions, any `evals/` or test
fixtures, and the deploy config that fixes the model version and route. Then run the phases as a
review — each phase either confirms an existing choice or produces a finding.

**Ask the user for the four numbers the repo cannot tell you:** expected daily volume, the
user-visible latency deadline, the cost ceiling per request or per month, and who signs off when
the system is wrong. If they do not know, proceed with explicit assumptions and list them as open
risks; do not silently pick values.

Do not invoke sibling skills yourself. When a question belongs to one, name it and let the user
decide.

## Phase 0 — Which model properties bind here

| Property | Reliable at | Unreliable at | Design response |
|---|---|---|---|
| Next-token prediction | Language work with plenty of pattern: summarising, reformatting, explaining | Exact specifics — names, figures, dates, citations | Cite sources; signal uncertainty; verify with a second pass; send lookups to a tool |
| Knowledge | Common, stable, well-documented topics | Rare, private, contested or fast-moving topics | An external system is the source of truth: retrieval, tools, search |
| Working memory | Whatever is inside the context window | Everything outside it — a cliff, not a slope | Load progressively; chunk; summarise across turns |
| Steerability | Short, concrete, checkable instructions and explicit formats | Abstract goals, long reasoning chains, arithmetic and strict logic | Structured outputs; code execution for anything that must compute |

**A property binds when the task's input or output touches its "unreliable at" column.** Name
the binding ones; they drive everything below.

What you are really designing around:

- **Non-determinism** — one good run proves nothing; you certify distributions, not demos.
- **Finite context** — what goes in, in what order, and what is left out are priced decisions.
- **Fluency ≠ correctness** — wrong answers sound like right ones, so verification and human
  placement are architecture.
- **Knowledge edges** — for private or moving facts, the model must never be the source of truth.

## Phase 1 — Who owns each step

Produce a **delegation map**: every step lands with exactly one owner.

| Owner | Takes |
|---|---|
| Claude | Understanding, summarising, planning, drafting, tool-mediated action |
| Existing systems | Anything already correct and already paid for: rule engines, lookups, systems of record, live-state services |
| Humans | Judgement, exceptions, approvals — where the routing rule below fires |

The question is not "where could Claude help?" but **"where do the binding properties argue for
Claude rather than the component that already gets this right?** Everything else stays where it is.
Over-assigning to the model buys latency, cost and opacity.

**Assign to a human when the review-routing rule fires: confidence is low AND the action is
irreversible or high-cost.** That rule, its placements and the reviewer payload are owned by
`architect-responsible-ai`; do not re-derive it here.

**The trap: a deterministic rule in a probabilistic component.** Thresholds, tiers, eligibility,
priority, entitlement, totals, live status — anything that must be right every time goes in code.
In a prompt it passes the clean demo cases and quietly fails the messy ones, with no error thrown
and nothing to audit until someone checks months later. If a rule matters to the business it must
be tested, monitored and owned — which prompts are not.

Steps often split: *draft* (Claude) / *send* (system) / *approve above a threshold* (human).

## Phase 2 — Pick the pattern

| Pattern | Control flow lives in | Use when |
|---|---|---|
| **Augmented call** | Your code; one bounded model call with tools/retrieval if needed; nothing branches on the model's decision | Task is well-defined and the output is checkable |
| **Workflow** | Your code; named steps, each may call the model; loggable, testable, guardable between steps | Steps can be enumerated in advance and error cost is real |
| **Agent** | The model; a goal and tools, it chooses the sequence | The path genuinely cannot be enumerated **and** an unexpected result is acceptable and recoverable |

**Elimination rules — apply in order, each rules a pattern out:**

1. Can the steps be listed in advance? **Yes → not Agent.** (If you could write the steps in
   code, a workflow was available, with its logs and step-level guards.)
2. Must a wrong intermediate result be caught before the next step acts on it? **Yes → not
   Augmented.**
3. Would ops need to reconstruct *why* a result happened? **Yes → not Agent** unless you can
   log and alert on trajectories, which most tooling cannot.
4. Is there a user-visible deadline? **Agent latency is open-ended → budget the worst case or
   not Agent.**
5. Volume × context growth: **Agent cost compounds with retries and turns → not Agent unless
   the budget survives the worst case.**

Then check the survivor against *every* factor. A survivor that still fails one means re-scope
the task, not pick a different pattern. "It feels open-ended" is not an answer to rule 1 — being
not yet knowing how to structure the work is not the same as the steps being unknowable. Most
"agents" in production turn out to be a router in front of a handful of chains.

If it is an Agent, bound it: narrow tool surface, per-turn budget, explicit permissions, stopping
criteria. These are mandatory, not tuning.

### Workflow sub-shapes

| Shape | Structure | Earns its place when |
|---|---|---|
| Chain | Output of step N feeds step N+1 | Clean stage boundaries: extract → classify → summarise |
| Route | Classifier picks the downstream path | Inputs differ in kind and need different handling |
| Parallel | Independent calls, results merged or voted | Sub-tasks do not depend on each other |
| Evaluator–optimiser | Generate → grade against a rubric → revise; exit on pass or retry cap | Quality is checkable but one attempt is not reliable enough |

Combine freely; start with the simplest shape that meets the error and observability requirement
and escalate only when measurement says so.

**Before fine-tuning**, in order: fix the prompt → add tools or retrieval → strengthen the pattern
(evaluator–optimiser) → then consider fine-tuning, and only for very high volume where inference
cost binds, latency-critical paths where a small specialised model wins, or a format prompting
never pins down. Confirm it is available for the model before proposing it.

**Packaging**: prompt-only → direct tool use → a versioned Skill, once the same procedure repeats,
must be shared across teams or products, or needs rollback.

## Phase 3 — Multi-agent, only when one context cannot hold the work

An **orchestrator** owns the goal, splits it, delegates, and synthesises — it never does the
sub-task itself. **Subagents** run in their own context and return one scoped result.

Design explicitly: how work is split, the result schema each subagent returns, and how the
orchestrator resolves conflicts and gaps. Subagent failures are recoverable (retry, reroute, flag);
orchestrator failure loses the goal and the partial synthesis — so make subagent work idempotent,
checkpoint orchestrator state, and carry one trace ID across the run.

**The silent failure**: a subagent times out or returns empty and the orchestrator writes a
confident, complete-looking summary over the hole. **Require a coverage check at synthesis: results
received must match units dispatched, otherwise the run reports the shortfall before anyone reads it.**

Human gates in agent designs follow the routing rule from Phase 1.

## Phase 4 — Fit a reference architecture

| Architecture | Good shape | Failure shape |
|---|---|---|
| Agent | Goal + tools, narrow surface, turn budget, a measurable success criterion | State-changing tools, no turn cap, no success measure |
| RAG | Stable corpus, chunked and indexed; relevant chunks retrieved per query | Pointed at **live state** — status, stock, queues. An index is a snapshot |
| Document pipeline | OCR → schema-constrained extraction → validation → exception routing | No exception path; low-confidence extractions pass as clean |
| Triage / routing | Classify, then route: retrieval for docs, API for live state, human queue for high stakes | Retrieval answering live questions; no escalation; agent shipped before the routed workflow was measured |
| Coding agent | Agentic *investigation*, deterministic edit/test/review, human review gate | Edit-and-commit with no gate; no regression eval per stack |

**The most common mistake: retrieval where a tool call belongs.** Symptoms: stale answers, results
that change after a re-index, answers contradicting the database. No embedding model fixes it —
call the system that owns the state.

Two patterns in one system is fine when the halves **break differently**: different error owner,
different retry semantics, or different SLA. A second pattern chosen because the problem is not yet
understood is a deferred decision, not a design.

## Phase 5 — Model, context, prompt

Detail in `reference/context-strategy.md`; decisions in brief:

- **Model: start on the mid tier (Sonnet).** Go up only when an eval shows a quality gap; go down
  only when an eval confirms the trade is acceptable. Tiers differ in context window size and
  feature support, not just quality — check both before assuming a swap is quality-only. The
  gated model-change procedure lives in `architect-evals-and-production`.
- **The window is a ceiling, not a budget.** Budget largest realistic conversation + retrieved
  context + system prompt + working space + growth margin; measure with the API's `usage` field,
  not character counts.
- **Default to progressive context**; layer stable-prefix, retrieval and compaction deliberately.
  Strategy and sizing are separate decisions.
- **Thinking is a cost/latency dial.** On current models it is adaptive and controlled through the
  effort setting; on the top tier it cannot be disabled. Choose the effort level per route by
  eval, not by "it can't hurt".
- **Prompt**: role and scope, constraints, an output contract. Enforce hard rules *structurally*
  (schema, validator) rather than as a sentence — sentences drift. Hunt for what the prompt fails
  to say; silence is filled differently each run.
- **Technique**: zero-shot first; few-shot when the format is easier shown than described;
  chain-of-thought only when the reasoning path decides the answer.
- **Caching keys on a stable prefix**: fixed instructions first, per-request content last.

`reference/rag-pipeline.md` when retrieval is in the design; `reference/entry-points.md` for entry
point, build-time interface and delivery route.

## Artifacts — only when asked

Reason in the conversation by default. When asked for the design in writing, produce exactly:

1. **Delegation map** — step → owner → reason
2. **Pattern decision** — the pattern, the rule that eliminated the others
3. **Architecture** — reference shape, components, human gates
4. **Model and context strategy** — model, budget, strategy mix, effort level
5. **Open risks** — unverified assumptions and what would change the design

One ADR per contested decision if the repo has an ADR convention.

## Hand-offs

Name the skill; do not invoke it.

- Evals, model-change gating, cost/latency modelling, integration layers, observability →
  `architect-evals-and-production`
- Guardrails, injection, the human-routing rule, compliance controls → `architect-responsible-ai`
- Requirements discovery, tradeoff presentation, SLAs, documentation →
  `architect-discovery-and-tradeoffs`
- Team rollout, Skills distribution, runbooks → `architect-team-enablement`
