/* ---------- chat engine ---------- */
function useChat(init, opts) {
  opts = opts || {};
  const ref = useRef(init);
  const ctl = useRef(null);
  const aRef = useRef(false);
  const alive = useRef(true);
  const [, tick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [stream, setStream] = useState('');
  const [err, setErr] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const save = () => { if (opts.onSave) opts.onSave(ref.current); if (alive.current) tick(n => n + 1); };
  const pending = () => { const s = ref.current; return s.messages.slice(s.analyzedUpTo).filter(m => m.role === 'me').length; };

  async function reply() {
    const s = ref.current;
    setErr(null); setBusy(true); setStream('');
    const c = new AbortController();
    ctl.current = c;
    try {
      const r = await aiText(buildTurns(s), { cache: false, modelTier: 'quick', signal: c.signal, onText: u => { if (alive.current) setStream(u.text.replace(/\[END\]/gi, '').trim()); } });
      let t = str(r.text);
      const ended = /\[END\]/i.test(t);
      t = t.replace(/\[END\]/gi, '').trim();
      if (t) s.messages.push({ id: uid(), role: 'partner', text: t, t: Date.now() });
      if (ended && s.scenario && !s.warmup) s.scenarioDone = true;
      save();
      if (t && alive.current && lsGet(LS + 'autoread')) TTS.speak(t);
    } catch (e) {
      if (!(e && e.code === 'cancelled') && alive.current) setErr({ text: 'No reply. ' + errText(e), kind: 'reply' });
    } finally {
      if (alive.current) { setBusy(false); setStream(''); }
    }
  }

  async function analyze(max, rethrow, aopts) {
    const s = ref.current;
    if (aRef.current) return null;
    const from = s.analyzedUpTo, to = s.messages.length;
    const count = s.messages.slice(from, to).filter(m => m.role === 'me').length;
    if (!count) return null;
    aRef.current = true; setAnalyzing(true);
    if (err && err.kind === 'analysis') setErr(null);
    s.analyzedUpTo = to; save();
    try {
      const raw = await aiJSON(analysisPrompt(s, from, to, max || 5, aopts), { modelTier: 'default' });
      const result = normAnalysis(raw);
      recordAnalysis(result, s.warmup ? 'daily' : 'speaking');
      const b = { id: uid(), at: s.messages.length, count, result };
      s.batches.push(b);
      save();
      return b;
    } catch (e) {
      s.analyzedUpTo = from; save();
      if (rethrow) throw e;
      if (alive.current) setErr({ text: 'Couldn’t check your messages. ' + errText(e), kind: 'analysis' });
      return null;
    } finally {
      aRef.current = false;
      if (alive.current) setAnalyzing(false);
    }
  }

  function send(text) {
    const s = ref.current;
    const t = str(text);
    if (!t) return;
    const used = Vocab.detectUse(t);
    s.messages.push({ id: uid(), role: 'me', text: t, t: Date.now(), used: used.map(v => v.en) });
    if (used.length) commit('vocab');
    save();
    reply();
    if (opts.autoCorrect && pending() >= (Store.profile.correctionsEvery || 4)) analyze(5);
  }

  useEffect(() => {
    alive.current = true;
    const s = ref.current;
    const last = s.messages[s.messages.length - 1];
    if (!s.ended && (!last || last.role === 'me')) reply();
    return () => { alive.current = false; if (ctl.current) ctl.current.abort(); };
  }, []);

  return { s: ref.current, busy, stream, err, analyzing, send, analyze, reply, save, pending, retry: () => (err && err.kind === 'analysis' ? analyze(5) : reply()) };
}

function Bubble({ m }) {
  if (m.role === 'me') return html`<div class="msg me">${m.text}${m.used && m.used.length ? html`<div class="used"><${Icon} n="check" s=${13} /> You used: ${m.used.join(', ')}</div>` : null}</div>`;
  return html`<div class="msg partner">${m.text}<${Say} text=${m.text} /></div>`;
}

function Composer({ chat, placeholder }) {
  const [t, setT] = useState('');
  const ta = useRef(null);
  const coarse = useRef(false);
  useEffect(() => { try { coarse.current = matchMedia('(pointer: coarse)').matches; } catch (e) {} }, []);
  const off = AI.status === 'unavailable' || AI.status === 'denied';
  function submit() {
    const v = t.trim();
    if (!v || chat.busy || off) return;
    chat.send(v);
    setT('');
    if (ta.current) ta.current.style.height = '';
  }
  function onKey(e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !coarse.current) { e.preventDefault(); submit(); } }
  function onInput(e) { setT(e.target.value); const el = e.target; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 200) + 'px'; }
  return html`<div class="composer">
    <div class="composer-in">
      <textarea id="chat-input" ref=${ta} rows="1" value=${t} onInput=${onInput} onKeyDown=${onKey} placeholder=${placeholder || 'Reply in English…'} aria-label="Your message"></textarea>
      <button class="btn primary send" onClick=${submit} disabled=${!t.trim() || chat.busy || off} aria-label="Send"><${Icon} n="send" s=${20} /></button>
    </div>
    <div class="composer-hint"><span class="hint-d">Enter sends · Shift+Enter adds a line · To speak instead of typing, use dictation: <span class="kbd">Win</span>+<span class="kbd">H</span> on Windows or <span class="kbd">Fn</span> twice on Mac</span><span class="hint-m">Tip: tap the mic on your keyboard to speak instead of typing.</span></div>
  </div>`;
}

