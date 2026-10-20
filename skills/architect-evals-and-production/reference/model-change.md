# Gating a model change

A model swap is a behaviour change and ships like one. Applies to tier changes (Sonnet → Haiku,
Sonnet → Opus), generation upgrades, and forced migrations off a deprecated version.

## Runbook

1. **Inventory.** Find every place the model id is set — config, env vars, SDK defaults, per-route
   overrides, eval harness. Confirm all are pinned to explicit versions. An unpinned id means the
   swap may already have happened without you.
2. **Check parity before quality.** Compare the target's context window, feature support
   (structured outputs, tool use variants, thinking controls, caching) and rate limits with the
   current model. A smaller window means requests that used to succeed now fail with size errors —
   that is a correctness regression no eval score will show. Fix or filter those first.
3. **Re-tune the prompt for the target.** The unit under test is the prompt + model pair. A
   prompt tuned for a stronger model usually needs more scaffolding on a weaker one and less on a
   stronger one. Judging the new model with the old prompt untouched measures the wrong thing.
4. **Fix the acceptance criterion before running.** Write down: the metric, the overall floor,
   and the **per-slice floor** — e.g. "reject if any input type scores below 0.85". A threshold
   set after seeing results is a negotiation with yourself, not a gate.
5. **Run the suite, read per slice.** Stratify the golden set by input type and score each
   stratum. Averages hide concentrated losses.
6. **Shadow on live traffic** if the stakes or the traffic volume warrant it (see
   `ab-and-shadow.md`): run the candidate on a copy of real requests, score offline.
7. **Choose among three outcomes:**
   - **Migrate** — every slice clears its floor.
   - **Partial migration** — route the failing slices to the current model through the existing
     classifier and the rest to the new one. Often the real win: most of the cost saving, none of
     the regression.
   - **Reject** — record which slices failed and by how much; revisit when the prompt or the
     model improves.
8. **Name the rollback trigger** before cutover: which production metric, over which window,
   flips the config back. Keep the old version pinned and reachable until the window has passed.

## Worked shape (illustrative numbers)

A procurement-document pipeline considers moving from the mid tier to the small tier to cut cost.
Golden set: 300 hand-checked documents across six document types. Criterion set in advance:
overall ≥ 0.90 and no type below 0.85.

Result: overall 0.91 — passes. Per slice: four types between 0.90 and 0.95; two types
(multi-currency invoices, scanned handwritten forms) at 0.78 and 0.81. The migration as proposed
is rejected by the per-slice rule despite the passing average. Outcome chosen: partial migration —
the two failing types stay on the mid tier via the existing router, the rest move. Cost falls by
roughly two thirds of the projected saving with no measured regression.

The transferable lesson is not the numbers: the criterion existed before the data, and per-slice
scoring turned a rejection into a partial win the average would have hidden.

## Record

model from → to · date · parity check result · prompt changes made · criterion (set when) ·
per-slice scores · outcome · rollback trigger and owner
