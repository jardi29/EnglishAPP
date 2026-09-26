/* ---------- home ---------- */
function Tile({ icon, title, desc, meta, onClick, accent }) {
  return html`<button class=${'tile' + (accent ? ' accent' : '')} onClick=${onClick}>
    <span class="tile-ic"><${Icon} n=${icon} s=${26} /></span>
    <span class="tile-t">${title}</span>
    <span class="tile-d">${desc}</span>
    <span class="tile-meta">${meta}</span>
  </button>`;
}
function Extra({ icon, title, desc, onClick }) {
  return html`<button class="xcard" onClick=${onClick}><span class="tile-ic"><${Icon} n=${icon} s=${20} /></span><span><b>${title}</b><span class="xd">${desc}</span></span></button>`;
}
function Home({ go }) {
  const p = Store.profile;
  const today = dayKey();
  const dailyDone = p.sessions.some(s => s.mode === 'daily' && s.day === today);
  const dd = lsGet(DRAFT_DAILY);
  const dailyOn = dd && dd.day === today && !dd.done && (dd.step > 1 || (dd.chat && dd.chat.messages.some(m => m.role === 'me')));
  const sd = lsGet(DRAFT_SPEAK);
  const speakOn = sd && !sd.ended && arr(sd.messages).some(m => m.role === 'me');
  const top = Mistakes.top(3);
  const st = streak();
  const due = Vocab.due().length;
  const ab = p.about || {};
  const aboutSet = !!(ab.role || ab.goals || arr(ab.uses).length);
  let dateLabel = '';
  try { dateLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }); } catch (e) {}
  return html`<div class="page">
    <section class="hero">
      <p class="lbl">${dateLabel}${p.level ? ' · Level ' + p.level : ''}${st ? ' · ' + st + '-day streak' : ''}</p>
      <h1>What do you want to practice?</h1>
    </section>
    <div class="tiles">
      <${Tile} icon="chat" title="Speaking" desc="Chat about everyday topics or role-play real situations. You keep talking; corrections come in batches." meta=${speakOn ? 'Conversation in progress · resume' : TOPICS.length + ' topics · ' + (SCENARIOS.length + arr(p.customScenarios).length) + ' real-life situations'} onClick=${() => go('speaking')} />
      <${Tile} icon="pen" title="Writing" desc="Paste an email, a message or a post. See the exact fixes, a more natural version and why." meta="Text check · Would a native say this?" onClick=${() => go('writing')} />
      <${Tile} icon="daily" title="Daily practice" desc="10–15 minutes: a short conversation, your top corrections, 5 phrases, an exercise and a review of old mistakes." meta=${dailyDone ? 'Done today ✓' : dailyOn ? 'In progress · step ' + dd.step + ' of 6' : 'Not done yet today'} accent=${!dailyDone} onClick=${() => go('daily')} />
      <${Tile} icon="chart" title="My progress" desc="Your recurring mistakes, your vocabulary list and how your English is changing." meta=${Mistakes.items.length + ' mistakes tracked · ' + Store.vocab.items.length + ' phrases'} onClick=${() => go('progress')} />
    </div>
    <section class="focus">
      <div class="block-h"><h2>More ways to practise</h2></div>
      <div class="extras">
        <${Extra} icon="cards" title="Phrase review" desc=${due ? due + ' phrase' + (due === 1 ? '' : 's') + ' to review · 3–5 min' : 'Nothing due · review anyway'} onClick=${() => go('review')} />
        <${Extra} icon="bolt" title="Think in English" desc="30-second answers and a Polish → English sprint" onClick=${() => go('sprint')} />
        <${Extra} icon="wave" title="Shadowing" desc="Listen, repeat with dictation, compare" onClick=${() => go('shadow')} />
        <${Extra} icon="report" title="Weekly report" desc="Your week, your coach’s plan for the next one" onClick=${() => go('progress', { tab: 'report' })} />
      </div>
      ${!aboutSet ? html`<button class="nudge" onClick=${() => go('progress', { tab: 'about' })}><${Icon} n="user" s=${20} /><span><b>Tell your coach about yourself.</b> Your job, where you use English and your goals. Conversations, situations and phrases will match your real life.</span></button>` : null}
    </section>
    <section class="focus">
      <div class="block-h"><h2>Your focus right now</h2>${top.length ? html`<button class="linkbtn" onClick=${() => go('progress', { tab: 'mistakes' })}>All mistakes →</button>` : null}</div>
      ${top.length
        ? html`<div class="chips">${top.map(m => html`<button class="chip mist" onClick=${() => go('progress', { tab: 'mistakes' })}><span>${m.label}</span><b>×${m.count}</b></button>`)}</div>`
        : html`<p class="muted">Your recurring mistakes will show up here after your first conversation or writing check.</p>`}
    </section>
  </div>`;
}

