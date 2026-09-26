/* ---------- my progress ---------- */
function Progress({ go, tab }) {
  const [t, setT] = useState(tab || 'overview');
  const tabs = [['overview', 'Overview'], ['mistakes', 'My common mistakes'], ['vocab', 'My vocabulary'], ['history', 'History'], ['settings', 'Settings']];
  return html`<div class="page">
    <header class="page-h"><h1>My progress</h1></header>
    <div class="tabs" role="tablist">${tabs.map(([k, l]) => html`<button role="tab" aria-selected=${t === k} class=${'tab' + (t === k ? ' on' : '')} onClick=${() => setT(k)}>${l}</button>`)}</div>
    ${t === 'overview' ? html`<${Overview} setT=${setT} />` : t === 'mistakes' ? html`<${MistakesTab} />` : t === 'vocab' ? html`<${VocabTab} />` : t === 'history' ? html`<${HistoryTab} />` : html`<${SettingsTab} go=${go} />`}
  </div>`;
}

function StatTile({ dim }) {
  const pts = Store.profile.sessions.filter(s => s.scores && s.scores[dim] != null).slice(-12).map(s => ({ v: s.scores[dim], d: s.date }));
  const [hi, setHi] = useState(-1);
  if (!pts.length) return html`<div class="stat"><span class="stat-l">${DIM_LABEL[dim]}</span><span class="stat-v">–</span><span class="stat-tip">No data yet</span></div>`;
  const last3 = avg(pts.slice(-3).map(p => p.v));
  const prev3 = pts.length > 3 ? avg(pts.slice(-6, -3).map(p => p.v)) : null;
  const delta = prev3 == null ? null : last3 - prev3;
  const W = 160, H = 44, P = 5;
  const x = i => pts.length === 1 ? W / 2 : P + i * (W - 2 * P) / (pts.length - 1);
  const y = v => H - P - (v - 1) / 9 * (H - 2 * P);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(p.v).toFixed(1)).join(' ');
  const area = line + ' L' + x(pts.length - 1).toFixed(1) + ',' + (H - P) + ' L' + x(0).toFixed(1) + ',' + (H - P) + ' Z';
  const li = pts.length - 1;
  function move(e) {
    const r = e.currentTarget.getBoundingClientRect();
    const rx = (e.clientX - r.left) / r.width * W;
    let best = 0;
    pts.forEach((p, i) => { if (Math.abs(x(i) - rx) < Math.abs(x(best) - rx)) best = i; });
    setHi(best);
  }
  const dcls = delta == null ? '' : delta > 0.05 ? 'up' : delta < -0.05 ? 'down' : 'flat';
  return html`<div class="stat">
    <span class="stat-l">${DIM_LABEL[dim]}</span>
    <span class="stat-v">${last3.toFixed(1)}<small> /10</small></span>
    ${delta != null ? html`<span class=${'stat-d ' + dcls}>${delta > 0.05 ? '▲ +' : delta < -0.05 ? '▼ ' : '■ '}${delta.toFixed(1)} <span>vs previous 3</span></span>` : html`<span class="stat-d flat"><span>average of last ${Math.min(3, pts.length)}</span></span>`}
    <svg class="spark" viewBox=${'0 0 ' + W + ' ' + H} role="img" aria-label=${DIM_LABEL[dim] + ' over the last ' + pts.length + ' sessions, latest ' + pts[li].v} onPointerMove=${move} onPointerLeave=${() => setHi(-1)}>
      <line class="grid" x1="0" x2=${W} y1=${y(5.5)} y2=${y(5.5)} />
      <path class="area" d=${area} />
      <path class="line" d=${line} />
      ${hi >= 0 ? html`<line class="cross" x1=${x(hi)} x2=${x(hi)} y1="0" y2=${H} />` : null}
      <circle class="end" cx=${x(li)} cy=${y(pts[li].v)} r="4" />
      ${hi >= 0 && hi !== li ? html`<circle class="hov" cx=${x(hi)} cy=${y(pts[hi].v)} r="3.5" />` : null}
    </svg>
    <span class=${'stat-tip' + (hi >= 0 ? ' on' : '')}>${hi >= 0 ? fmtDay(pts[hi].d) + ' · ' + pts[hi].v + '/10' : 'Last ' + pts.length + ' session' + (pts.length === 1 ? '' : 's')}</span>
  </div>`;
}

