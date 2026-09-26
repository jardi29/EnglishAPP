# Say It Naturally

A personal English coach built as a single-page Claude Artifact. It focuses on conversation, natural phrasing, writing feedback, useful phrases and recurring mistakes, not on drills.

## Modes

- **Speaking**: casual conversation on 12 topics or role-play in 11 real-life situations. The partner never interrupts; corrections arrive in batches (every 4 messages by default), grouped into repeated mistakes, grammar, vocabulary, unnatural expressions and pronunciation hints, with a naturalness ladder (Correct → Natural → More natural → Native-like). Each session ends with scores and "3 things to remember".
- **Writing**: A–F report for any text (original with marked issues, corrected version as a diff, more natural version, key mistakes, useful expressions, level estimate), plus a one-sentence "Would a native say this?" check.
- **Daily practice**: warm-up conversation (3 min) → top 3 corrections → 5 phrases → exercise → review of recurring mistakes → summary.
- **My progress**: trends, weekly report, common mistakes with spaced-repetition review and mini-lessons, vocabulary list (new / learning / mastered), About me, history, settings.

Extra practice (from the home screen):

- **Phrase review**: flashcards (Polish → English) with spaced repetition, then "use it in a sentence" checked by AI.
- **Think in English**: 5 personal questions with 30 seconds each, then a 6-sentence Polish → English sprint built around the learner's traps.
- **Shadowing**: listen to a sentence (device voice), repeat it with system dictation, compare word by word; missed words are collected for practice.
- **Weekly report**: last 7 days vs the week before (days, minutes, scores, mistakes getting better or coming back) plus a coach's summary, 3 priorities and a 7-day plan.
- **About me + your situations**: job, uses of English, goals and interests feed every prompt; role-plays can be generated from the profile or described in one sentence.

The app adapts through a learner profile sent with every AI request: level, recurring mistakes, mastered phrases (not taught again), phrases being learned (recycled in conversation), recent scores. Explanations start in Polish and move to English as scores improve.

## Build

The page is assembled from `src/` into `say-it-naturally.html`:

```sh
./build.sh
```

Runtime capabilities used when published: `sample` (Claude answers), `db` + `user` (private per-user storage under `data/users/<id>/`). Without them the page falls back to browser storage and shows that the AI tutor is unavailable.

## Known limits

- No microphone in artifacts: use system dictation (Win+H, Fn Fn on Mac, phone keyboard mic).
- Pronunciation tips are based on the words used, not on audio.
- Fluency is estimated from text: message length, linking, reply speed.
- Every AI answer uses the viewer's own Claude usage.