/* ---------- onboarding ---------- */
function Onboarding({ go, retake }) {
  const [mode, setMode] = useState(retake ? 'test' : 'choose');
  function setLevel(l) {
    const p = Store.profile;
    p.level = l; p.levelSource = 'self'; p.onboarded = true;
    p.levelHistory.push({ date: new Date().toISOString(), level: l, source: 'self' });
    commit('profile');
    toast('Level set to ' + l + '. It will adjust as you practise.');
    go('home');
  }
  if (mode === 'test') return html`<${Diagnostic} go=${go} onCancel=${() => retake ? go('progress', { tab: 'settings' }) : setMode('choose')} />`;
  if (mode === 'pick') return html`<div class="page">
    <header class="page-h"><button class="linkbtn" onClick=${() => setMode('choose')}><${Icon} n="back" s=${16} /> Back</button><h1>Which sounds most like you?</h1><p class="lead">Pick the closest one. The app keeps checking and adjusts your level as you practise.</p></header>
    <div class="levels">${['A2', 'B1', 'B1+', 'B2', 'B2+', 'C1'].map(l => html`<button class="levelbtn" onClick=${() => setLevel(l)}><b>${l}</b><span>${LEVEL_INFO[l]}</span></button>`)}</div>
  </div>`;
  return html`<div class="page">
    <header class="page-h">
      <p class="lbl">Welcome</p>
      <h1>Let’s find your level first.</h1>
      <p class="lead">Everything adapts to your level: how your conversation partner talks, which phrases you learn, and whether explanations come in Polish or English.</p>
      <p class="small muted">Aplikacja mówi do Ciebie po angielsku. Wyjaśnienia błędów są na początku po polsku, a z czasem coraz częściej po angielsku.</p>
    </header>
    <div class="opts">
      <button class="opt" onClick=${() => setMode('test')}><span class="lbl">Recommended · about 5 minutes</span><span class="t">Take the level check</span><span class="d">12 quick questions and two short writing tasks. The AI reads your writing and finds your first focus areas.</span></button>
      <button class="opt" onClick=${() => setMode('pick')}><span class="lbl">30 seconds</span><span class="t">I know my level</span><span class="d">Choose from A2 to C1. You can retake the check later in Settings.</span></button>
    </div>
  </div>`;
}

