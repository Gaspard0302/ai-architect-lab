# Manual QA

What to click before a release. Automated checks (`pnpm lint`, `pnpm test`,
`pnpm check:anchors`, `pnpm validate`, `pnpm build`) run in CI and are not repeated here.

Run against a dev server with a real Supabase project:

```bash
pnpm dev     # http://localhost:3000
```

Use a throwaway name so you can delete the row afterwards. Two browsers, or one normal
and one private window, stand in for "two devices". A checklist item that needs the
second browser says so.

---

## 1. Sign-in and identity

1. Open `/` signed out. The name list renders and "I'm new" is offered.
2. Type into **Find your name**: the list filters as you type.
3. Pick **I'm new**, take a fresh name, set a 4-digit PIN and confirm it. You land on the
   course picker or straight on a course Home.
4. Sign out from the header. You are back on `/` and the header nav is gone.
5. Sign in again with the same name and PIN. You land on the course you last used.
6. Wrong PIN: the message counts down the tries left ("Wrong PIN, 4 tries left").
7. Five wrong PINs in a row: the name locks and the message says how many minutes are
   left. A correct PIN during the lock is still refused.
8. Non-numeric or 3-digit PINs are refused before anything is written.
9. Taking a name that already exists, in any casing, is refused as a duplicate.
10. Close the browser, reopen `/`: still signed in. The cookie is HTTP-only — check
    `document.cookie` in the console shows nothing.
11. Signed out, visit `/architect`, `/architect/learn`, `/architect/practice`,
    `/architect/mock` and a session URL directly: every one redirects to `/`.
12. Signed in as A, paste a URL of B's practice or mock session: not found, never B's
    answers.

## 2. Home

1. `/architect` shows the exam name and code in the header area, and the nav has Home ·
   Learn · Practice · Mock.
2. A brand-new user sees an empty state, not a wall of zeros or a crash.
3. The course switcher in the header moves you to the same page on the other course, and
   the numbers change with it. No architect data appears under developer.
4. Mastery per objective lists every blueprint objective, including ones with no
   questions banked, with attempted / retired / accuracy.
5. Answer a few questions in Practice, come back: attempted and accuracy moved.
6. Get the same question right twice in a row: it counts as retired.
7. **Weakest objectives** ranks only objectives with at least 3 attempts. Low-sample
   objectives are listed separately and are not ranked.
8. Cross-check the ranking against `pnpm report --course <name>` for bank coverage, and
   against the raw `attempts` rows for the wrong rate.
9. With an unfinished practice set, the resume card appears and links into it. Same for
   an open mock.
10. Submitted mocks appear in the history with date, score and a review link.
11. The rating line reads "You have rated N of M questions you've seen", and M only
    counts questions actually seen.
12. Bank coverage per domain shows questions available against `items_in_mock`.

## 3. Learn

1. `/architect/learn` lists every lesson in module order, with its topics from
   frontmatter.
2. No topic renders as `[object Object]`. The developer module 3 lesson has a topic
   written `context engineering: pruning, compaction, clearing, subagent handoffs` — it
   must render with the colon, in full.
3. Open a lesson. It renders in under a second even for the 160 KB modules.
4. The sticky table of contents lists h2 and h3 only, and scrolling moves the highlight.
5. Click a TOC entry: the heading lands below the sticky header, not behind it.
6. Prev/next links move between modules in order, and are absent at the ends.
7. Markdown renders fully: tables, fenced code with horizontal scroll, nested lists,
   blockquotes, horizontal rules. Nothing overflows the page horizontally.
8. Paste a deep link from a question's sources into the address bar directly: the page
   opens at that heading.
9. Glossary search filters as you type, matching both term and definition, and each hit
   links to the module it came from.
10. An unknown lesson slug is a 404, not a crash. An unknown course is a 404.

## 4. Practice

1. `/architect/practice` shows the filters: status (all · unseen · due · retired),
   domain, objective. Defaults are status = all, no domain.
2. Choosing a domain narrows the objective list to that domain's objectives.
3. The form shows how many questions match before you start.
4. Filters that match nothing refuse to start a set and say so, rather than opening an
   empty runner.
5. Start a set: 25 questions, or all matching if fewer.
6. Answer a multi-choice question: radios, one selection, Submit grades it.
7. Answer a multi-response question: checkboxes, the hint says "Select N", and you
   cannot choose more than N.
8. Once graded: the key is marked, your wrong pick is marked, each wrong option carries
   its distractor note, the rationale renders, and every `sources` entry is a link.
