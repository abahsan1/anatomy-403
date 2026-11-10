# Anatomy 403 Practice

Practice questions, fill-in-the-blank sentences and flashcards for Anatomy 403, one set per exam. Live at https://anatomy-403.vercel.app. There is one page per exam, with its lectures as tabs; open a lecture directly with `#lecture-N` (for example `/exam-2/neuro#lecture-3`). Every page is a single static HTML file; flags and progress are saved in the browser.

| Exam | Pages |
| --- | --- |
| Exam 1, musculoskeletal | `exam-1/msk.html` (lectures 1 to 5 as tabs) |
| Exam 2, neuroanatomy | `exam-2/neuro.html` (lectures 1 to 6) |
| Exam 3, cardiovascular and respiratory | `exam-3/cardio.html` |
| Exam 4, GI, reproductive, endocrine and integumentary | `exam-4/gi.html` |

## Accounts and sync

Sign-in is Supabase Auth (project `anatomy-403`): Google, GitHub and email sign-in links, on `/login`. Progress (flags, misses, positions) is saved to the Neon Postgres database through `api/progress.js`, which checks the Supabase sign-in and stores progress under the account. `assets/sync.js` loads the Supabase client, watches the pages' browser-storage keys and syncs them. Signed out, progress stays in the browser. The database connection comes from the `DATABASE_URL` environment variable that the Vercel Neon integration set.

## Building

All four exams use the Exam 2 page's design and quiz engine. `exam-2/neuro.html` is edited directly; Exams 1, 3 and 4 are generated from it by `src/build-exams.mjs`, which swaps in their own questions:

- Exam 1 from the five lecture quizzes in `src/exam-1-msk/` (multiple choice, fill in the blank, muscle flashcards)
- Exam 3 from `src/exam-3-cardio/cardio-data.js`
- Exam 4 from `src/exam-4-gi/exam4-data.js` (same format; empty until its lectures arrive)

Rebuild after changing any of those, or after changing the Exam 2 page:

```bash
node src/build.mjs
```

This also rebuilds `src/exam-3-cardio/artifact.html`, the separate claude.ai Cardio artifact. The pages share `assets/theme.css` and `assets/neuro.css`. Vercel redeploys on every push to `main`.

## Adding Cardio lectures

Add questions to `cardio-data.js` (set the lecture's `ready: true` and add its topics), then run `node src/build.mjs`.

Edits made through Claude Code on this machine are committed and pushed automatically at the end of each Claude turn (a Stop hook in `~/.claude/settings.json` runs `~/.claude/hooks/anatomy-autopush.sh`, which also rebuilds the generated pages when `src/` changes).

Questions are practice only and may contain mistakes.
