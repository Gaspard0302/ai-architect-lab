#!/usr/bin/env python3
"""Validate formatted course lessons, drill banks, and the merged glossary.

Run from the repo root, naming the course (or set COURSE):

    python3 skills/format-course-module/scripts/validate.py --course developer
    python3 skills/format-course-module/scripts/validate.py --course architect --coverage
    python3 skills/format-course-module/scripts/validate.py --course architect --coverage "courses/architect/content/lessons/Enterprise Integration & Production.md"

Checks
  structure  frontmatter keys, heading levels, required trailing sections
  anchors    every ](#...) link resolves to a heading in the same file
  drills     ID scheme, uniqueness, required fields, index/body agreement,
             lesson<->drill-file cross references, frontmatter counts
  gaps       every inline capture-gap marker appears in the Appendix table
  artifacts  leftover tab runs and glued list numbers from the paste
  coverage   (--coverage) source sentences that vanished from the lesson,
             i.e. the near-verbatim rule

Exit code 0 = clean, 1 = problems found.
"""

from __future__ import annotations

import argparse
import os
import pathlib
import re
import sys
import unicodedata

REPO = pathlib.Path(__file__).resolve().parents[3]


def _course_root() -> pathlib.Path:
    """courses/<name>/. No default: two courses are live, and validating the wrong
    one silently is worse than an error."""
    argv = sys.argv
    name = argv[argv.index("--course") + 1] if "--course" in argv else os.environ.get("COURSE")
    available = sorted(d.name for d in (REPO / "courses").iterdir() if d.is_dir())
    if not name or name not in available:
        what = f'unknown course "{name}"' if name else "no course selected"
        sys.exit(f"\n  {what}. Pass --course <name> or set COURSE.\n  available: {', '.join(available)}\n")
    return REPO / "courses" / name


COURSE_ROOT = _course_root()
CONTENT = COURSE_ROOT / "content"
LESSON_DIR = CONTENT / "lessons"
RAW_DIR = CONTENT / "_raw"
DRILL_DIR = CONTENT / "drills"
GLOSSARY = CONTENT / "GLOSSARY.md"

LESSON_KEYS = ("title", "course", "module", "sections", "topics")
DRILL_KEYS = ("title", "module", "lesson", "drills")
DRILL_ID = re.compile(r"^D(\d+)\.(\d+)\.(\d+)$")
DRILL_HEAD = re.compile(r"^##\s+(D\d+\.\d+\.\d+)\s+·\s+(.+)$", re.M)
ANSWER_STATUS = ("given", "inferred", "missing")
GAP = "⚠️"

# words that may legitimately start a line with "N." — keep the glued-number check honest
_GLUED = re.compile(r"^\s*\d{1,2}[A-Z][a-z]")


class Report:
    def __init__(self) -> None:
        self.problems: list[tuple[str, str, str]] = []
        self.notes: list[str] = []

    def fail(self, path: pathlib.Path | str, check: str, msg: str) -> None:
        name = path.name if isinstance(path, pathlib.Path) else str(path)
        self.problems.append((name, check, msg))

    def note(self, msg: str) -> None:
        self.notes.append(msg)

    def render(self) -> int:
        for n in self.notes:
            print(f"  · {n}")
        if not self.problems:
            print("\n✅ all checks passed")
            return 0
        print(f"\n❌ {len(self.problems)} problem(s)\n")
        width = max(len(p[0]) for p in self.problems)
        for name, check, msg in self.problems:
            print(f"  {name:<{width}}  [{check}] {msg}")
        return 1


# ---------------------------------------------------------------- helpers


def slug(text: str) -> str:
    """GitHub heading slug: strip non-word chars, then each space -> one hyphen."""
    text = text.strip().lower()
    text = re.sub(r"[^\w\s-]", "", text, flags=re.UNICODE)
    return text.replace(" ", "-")


def frontmatter(body: str) -> dict[str, str]:
    if not body.startswith("---\n"):
        return {}
    end = body.find("\n---\n", 4)
    if end == -1:
        return {}
    out: dict[str, str] = {}
    for line in body[4:end].split("\n"):
        if re.match(r"^\s", line) or ":" not in line:
            continue
        k, _, v = line.partition(":")
        out[k.strip()] = v.strip()
    return out


def headings(body: str) -> list[tuple[int, str]]:
    out = []
    fenced = False
    for line in body.split("\n"):
        if line.startswith("```"):
            fenced = not fenced
        if fenced or not line.startswith("#"):
            continue
        level = len(line) - len(line.lstrip("#"))
        out.append((level, line.lstrip("#").strip()))
    return out


