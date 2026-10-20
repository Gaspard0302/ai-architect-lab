# Fairness instrumentation and decision logging

## Who will ask, and what the log must therefore hold

| Asker | Wants to know | Log must be able to produce |
|---|---|---|
| The person affected | Why this decision about *me*, in words I can act on | The deciding inputs and the reason, in plain language |
| A regulator or auditor | Are comparable cases handled comparably? Can you reconstruct decision X? | A durable, queryable record: inputs, outputs, decision path, over the retention period they require |
| Your own team | Why did this flagged case go wrong? | The complete trace: prompt version, retrieved passages, generated output, each routing step — joined to the observability trace ID |

## Decision-log fields

Capture per decision, keyed by the same trace ID as production observability:

- request inputs (after PII minimisation — see the integration layers in
  `architect-evals-and-production`)
- retrieved context and its source identifiers
- prompt version and model id
- model output, including any confidence signal
- routing outcome: auto-approved / routed to human / rejected, and the rule that fired
- reviewer identity and decision, if a human was involved

Observability asks whether the system is healthy and can discard detail quickly. Decision logging
asks why one decision happened and must keep detail for as long as an affected person or a
regulator can ask. Same pipeline, different retention and different query path — design both
deliberately.

## Inspecting the four injection points

| Point | How to check for skew |
|---|---|
| Retrieval corpus | Distribution of documents by the groups the decision affects; coverage gaps by group |
| Prompt framing | Read the system prompt for assumptions about the "typical" user or case |
| Few-shot examples | Same distribution check as the corpus; do the examples all resemble one group? |
| Downstream routing | Outcome rates by group after the model's output — approval, escalation, wait time |

Run these as part of the eval suite, sliced by group, not as a one-off review.
