/* ---------- daily practice ---------- */
const STEPS = ['Warm-up', 'Corrections', '5 phrases', 'Use them', 'Review', 'Summary'];
function pickDaily() {
  const recent = arr(Store.profile.lastTopics);
  const dayNum = Math.floor(Date.now() / DAY);
  if (dayNum % 2 === 0) {
    const pool = TOPICS.filter(t => !recent.includes(t.id));
    return { kind: 'topic', id: pick(pool.length ? pool : TOPICS).id };
  }
  const all = SCENARIOS.concat(arr(Store.profile.customScenarios));
  const pool = all.filter(s => !recent.includes(s.id));
  return { kind: 'scenario', id: pick(pool.length ? pool : all).id };
}
function newDaily() {
  const p = pickDaily();
  return { id: uid(), day: dayKey(), step: 1, maxStep: 1, chat: newSession(p.kind, p.id, true), reviewKeys: null, analysis: null, content: null, ex: null, review: null, rev: null, feedback: null, done: false, recorded: false };
}
function DailyHost({ go }) {
  const [round, setRound] = useState(0);
  return html`<${Daily} key=${round} go=${go} again=${() => { lsDel(DRAFT_DAILY); setRound(round + 1); window.scrollTo(0, 0); }} />`;
}
function WarmTimer({ start }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const left = Math.max(0, 180 - Math.floor((now - start) / 1000));
  return html`<div class=${'timer' + (left ? '' : ' up')} aria-label="Time left">${left ? Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0') : 'Time’s up'}</div>`;
}

