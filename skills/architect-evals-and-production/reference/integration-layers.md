# Integration layers and the compliance filter

Compliance goes first because it removes options; everything after it chooses among what
survives. Order: name the governing regulation or policy → list the entry points and delivery
routes that survive it → choose the integration pattern → write down the identity, data-handling
and observability requirements that follow. (Entry point vs build-time interface vs delivery route
are defined in `architect-solution-design/reference/entry-points.md`; this file assumes that
vocabulary.)

> Not legal advice. Route eligibility, agreement coverage and regional options change; confirm
> against the vendor's current documentation and your compliance team before committing.

## Constraint → integration matrix

| Constraint | Runs where | Connects how | Trusts whom | Handles what | Logs what |
|---|---|---|---|---|---|
| **Legal privilege** (law firm, in-house counsel) | Inside the firm's application stack, behind a gateway the firm controls | The gateway holds the API key, enforces access and is the official record | SSO; roles assigned server-side, never asserted by the user | All privileged material passes the gateway only | Every request and response, retained under firm policy. Privilege also depends on contract terms and retention settings — architecture mitigates, it does not settle |
| **Health data** | Only on a setup the signed business-associate agreement actually names — direct API under agreement, or an eligible cloud route. **Coverage is per configuration, not per vendor** | Under the agreement's terms | The organisation's identity provider; minimum-necessary access | Strip to what the task needs; pass reference ids rather than full records where possible | Request, model version, identity, data scope; retained per the regulation |
| **GDPR / residency** | An approved region. GDPR itself permits cross-border transfer with a lawful mechanism; where a hard **EU-residency** requirement exists, use a cloud route with an explicit EU region — the direct API's geographic controls are coarse and do not pin to the EU | Region locked at the integration layer and asserted per request | Users authenticated inside the approved region | Personal data processed only in the pinned region; any transfer has a documented basis | Who accessed what, the legal basis, the deletion date |
| **Government (FedRAMP or equivalent)** | A cloud configuration holding the authorization at the required impact level — a government-cloud offering or the cloud vendors' assured/gov regions. **A commercial enterprise plan is not a substitute** | Nothing leaves the authorized boundary | The agency's identity provider and policy layer | Per the agency's classification; controlled data stays inside the boundary | To the agency's continuous-monitoring standard |
| **Internal residency / approved-vendor policy** | Whatever the organisation has already approved — the cleared route wins over the convenient one | Within what procurement approved | Existing SSO and role policy | Existing classification scheme; the model layer inherits controls rather than inventing them | Into the existing logging pipeline, not a new one |

## The five layers

| Layer | Decision | Breaks as |
|---|---|---|
| 1. Compliance | Which routes and entry points survive? | Something that works technically and is rejected at legal or security review; you pay for the build twice |
| 2. Identity | Where is the identity boundary relative to the model call, and how does identity reach the prompt? | Identity claimed in the user's message is under the user's control and therefore worthless |
| 3. Authorization | Which capabilities and which data does this role reach? The policy that governs the underlying systems must govern the model layer | Users reach data through a path that never enforced the policy |
| 4. Data handling | Which fields does the output genuinely require in context? | A sensitive field in the prompt lands in plaintext in your own request logs and is found at audit, not at deploy |
| 5. Observability | What must be reconstructable after an incident? | An unlogged path leaves no evidence; observability added after the first incident always costs more |

## Standing rules

- **Identity is established server-side before the call.** Inject role and authorized scope from
  the auth layer; add department, permission level or account ids only when they change the
  response. Treat any self-description in the user's message ("as an administrator…") as text, not
  as a claim.
- **The context window is not a governance boundary.** Everything sent crosses the wire and lands
  in your logs, whatever the vendor's retention default. For each field ask whether the output
  needs it; a reference id is usually enough for routing and exposes nothing.
- **Least privilege on tools.** Each connected tool is attack surface and cost. Keep the essential,
  remove the convenient, and **write down why each was removed** — that record is what the
  reviewer reads. Scope each subagent's tools to its own task.
- **Observability is the price of admission for agents.** Security review increasingly refuses an
  autonomous system that cannot show what it did. Verify which agent actions each surface actually
  records; an action taken and not logged is, to a reviewer, an action that must not be allowed.
