#!/usr/bin/env python3
"""Fail if any architect skill shares a long word n-gram with the course transcription.

Usage: python3 scripts/check-skill-overlap.py [N]   (default N=10)
Prints each offending skill line with the matching n-gram. Exit 1 on any hit.
"""
import re, sys, pathlib

N = int(sys.argv[1]) if len(sys.argv) > 1 else 10
ROOT = pathlib.Path(__file__).resolve().parents[1]
SKILLS = ROOT / "skills"
CONTENT = ROOT / "courses" / "architect" / "content"

def words(s):
    return re.sub(r"[^a-z0-9 ]", " ", s.lower()).split()

def grams(ws, n):
    return {" ".join(ws[i:i + n]) for i in range(len(ws) - n + 1)}

corpus = set()
for p in list((CONTENT / "lessons").glob("*.md")) + list((CONTENT / "drills").glob("*.md")):
    corpus |= grams(words(p.read_text()), N)

if not corpus:
    sys.exit("Private architect corpus missing; this check requires the local study material")

hits = 0
for p in sorted(SKILLS.glob("architect-*/**/*.md")):
    if p.name == "README.md":
        continue
    for i, line in enumerate(p.read_text().splitlines(), 1):
        for g in grams(words(line), N):
            if g in corpus:
                hits += 1
                print(f"{p.relative_to(ROOT)}:{i}: {g}")
                break
print(f"{hits} line(s) with {N}-gram overlap")
sys.exit(1 if hits else 0)
