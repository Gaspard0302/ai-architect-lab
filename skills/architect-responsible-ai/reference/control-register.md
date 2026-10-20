# Compliance control register

One row per obligation. A row missing its owner or its evidence does not pass review.

| Obligation (source) | Control that achieves it | Evidence a reviewer will accept | Owner |
|---|---|---|---|
| Health data processed only under a covered agreement (HIPAA) | Use only the plan or API configuration that is covered by a signed BAA, with the compliance setting on and only eligible features enabled | Signed BAA; screenshot of the compliance setting; list of enabled features | Security lead |
| Government workload runs at the required authorization level (FedRAMP) | Serve exclusively through a route that holds the authorization at that level | The route's authorization record; deployment config proving no other route is reachable | Platform owner |
| Data stays in an approved region (residency) | Configure regional processing and storage, then trace every derived copy — logs, caches, monitoring, backups — and keep each inside the boundary | Region configuration plus a data-flow diagram listing where each copy lives | Data owner |
| Any decision reconstructable on request (transparency; several frameworks) | Decision logging (see `fairness.md`) retained for the required period and queryable | A live reconstruction of one real past decision, run in front of the reviewer | Architect |

## Building it

1. **List the obligations** — regulation, customer contract, internal policy. The route
   pre-filter you did earlier already surfaced most of them.
2. **Write a control specific enough that someone else could verify it.** "Encrypt data" is not a
   control; "field-level encryption of columns X, Y with keys in KMS ring Z" is.
3. **Name a person.** Teams do not own controls; people do.
4. **Name the evidence and confirm it exists today.** If it does not exist, the control is not
   live yet — mark the row as open.
5. **Chase the copies.** Residency and retention claims break in the secondary paths — logs,
   caches, monitoring exports, backups, vendor telemetry — far more often than in the primary
   store.

## Two traps

- **"Not used for training" ≠ "not retained".** These are independent assurances. State which
  one each row relies on.
- **A compliant route is not a control.** Passing the pre-filter shows the obligation *can* be met
  on that route. Only the control + owner + evidence show it *is*.

> Working format, not legal advice. Route eligibility and feature coverage change; verify against
> the vendor's current documentation and run the register through your compliance team.