function ChatView({ chat, composer, placeholder }) {
  const s = chat.s;
  const endRef = useRef(null);
  useEffect(() => {
    const el = endRef.current;
    if (!el) return;
    const near = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 320;
    if (near) el.scrollIntoView({ block: 'end' });
  }, [s.messages.length, chat.stream, s.batches.length, chat.busy]);
  const items = [];
  s.messages.forEach((m, i) => {
    s.batches.filter(b => b.at === i).forEach(b => items.push(html`<${Corrections} key=${b.id} batch=${b} />`));
    items.push(html`<${Bubble} key=${m.id} m=${m} />`);
  });
  s.batches.filter(b => b.at >= s.messages.length).forEach(b => items.push(html`<${Corrections} key=${b.id} batch=${b} />`));
  return html`<div class="chat" aria-live="polite">
      ${items}
      ${chat.busy ? html`<div class="msg partner typing">${chat.stream || html`<span class="dots"><i></i><i></i><i></i></span>`}</div>` : null}
      ${chat.err ? html`<div class="chat-err" role="alert"><span>${chat.err.text}</span><button class="btn sm" onClick=${chat.retry}>Try again</button></div>` : null}
      ${chat.analyzing ? html`<div class="pill-note"><span class="dots"><i></i><i></i><i></i></span> Checking your last messages. Keep talking.</div>` : null}
      <div ref=${endRef}></div>
    </div>
    ${composer ? html`<${Composer} chat=${chat} placeholder=${placeholder} />` : null}`;
}

function ScenarioBrief({ sc }) {
  return html`<div class="brief">
    <div><span class="lbl">Situation</span><p>${sc.situation}</p></div>
    <div><span class="lbl">You are</span><p>${cap(sc.me)}</p></div>
    <div><span class="lbl">Your goal</span><p>${sc.goal}</p></div>
  </div>`;
}