function Overview({ setT }) {
  const p = Store.profile, ss = p.sessions, v = Store.vocab.items;
  const mastered = v.filter(x => x.status === 'mastered').length;
  const learning = v.filter(x => x.status === 'learning').length;
  const minutes = ss.reduce((n, s) => n + (s.minutes || 0), 0);
  const calq = ss.slice(-5).reduce((n, s) => n + (s.calques || 0), 0);
  const top = Mistakes.top(3);
  const src = { self: 'you chose it', quiz: 'from the level check', test: 'from the level check', ai: 'updated from your recent sessions' }[p.levelSource] || '';
  return html`<div class="block" style="gap:28px">
    <div class="ov-sum">
      <div class="ov-item"><span class="lbl">Level</span><b>${p.level || '–'}</b><small>${src}</small></div>
      <div class="ov-item"><span class="lbl">Streak</span><b>${streak()}</b><small>days in a row</small></div>
      <div class="ov-item"><span class="lbl">Sessions</span><b>${ss.length}</b><small>about ${minutes} min of practice</small></div>
      <div class="ov-item"><span class="lbl">Phrases</span><b>${mastered}</b><small>mastered · ${learning} learning</small></div>
    </div>
    <section class="block">
      <div class="block-h"><h2>Your trend</h2><span class="small muted">Average of your last 3 sessions, on a 1–10 scale. A trend line, not a grade.</span></div>
      ${ss.some(s => s.scores) ? html`<div class="kpis">${DIMS.map(d => html`<${StatTile} dim=${d} />`)}</div><p class="small muted">Fluency and confidence come from conversations only; writing checks add grammar, vocabulary and naturalness.</p>` : html`<p class="empty">Your trends appear after your first session with feedback.</p>`}
    </section>
    <section class="block">
      <div class="block-h"><h2>Focus now</h2>${Mistakes.items.length ? html`<button class="linkbtn" onClick=${() => setT('mistakes')}>All mistakes →</button>` : null}</div>
      ${top.length ? html`<div class="chips">${top.map(m => html`<button class="chip mist" onClick=${() => setT('mistakes')}><span>${m.label}</span><b>×${m.count}</b></button>`)}</div>` : html`<p class="muted">Nothing yet. Have a conversation or check a text.</p>`}
      ${calq ? html`<p class="muted">Word-for-word translations from Polish in your last 5 sessions: <b style="color:var(--ink)">${calq}</b>. Try to start the sentence from what you <i>can</i> say in English instead of translating.</p>` : null}
      <p class="small muted">Explanations are currently in <b>${EXPLAIN_LABEL[explainMode()]}</b>${p.explainMode === 'auto' ? ' (set automatically; more English as your scores go up)' : ''}.</p>
    </section>
  </div>`;
}

