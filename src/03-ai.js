/* ---------- AI (the `sample` capability) ---------- */
const AI = { fn: null, status: 'loading' };
AI.ready = (async () => {
  try {
    const c = window.claude;
    const s = c && typeof c.use === 'function' ? await c.use('sample') : null;
    AI.fn = s || null;
    AI.status = s ? 'ready' : 'unavailable';
  } catch (e) { AI.status = 'unavailable'; }
  emit();
})();
function onAIError(e) {
  const c = e && e.code;
  if (c === 'not_granted') { AI.status = 'denied'; emit(); }
  else if (c === 'sampling_disabled' || c === 'not_declared' || c === 'capability_disabled') { AI.status = 'unavailable'; emit(); }
}
function aiBlocked() { return { code: AI.status === 'denied' ? 'not_granted' : 'unavailable' }; }
async function aiText(input, opts) {
  await AI.ready;
  if (!AI.fn) throw aiBlocked();
  try { return await AI.fn(input, opts || {}); }
  catch (e) { onAIError(e); throw e; }
}
function looseJSON(t) {
  try { return JSON.parse(t); } catch (e) {}
  const f = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (f) { try { return JSON.parse(f[1]); } catch (e) {} }
  const a = t.search(/[\[{]/), b = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (e) {} }
  return null;
}
async function aiJSON(input, opts) {
  await AI.ready;
  if (!AI.fn) throw aiBlocked();
  try { return await AI.fn.json(input, opts || {}); }
  catch (e) {
    if (e && e.code === 'capability_removed') {
      const r = await aiText(input, opts);
      const j = looseJSON(r.text);
      if (j == null) throw { code: 'invalid_json' };
      return j;
    }
    onAIError(e);
    throw e;
  }
}
function errText(e) {
  switch (e && e.code) {
    case 'unavailable': return 'The AI tutor isn’t available in this view. Open the page on claude.ai while signed in.';
    case 'not_granted': return 'AI access was declined. Reload the page and choose Allow to use the tutor.';
    case 'sampling_disabled': case 'not_declared': case 'capability_disabled': return 'Claude isn’t available for this account here.';
    case 'rate_limited': return 'Too many requests, or your usage limit was reached. Wait a moment and try again.';
    case 'session_expired': return 'Your Claude session has expired. Sign in again and reload the page.';
    case 'refused': return 'Claude declined to answer this one. Try rephrasing it.';
    case 'invalid_json': return 'The answer came back in the wrong format. Try again.';
    case 'prompt_too_large': return 'That’s too much text at once. Try something shorter.';
    case 'empty_completion': return 'No answer came back. Try again.';
    case 'cancelled': return 'Stopped.';
    default: return 'Connection problem. Try again.';
  }
}

/* ---------- prompt building ---------- */
function explainRule() {
  const m = explainMode();
  if (m === 'pl') return 'LANGUAGE OF EXPLANATIONS: write every explanation, tip and piece of feedback in simple, friendly Polish. Keep English examples in English.';
  if (m === 'mix') return 'LANGUAGE OF EXPLANATIONS: write explanations mainly in Polish, but use simple English for grammar terms and short key phrases, so the learner slowly gets used to explanations in English. Keep examples in English.';
  return 'LANGUAGE OF EXPLANATIONS: write explanations and feedback in clear, simple English (about B1-B2). Use a few Polish words only to explain a Polish-specific trap.';
}
function keysList() {
  const known = Store.mistakes.items.map(m => m.key);
  return Array.from(new Set(known.concat(Object.keys(MISTAKE_TYPES)))).join(', ');
}
function learnerContext() {
  const p = Store.profile;
  const top = Mistakes.top(6).map(m => m.label + ' [' + m.key + '] x' + m.count).join('; ') || 'none recorded yet';
  const v = Store.vocab.items;
  const mastered = v.filter(x => x.status === 'mastered').slice(0, 40).map(x => x.en).join('; ') || 'none yet';
  const learning = v.filter(x => x.status !== 'mastered').slice(0, 25).map(x => x.en).join('; ') || 'none yet';
  const r = recentScores();
  const scores = r ? DIMS.filter(d => r[d] != null).map(d => d + ' ' + r[d].toFixed(1)).join(', ') : 'no sessions yet';
  return `LEARNER PROFILE
- First language: Polish. Goals: speak fluently, sound natural, write better, learn phrases they will really use, stop repeating the same mistakes. They want to move from "Polish -> translate -> English" to thinking directly in English.
- Estimated level: ${p.level || 'not known yet (probably B1/B2)'}
- Recurring mistakes (most important first): ${top}
- Strong areas: ${p.strengths.join(', ') || 'not known yet'}
- Phrases already mastered (don't teach these again): ${mastered}
- Phrases being learned (good to recycle): ${learning}
- Recent average scores (1-10): ${scores}`;
}
function sessionLabel(s) {
  const sc = s.scenario && SCENARIOS.find(x => x.id === s.scenario);
  if (sc) return `Role-play: ${sc.situation} The learner is ${sc.me}; the partner is ${sc.ai}.`;
  const tp = s.topic && TOPICS.find(x => x.id === s.topic);
  return `Topic: ${tp ? tp.label : 'free conversation'}.`;
}
function transcript(msgs, from) {
  return msgs.map((m, i) => (from > 0 && i === from ? '--- NEW (analyse from here) ---\n' : '') + (m.role === 'me' ? 'L: ' : 'P: ') + m.text.slice(0, 1200)).join('\n');
}

function partnerRules(s) {
  const lvl = Store.profile.level || 'B1/B2';
  const learning = Store.vocab.items.filter(v => v.status !== 'mastered').slice(0, 6).map(v => v.en).join('; ');
  const sc = s.scenario && SCENARIOS.find(x => x.id === s.scenario);
  const tp = s.topic && TOPICS.find(x => x.id === s.topic);
  const setup = sc
    ? `ROLE-PLAY. Situation: ${sc.situation} You play ${sc.ai}. The learner plays ${sc.me}; their goal: ${sc.goal}
Stay fully in character the whole time. Make it feel real, and at a natural moment add one small complication the learner has to react to spontaneously (${sc.twist}).${s.warmup ? ' This is a short warm-up of about 3 minutes, so keep the scene simple.' : ' When the situation is naturally resolved (usually after 8-14 exchanges), say a natural closing line and add [END] at the very end of that message.'}`
    : `CASUAL CONVERSATION. Topic: ${tp ? tp.label + ' (' + tp.seed + ')' : 'anything'}. You are Alex, a friendly, curious native English speaker in your thirties. Share your own small opinions and experiences too, like a real person, so it feels like a two-way chat.${s.warmup ? ' This is a short 3-minute warm-up, so ask easy, open questions.' : ''}`;
  return `You are having a text conversation with an English learner whose first language is Polish (level ${lvl}). This is real conversation practice, not a lesson.

${setup}

RULES
- Talk like a real person: short replies (1-3 sentences, at most about 45 words), contractions, everyday phrasal verbs and collocations, pitched slightly above the learner's level.
- Usually end with a question or a prompt that keeps the learner talking. Vary it: opinions, stories, details, "what would you do if...".
- Never correct mistakes, never explain grammar and never comment on the learner's English. Corrections are handled separately later.
- If something is genuinely unclear, ask what they mean, like a real person would. You may naturally reuse the correct form of what they said without pointing it out.
- If the learner writes in Polish or gets stuck, stay in English: give them a simple way to say it in one short line, then carry on.
${learning ? '- When it fits naturally, use some of these phrases the learner is learning: ' + learning + '.\n' : ''}- Plain text only: no lists, no markdown, no emoji, no stage directions.`;
}
function buildTurns(s) {
  const rules = partnerRules(s);
  const msgs = s.messages.slice(-40);
  if (!msgs.length) return [{ role: 'user', content: rules + '\n\n' + (s.scenario ? 'Start the scene now with your first line, in character (1-2 sentences).' : 'Start the conversation now with a natural, friendly opening line and one question.') }];
  const turns = [{ role: 'user', content: rules + '\n\n(The conversation follows. Reply only as your character.)' }];
  msgs.forEach(m => turns.push({ role: m.role === 'me' ? 'user' : 'assistant', content: m.text }));
  if (turns[turns.length - 1].role !== 'user') turns.push({ role: 'user', content: '(Continue the conversation.)' });
  return turns;
}

function analysisPrompt(s, from, to, max, o) {
  o = o || {};
  const ctxStart = Math.max(0, from - 6);
  const msgs = s.messages.slice(ctxStart, to);
  const rel = from - ctxStart;
  return `You are an expert English coach for Polish speakers. The learner has been chatting in English (typing or dictating) with a conversation partner. ${sessionLabel(s)}
Analyse only the learner's lines (L:)${rel > 0 ? ' after the "--- NEW ---" marker; earlier lines are context' : ''}. Partner lines (P:) are context only.

${learnerContext()}

PRIORITIES, in this order: 1) communication (was the meaning clear?), 2) naturalness (would a native speaker really say it like this?), 3) the learner's recurring mistakes, 4) grammar, 5) vocabulary.

RULES
- Give at most ${max} corrections: only the ones that matter most. Ignore typos, capital letters, missing final punctuation and small slips that don't affect communication, unless they match a recurring mistake. Don't correct things that are already fine. Fewer is better than more.
- "you_said": the learner's exact words (the shortest part that shows the problem, or the whole sentence if needed).
- "better": the minimal correct version. "more_natural": what a native speaker would typically say here (it can be the same as "better").
- "type": "grammar", "vocabulary", "unnatural" (grammatical, but not how natives say it) or "pronunciation".
- "mistake_key": reuse one of these keys whenever it fits: ${keysList()}. Otherwise invent a short kebab-case key. "mistake_label": a short English name for that type of mistake.
- "polish_calque": true if the problem comes from translating Polish word for word.
- If the learner keeps using very basic words (very, good, nice, thing, big, do, get, make), point out one more precise or natural option as a "vocabulary" correction.
- "why": 1-2 short sentences. "remember": a short memory hook (a rule of thumb, a contrast or a mini pattern).
- ${explainRule()}
- "naturalness": up to 3 learner sentences worth rating. Include one that is already good, if there is one. "rating": "correct" (grammatical, but a native wouldn't say it this way), "natural", or "native" (idiomatic, native-like). "upgrade": a more natural or more native-like version, with "upgrade_rating": "more_natural" or "native". For sentences rated "native", use "" for upgrade.
- "pronunciation": up to 2 words the learner used that Polish speakers often mispronounce, with a simple tip (stressed syllable in CAPITALS, e.g. "comfortable: KUMF-tuh-bul, 3 syllables"). Use [] if nothing is relevant.
${o.noPhrases ? '- "phrases": return an empty list [].' : '- "phrases": 2-3 useful chunks (collocations, phrasal verbs, sentence patterns) that would have helped the learner say what they meant more naturally. Teach whole constructions like "it depends on...", not single words. Skip phrases they have mastered.'}
- "praise": one short, specific sentence about something they did well.

CONVERSATION
${transcript(msgs, rel)}

Reply with only JSON in exactly this shape:
{"corrections":[{"type":"grammar","you_said":"","better":"","more_natural":"","why":"","remember":"","mistake_key":"","mistake_label":"","polish_calque":false}],"naturalness":[{"sentence":"","rating":"correct","upgrade":"","upgrade_rating":"more_natural","why":""}],"pronunciation":[{"word":"","tip":""}],"phrases":[{"en":"","pl":"","example":"","alternatives":[""],"difficulty":"B2","kind":"collocation"}],"praise":""}`;
}

function feedbackPrompt(s, extra) {
  const m = chatMetrics(s);
  const shown = s.batches.flatMap(b => b.result.corrections.map(c => c.mistake_label || c.type)).slice(0, 12).join('; ') || 'none';
  return `You are a supportive English coach for a Polish learner. Write the end-of-session summary for this ${s.scenario ? 'role-play' : 'conversation'} practice. ${sessionLabel(s)}

${learnerContext()}

METRICS (text chat): ${m.n} learner messages, ${m.avgWords} words per message on average, longest message ${m.longest} words, average time to reply ${m.avgReply ? m.avgReply + ' s' : 'unknown'}.
CORRECTIONS ALREADY SHOWN: ${shown}
${extra || ''}
SCORING (1-10). The scores help the learner track progress over time; they are not school grades. Calibrate: 5 = a solid B1, 7 = a solid B2, 9 = C1 or above. Be honest and consistent.
- fluency: how easily and fully they expressed ideas (message length, linking words, reply speed, keeping the conversation going)
- grammar: accuracy
- vocabulary: range and precision
- naturalness: how native-like the phrasing sounds
- confidence: taking initiative, giving details, asking questions, handling unexpected turns

Also write:
- "headline": one short, encouraging, specific sentence.
- "did_well": 2 specific things (quote the learner where useful).
- "improve": the 2 most important things to work on (communication and naturalness first). No long lists.
- "remember": exactly 3 short, concrete takeaways, each with an English example.
- "level": CEFR estimate for this session (A2, B1, B1+, B2, B2+, C1 or C2).
- "strengths": 1-3 short areas in English (e.g. "past tenses", "small talk", "linking ideas").
${explainRule()}

TRANSCRIPT
${transcript(s.messages.slice(-40), 0)}

Reply with only JSON:
{"headline":"","scores":{"fluency":0,"grammar":0,"vocabulary":0,"naturalness":0,"confidence":0},"did_well":["",""],"improve":["",""],"remember":["","",""],"level":"B1+","strengths":[""]}`;
}

function writingPrompt(type, ctx, text) {
  const max = words(text) < 80 ? 5 : 8;
  const t = typeLabel(type).toLowerCase();
  return `You are an expert English editor and coach for a Polish learner. Check this ${t} and show concrete corrections.

${learnerContext()}

TEXT TYPE: ${t}
CONTEXT / READER: ${ctx || 'not given'}

TASKS
1. "corrected": the full text with only the necessary corrections (grammar, wrong words, punctuation, spelling). Keep everything else exactly as written, including line breaks and the learner's style.
2. "natural": the full text as a fluent native speaker would write this ${t}: same meaning and personal voice, the right tone and formality, not longer than needed. Keep the line breaks and structure.
3. "mistakes": the ${max} most important issues at most, most important first (communication and naturalness before small grammar points). "original": an exact substring copied from the ORIGINAL text. "corrected": that part corrected. "natural": a more natural way to say that part (or the same as "corrected"). "why": 1-2 short sentences. "type": "grammar", "vocabulary", "unnatural", "punctuation" or "tone". "mistake_key": reuse one of: ${keysList()} (or a new short kebab-case key). "mistake_label": short English name. "polish_calque": true if it's a word-for-word translation from Polish. Skip trivial issues.
4. "expressions": 3-5 useful expressions for this type of text that the learner could use next time (chunks, collocations, sentence patterns, not single words), each with a natural Polish meaning and an example.
5. "level": {"cefr": "B1+", "comment": "one sentence explaining the estimate"}.
6. "scores": grammar, vocabulary, naturalness, clarity, each 1-10 (for tracking only; 5 = solid B1, 7 = solid B2, 9 = C1+).
7. "tone": one sentence: does the tone fit this ${t}? What to adjust, if anything?
8. "did_well": one specific strength.
${explainRule()}

ORIGINAL TEXT
"""
${text}
"""

Reply with only JSON:
{"corrected":"","natural":"","mistakes":[{"original":"","corrected":"","natural":"","why":"","type":"grammar","mistake_key":"","mistake_label":"","polish_calque":false}],"expressions":[{"en":"","pl":"","example":"","alternatives":[""],"difficulty":"B2","kind":"expression"}],"level":{"cefr":"B2","comment":""},"scores":{"grammar":0,"vocabulary":0,"naturalness":0,"clarity":0},"tone":"","did_well":""}`;
}

function sentencePrompt(sentence, ctx) {
  return `A Polish learner of English asks: "Would a native speaker really say this?"

SENTENCE: "${sentence}"
SITUATION: ${ctx || 'everyday conversation'}
Learner level: ${Store.profile.level || 'B1/B2'}

Give four versions on a naturalness ladder (a version may repeat the previous one if it can't be improved):
- "correct": grammatically correct, as close to the learner's sentence as possible
- "natural": sounds natural to a native speaker
- "more_natural": the more typical, everyday way to say it
- "native": excellent, native-like and idiomatic (a common phrasal verb or idiom is welcome if it fits; never force rare idioms)
Also:
- "rating" of the learner's original sentence: "incorrect", "correct", "natural" or "native".
- "why": 2-3 short sentences on the key differences.
- "alternatives": 2 other natural ways to say it, labelled by register, e.g. {"text":"","note":"casual"} and {"text":"","note":"formal"}.
- "key_phrase": the most useful chunk from the native-like version, with a natural Polish meaning and an example.
${explainRule()}

Reply with only JSON:
{"rating":"correct","correct":"","natural":"","more_natural":"","native":"","why":"","alternatives":[{"text":"","note":"casual"}],"key_phrase":{"en":"","pl":"","example":""}}`;
}

function dailyContentPrompt(d) {
  const mine = d.chat.messages.filter(m => m.role === 'me').map(m => m.text).join('\n').slice(0, 3000);
  const known = Store.vocab.items.map(v => v.en).slice(0, 120).join('; ') || 'none';
  return `Create today's 5 phrases for a Polish learner of English, plus one short exercise per phrase.

${learnerContext()}

TODAY'S WARM-UP: ${sessionLabel(d.chat)}
WHAT THE LEARNER WROTE:
"""
${mine || '(nothing yet)'}
"""

PHRASES
- Exactly 5 items the learner will really use in normal conversation or at work. Prefer phrasal verbs, collocations, natural expressions and useful sentence patterns. An idiom only if it is genuinely common.
- Teach whole constructions with their typical structure (e.g. "it depends on + noun/-ing", "I'm not sure whether...", "get used to + -ing"), not single words.
- At least 2 items should help the learner say what they tried to say in the warm-up more naturally.
- Slightly above the learner's level. Don't include anything from this list: ${known}.
- "pl": a natural Polish meaning (not word for word). "example": a natural sentence. "alternatives": 1-2 natural alternatives. "kind": "phrasal verb", "collocation", "expression", "sentence pattern" or "idiom".

EXERCISES: one per phrase ("phrase" = its index 0-4). Use at least 2 different types:
- "gap": a natural sentence with ___ where the phrase (correctly inflected) goes; "answer" = the missing words.
- "rewrite": a plain sentence to rewrite using the phrase; "answer" = a model answer.
- "respond": a short personal question to answer using the phrase; "answer" = a model answer.

Reply with only JSON:
{"phrases":[{"en":"","pl":"","example":"","alternatives":[""],"difficulty":"B2","kind":"collocation"}],"exercises":[{"phrase":0,"type":"gap","prompt":"","answer":""}]}`;
}

function reviewPrompt(ms) {
  return `Create a quick review of a Polish learner's recurring mistakes (level ${Store.profile.level || 'B1/B2'}).
For each mistake below write a one-line "rule" that is easy to remember, and exactly 2 short exercises in new contexts that target this exact problem:
- "fix": an English sentence containing the typical error; the learner corrects it. "answer" = the corrected sentence.
- "translate": a short, natural Polish sentence that tempts the typical Polish-speaker error; the learner translates it into English. "answer" = a natural English translation.
Don't reuse the learner's original sentences.
${explainRule()}

MISTAKES
${ms.map(m => '- key: ' + m.key + ' | ' + m.label + ' | seen ' + m.count + 'x | learner\'s errors: ' + (m.examples.slice(0, 2).map(e => '"' + e.wrong + '" -> "' + e.right + '"').join('; ') || '-')).join('\n')}

Reply with only JSON: {"items":[{"key":"","rule":"","exercises":[{"type":"fix","prompt":"","answer":""},{"type":"translate","prompt":"","answer":""}]}]}`;
}

function lessonPrompt(m) {
  const ex = m.examples.slice(0, 3).map(e => '"' + e.wrong + '" -> "' + e.right + '"').join('; ');
  return `Create a short mini-lesson for a Polish learner of English (level ${Store.profile.level || 'B1/B2'}) about one of their recurring mistakes.
MISTAKE: ${m.label} [${m.key}], seen ${m.count} times. The learner's own errors: ${ex || 'none recorded'}.
Include:
- "explanation": 2-3 short sentences: why this is wrong and how English works here (mention the Polish habit behind it, if relevant).
- "pattern": a short formula or rule of thumb that is easy to remember.
- "examples": exactly 2 natural example sentences that use the structure correctly, each with a short note.
- "exercises": 3 short exercises in new contexts: one "fix" (a sentence with the typical error to correct), one "translate" (a short Polish sentence that tempts this error; answer in English) and one "gap" (a sentence with ___ to fill). Each with "prompt" and "answer".
${explainRule()}
Reply with only JSON: {"explanation":"","pattern":"","examples":[{"en":"","note":""},{"en":"","note":""}],"exercises":[{"type":"fix","prompt":"","answer":""},{"type":"translate","prompt":"","answer":""},{"type":"gap","prompt":"","answer":""}]}`;
}

function checkPrompt(items) {
  return `Check a Polish learner's answers to short English exercises. Be fair and encouraging: accept any answer that is correct, natural and does what the task asks (other wording, contractions and inflected forms are fine). Mention small typos without failing the answer for them.
${explainRule()} Keep each feedback to 1-2 short sentences.

ITEMS
${items.map(x => '#' + x.i + ' | Task type: ' + x.type + ' | Target: ' + (x.target || '-') + ' | Task: ' + x.prompt + ' | Model answer: ' + (x.answer || '-') + ' | Learner\'s answer: "' + x.given + '"').join('\n')}

For each item return {"i": number, "ok": true or false, "feedback": "", "better": "a natural correct answer (improve the learner's answer if it could sound more natural)"}.
Reply with only JSON: {"results":[{"i":0,"ok":true,"feedback":"","better":""}]}`;
}

function vocabFillPrompt(text) {
  return `A Polish learner wants to add this to their English vocabulary list: "${text}".
If a longer construction is more useful or natural, turn it into that chunk (e.g. "depend" -> "it depends on...", "decision" -> "make a decision"). If the input is Polish, give the natural English equivalent.
Reply with only JSON: {"en":"","pl":"natural Polish meaning","example":"a natural example sentence","alternatives":["",""],"difficulty":"B1","kind":"collocation"}`;
}

function diagPrompt(score, missed, a1, a2) {
  return `You are assessing the English level of a Polish speaker.
Multiple-choice quiz: ${score}/12 correct (areas missed: ${missed.map(q => q.key).join(', ') || 'none'}).
Writing task 1, "Describe a typical day at work or school": """${a1.slice(0, 2000)}"""
Writing task 2, "If you could live in any country for a year, where would you go and why?": """${a2.slice(0, 2000)}"""
Estimate their CEFR level (A2, B1, B1+, B2, B2+, C1 or C2), weighing the writing more than the quiz. Then list up to 4 "focus" areas: real mistakes from their writing, each with the learner's exact words ("you_said"), a corrected natural version ("better"), a short explanation in Polish ("why") and a mistake key (reuse one of: ${Object.keys(MISTAKE_TYPES).join(', ')}). Also "strengths" (1-3 short phrases in English) and a "summary" in Polish: 2 sentences, encouraging and specific.
Reply with only JSON: {"level":"B1+","summary":"","strengths":[""],"focus":[{"you_said":"","better":"","why":"","mistake_key":"","mistake_label":""}]}`;
}

/* ---------- normalisers ---------- */
function normAnalysis(r) {
  r = r && typeof r === 'object' ? r : {};
  const types = ['grammar', 'vocabulary', 'unnatural', 'pronunciation'];
  return {
    corrections: arr(r.corrections).map(c => ({ type: types.includes(c && c.type) ? c.type : 'grammar', you_said: str(c && c.you_said), better: str(c && c.better), more_natural: str(c && c.more_natural), why: str(c && c.why), remember: str(c && c.remember), mistake_key: slug(c && c.mistake_key), mistake_label: str(c && c.mistake_label), polish_calque: !!(c && c.polish_calque) })).filter(c => c.you_said && (c.better || c.more_natural)).slice(0, 6),
    naturalness: arr(r.naturalness).map(n => ({ sentence: str(n && n.sentence), rating: n && n.rating in RUNG_IDX ? n.rating : 'correct', upgrade: str(n && n.upgrade), upgrade_rating: n && (n.upgrade_rating === 'more_natural' || n.upgrade_rating === 'native') ? n.upgrade_rating : 'native', why: str(n && n.why) })).filter(n => n.sentence).slice(0, 4),
    pronunciation: arr(r.pronunciation).map(p => ({ word: str(p && p.word), tip: str(p && p.tip) })).filter(p => p.word).slice(0, 3),
    phrases: arr(r.phrases).map(normPhrase).filter(p => p.en).slice(0, 4),
    praise: str(r.praise)
  };
}
function normFeedback(r) {
  r = r || {};
  const sc = r.scores || {};
  const scores = {};
  DIMS.forEach(d => { scores[d] = score10(sc[d]); });
  const list = (x, n) => arr(x).map(str).filter(Boolean).slice(0, n);
  return { headline: str(r.headline), scores, did_well: list(r.did_well, 3), improve: list(r.improve, 3), remember: list(r.remember, 3), level: levelNorm(r.level), strengths: list(r.strengths, 3) };
}
function normWriting(r) {
  r = r || {};
  const lv = r.level || {}, sc = r.scores || {};
  return {
    corrected: str(r.corrected), natural: str(r.natural),
    mistakes: arr(r.mistakes).map(m => ({ original: str(m && m.original), corrected: str(m && m.corrected), natural: str(m && m.natural), why: str(m && m.why), type: str(m && m.type) || 'grammar', mistake_key: slug(m && m.mistake_key), mistake_label: str(m && m.mistake_label), polish_calque: !!(m && m.polish_calque) })).filter(m => m.original && m.corrected).slice(0, 10),
    expressions: arr(r.expressions).map(normPhrase).filter(p => p.en).slice(0, 5),
    level: { cefr: levelNorm(lv.cefr) || '', comment: str(lv.comment) },
    scores: { grammar: score10(sc.grammar), vocabulary: score10(sc.vocabulary), naturalness: score10(sc.naturalness), clarity: score10(sc.clarity) },
    tone: str(r.tone), did_well: str(r.did_well)
  };
}
function normLesson(r) {
  r = r || {};
  return {
    explanation: str(r.explanation), pattern: str(r.pattern),
    examples: arr(r.examples).map(e => ({ en: str(e && e.en), note: str(e && e.note) })).filter(e => e.en).slice(0, 2),
    exercises: arr(r.exercises).map(x => ({ type: ['fix', 'translate', 'gap'].includes(x && x.type) ? x.type : 'fix', prompt: str(x && x.prompt), answer: str(x && x.answer) })).filter(x => x.prompt).slice(0, 3)
  };
}
function recordAnalysis(r, source) {
  r.corrections.forEach(c => { if (c.type !== 'pronunciation') c.repeat = Mistakes.record(c); });
  if (r.corrections.length) commit('mistakes');
  if (r.phrases.length) { r.phrases.forEach(p => Vocab.add(p, source)); commit('vocab'); }
}

/* ---------- chat sessions ---------- */
function newSession(kind, id, warmup) {
  return { id: uid(), kind, topic: kind === 'topic' ? id : null, scenario: kind === 'scenario' ? id : null, warmup: !!warmup, messages: [], batches: [], analyzedUpTo: 0, startedAt: Date.now(), ended: false, feedback: null, scenarioDone: false };
}
function sessionTitle(s) {
  const sc = s.scenario && SCENARIOS.find(x => x.id === s.scenario);
  if (sc) return sc.title;
  const tp = s.topic && TOPICS.find(x => x.id === s.topic);
  return tp ? tp.label : 'Conversation';
}
function chatMetrics(s) {
  const ms = s.messages;
  const mine = ms.filter(m => m.role === 'me');
  const wc = mine.map(m => words(m.text));
  const replies = [];
  ms.forEach((m, i) => {
    if (m.role === 'me' && i > 0 && ms[i - 1].role === 'partner' && m.t && ms[i - 1].t) {
      const sec = (m.t - ms[i - 1].t) / 1000;
      if (sec > 0 && sec < 600) replies.push(sec);
    }
  });
  return { n: mine.length, totalWords: wc.reduce((a, b) => a + b, 0), avgWords: wc.length ? Math.round(avg(wc)) : 0, longest: wc.length ? Math.max.apply(null, wc) : 0, avgReply: replies.length ? Math.round(avg(replies)) : null };
}
const countCalques = s => s.batches.reduce((n, b) => n + b.result.corrections.filter(c => c.polish_calque).length, 0);
const countCorr = s => s.batches.reduce((n, b) => n + b.result.corrections.length, 0);
const sessionMinutes = s => { const last = s.messages.length ? s.messages[s.messages.length - 1].t : Date.now(); return Math.max(1, Math.min(90, Math.round((last - s.startedAt) / 60000))); };

/* ---------- text to speech ---------- */
const TTS = {
  ok: typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined',
  voices: [],
  load() { try { this.voices = speechSynthesis.getVoices().filter(v => /^en[-_]/i.test(v.lang)); } catch (e) {} },
  pick() {
    const want = (Store.profile.voice || 'en-GB').toLowerCase();
    const score = v => (v.lang.replace('_', '-').toLowerCase().indexOf(want) === 0 ? 10 : 0) + (/natural|neural|google|premium|enhanced|siri/i.test(v.name) ? 3 : 0);
    return this.voices.slice().sort((a, b) => score(b) - score(a))[0] || null;
  },
  speak(text) {
    if (!this.ok) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text).replace(/…|\.\.\./g, ', '));
      const v = this.pick();
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = Store.profile.voice || 'en-GB';
      u.rate = Store.profile.rate || 1;
      speechSynthesis.speak(u);
    } catch (e) {}
  }
};
if (TTS.ok) { TTS.load(); try { speechSynthesis.addEventListener('voiceschanged', () => TTS.load()); } catch (e) {} }

/* ---------- word diff ---------- */
function diffWords(a, b) {
  const A = str(a).match(/\S+\s*/g) || [], B = str(b).match(/\S+\s*/g) || [];
  const n = A.length, m = B.length;
  if (n * m > 1500000) return null;
  const eq = (x, y) => x.trim() === y.trim();
  const dp = [];
  for (let i = 0; i <= n; i++) dp.push(new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = eq(A[i], B[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = [];
  const push = (t, s) => { const l = out[out.length - 1]; if (l && l.t === t) l.s += s; else out.push({ t, s }); };
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (eq(A[i], B[j])) { push('eq', B[j]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { push('del', A[i]); i++; }
    else { push('ins', B[j]); j++; }
  }
  while (i < n) push('del', A[i++]);
  while (j < m) push('ins', B[j++]);
  return out;
}
function diffText(a, b) {
  const pa = str(a).split('\n'), pb = str(b).split('\n');
  if (pa.length === pb.length) {
    const out = [];
    for (let k = 0; k < pa.length; k++) {
      const d = diffWords(pa[k], pb[k]);
      if (!d) return null;
      if (k) out.push({ t: 'eq', s: '\n' });
      out.push.apply(out, d);
    }
    return out;
  }
  return diffWords(a, b);
}
