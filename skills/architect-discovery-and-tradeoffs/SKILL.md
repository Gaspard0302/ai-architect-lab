---
name: architect-discovery-and-tradeoffs
description: >-
  Run the stakeholder side of an AI project — prepare and run discovery, turn vague asks into
  testable constraints, present design tradeoffs so a non-technical owner can decide, write
  documentation that survives handoff and audit, set the SLA and governance table, and report
  outcomes. Invoke explicitly (the user is preparing a discovery call, a design review, a
  stakeholder presentation, an SLA, a handoff document, or an outcome report). Do not self-invoke
  during ordinary implementation.
---

# Discovery, tradeoffs, and the deployment lifecycle

This skill covers the parts of an AI project that happen between people rather than between
components. Every stage has the same failure: a plausible artifact produced before the
translation work is done — a confident architecture sketch after a 30-minute call, a
recommendation with no stated downside, a dashboard with no owner, a diagram with no rationale.

Sections follow the lifecycle: **1 discovery → 2 design tradeoffs → 3 handoff → 4 monitoring
and iteration → 5 outcome**. Say which stage you are in, and check the previous stage's exit
criterion before moving on.

## Before you start

**Read** whatever exists before proposing anything: prior design docs or ADRs, the POC and its
eval set, the SOW, tickets, the current dashboards. **Ask**, if not already clear: who is in the
room and what each can decide alone (§1 stakeholder map); what the next irreversible commitment
is (a budget, a vendor route, a launch date); and which stage the project believes it is in.

**Stop and route** when the ask is actually a component decision: architecture or pattern →
`architect-solution-design`; evals, cost model, feasibility → `architect-evals-and-production`;
controls and risk → `architect-responsible-ai`; team rollout → `architect-team-enablement`. Name
the skill; do not invoke it.

If a design already exists, run §1 backwards on it (see "Starting mid-project") first.

## 1 — Discovery: preference → constraint

### Before the first call

Do not wait for the stakeholder to volunteer constraints. Walk in with these, adapted to the
domain:

1. Walk me through how this is done today, step by step — who touches it, in which system.
2. How many cases per day / month, and how many people work them? Peak vs typical?
3. How long does one case take today, and where does the time go?
4. What does a wrong outcome cost, who catches it today, and how long until it is caught?
5. Which parts are already automated or rule-based upstream and downstream?
6. What must never happen? What always goes to a person?
7. Which regulation, policy or audit applies, and who owns that relationship?
8. **What number should be different in six months, and what is it today?** Capture the
   baseline and its exact definition now — it cannot be reconstructed later, and §5 needs it.
9. Who signs off on the design, who pays, and who can veto?

### Stakeholder map

Fill this before translating anything; §2, §3 and the translation table all need named owners.

| Role | Who | Decides | Will ask |
|---|---|---|---|
| Sponsor / budget holder | | Spend, timeline, go/no-go | Value, payback, risk to them |
| Decision owner for the design | | Tradeoffs in §2 | Why this over that; reversal cost |
| End users / operators | | Nothing formally — but adoption | Will it make my day worse? |
| Compliance / legal / model-risk | | Veto on route, data, controls | Evidence, obligations, retention |
| Security / IT | | Veto on integration, identity, tools | Where does data go; who can act |
| Owner of the baseline metric | | Whether "after" was measured the same way | Definition, window, source system |

The people describing the work are usually the users, not the buyer or the veto holders. If a row
is empty, that is a finding: the decision has no owner yet.

### Translation

Stakeholders describe outcomes, not constraints. Treat every experience word — *seamless, simple,
fast, intuitive, safe, careful* — as a flag that more questions are needed. For each, ask *what
would make it feel the opposite?* — the answers are the constraints (a latency ceiling, a
no-re-entry rule, a quiet human handoff). Then ask what the user must never notice, what must
happen invisibly in the background, and what must remain true when something goes wrong.

**Force every statement into four buckets:**

| Bucket | Question to ask | Why stakeholders skip it |
|---|---|---|
| Must do | Which outcomes does the system own? Which stay with an existing system or a person? | They describe features, not the split of responsibility |
| Must not do | What is prohibited? What always routes to a human? | Nobody volunteers boundaries; ask directly |
| Must cost | Latency target, per-interaction ceiling, volume forecast | They assume cost is your problem |
| Must prove | What evidence must exist afterwards — audit trail, sign-off record, **the before/after on the baseline metric** | Proof obligations surface only in legal review unless you ask |

