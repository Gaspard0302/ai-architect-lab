# Retrieval pipeline design

Open this only after retrieval has been chosen. Retrieval serves a **stable corpus**. Live state —
an order's status, stock levels, a queue, a balance — is answered by calling the system that owns
it. An index is a photograph of the corpus at index time; better embeddings do not make it live.

## Decide the chunk by the corpus shape

| Chunking | Mechanism | Choose for |
|---|---|---|
| Fixed-size | Equal spans with overlap, structure ignored | Uniform prose with no useful boundaries; cheapest to run |
| Semantic | Split where the topic shifts, so each piece stands on its own | Narrative text where a retrieved passage must be self-contained to be useful |
| Hierarchical | Keep the document's own sections and retrieve at the granularity that fits the query | Contracts, manuals, policies — anything where the section header carries meaning |

A mixed corpus gets mixed chunking: numbered clauses hierarchically, free-form reports
semantically.

## Decide the index by how people phrase queries

| Index | Finds | Choose for |
|---|---|---|
| Dense (embeddings) | Passages that mean the same thing as the query, even with different words | Paraphrased or conceptual queries |
| Sparse (keyword / BM25) | Passages containing the exact terms | Queries built around identifiers: SKUs, clause numbers, error strings |
| Hybrid | Both lists, fused | Real traffic, which is nearly always mixed; recovers the exact-token hits dense search drops |

Fusing two ranked lists has a standard default — reciprocal rank fusion, which rewards items that
rank well in both lists. Use it unless you have measured a reason not to; inventing a merge scheme
is not where the value is.

## Name the trade you are making

Three quantities pull against each other:

- **Hit quality** — does the right passage come back?
- **Added latency** — what does the retrieval step cost per request?
- **Upkeep** — what does keeping the index correct cost as the corpus grows and changes?

Smaller chunks plus hybrid search raise hit quality and latency together; bigger chunks with dense
search only are cheaper to run and faster but miss identifier queries. There is no universal
setting — pick for this corpus and this query mix, and write the trade down so it can be
defended.

## Known weak spots

- Questions that need several documents combined; each passage is scored alone.
- Chunk boundaries that cut through a table, a code block, or a multi-paragraph argument.
- The right passage exists but never makes the top-k.
- The index itself needs evaluation and maintenance — budget people and time for it, or quality
  drifts unnoticed. Add retrieval metrics (recall@k on a labelled query set) to the eval suite.

## Four things that are not the same

| Term | Is |
|---|---|
| Context window | The model's attention space for one call; nothing survives between calls unless your code carries it |
| Retrieval | Passages fetched at query time and placed in the window; the model sees only what came back |
| Application state | Records your system owns; reached through a tool call, never guessed |
| Memory / summaries | Continuity your application built by storing something and passing it back in; the model has none of its own |