function Diagnostic({ go, onCancel }) {
  const [i, setI] = useState(0);
  const [picks, setPicks] = useState([]);
  const [phase, setPhase] = useState('mc');
  const [a1, setA1] = useState('');
  const [a2, setA2] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [result, setResult] = useState(null);
  const q = DIAG[i];
  function choose(k) {
    const np = picks.slice(); np[i] = k; setPicks(np);
    setTimeout(() => { if (i < DIAG.length - 1) setI(i + 1); else setPhase('open'); }, 160);
  }
  async function evaluate(skip) {
    const score = DIAG.reduce((n, d, j) => n + (picks[j] === d.ans ? 1 : 0), 0);
    const missed = DIAG.map((d, j) => Object.assign({}, d, { picked: picks[j] })).filter(d => d.picked !== d.ans);
    const res = { level: mcToLevel(score), score, missed, summary: '', strengths: [], focus: [], source: 'quiz' };
    if (!skip && words(a1) + words(a2) >= 10) {
      setBusy(true); setNote('');
      try {
        const r = await aiJSON(diagPrompt(score, missed, a1, a2), { modelTier: 'default' });
        const L = levelNorm(r && r.level);
        if (L) { res.level = L; res.source = 'ai'; }
        res.summary = str(r && r.summary);
        res.strengths = arr(r && r.strengths).map(str).filter(Boolean).slice(0, 3);
        res.focus = arr(r && r.focus).map(f => ({ you_said: str(f && f.you_said), better: str(f && f.better), more_natural: str(f && f.better), why: str(f && f.why), mistake_key: slug(f && f.mistake_key), mistake_label: str(f && f.mistake_label) })).filter(f => f.you_said && f.better).slice(0, 4);
      } catch (e) { setNote(errText(e) + ' Your level is based on the quiz for now.'); }
      setBusy(false);
    }
    setResult(res); setPhase('result');
  }
  function start() {
    const p = Store.profile, r = result;
    p.level = r.level; p.levelSource = r.source === 'ai' ? 'test' : 'quiz'; p.onboarded = true;
    p.levelHistory.push({ date: new Date().toISOString(), level: r.level, source: 'check' });
    if (r.strengths.length) p.strengths = r.strengths;
    r.missed.forEach(d => Mistakes.record({ mistake_key: d.key, you_said: d.picked >= 0 ? fillBlank(d, d.picked) : '', better: fillBlank(d, d.ans), more_natural: fillBlank(d, d.ans), why: d.why }));
    r.focus.forEach(f => Mistakes.record(f));
    commit('mistakes'); commit('profile');
    go('home');
  }
  if (phase === 'mc') return html`<div class="page">
    <header class="page-h"><div class="row"><span class="lbl">Level check · question ${i + 1} of ${DIAG.length}</span><div class="grow"></div><button class="linkbtn" onClick=${onCancel}>Cancel</button></div>
      <div class="progressbar"><i style=${'width:' + (i / DIAG.length * 100) + '%'}></i></div></header>
    <p class="q">${q.q}</p>
    <div class="answers">${q.opts.map((o, k) => html`<button class=${'ans' + (picks[i] === k ? ' on' : '')} onClick=${() => choose(k)}>${o}</button>`)}</div>
    <div class="row">${i > 0 ? html`<button class="linkbtn" onClick=${() => setI(i - 1)}><${Icon} n="back" s=${16} /> Previous</button>` : null}<div class="grow"></div><button class="linkbtn" onClick=${() => choose(-1)}>I don’t know</button></div>
  </div>`;
  if (phase === 'open') return html`<div class="page">
    <header class="page-h"><span class="lbl">Level check · writing</span><h1>Two short answers</h1><p class="lead">Write 3–5 sentences for each. Don’t look anything up; mistakes are useful here. The AI uses them to find your first focus areas.</p></header>
    <div class="form">
      <label class="lbl" for="diag-a1">1. Describe a typical day at work or school. What do you actually do?</label>
      <textarea id="diag-a1" class="input" rows="5" value=${a1} onInput=${e => setA1(e.target.value)}></textarea>
      <label class="lbl" for="diag-a2">2. If you could live in any country for a year, where would you go and why?</label>
      <textarea id="diag-a2" class="input" rows="5" value=${a2} onInput=${e => setA2(e.target.value)}></textarea>
    </div>
    <div class="row">${busy ? html`<${Thinking} label="Reading your answers" />` : html`
      <button class="btn primary" onClick=${() => evaluate(false)} disabled=${words(a1) + words(a2) < 10}>See my level</button>
      <button class="linkbtn" onClick=${() => evaluate(true)}>Skip, use the quiz only</button>`}</div>
  </div>`;
  const r = result;
  return html`<div class="page">
    <header class="page-h"><span class="lbl">Your starting level</span>
      <div class="lvlbox"><div class="biglevel">${r.level}</div><div><p class="lead">${LEVEL_INFO[r.level] || ''}</p><p class="small muted">Quiz: ${r.score} / ${DIAG.length}${r.source === 'ai' ? ' · level estimated from your writing and the quiz' : ' · level estimated from the quiz'}</p></div></div>
    </header>
    ${note ? html`<p class="err">${note}</p>` : null}
    ${r.summary ? html`<p class="lead" style="color:var(--ink)">${r.summary}</p>` : null}
    ${r.strengths.length ? html`<div class="block"><h2 style="font-size:19px">Strengths</h2><div class="chips">${r.strengths.map(s => html`<span class="chip">${s}</span>`)}</div></div>` : null}
    ${r.focus.length || r.missed.length ? html`<div class="block"><h2 style="font-size:19px">Your first focus areas</h2>
      ${r.focus.map(f => html`<div class="corrs" style="margin:0"><dl class="cgrid"><dt>You wrote</dt><dd class="said">“${f.you_said}”</dd><dt>Better</dt><dd><${DiffView} ops=${diffWords(f.you_said, f.better)} fallback=${f.better} /></dd>${f.why ? html`<dt>Why</dt><dd>${f.why}</dd>` : null}</dl></div>`)}
      ${r.missed.length ? html`<p class="muted">From the quiz: ${r.missed.map(d => MISTAKE_TYPES[d.key]).join(' · ')}</p>` : null}
    </div>` : null}
    <div class="row"><button class="btn primary" onClick=${start}>Start practising</button></div>
  </div>`;
}