function Lesson({ m }) {
  const L = m.lesson;
  const items = L.exercises.map(x => ({ type: x.type, prompt: x.prompt, answer: x.answer }));
  return html`<div class="block" style="gap:12px">
    ${L.explanation ? html`<p>${L.explanation}</p>` : null}
    ${L.pattern ? html`<div class="pattern">${L.pattern}</div>` : null}
    ${L.examples.length ? html`<div><span class="lbl">Examples</span><ul style="margin-top:6px">${L.examples.map(e => html`<li><span class="native">${e.en}</span> <${Say} text=${e.en} />${e.note ? html`<div class="small muted">${e.note}</div>` : null}</li>`)}</ul></div>` : null}
    ${items.length ? html`<div><span class="lbl">Practice</span><div style="margin-top:8px"><${Exercises} key=${L.id || m.key} items=${items} idPrefix=${'ls-' + m.key} onChecked=${(res, ans, first) => {
      if (!first) return;
      const tried = res.filter(r => !r.skipped);
      if (tried.length) { Mistakes.review(m.key, tried.every(r => r.ok)); commit('mistakes'); toast(tried.every(r => r.ok) ? 'Nice. This mistake will come back less often.' : 'This one will come back again soon.'); }
    }} /></div></div>` : null}
  </div>`;
}
function MistakeCard({ m }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [st, stLabel] = Mistakes.status(m);
  const ex = m.examples[0];
  async function lesson(refresh) {
    setBusy(true); setErr('');
    try {
      const r = await aiJSON(lessonPrompt(m), refresh ? { modelTier: 'default', cache: false } : { modelTier: 'default' });
      const L = normLesson(r);
      L.id = uid();
      m.lesson = L;
      commit('mistakes');
    } catch (e) { setErr(errText(e)); }
    finally { setBusy(false); }
  }
  return html`<article class="mcard">
    <button class="mcard-h" onClick=${() => setOpen(!open)} aria-expanded=${open}>
      <span class="mcount">×${m.count}</span>
      <span class="mtitle">${m.label}<small>Last seen ${fmtDay(m.lastSeen)}${m.calques ? ' · ' + m.calques + '× translated from Polish' : ''}</small></span>
      <span class=${'status ' + st}>${stLabel}</span>
    </button>
    ${ex ? html`<div class="mcard-ex">
      <span class="lbl">Your typical mistake</span><span><del>${ex.wrong}</del></span>
      <span class="lbl">Correct</span><span><ins>${ex.right}</ins>${ex.natural && norm(ex.natural) !== norm(ex.right) ? html`<div class="small">More natural: <span class="native">${ex.natural}</span></div>` : null}</span>
      ${ex.why ? html`<p class="why">${ex.why}</p>` : null}
    </div>` : null}
    ${open ? html`<div class="mcard-body">
      ${m.examples.length > 1 ? html`<div><span class="lbl">Other times you made it</span><ul style="margin-top:6px">${m.examples.slice(1).map(e => html`<li class="small"><del>${e.wrong}</del> → <ins>${e.right}</ins></li>`)}</ul></div>` : null}
      ${m.lesson ? html`<${Lesson} m=${m} /><div class="row"><button class="btn sm" disabled=${busy} onClick=${() => lesson(true)}>New exercises</button></div>` : !busy ? html`<div class="row"><button class="btn primary" onClick=${() => lesson(false)}>Explain it and give me an exercise</button><span class="small muted">2 examples, a rule of thumb and 3 short exercises</span></div>` : null}
      ${busy ? html`<${Thinking} label="Preparing a mini-lesson" />` : null}
      ${err ? html`<p class="err" role="alert">${err}</p>` : null}
    </div>` : html`<div style="padding:0 16px 14px"><button class="linkbtn" onClick=${() => setOpen(true)}>Explanation, examples and exercise →</button></div>`}
  </article>`;
}
function MistakesTab() {
  const items = Mistakes.top(999);
  if (!items.length) return html`<p class="empty">No mistakes recorded yet. They appear here after your conversations and writing checks, sorted by how often you make them.</p>`;
  return html`<div class="block">
    <p class="muted">Sorted by priority: how often you make the mistake and whether it’s due for review. The more often a mistake appears, the more often it comes back in Daily practice. Get it right in reviews and it moves to <b>Improving</b>, then <b>Under control</b>.</p>
    <div class="mlist">${items.map(m => html`<${MistakeCard} key=${m.key} m=${m} />`)}</div>
  </div>`;
}

