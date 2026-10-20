# Content provenance and sharing

The Claude course captures and exam guide PDFs are third-party source material. They
remain attributed to their source. A free-to-access course does not itself establish
permission to redistribute its text under a new license.

The ignored `.local/content-manifest.json` records the SHA-256 hashes of 51 retained course files at the
personal migration baseline: raw captures, formatted lessons, drills, glossaries, exam
guides, objectives, and question banks. Every file matched when the clean copy was made.
`pnpm check:preserved` continuously checks immutable raw captures and PDFs against those
hashes. Formatted and authored material can evolve without changing the raw baseline.

Keep original teaching and new labs separate from transcriptions. Preserve source links
and capture-gap markers. The architect skills have an overlap check against lessons and
drills; that heuristic detects accidental copying, not ownership or legal permissions.

Before public sharing, decide separately:

- Which original skills, questions, and labs the author is entitled to share, and their license.
- Whether source captures and PDFs can be redistributed; otherwise keep them private and
  publish source links plus original teaching instead.
- Which material belongs in a public skills release. Releases package skills only and do
  not include the course transcription folders.

No blanket open-source license is applied to third-party course material.

## Confirmed public boundary

The user selected one public repository for skills and the future mock-exam website.
Raw captures, formatted transcripts, and source PDFs remain local. The inherited course
objectives and question banks also stay local; public website learning material will
be original. The private directories and preservation manifest are ignored by Git.
Public Git history starts from a curated snapshot that has never contained the corpus.