/* ---------- speaking ---------- */
function Speaking({ go }) {
  const [sess, setSess] = useState(() => { const d = lsGet(DRAFT_SPEAK); return d && !d.ended && d.messages ? d : null; });
  function start(kind, id) {
    const s = newSession(kind, id, false);
    noteTopic(id);
    lsSet(DRAFT_SPEAK, s);
    setSess(s);
    window.scrollTo(0, 0);
  }
  if (!sess) return html`<${SpeakSetup} start=${start} />`;
  return html`<${ChatSession} key=${sess.id} init=${sess} go=${go} onNew=${() => { lsDel(DRAFT_SPEAK); setSess(null); window.scrollTo(0, 0); }} />`;
}
function SpeakSetup({ start }) {
  const every = Store.profile.correctionsEvery || 4;
  const fresh = TOPICS.filter(t => !arr(Store.profile.lastTopics).includes(t.id));
  return html`<div class="page">
    <header class="page-h"><h1>Speaking</h1><p class="lead">Talk with Alex like you would with a friend or a colleague. Nobody interrupts you: corrections appear after every ${every} messages, and you get feedback at the end.</p></header>
    <section class="block">
      <div class="block-h"><h2>Talk about…</h2><button class="btn sm" onClick=${() => start('topic', pick(fresh.length ? fresh : TOPICS).id)}>Surprise me</button></div>
      <div class="chips">${TOPICS.map(t => html`<button class="chip big" onClick=${() => start('topic', t.id)}>${t.label}</button>`)}</div>
    </section>
    <section class="block">
      <div class="block-h"><h2>Role-play a real situation</h2></div>
      <p class="muted">Alex plays the other person. React spontaneously, like in real life. When the scene ends you get a full analysis of your English.</p>
      <div class="scen-grid">${SCENARIOS.map(sc => html`<button class="scen" onClick=${() => start('scenario', sc.id)}><b>${sc.title}</b><span>${sc.situation}</span></button>`)}</div>
    </section>
    <aside class="note"><b>Want to speak out loud?</b> Claude artifacts can’t use your microphone, so there’s no record button. Use your device’s dictation and your speech is typed into the box: <span class="kbd">Win</span>+<span class="kbd">H</span> on Windows, <span class="kbd">Fn</span> twice (or the Globe key) on Mac, or the mic key on your phone’s keyboard. Alex’s replies can be read aloud with the speaker button.</aside>
  </div>`;
}
function ChatSession({ init, go, onNew }) {
  const chat = useChat(init, { autoCorrect: true, onSave: s => (s.ended ? lsDel(DRAFT_SPEAK) : lsSet(DRAFT_SPEAK, s)) });
  const s = chat.s;
  const [fb, setFb] = useState({ busy: false, err: '' });
  const [auto, setAuto] = useState(() => !!lsGet(LS + 'autoread'));
  const sc = s.scenario ? SCENARIOS.find(x => x.id === s.scenario) : null;
  const title = sessionTitle(s);
  const mineN = s.messages.filter(m => m.role === 'me').length;
  const every = Store.profile.correctionsEvery || 4;
  const pend = chat.pending();
  const left = Math.max(1, every - pend);
  function toggleAuto() { const v = !auto; setAuto(v); if (v) lsSet(LS + 'autoread', true); else lsDel(LS + 'autoread'); }
  async function finish() {
    if (mineN < 2) { toast('Write at least 2 messages first.'); return; }
    setFb({ busy: true, err: '' });
    const pa = pend ? chat.analyze(4) : Promise.resolve(null);
    try {
      const r = await aiJSON(feedbackPrompt(s), { modelTier: 'default' });
      await pa;
      const f = normFeedback(r);
      const m = chatMetrics(s);
      s.feedback = f; s.ended = true;
      chat.save();
      recordSession({ mode: sc ? 'scenario' : 'speaking', title, scores: f.scores, remember: f.remember, level: m.n >= 4 && m.totalWords >= 40 ? f.level : null, strengths: f.strengths, calques: countCalques(s), corrections: countCorr(s), minutes: sessionMinutes(s), words: m.totalWords });
      setFb({ busy: false, err: '' });
    } catch (e) { setFb({ busy: false, err: errText(e) }); }
  }
  return html`<div class="page">
    <div class="chat-top">
      <div class="chat-title"><button class="linkbtn" onClick=${onNew}><${Icon} n="back" s=${16} /> ${s.ended ? 'New conversation' : 'Change topic'}</button><h1>${title}</h1></div>
      ${!s.ended ? html`<div class="chat-actions">
        <span class="small muted">${pend ? 'Corrections in ' + left + ' message' + (left === 1 ? '' : 's') : 'Corrections every ' + every + ' messages'}</span>
        <button class="btn sm" disabled=${!pend || chat.analyzing} onClick=${() => chat.analyze(5)}>Check now</button>
        ${TTS.ok ? html`<button class=${'btn sm' + (auto ? ' on' : '')} onClick=${toggleAuto} aria-pressed=${auto}><${Icon} n="speaker" s=${15} /> Read aloud</button>` : null}
        <button class="btn sm primary" disabled=${fb.busy} onClick=${finish}>End & get feedback</button>
      </div>` : null}
    </div>
    ${sc ? html`<${ScenarioBrief} sc=${sc} />` : null}
    <${ChatView} chat=${chat} composer=${!s.ended && !fb.busy} placeholder=${sc ? 'Say what you would say…' : 'Reply in English…'} />
    ${s.scenarioDone && !s.ended && !fb.busy ? html`<div class="scen-done">The scene has come to an end. <button class="btn primary sm" onClick=${finish}>See my analysis</button></div>` : null}
    ${fb.busy ? html`<${Thinking} label="Preparing your feedback" />` : null}
    ${fb.err ? html`<div class="chat-err" role="alert"><span>${fb.err}</span><button class="btn sm" onClick=${finish}>Try again</button></div>` : null}
    ${s.feedback ? html`<${FeedbackPanel} fb=${s.feedback} />
      <div class="row"><button class="btn primary" onClick=${onNew}>New conversation</button><button class="btn" onClick=${() => go('progress')}>See my progress</button></div>` : null}
  </div>`;
}
