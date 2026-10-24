# Prompt test cases

Inputs for checking the coach's correction prompts (`analysisPrompt`, `writingPrompt`, `checkPrompt` in `src/03-ai.js`). Each case lists what a good answer must do and must not do.

Status: these cases were reviewed against the prompt text on 24 Oct 2026. They have not been run on the live model yet, because the app's AI calls only run inside claude.ai. To run them, paste a case into Speaking or Writing and compare the result with this table.

## Conversation corrections (`analysisPrompt`)

| # | Learner says | Must do | Must not do | Rule that covers it |
|---|---|---|---|---|
| 1 | I have went to London last year. | Fix to "I went to London last year."; key `present-perfect-vs-past-simple` | Accept "have went" | priorities, mistake keys |
| 2 | I am working here since 2019. | "I've been working here since 2019."; `polish_calque: true` | Call it a typo | polish_calque rule |
| 3 | She is engineer in big company. | "She's an engineer at a big company."; key `articles` | Skip the articles | recurring mistakes, articles key |
| 4 | Can you explain me the configuration? | "Can you explain the configuration to me?" | Leave it as natural | word-for-word translation rule |
| 5 | Actually I am working on a firewall migration. | Flag "actually" only if the context shows the meaning "currently" | Always "correct" a valid use of "actually" | NEVER correct correct sentences |
| 6 | I made a big mistake on the meeting. | "in the meeting"; key `prepositions` | Change "made a mistake" | minimal "better" version |
| 7 | We must to restart the router. | "We have to / need to restart the router."; key `modal-verbs` | Rewrite the whole sentence | minimal fix + more natural |
| 8 | How long do you work in IT? | "How long have you been working in IT?"; calque | Accept the present simple | polish_calque rule |
| 9 | I'm exhausted. I've been working all day. | Rate "native" in naturalness, no correction | Invent a correction | NEVER correct correct sentences |
| 10 | yeah tbh the vpn keeps dropping so i rebooted it | No corrections (informal chat, dictation style) | Fix capitals or "tbh" | informal style + dictation rule |
| 11 | The colour of the cable is grey. | No correction | "Fix" British spelling | British vs American rule |
| 12 | I am very tired because I worked a lot today. | Type `unnatural` or naturalness "correct" with upgrade "I'm exhausted. I've been working all day." | Mark as a grammar error | unnatural type, naturalness ladder |
| 13 | I will write to you when I will finish the audit. | "when I finish the audit"; key `verb-tenses` | Leave the second "will" | priorities |
| 14 | Please find in attachment my CV. | Upgrade to "Please find my CV attached." / "I've attached my CV." | Call it fine | unnatural / register |
| 15 | I have 5 years of experience with Cisco. | No correction | Change "with" to "in" as a forced fix | NEVER correct correct sentences |

## Writing check (`writingPrompt`)

Input (cover letter fragment):

> Dear Sir or Madam, I am interesting in the position of Network Engineer. I have big experience with Fortinet and I am working with networks since five years. Please find in attachment my CV.

Must do: fix "interesting" → "interested", "big experience" → "extensive experience", "I am working … since five years" → "I've been working … for five years", "Please find my CV attached"; keep the British/American variety of the author; level estimate with a one-sentence reason.

Must not do: rewrite the corrected version into a different letter (that belongs in "natural"), invent experience or numbers.

## Exercise check (`checkPrompt`)

| Task | Model answer | Learner answer | Expected |
|---|---|---|---|
| Fix: "I have seen him yesterday." | I saw him yesterday. | I saw him yesterday | ok (missing full stop is fine) |
| Translate: "Byłem tam w zeszłym roku." | I was there last year. | I went there last year. | ok (different, correct wording) |
| Gap: "I'm looking forward ___ you." | to seeing | to see | not ok, explain "to" + -ing |
| Respond using "figure out" | I figured out the problem. | I figurd it out quickly. | ok, mention the typo |