def normalise(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = text.replace("’", "'").replace("‘", "'")
    text = text.replace("“", '"').replace("”", '"')
    # the paste glues list numbers to the first word: "1Break down" -> "1 Break down"
    text = re.sub(r"(\d)([A-Z])", r"\1 \2", text)
    text = re.sub(r"[^a-z0-9 ]+", " ", text.lower())
    return re.sub(r"\s+", " ", text).strip()


def lessons() -> list[pathlib.Path]:
    return sorted(
        p
        for p in LESSON_DIR.glob("*.md")
        if "module" in frontmatter(p.read_text())
    )


# ---------------------------------------------------------------- checks


def check_anchors(path: pathlib.Path, body: str, r: Report) -> None:
    known = {slug(h) for _, h in headings(body)}
    for target in set(re.findall(r"\]\(#([^)]+)\)", body)):
        if target not in known:
            r.fail(path, "anchors", f"#{target} matches no heading")


def check_structure(path: pathlib.Path, body: str, r: Report) -> None:
    fm = frontmatter(body)
    for key in LESSON_KEYS:
        if key not in fm:
            r.fail(path, "structure", f"frontmatter missing '{key}'")
    hs = headings(body)
    if sum(1 for lvl, _ in hs if lvl == 1) != 1:
        r.fail(path, "structure", "expected exactly one H1")
    prev = 1
    for lvl, text in hs:
        if lvl > prev + 1:
            r.fail(path, "structure", f"H{prev} -> H{lvl} skips a level at {text!r}")
        prev = lvl
    titles = [t for _, t in hs]
    if not any(t.startswith("Contents") for t in titles):
        r.fail(path, "structure", "no 'Contents' section")
    if not any(t.startswith("Concept index") for t in titles):
        r.fail(path, "structure", "no 'Concept index' section")
    if GAP in body and not any(t.startswith("Appendix") for t in titles):
        r.fail(path, "structure", "capture-gap markers present but no Appendix section")


def check_gaps(path: pathlib.Path, body: str, r: Report) -> None:
    """Every gap *callout* ('> ⚠️ ...') must be reflected in the Appendix table.

    Inline '⚠️ *not captured*' cells inside a table are part of a single callout's
    screen and are deliberately not counted.
    """
    idx = body.find("## Appendix")
    if idx == -1:
        return
    callouts = len(re.findall(r"^>\s*" + GAP, body[:idx], flags=re.M))
    appendix = body[idx:]
    rows = [ln for ln in appendix.split("\n") if ln.startswith("|") and "---" not in ln]
    listed = max(0, len(rows) - 1)  # minus header row
    prose_gaps = len(re.findall(GAP, appendix)) - sum(GAP in ln for ln in rows)
    if callouts and not listed:
        r.fail(path, "gaps", f"{callouts} gap callout(s) but the Appendix table is empty")
    elif callouts > listed + max(0, prose_gaps):
        r.fail(
            path,
            "gaps",
            f"{callouts} gap callout(s) vs {listed} Appendix row(s) — reconcile",
        )


def check_artifacts(path: pathlib.Path, body: str, r: Report) -> None:
    fenced = False
    for i, line in enumerate(body.split("\n"), 1):
        if line.startswith("```"):
            fenced = not fenced
            continue
        if fenced:
            continue
        if "\t" in line:
            r.fail(path, "artifacts", f"line {i}: leftover tab (unconverted table run?)")
        if _GLUED.match(line):
            r.fail(path, "artifacts", f"line {i}: glued list number — {line.strip()[:48]!r}")


def check_drills(r: Report) -> None:
    if not DRILL_DIR.is_dir():
        r.note("no drills/ directory — skipping drill checks")
        return
    for path in sorted(DRILL_DIR.glob("module-*-drills.md")):
        body = path.read_text()
        fm = frontmatter(body)
        for key in DRILL_KEYS:
            if key not in fm:
                r.fail(path, "drills", f"frontmatter missing '{key}'")

        lesson_rel = fm.get("lesson", "").strip('"')
        if lesson_rel and not (path.parent / lesson_rel).resolve().exists():
            r.fail(path, "drills", f"lesson path does not exist: {lesson_rel}")

        module = fm.get("module")
        entries = DRILL_HEAD.findall(body)
        seen: set[str] = set()
        for did, _title in entries:
            m = DRILL_ID.match(did)
            if not m:
                r.fail(path, "drills", f"{did} does not match D<module>.<section>.<n>")
                continue
            if module and m.group(1) != module:
                r.fail(path, "drills", f"{did} module segment != frontmatter module {module}")
            if did in seen:
                r.fail(path, "drills", f"duplicate drill id {did}")
            seen.add(did)

        declared = fm.get("drills")
        if declared and declared.isdigit() and int(declared) != len(entries):
            r.fail(path, "drills", f"frontmatter drills={declared} but {len(entries)} entries")

        # per-entry required fields
        blocks = re.split(r"^## (?=D\d+\.\d+\.\d+)", body, flags=re.M)[1:]
        for block in blocks:
            did = block.split(" ", 1)[0]
            for field in ("**Type:**", "**Section:**", "**Tests:**", "**Answer status:**"):
                if field not in block:
                    r.fail(path, "drills", f"{did} missing {field}")
            status = re.search(r"\*\*Answer status:\*\*\s*(\w+)", block)
            if status and status.group(1) not in ANSWER_STATUS:
                r.fail(path, "drills", f"{did} answer status {status.group(1)!r} not in {ANSWER_STATUS}")
            if status and status.group(1) != "missing" and "<details>" not in block:
                r.fail(path, "drills", f"{did} has an answer but no <details> block")

        # index table lists every entry
        for did, _ in entries:
            if f"[{did}]" not in body:
                r.fail(path, "drills", f"{did} missing from the index table")

        check_anchors(path, body, r)


def check_glossary(r: Report) -> None:
    if not GLOSSARY.exists():
        r.note("no GLOSSARY.md — skipping glossary checks")
        return
    body = GLOSSARY.read_text()
    fm = frontmatter(body)
    if "modules" not in fm:
        r.fail(GLOSSARY, "glossary", "frontmatter missing 'modules'")
    terms = [t for lvl, t in headings(body) if lvl == 3]
    if not terms:
        r.fail(GLOSSARY, "glossary", "no term headings (expected H3 per term)")
    lowered = [t.lower() for t in terms]
    if lowered != sorted(lowered):
        r.fail(GLOSSARY, "glossary", "terms are not in alphabetical order")
    for dup in {t for t in lowered if lowered.count(t) > 1}:
        r.fail(GLOSSARY, "glossary", f"duplicate term heading {dup!r} — merge it")
    declared = fm.get("terms")
    if declared and declared.isdigit() and int(declared) != len(terms):
        r.fail(GLOSSARY, "glossary", f"frontmatter terms={declared} but {len(terms)} headings")
    check_anchors(GLOSSARY, body, r)


def check_coverage(path: pathlib.Path, r: Report, shingle: int = 8, floor: int = 12) -> None:
    """Near-verbatim guard: every substantial source sentence must survive.

    A sentence counts as surviving if ANY contiguous run of `shingle` words from it
    appears in the output. That tolerates restructuring (a bold label prepended, the
    sentence lifted into a table cell) while still failing on rewrites and deletions,
    which leave no intact window.
    """
    stem = path.stem
    candidates = [RAW_DIR / path.name, RAW_DIR / stem, RAW_DIR / f"{stem}.md"]
    raw_path = next((c for c in candidates if c.exists()), None)
    if raw_path is None:
        r.note(f"{path.name}: no matching file in _raw/ — coverage skipped")
        return

    out = normalise(path.read_text())
    missing: list[str] = []
    total = 0
    for chunk in re.split(r"(?<=[.!?])\s+|\n", raw_path.read_text()):
        toks = normalise(chunk).split()
        if len(toks) < floor:
            continue
        total += 1
        windows = (
            " ".join(toks[i : i + shingle]) for i in range(len(toks) - shingle + 1)
        )
        if not any(w in out for w in windows):
            missing.append(" ".join(toks[:shingle]))

    if not total:
        return
    pct = 100 * (total - len(missing)) / total
    r.note(f"{path.name}: source coverage {pct:.1f}% ({total - len(missing)}/{total} sentences)")
    if missing:
        for m in missing[:15]:
            r.fail(path, "coverage", f"source sentence missing: '{m}…'")
        if len(missing) > 15:
            r.fail(path, "coverage", f"…and {len(missing) - 15} more")


# ---------------------------------------------------------------- main


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("files", nargs="*", help="lesson files to check (default: all)")
    ap.add_argument("--coverage", action="store_true", help="also diff each lesson against its _raw/ source")
    ap.add_argument("--course", help="course under courses/ to validate (or set COURSE)")
    args = ap.parse_args()

    targets = [pathlib.Path(f) for f in args.files] if args.files else lessons()
    if not targets:
        print("no lesson files found (need frontmatter with a 'module' key)")
        return 1

    r = Report()
    print(f"checking {len(targets)} lesson(s) in {COURSE_ROOT}\n")
    for path in targets:
        body = path.read_text()
        check_structure(path, body, r)
        check_anchors(path, body, r)
        check_gaps(path, body, r)
        check_artifacts(path, body, r)
        if args.coverage:
            check_coverage(path, r)

    check_drills(r)
    check_glossary(r)
    return r.render()


if __name__ == "__main__":
    sys.exit(main())