A constraint is usable when it is **testable and bounded**. "Fast" is not; "p95 under 2 s at
forecast volume" is.

**Output: the translation table.** One row per statement, in the stakeholder's own words:

| Stakeholder said | Implied constraint | Design decision it forces | Assumption to confirm (owner) |
|---|---|---|---|

The fourth column protects you: anything inferred but not confirmed goes there with a named
person from the stakeholder map. Common rows: "it just reads and routes" → routing is probably a
deterministic rule that stays outside the model; "people will review it anyway" → a mandatory
human gate, confirm who and when; "we're in healthcare / finance" → a proof obligation, confirm
scope with compliance.

**Exit criterion:** stakeholder map filled; baseline metric captured with definition and source;
no experience words left untranslated; every row has a confirmed constraint or an assumption with
an owner. If the table cannot be filled, say so instead of sketching an architecture.

**Starting mid-project.** If a design exists, reverse-engineer the table from it: list every
design decision, ask which constraint justifies it, and flag decisions with no constraint behind
them as unexamined assumptions.

## 2 — Tradeoffs: make the decision possible, don't make it

Your job in a design review is not to have resolved the tradeoff; it is to describe it so the
decision owner can choose and defend the choice later. A recommendation with no stated downside is
weak even when it is right — when the downside shows up, the stakeholder feels they approved
something they did not understand.

**The four-question frame** for every meaningful decision:

1. What do we gain?
2. What do we give up?
3. What does it cost to reverse this later, once the system is built around it?
4. (Regulated) What does it do to our compliance posture?

Question 3 turns "which is technically better" into "which is the better business choice", and it
is the one most presentations omit. Always answer it explicitly.

**Present a package, not a verdict:** options considered, criteria used, recommendation, residual
risks. Lead with the business outcome; state limits plainly (a security stakeholder trusts the
system whose limits are named); hand over the justification the owner will need when their own
leadership asks.

**Translate architecture into consequences.** Rows to reuse:

| Decision | Gain | Give up | Reversal cost |
|---|---|---|---|
| Whole document in context vs retrieval over chunks | Simpler build, everything in view | Per-call cost and latency grow with volume — check prompt caching before treating the cost as fixed | Re-architecting after a production cost spike, plus the credibility hit |
| Less logging for lower latency | Faster perceived response | Visibility into each interaction | In a regulated workload, a compliance gap needing remediation |
| One delivery route vs several | One auth/logging profile, less build | Flexibility for regional, compliance or procurement needs | A blocked cutover when a late residency requirement appears |

**Objections come in three kinds; answer each differently.**

| Objection | Asks | Respond with |
|---|---|---|
| Capability | Can it do this at all? | Evidence — eval results, a scenario-specific demo |
| Governance / compliance | Can it be controlled and evidenced? | The control register (defined and owned by `architect-responsible-ai`) and the guarded path |
| Design choice | Why this instead of that? | The four-question frame: the tradeoff made and what the alternative would have cost |

**Demos:** show the buyer's workflow with their data shapes, not a feature tour. Choose beforehand
the one or two limits you will state openly, why each exists, and the plan when a case falls
outside them. A limit found mid-demo costs trust; one declared up front earns it.

**Exit criterion:** every recommendation has a written gain / give-up / reversal-cost triple and a
named decision owner from the §1 map.

## 3 — Handoff documentation

One document, three readers. Detailed but built for one reader is still incomplete.

| Reader | Needs | Test |
|---|---|---|
| Inheriting engineer | Decisions **and rejected alternatives, with the reason each was rejected** | Could they distinguish a structural choice from a mere preference? |
| Compliance reviewer | Obligation → control → owner → evidence artifact (the control register from `architect-responsible-ai`) | Evidence, not assertions — is the artifact current? |
| Returning architect (you, later) | Dated decisions, assumptions labelled as assumptions, open items with owners and resolution criteria | Could a capable architect with no prior involvement change it safely from this alone? |

**Completeness checklist** — every decision entry carries: decision (dated), rejected
alternatives, the tradeoff it resolved (gain / give-up / reversal), owner, evidence artifact,
audit-ready status.

A diagram says what the system is. Without the rejected alternatives, a successor will reverse
the right call for a wrong reason, or defend a wrong call, because they cannot see the tradeoff
it resolved.