function VocabTab() {
  const [f, setF] = useState('all');
  const [q, setQ] = useState('');
  const [add, setAdd] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const all = Store.vocab.items;
  const count = s => all.filter(v => v.status === s).length;
  const items = all.filter(v => (f === 'all' || v.status === f) && (!q || norm(v.en + ' ' + v.pl).includes(norm(q))));
  async function addPhrase() {
    const t = add.trim();
    if (!t) return;
    setBusy(true); setErr('');
    let v = null;
    try {
      const r = await aiJSON(vocabFillPrompt(t), { modelTier: 'quick' });
      v = Vocab.add(normPhrase(r).en ? r : { en: t }, 'manual');
    } catch (e) {
      if (e && (e.code === 'unavailable' || e.code === 'not_granted')) v = Vocab.add({ en: t }, 'manual');
      else setErr(errText(e));
    }
    if (v) { commit('vocab'); setAdd(''); toast('Added “' + v.en + '”'); }
    setBusy(false);
  }
  return html`<div class="block">
    <p class="muted">Whole constructions, not single words. Phrases from your sessions land here automatically. Use one in a conversation and it moves towards <b>mastered</b>; mastered phrases are no longer taught again.</p>
    <div class="vtools">
      <div class="chips">${[['all', 'All', all.length], ['new', 'New', count('new')], ['learning', 'Learning', count('learning')], ['mastered', 'Mastered', count('mastered')]].map(([k, l, n]) => html`<button class=${'chip' + (f === k ? ' on' : '')} onClick=${() => setF(k)} aria-pressed=${f === k}>${l} · ${n}</button>`)}</div>
      <div class="grow"></div>
      <input id="v-search" class="input" value=${q} onInput=${e => setQ(e.target.value)} placeholder="Search" aria-label="Search your vocabulary" />
    </div>
    <div class="row">
      <input id="v-add" class="input" style="flex:1;min-width:200px" value=${add} onInput=${e => setAdd(e.target.value)} onKeyDown=${e => { if (e.key === 'Enter') addPhrase(); }} placeholder="Add a word or phrase, e.g. “depend” or “zależy od”" aria-label="Add a phrase" />
      ${busy ? html`<${Thinking} label="Adding" />` : html`<button class="btn" onClick=${addPhrase} disabled=${!add.trim()}><${Icon} n="plus" s=${16} /> Add</button>`}
    </div>
    ${err ? html`<p class="err" role="alert">${err}</p>` : null}
    ${items.length ? html`<div class="vlist">${items.map(v => html`<div class="vrow" key=${v.id}>
      <div class="vmain"><div><b>${v.en}</b> <${Say} text=${v.en} /></div>
        ${v.pl ? html`<div class="vpl">${v.pl}</div>` : null}
        ${v.example ? html`<div class="vex">“${v.example}”</div>` : null}
        ${v.alternatives && v.alternatives.length ? html`<div class="valt">Also: ${v.alternatives.join(' · ')}</div>` : null}</div>
      <div class="vmeta">
        <span class="tag acc">${v.difficulty || 'B2'}</span>
        <select id=${'st-' + v.id} value=${v.status} onChange=${e => { Vocab.set(v.id, e.target.value); commit('vocab'); }} aria-label=${'Status of ' + v.en}>
          <option value="new">New</option><option value="learning">Learning</option><option value="mastered">Mastered</option>
        </select>
        <button class="iconbtn" onClick=${() => { Vocab.remove(v.id); commit('vocab'); toast('Removed'); }} aria-label=${'Delete ' + v.en}><${Icon} n="trash" s=${16} /></button>
      </div>
    </div>`)}</div>` : html`<p class="empty">${all.length ? 'Nothing matches this filter.' : 'Your vocabulary list is empty. Phrases from conversations, writing checks and daily practice will appear here.'}</p>`}
  </div>`;
}

const MODE_LABEL = { speaking: 'Conversation', scenario: 'Role-play', writing: 'Writing', daily: 'Daily practice' };
function HistoryTab() {
  const ss = Store.profile.sessions.slice().reverse();
  if (!ss.length) return html`<p class="empty">No sessions yet.</p>`;
  const short = { fluency: 'F', grammar: 'G', vocabulary: 'V', naturalness: 'N', confidence: 'C' };
  return html`<div class="block">
    <p class="small muted">F fluency · G grammar · V vocabulary · N naturalness · C confidence</p>
    <div class="hlist">${ss.map(s => html`<div class="hrow">
      <span class="hdate">${fmtDay(s.date)}</span>
      <div><div class="row" style="gap:8px"><b>${s.title || MODE_LABEL[s.mode]}</b><span class="tag">${MODE_LABEL[s.mode] || s.mode}</span>${s.level ? html`<span class="tag acc">${s.level}</span>` : null}</div>
        ${s.scores ? html`<div class="hscores">${DIMS.filter(d => s.scores[d] != null).map(d => short[d] + ' ' + s.scores[d]).join(' · ')}</div>` : null}
        ${s.remember && s.remember.length ? html`<div class="hrem">${s.remember.join(' · ')}</div>` : null}</div>
    </div>`)}</div>
  </div>`;
}

