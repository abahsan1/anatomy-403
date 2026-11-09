# Anatomy 403 Practice

Practice questions, fill-in-the-blank sentences and flashcards for Anatomy 403, one set per exam. Every page is a single static HTML file; flags and progress are saved in the browser.

| Exam | Pages |
| --- | --- |
| Exam 1, musculoskeletal | `exam-1/msk1.html` to `exam-1/msk5.html` |
| Exam 2, neuroanatomy | `exam-2/neuro.html` |
| Exam 3, cardiovascular and respiratory | `exam-3/cardio.html` |

## Adding Cardio lectures

The Cardio page is built from `src/exam-3-cardio/`. Add questions to `cardio-data.js` (set the lecture's `ready: true` and add its topics), then run:

```bash
node src/build.mjs
```

and commit the rebuilt `exam-3/cardio.html`. Vercel redeploys on every push to `main`.

Questions are practice only and may contain mistakes.