**Exit criterion:** a reader who was not present can name each load-bearing decision, the
alternative it beat, and the evidence artifact — without asking you.

## 4 — Monitoring and iteration: SLA and governance table

Observability produces signals; it does not produce decisions. Drift is gradual — nothing breaks,
quality erodes — so a team without a decision layer notices only after users do. The loop the
team must own: **observe → sort by urgency → decide who acts → change something → check the
change worked, and whether the rule itself should change.**

**An SLA names three things:** the metric (with its measurement window), the breach condition,
and the consequence of a breach. Every threshold traces to a source or it is a number someone
liked:

- latency → the user-experience expectation from §1
- availability → how much the business depends on the deployment being up
- quality → the eval acceptance criteria already agreed (`architect-evals-and-production`)
- cost → the "must cost" envelope from §1

**Cost is the expectation that breaks first.** Production volume routinely runs 10–100× the
pilot. Give the sponsor a consumption forecast at production volume and state the spend controls
(caching, tiering, budget alerts) before invoice one arrives.

**Governance table — build it before launch, one row per signal:**

| Signal | Metric & window | Breach threshold (source) | Owner | Action on breach | Scheduled check (regulated) |
|---|---|---|---|---|---|
| Quality | Eval pass rate per category, per release and weekly on sampled production | Below the agreed threshold (eval criteria) | Product owner + eng lead | Attribute prompt vs data vs model drift; iterate or re-architect; inform sponsor if threshold must move | Periodic output audit on a schedule, regardless of score |
| Latency | p95 over a rolling 15 min | Above the UX budget (§1) | On-call engineer | Find the bottleneck by step; escalate if the budget itself is wrong | Only if latency hides a logging gap |
| Cost | Cost per interaction, daily | Above the §1 envelope; spike > agreed % over 7-day baseline | Sponsor's delegate | Identify the driver; bring a tradeoff (§2) if the budget must move | Only if cost is a regulated constraint |
| Configuration / residency | Route, region, pinned model id | Any drift from the recorded configuration | Platform owner | Revert and record; notify compliance | Confirmation on the compliance schedule |

Scheduled rows are design-time obligations: if they are not in the table before launch, they
surface when a reviewer asks for the record. The incident **runbook** (symptom → cause → action)
is a separate artifact owned by `architect-team-enablement`; this table decides *who acts on
which signal*, not how to diagnose.

**Exit criterion:** every row has a metric with a window, a sourced threshold, a named owner and
an action; no threshold without a source.

## 5 — Outcome document

Six fields, written for someone who never saw the build:

| Field | Records |
|---|---|
| Use case with scope boundary | What it does and does not do |
| Metric before | The §1 baseline — number, definition, source, date |
| Metric after | Same metric, same definition, same source, after |
| Control in place | What makes the before/after auditable rather than asserted |
| Measurement owner | Who keeps measuring after the engagement |
| Reuse potential | How the pattern transfers elsewhere |

Volume, latency and error rate say the system runs. A before/after on the business metric the
use case targeted, backed by a control, says what it is worth.

Multi-route deployments (direct API and cloud-mediated routes) add route-specific identifiers,
regions and feature lag; the route choice and the entry-point responsibility map are design
decisions owned by `architect-solution-design/reference/entry-points.md`. Here, only confirm the
recorded route and region match what compliance approved.

**Exit criterion:** before and after use one metric definition, and a named owner will still be
measuring it in six months.

## Artifacts — only when asked

- **Discovery pack** (§1) — stakeholder map, baseline metric, translation table.
- **Decision package** (§2) — options, criteria, recommendation, residual risks, with the
  gain / give-up / reversal-cost triple per option.
- **Handoff document** (§3) — completeness checklist per decision; carries the control register
  forward.
- **Governance table + SLA** (§4).
- **Outcome document** (§5).

Default to reasoning in the conversation; write files when the user asks for a document or
explicitly wants a handoff/audit artifact.

## Hand-offs

Name the skill; do not invoke it.

- Turning confirmed constraints into a pattern, model, entry point and delivery route →
  `architect-solution-design`
- Eval thresholds the SLA quality line traces to, observability fields, cost modelling, sizing
  and ROI → `architect-evals-and-production`
- The control register, guardrail placement, compliance obligations → `architect-responsible-ai`
- Rolling the deployment out to a team, the incident runbook, escalation →
  `architect-team-enablement`