function SettingsTab({ go }) {
  const p = Store.profile;
  const [backup, setBackup] = useState('');
  const [msg, setMsg] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const set = (k, v) => { p[k] = v; commit('profile'); };
  const dump = () => JSON.stringify({ app: 'say-it-naturally', v: 1, profile: Store.profile, mistakes: Store.mistakes, vocab: Store.vocab });
  function restore() {
    try {
      const j = JSON.parse(backup);
      if (!j || !j.profile) throw new Error('bad');
      Store.profile = sanitizeDoc('profile', j.profile);
      Store.mistakes = sanitizeDoc('mistakes', j.mistakes) || { items: [], updatedAt: 0 };
      Store.vocab = sanitizeDoc('vocab', j.vocab) || { items: [], updatedAt: 0 };
      DOCS.forEach(commit);
      setBackup(''); setMsg('Backup restored.');
    } catch (e) { setMsg('That doesn’t look like a backup from this app. Paste the whole text you copied.'); }
  }
  function reset() {
    Store.profile = defaultProfile();
    Store.mistakes = { items: [], updatedAt: 0 };
    Store.vocab = { items: [], updatedAt: 0 };
    [DRAFT_SPEAK, DRAFT_DAILY, DRAFT_WRITE].forEach(lsDel);
    DOCS.forEach(commit);
    go('home');
  }
  const em = explainMode();
  return html`<div class="block" style="gap:0">
    <section class="set"><h3>Explanations of your mistakes</h3>
      <div class="chips">${[['auto', 'Auto (now: ' + EXPLAIN_LABEL[em] + ')'], ['pl', 'Polish'], ['mix', 'Polish + English'], ['en', 'English']].map(([k, l]) => html`<button class=${'chip' + (p.explainMode === k ? ' on' : '')} onClick=${() => set('explainMode', k)} aria-pressed=${p.explainMode === k}>${l}</button>`)}</div>
      <p class="small muted">Auto starts in Polish and switches to more English as your level and scores go up.</p></section>
    <section class="set"><h3>Corrections during conversations</h3>
      <div class="chips">${[3, 4, 5, 6].map(n => html`<button class=${'chip' + (p.correctionsEvery === n ? ' on' : '')} onClick=${() => set('correctionsEvery', n)} aria-pressed=${p.correctionsEvery === n}>Every ${n} messages</button>`)}</div></section>
    <section class="set"><h3>Level</h3>
      <div class="row"><select id="set-level" class="input" style="width:auto" value=${p.level || 'B1'} onChange=${e => { p.level = e.target.value; p.levelSource = 'self'; p.levelHistory.push({ date: new Date().toISOString(), level: e.target.value, source: 'self' }); commit('profile'); }} aria-label="Your level">${LEVELS.map(l => html`<option value=${l}>${l}</option>`)}</select>
        <button class="btn" onClick=${() => go('onboard')}>Retake the level check</button></div>
      <p class="small muted">Your level also updates automatically from session feedback (the middle of your last 3 estimates).</p></section>
    ${TTS.ok ? html`<section class="set"><h3>Voice for reading aloud</h3>
      <div class="row"><div class="chips">${[['en-GB', 'British'], ['en-US', 'American']].map(([k, l]) => html`<button class=${'chip' + (p.voice === k ? ' on' : '')} onClick=${() => set('voice', k)} aria-pressed=${p.voice === k}>${l}</button>`)}</div>
        <label class="small muted" for="set-rate">Speed</label><input id="set-rate" type="range" min="0.7" max="1.2" step="0.05" value=${p.rate || 1} onChange=${e => set('rate', Number(e.target.value))} />
        <button class="btn sm" onClick=${() => TTS.speak('I’m exhausted. I’ve been working all day.')}><${Icon} n="speaker" s=${15} /> Test</button></div>
      <p class="small muted">Uses the voices installed on your device, so quality depends on your system.</p></section>` : null}
    <section class="set"><h3>Your data</h3>
      <p class="small muted">${Persist.mode === 'cloud' ? 'Saved privately to your Claude account, so it follows you across devices. Only you can see it.' : 'Saved in this browser only. Copy a backup now and then.'}</p>
      <div class="row"><button class="btn sm" onClick=${() => copyText(dump())}><${Icon} n="copy" s=${15} /> Copy backup</button></div>
      <label class="lbl" for="set-backup">Restore from a backup</label>
      <textarea id="set-backup" class="input" rows="3" value=${backup} onInput=${e => setBackup(e.target.value)} placeholder="Paste a backup here"></textarea>
      <div class="row"><button class="btn sm" disabled=${!backup.trim()} onClick=${restore}>Restore</button>${msg ? html`<span class="small muted">${msg}</span>` : null}</div>
      <div class="row" style="margin-top:8px">${confirmReset ? html`<span class="err">Delete all progress, mistakes and vocabulary?</span><button class="btn sm" style="border-color:var(--err);color:var(--err)" onClick=${reset}>Yes, delete everything</button><button class="btn sm" onClick=${() => setConfirmReset(false)}>Cancel</button>` : html`<button class="linkbtn" style="color:var(--err)" onClick=${() => setConfirmReset(true)}>Reset all progress…</button>`}</div></section>
    <section class="set"><h3>What this prototype can’t do (yet)</h3>
      <div class="limits">
        <p><b>No microphone.</b> Claude artifacts can’t record audio. Speak with your device’s dictation (Win+H, Fn Fn on Mac, the phone keyboard mic) and the text goes into the chat.</p>
        <p><b>Pronunciation is estimated from words, not your voice.</b> The app flags words Polish speakers often mispronounce and can read any phrase aloud.</p>
        <p><b>Fluency is measured in text:</b> message length, linking, reply speed and how you keep the conversation going.</p>
        <p><b>AI answers use your own Claude usage.</b> Each reply, check and summary is one request. The first request asks for your permission.</p>
      </div></section>
  </div>`;
}