9. Click a source link: it lands on the right lesson at the right heading.
10. The options lock after grading. Re-submitting is impossible.
11. Go Back to an already-graded question: the answer and the grading are still shown,
    still locked.
12. **Persistence.** Note the position, close the tab, reopen `/architect/practice`: the
    resume card shows "Resume set (7/25)" with the right count, and resuming restores the
    position and every answer.
13. **Second browser.** Sign in as the same person elsewhere and open Practice: the same
    open set, same answers.
14. "Start a new set" archives the open one; the answers already given stay in the
    history and in Home's numbers.
15. Only one open practice set exists per person per course: starting a second from
    another browser archives the first rather than creating two.
16. Answer the last question: the finish screen shows the set's score and offers a new
    set.
17. **Answer keys never reach the browser.** With a question unanswered, open DevTools →
    Network, reload, and search the HTML and the RSC payload for the correct letter, the
    rationale text and the word `distractors`. None of them is present until you submit.

## 5. Mock exam

1. `/architect/mock` states the item count (63 architect, 53 developer), 120 minutes and
   the pass mark, and lists the rules.
2. Domains whose bank is short of `items_in_mock` appear under **Bank shortfall**, each
   with wanted vs held. Both banks currently meet every quota, so the section renders
   nothing; to see it, temporarily lower a domain's bank (e.g. move one D3 developer
   question aside) and reload.
3. Start a paper. The count matches the blueprint total and the weighting per domain
   matches `items_in_mock`, shortfall domains repeating rather than shrinking.
4. The timer counts down and reads `1:59:5x` at the start, dropping to `mm:ss` under an
   hour.
5. **No feedback during the paper.** Nothing is marked right or wrong, no rationale, no
   key, on any question.
6. Flag a question: the navigator grid marks it. Unflag it: the mark clears.
7. The navigator distinguishes answered, flagged and blank, and clicking a cell jumps
   there.
8. Change an answer on a question you already answered: the new answer sticks.
9. **Refresh mid-exam.** Answers, flags and position come back, and the clock has kept
   running — it did not reset.
10. **Second browser**, same person: the same paper with the same answers and the same
    remaining time.
11. Let the clock run out, or start a short sitting by editing `time_limit_s` on the
    session row. On expiry the paper auto-submits without input, and reloading shows the
    result rather than the runner.
12. Submit manually: the result shows raw score, percentage and the approximate scaled
    score against 720, with the approximation labelled.
13. The per-domain breakdown adds up to the raw score.
14. Review after submit: every item graded, with rationale, distractor notes and working
    source links. Flags from the sitting are still visible.
15. The sitting appears in the lobby history and on Home, with a working review link.
16. Reopening a submitted paper's URL shows the review, never a live runner.
17. **Abandon** on an open sitting closes it unscored, and it does not appear in history.
18. Signed in as someone else, open that sitting's URL: not found.

## 6. Ratings

1. Stars appear only **after** a question is graded, never before, in both practice and
   mock review.
2. The caption above the row reads exactly: *Rate this question. 1–2 stars get rewritten,
   5 stars become the model for new ones.*
3. Hovering a star shows its label: 1 Broken · 2 Unfair · 3 OK, not exam-like · 4 Good
   exam question · 5 Could be on the real paper. The chosen label prints under the row.
4. One tap saves. Nothing blocks Next, no confirmation appears.
5. Tapping a different star changes the rating rather than adding one.
6. Leave and return to the same question: your star and its label are still shown.
7. The same question rated in practice shows that same star in mock review.
8. Nobody else's rating or average is visible anywhere in the app.
9. Home's rated count went up by one.

## 7. Ratings export

1. `pnpm ratings:pull` with no `--course` fails and lists the available courses.
2. `pnpm ratings:pull --course developer --fixture` prints a sample file and writes
   nothing.
3. With the service key missing or still `PASTE_ME`, the real run fails with a message
   naming `.env.local`, and does not write a half file.
4. With the key set: `pnpm ratings:pull --course developer` writes
   `courses/developer/ratings.yaml` and prints how many ratings over how many questions.
5. The file is sorted by qid, one entry each with `avg` to one decimal, `n`, and a `hist`
   covering 1 to 5.
6. The header explains the star labels and says the file is generated.
7. Spot-check one question against the `ratings` table: the count and the average match.
8. Rate one more question, re-run, and only that question's entry changes.
9. Commit the file. It is content, not personal data: it carries no user ids.
