# Testing an LLM change on traffic

## A/B test — four required parts

| Part | Requirement | Why LLM systems are stricter |
|---|---|---|
| Hypothesis | Treatment, primary metric, minimum effect, constraint — all written before the run | "The new prompt is better" cannot be falsified |
| Assignment | Random, and consistent within a session | A user who sees both variants mid-conversation contaminates both arms |
| Primary metric | Fixed before the run | Output variance is high; with enough metrics one always moves the right way — picking afterwards is outcome-shopping |
| Sample size | Computed from the metric's observed variance (take it from a shadow run or recent logs) and the minimum effect you care about | Non-deterministic output inflates variance, so samples must be larger than for ordinary software. A 50-session comparison is a smoke test, not evidence |

Template: *"Changing ⟨X⟩ to ⟨Y⟩ will raise ⟨primary metric⟩ by at least ⟨N⟩ without degrading
⟨constraint metric⟩."*

Before declaring a winner ask two things: is the effect large enough to justify maintaining the new
variant, and did a secondary metric (cost, latency, refusal rate) degrade? A 4-point lift in task
success at 30% more cost is not automatically a win.

**Interaction with input type** is the trap peculiar to these systems: a change that helps typical
inputs can hurt a rare category that is common in a seasonal spike. Align the test window with the
input distribution you actually need to cover, and read results per slice, not only overall.

## Shadow testing

Run the candidate on a copy of live traffic while every user keeps receiving the current version;
log and score the candidate's outputs offline against a rubric or golden answers. The deployment
decision is made before any user sees the change.

Choose shadow over A/B when:

- a single bad output carries unacceptable risk (regulated or high-stakes workflows — often the
  only acceptable option there);
- traffic is too low for a live split to reach significance in useful time;
- you need to validate a model change before committing (see `model-change.md`).

Cost: no downstream signal. Nobody acted on the candidate's output, so you cannot measure real
user behaviour — only rubric or golden-answer agreement. Follow a passing shadow run with a small
A/B when user behaviour is the metric that matters.