/* ---------- app ---------- */
function App() {
  const [, setTick] = useState(0);
  useEffect(() => { const f = () => setTick(t => t + 1); Store.subs.add(f); return () => { Store.subs.delete(f); }; }, []);
  const [route, setRoute] = useState(() => {
    let h = '';
    try { h = (location.hash || '').slice(1); } catch (e) {}
    return ['speaking', 'writing', 'daily', 'progress'].includes(h) ? { name: h } : { name: 'home' };
  });
  const go = (name, extra) => { if (TTS.ok) { try { speechSynthesis.cancel(); } catch (e) {} } setRoute(Object.assign({ name }, extra || {})); window.scrollTo(0, 0); };
  const p = Store.profile;
  let view;
  if (!p.onboarded && !Persist.settled) view = html`<div class="boot"><${Thinking} label="Loading your progress" /></div>`;
  else if (!p.onboarded || route.name === 'onboard') view = html`<${Onboarding} go=${go} retake=${p.onboarded && route.name === 'onboard'} />`;
  else if (route.name === 'speaking') view = html`<${Speaking} go=${go} />`;
  else if (route.name === 'writing') view = html`<${Writing} />`;
  else if (route.name === 'daily') view = html`<${DailyHost} go=${go} />`;
  else if (route.name === 'progress') view = html`<${Progress} key=${route.tab || 'p'} go=${go} tab=${route.tab} />`;
  else view = html`<${Home} go=${go} />`;
  return html`<${TopBar} route=${route} go=${go} /><main class="wrap"><${AIBanner} />${view}</main><${Toaster} />`;
}

appEl.textContent = '';
render(html`<${App} />`, appEl);
Persist.init();