function Daily({ go, again }) {
  const dref = useRef(null);
  if (!dref.current) {
    const x = lsGet(DRAFT_DAILY);
    dref.current = x && x.day === dayKey() && x.chat && x.chat.messages ? x : newDaily();
  }
  const d = dref.current;
  const [, tick] = useState(0);
  const save = () => { lsSet(DRAFT_DAILY, dref.current); tick(n => n + 1); };
  const chat = useChat(d.chat, { onSave: () => lsSet(DRAFT_DAILY, dref.current) });
  const flight = useRef({});
  const [busy, setBusy] = useState({});
  const [errs, setErrs] = useState({});
  const setB = (k, v) => { flight.current[k] = v; setBusy(b => Object.assign({}, b, { [k]: v })); };
  const setE = (k, v) => setErrs(b => Object.assign({}, b, { [k]: v }));

  async function runAnalysis() {
    if (d.analysis || flight.current.analysis) return;
    setB('analysis', true); setE('analysis', '');
    try {
      const b = await chat.analyze(3, true, { noPhrases: true });
      const last = d.chat.batches[d.chat.batches.length - 1];
      d.analysis = b ? b.result : (last ? last.result : { corrections: [], naturalness: [], pronunciation: [], phrases: [], praise: '' });
      save();
      if (!d.reviewKeys || !d.reviewKeys.length) runReview();
    } catch (e) { setE('analysis', errText(e)); }
    finally { setB('analysis', false); }
  }
  async function runContent() {
    if (d.content || flight.current.content) return;
    setB('content', true); setE('content', '');
    try {
      const r = await aiJSON(dailyContentPrompt(d), { modelTier: 'default' });
      const phrases = arr(r && r.phrases).map(normPhrase).filter(p => p.en).slice(0, 5);
      if (!phrases.length) throw { code: 'invalid_json' };
      phrases.forEach(p => { const v = Vocab.add(p, 'daily'); if (v) p.vid = v.id; });
      commit('vocab');
      const exercises = arr(r.exercises).map(x => ({ phrase: Math.max(0, Math.min(phrases.length - 1, Number(x && x.phrase) || 0)), type: ['gap', 'rewrite', 'respond'].includes(x && x.type) ? x.type : 'respond', prompt: str(x && x.prompt), answer: str(x && x.answer) })).filter(x => x.prompt).slice(0, 5);
      d.content = { phrases, exercises };
      save();
    } catch (e) { setE('content', errText(e)); }
    finally { setB('content', false); }
  }
  async function runReview() {
    if (d.review || flight.current.review) return;
    const keys = d.reviewKeys && d.reviewKeys.length ? d.reviewKeys : Mistakes.top(3).map(m => m.key);
    const ms = keys.map(k => Mistakes.find(k)).filter(Boolean).slice(0, 3);
    if (!ms.length) { if (d.analysis) { d.review = { items: [] }; save(); } return; }
    setB('review', true); setE('review', '');
    try {
      const r = await aiJSON(reviewPrompt(ms), { modelTier: 'default' });
      const items = arr(r && r.items).map((it, i) => {
        let key = slug(it && it.key);
        if (!Mistakes.find(key)) key = ms[i] ? ms[i].key : key;
        return { key, rule: str(it && it.rule), exercises: arr(it && it.exercises).map(x => ({ type: x && x.type === 'translate' ? 'translate' : 'fix', prompt: str(x && x.prompt), answer: str(x && x.answer) })).filter(x => x.prompt).slice(0, 2) };
      }).filter(it => it.exercises.length);
      d.review = { items };
      save();
    } catch (e) { setE('review', errText(e)); }
    finally { setB('review', false); }
  }
  async function runFeedback() {
    if (d.feedback || flight.current.feedback) return;
    setB('feedback', true); setE('feedback', '');
    try {
      const exs = d.ex ? 'EXERCISES WITH TODAY\'S PHRASES: ' + d.ex.results.filter(r => r.ok).length + '/' + d.ex.results.length + ' correct.' : '';
      const r = await aiJSON(feedbackPrompt(d.chat, 'This was a daily practice session: a 3-minute warm-up conversation, then corrections, 5 new phrases, an exercise and a review of old mistakes. ' + exs), { modelTier: 'default' });
      d.feedback = normFeedback(r);
      save();
    } catch (e) { setE('feedback', errText(e)); }
    finally { setB('feedback', false); }
  }
  function finishDaily() {
    if (d.recorded) return;
    const m = chatMetrics(d.chat);
    const f = d.feedback;
    recordSession({ mode: 'daily', title: sessionTitle(d.chat), scores: f ? f.scores : null, remember: f ? f.remember : [], strengths: f ? f.strengths : [], calques: countCalques(d.chat), corrections: d.analysis ? d.analysis.corrections.length : 0, minutes: Math.max(1, Math.min(60, Math.round((Date.now() - d.chat.startedAt) / 60000))), words: m.totalWords });
    d.recorded = true; d.done = true;
    save();
  }
  function toStep(n) {
    d.step = n; d.maxStep = Math.max(d.maxStep || 1, n);
    if (n >= 2 && !d.reviewKeys) d.reviewKeys = Mistakes.top(3).map(m => m.key);
    save();
    window.scrollTo(0, 0);
    if (n >= 2) { runAnalysis(); runContent(); if (d.reviewKeys.length) runReview(); }
    if (n >= 5) runFeedback();
  }
  useEffect(() => {
    if (!d.noted) { noteTopic(d.chat.topic || d.chat.scenario); d.noted = true; save(); }
    if (d.step >= 2) { runAnalysis(); runContent(); if (d.reviewKeys && d.reviewKeys.length) runReview(); }
    if (d.step >= 5) runFeedback();
  }, []);
  useEffect(() => { if (d.step === 6 && d.feedback && !d.recorded) finishDaily(); });

  const mine = d.chat.messages.filter(m => m.role === 'me').length;
  const sc = findScenario(d.chat.scenario);
  const Retry = ({ k, fn }) => errs[k] ? html`<div class="chat-err" role="alert"><span>${errs[k]}</span><button class="btn sm" onClick=${fn}>Try again</button></div>` : null;
  const Next = ({ to, label, disabled }) => html`<div class="stepnav"><button class="linkbtn" onClick=${() => toStep(d.step - 1)}><${Icon} n="back" s=${16} /> Back</button><button class="btn primary" disabled=${disabled} onClick=${() => toStep(to)}>${label}</button></div>`;

  let body;
  if (d.step === 1) {
    body = html`<div class="block">
      <div class="warm-h"><div><span class="lbl">Step 1 · Warm-up, about 3 minutes</span><h2 style="font-size:24px">${sessionTitle(d.chat)}</h2></div>
        <div class="row"><${WarmTimer} start=${d.chat.startedAt} /><button class="btn primary" disabled=${mine < 3} onClick=${() => toStep(2)}>Next: corrections</button></div></div>
      <p class="muted">Reply quickly and keep going. Don’t translate in your head: if you don’t know a word, describe it. ${mine < 3 ? 'Write at least ' + (3 - mine) + ' more message' + (3 - mine === 1 ? '' : 's') + ' to continue.' : ''}</p>
      ${sc ? html`<${ScenarioBrief} sc=${sc} />` : null}
      <${ChatView} chat=${chat} composer=${true} />
    </div>`;
  } else if (d.step === 2) {
    body = html`<div class="block">
      <span class="lbl">Step 2 · Your most important corrections</span>
      ${d.analysis ? html`<${Corrections} batch=${{ result: d.analysis, count: mine }} title="Top corrections from the warm-up" hidePhrases=${true} />` : busy.analysis ? html`<${Thinking} label="Reading your messages" />` : null}
      <${Retry} k="analysis" fn=${runAnalysis} />
      <${Next} to=${3} label="Next: 5 phrases" disabled=${!d.analysis} />
    </div>`;
  } else if (d.step === 3) {
    body = html`<div class="block">
      <span class="lbl">Step 3 · 5 phrases for real conversations</span>
      ${d.content ? html`<${PhraseList} list=${d.content.phrases} /><p class="small muted">Saved to My vocabulary. Try to use one of them in your next conversation.</p>` : busy.content ? html`<${Thinking} label="Choosing phrases for you" />` : null}
      <${Retry} k="content" fn=${runContent} />
      <${Next} to=${4} label="Next: use them" disabled=${!d.content} />
    </div>`;
  } else if (d.step === 4) {
    const items = d.content ? d.content.exercises.map(x => ({ type: x.type, prompt: x.prompt, answer: x.answer, target: (d.content.phrases[x.phrase] || {}).en })) : [];
    body = html`<div class="block">
      <span class="lbl">Step 4 · Use today’s phrases</span>
      ${d.content ? html`<${Exercises} items=${items} idPrefix="dx" initial=${d.ex} onChecked=${(res, ans, first) => {
        if (first) { d.content.exercises.forEach((x, i) => { const p = d.content.phrases[x.phrase]; if (p && p.vid && !res[i].skipped) Vocab.bump(p.vid, res[i].ok); }); commit('vocab'); }
        d.ex = { answers: ans, results: res }; save();
      }} />` : busy.content ? html`<${Thinking} label="Preparing the exercise" />` : null}
      <${Retry} k="content" fn=${runContent} />
      <${Next} to=${5} label="Next: review old mistakes" disabled=${!d.content} />
    </div>`;
  } else if (d.step === 5) {
    const its = d.review ? d.review.items : [];
    const flat = [];
    its.forEach(it => { const m = Mistakes.find(it.key); it.exercises.forEach(x => flat.push({ type: x.type, prompt: x.prompt, answer: x.answer, key: it.key, group: m ? m.label : '' })); });
    body = html`<div class="block">
      <span class="lbl">Step 5 · Review your recurring mistakes</span>
      ${d.review ? (its.length ? html`
        ${its.map(it => { const m = Mistakes.find(it.key); const e = m && m.examples[0]; return html`<div class="rv-h"><b>${m ? m.label : it.key}${m ? html` <span class="tag err">×${m.count}</span>` : null}</b>${e ? html`<div class="small"><del>${e.wrong}</del> → <ins>${e.right}</ins></div>` : null}${it.rule ? html`<div class="small">${it.rule}</div>` : null}</div>`; })}
        <${Exercises} items=${flat} idPrefix="rv" initial=${d.rev} onChecked=${(res, ans, first) => {
          if (first) { its.forEach(it => { const idx = flat.map((x, i) => x.key === it.key ? i : -1).filter(i => i >= 0 && !res[i].skipped); if (idx.length) Mistakes.review(it.key, idx.every(i => res[i].ok)); }); commit('mistakes'); }
          d.rev = { answers: ans, results: res }; save();
        }} />` : html`<p class="empty">Nothing to review yet. From tomorrow, this step brings back the mistakes you make most often.</p>`)
      : busy.review || busy.analysis ? html`<${Thinking} label="Preparing your review" />` : null}
      <${Retry} k="review" fn=${runReview} />
      <${Next} to=${6} label="Finish: see my summary" disabled=${false} />
    </div>`;
  } else {
    const exOk = d.ex ? d.ex.results.filter(r => r.ok).length + ' / ' + d.ex.results.length : '–';
    const rvOk = d.rev ? d.rev.results.filter(r => r.ok).length + ' / ' + d.rev.results.length : '–';
    body = html`<div class="block">
      <span class="lbl">Summary</span>
      <div class="ov-sum">
        <div class="ov-item"><span class="lbl">Corrections</span><b>${d.analysis ? d.analysis.corrections.length : 0}</b><small>from the warm-up</small></div>
        <div class="ov-item"><span class="lbl">New phrases</span><b>${d.content ? d.content.phrases.length : 0}</b><small>saved to your list</small></div>
        <div class="ov-item"><span class="lbl">Exercise</span><b>${exOk}</b><small>correct</small></div>
        <div class="ov-item"><span class="lbl">Review</span><b>${rvOk}</b><small>correct</small></div>
      </div>
      ${d.feedback ? html`<${FeedbackPanel} fb=${d.feedback} />` : busy.feedback ? html`<${Thinking} label="Writing your summary" />` : null}
      <${Retry} k="feedback" fn=${runFeedback} />
      <div class="row"><button class="btn primary" onClick=${() => go('home')}>Done for today</button><button class="btn" onClick=${again}>Do another round</button><button class="btn" onClick=${() => go('progress')}>See my progress</button></div>
    </div>`;
  }
  return html`<div class="page">
    <header class="page-h"><h1>Daily practice</h1>
      <div class="steps" aria-label="Steps">${STEPS.map((l, i) => { const n = i + 1; const cls = n === d.step ? ' cur' : n < d.step || n <= (d.maxStep || 1) ? ' done' : ''; return html`<button class=${'step' + cls} disabled=${n > (d.maxStep || 1)} onClick=${() => toStep(n)} aria-current=${n === d.step ? 'step' : null}><i></i><span>${n}. ${l}</span></button>`; })}</div>
    </header>
    ${body}
  </div>`;
}
