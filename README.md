# Anatomy 403 Practice

Practice questions, fill-in-the-blank sentences and flashcards for Anatomy 403, one set per exam. Live at https://anatomy-403.vercel.app. There is one page per exam, with its lectures as tabs; open a lecture directly with `#lecture-N` (for example `/exam-2/neuro#lecture-3`). Every page is a single static HTML file; flags and progress are saved in the browser.

| Exam | Pages |
| --- | --- |
| Exam 1, musculoskeletal | `exam-1/msk.html` (lectures 1 to 5 as tabs) |
| Exam 2, neuroanatomy | `exam-2/neuro.html` |
| Exam 3, cardiovascular and respiratory | `exam-3/cardio.html` |

## Sync across devices

Progress (flags, misses, positions) is saved to a Neon Postgres database through `api/progress.js`. Each browser gets a private sync code (shown on the home page); entering it on another device links them. `assets/sync.js` watches the pages' browser-storage keys and syncs them. The database connection comes from the `DATABASE_URL` environment variable that the Vercel Neon integration set.

## Building

Exam 1 is built from the five lecture quizzes in `src/exam-1-msk/` with `node src/build-msk.mjs`.

## Adding Cardio lectures

The Cardio page is built from `src/exam-3-cardio/` (`cardio-app.html`, `cardio-style.css`, `cardio-data.js`). Add questions to `cardio-data.js` (set the lecture's `ready: true` and add its topics), then run:

```bash
node src/build.mjs
```

and commit the rebuilt `exam-3/cardio.html`. The other pages share `assets/theme.css`, with `assets/msk.css` and `assets/neuro.css` adapting the older quiz pages to it. Vercel redeploys on every push to `main`.

Edits made through Claude Code on this machine are committed and pushed automatically at the end of each Claude turn (a Stop hook in `~/.claude/settings.json` runs `~/.claude/hooks/anatomy-autopush.sh`, which also rebuilds the generated pages when `src/` changes).

Questions are practice only and may contain mistakes.
