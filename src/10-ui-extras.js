/* ---------- extra practice: phrase review, think in English, shadowing, weekly report, about me ---------- */
const shuffle = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]);
function PageBack({ go, label }) {
  return html`<button class="linkbtn" onClick=${() => go('home')}><${Icon} n="back" s=${16} /> ${label || 'Home'}</button>`;
}

/* phrase review (flashcards with spaced repetition) */
function blankExample(v) {
  const core = coreOf(v.en);
  if (!v.example || core.length < 3) return '';
  const esc = core.split(' ').map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\s,]+');
  const re = new RegExp(esc, 'i');
  return re.test(v.example) ? v.example.replace(re, '_____') : '';
}
function VocabReview({ go }) {
  const [deck, setDeck] = useState(() => Vocab.due(12).map(v => v.id));
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  const [typed, setTyped] = useState('');
  const [stats, setStats] = useState({ knew: 0, almost: 0, again: 0 });
  const [weak, setWeak] = useState([]);
  const requeued = useRef(new Set());
  const started = useRef(Date.now());
  const recorded = useRef(false);
  const keyRef = useRef(null);
  const done = deck.length > 0 && i >= deck.length;
  const v = !done && deck.length ? Store.vocab.items.find(x => x.id === deck[i]) : null;
  function reveal() { setShown(true); }
  function grade(g) {
    if (!v) return;
    Vocab.review(v.id, g);
    commit('vocab');
    const k = g === 2 ? 'knew' : g === 1 ? 'almost' : 'again';
    setStats(s => Object.assign({}, s, { [k]: s[k] + 1 }));
    if (g === 0 && !requeued.current.has(v.id)) { requeued.current.add(v.id); setDeck(deck.concat(v.id)); }
    if (g < 2 && !weak.includes(v.id)) setWeak(weak.concat(v.id));
    setI(i + 1); setShown(false); setTyped('');
  }
  keyRef.current = e => {
    if (!v) return;
    const tag = e.target && e.target.tagName;
    if (tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (!shown && (e.key === 'Enter' || (e.key === ' ' && tag !== 'INPUT'))) { e.preventDefault(); reveal(); return; }
    if (shown && ['1', '2', '3'].includes(e.key)) { e.preventDefault(); grade(Number(e.key) - 1); }
  };
  useEffect(() => { const h = e => keyRef.current && keyRef.current(e); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, []);
  useEffect(() => {
    if (done && !recorded.current) { recorded.current = true; recordSession({ mode: 'review', title: 'Phrase review', minutes: Math.max(1, Math.round((Date.now() - started.current) / 60000)) }); }
  }, [done]);
  function anyway() {
    const pool = Store.vocab.items.filter(x => x.status !== 'mastered');
    const ids = shuffle(pool.length >= 4 ? pool : Store.vocab.items).slice(0, 10).map(x => x.id);
    setDeck(ids); setI(0); setShown(false); setStats({ knew: 0, almost: 0, again: 0 }); setWeak([]); requeued.current = new Set(); recorded.current = false; started.current = Date.now();
  }
  const head = html`<header class="page-h"><${PageBack} go=${go} /><h1>Phrase review</h1><p class="lead">Recall the English phrase from its Polish meaning, then check. Phrases you know come back less often; the ones you miss come back sooner.</p></header>`;
  if (!Store.vocab.items.length) return html`<div class="page">${head}<p class="empty">Your vocabulary list is empty. Phrases from conversations, writing checks and daily practice land there automatically, or add your own in My progress → My vocabulary.</p></div>`;
  if (!deck.length) {
    const nd = Vocab.nextDue();
    return html`<div class="page">${head}<div class="empty">Nothing is due right now.${nd ? ' Next review: ' + fmtDay(nd) + '.' : ''}</div><div class="row"><button class="btn primary" onClick=${anyway}>Review anyway</button><button class="btn" onClick=${() => go('progress', { tab: 'vocab' })}>See my vocabulary</button></div></div>`;
  }
  if (done) {
    const ids = (weak.length ? weak : deck).filter((x, k, a) => a.indexOf(x) === k).slice(0, 3);
    const items = ids.map(id => Store.vocab.items.find(x => x.id === id)).filter(Boolean).map(x => ({ id: x.id, type: 'respond', prompt: 'Write a sentence about your own life using “' + x.en + '”.', answer: x.example, target: x.en }));
    return html`<div class="page">${head}
      <div class="ov-sum">
        <div class="ov-item"><span class="lbl">Knew it</span><b>${stats.knew}</b><small>come back later</small></div>
        <div class="ov-item"><span class="lbl">Almost</span><b>${stats.almost}</b><small>back tomorrow</small></div>
        <div class="ov-item"><span class="lbl">Didn’t know</span><b>${stats.again}</b><small>back next time</small></div>
        <div class="ov-item"><span class="lbl">Cards</span><b>${deck.length}</b><small>reviewed</small></div>
      </div>
      ${items.length ? html`<section class="block"><div class="block-h"><h2>Now use them</h2><span class="small muted">A phrase sticks once you use it about your own life.</span></div>
        <${Exercises} items=${items} idPrefix="vr" onChecked=${(res, ans, first) => { if (!first) return; items.forEach((x, k) => { if (!res[k].skipped) Vocab.bump(x.id, res[k].ok); }); commit('vocab'); }} /></section>` : null}
      <div class="row"><button class="btn primary" onClick=${() => go('home')}>Done</button><button class="btn" onClick=${() => { const ids2 = Vocab.due(12).map(x => x.id); if (ids2.length) { setDeck(ids2); setI(0); setStats({ knew: 0, almost: 0, again: 0 }); setWeak([]); requeued.current = new Set(); recorded.current = false; started.current = Date.now(); } else anyway(); }}>Review more</button></div>
    </div>`;
  }
  if (!v) return html`<div class="page">${head}<div class="row"><span class="muted">This phrase was removed.</span><button class="btn" onClick=${() => setI(i + 1)}>Skip</button></div></div>`;
  const blank = blankExample(v);
  const frontLabel = v.pl ? 'How do you say it in English?' : blank ? 'Complete the sentence' : 'Recall the phrase';
  const front = v.pl || blank || (v.en.split(' ')[0] + ' …');
  const ok = typed.trim() && norm(typed).includes(coreOf(v.en));
  return html`<div class="page">${head}
    <div class="fcard">
      <div class="row"><span class="lbl">Card ${i + 1} of ${deck.length}</span><span class="tag">${v.status}</span><div class="grow"></div><span class="small muted">✓ ${stats.knew} · ~ ${stats.almost} · ✗ ${stats.again}</span></div>
      <div class="progressbar"><i style=${'width:' + (i / deck.length * 100) + '%'}></i></div>
      <span class="lbl">${frontLabel}</span>
      <p class="fc-front">${front}</p>
      ${v.kind ? html`<span class="small muted">Type: ${v.kind}</span>` : null}
      <input id="fc-type" class="input" value=${typed} onInput=${e => setTyped(e.target.value)} readOnly=${shown} placeholder="Type it (optional), or say it out loud" aria-label="Your answer" />
      ${!shown ? html`<div class="row"><button class="btn primary" onClick=${reveal}>Show answer</button><span class="small muted">or press Enter</span></div>` : html`
        <div class="fc-back">
          <p class="fc-en">${v.en} <${Say} text=${v.en} /></p>
          ${typed.trim() ? (ok ? html`<p class="okt"><${Icon} n="check" s=${15} /> Spot on</p>` : html`<p class="small">Yours: <${DiffView} ops=${diffWords(typed, v.en)} fallback=${typed} /></p>`) : null}
          ${v.example ? html`<p class="phrase-ex">“${v.example}”</p>` : null}
          ${v.alternatives && v.alternatives.length ? html`<p class="phrase-alt">Also: ${v.alternatives.join(' · ')}</p>` : null}
        </div>
        <div class="grades">
          <button class="btn" onClick=${() => grade(0)}>Didn’t know<kbd>1</kbd></button>
          <button class="btn" onClick=${() => grade(1)}>Almost<kbd>2</kbd></button>
          <button class="btn primary" onClick=${() => grade(2)}>Knew it<kbd>3</kbd></button>
        </div>`}
    </div>
  </div>`;
}

/* think in English: timed answers and a Polish-to-English sprint */
function Countdown({ secs, onUp }) {
  const [left, setLeft] = useState(secs);
  const up = useRef(onUp);
  up.current = onUp;
  useEffect(() => {
    const s = Date.now();
    const id = setInterval(() => {
      const l = Math.max(0, secs - (Date.now() - s) / 1000);
      setLeft(l);
      if (l <= 0) { clearInterval(id); up.current(); }
    }, 200);
    return () => clearInterval(id);
  }, []);
  return html`<div class="cd" role="timer" aria-label=${Math.ceil(left) + ' seconds left'}><div class="cd-bar"><i style=${'width:' + (left / secs * 100) + '%'}></i></div><span class="timer">${Math.ceil(left)}s</span></div>`;
}
function Sprint({ go }) {
  const [phase, setPhase] = useState('intro');
  const [items, setItems] = useState([]);
  const [i, setI] = useState(0);
  const [cur, setCur] = useState('');
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');
  const curRef = useRef('');
  const ansRef = useRef([]);
  const t0 = useRef(0);
  const ta = useRef(null);
  const lastIdx = useRef(-1);
  useEffect(() => { if (phase === 'run' && ta.current) ta.current.focus(); }, [phase, i]);
  async function start() {
    setPhase('loading'); setErr('');
    try {
      const r = await aiJSON(sprintGenPrompt(), { modelTier: 'default', cache: false });
      const q = arr(r && r.quick).map(x => str(x && x.q)).filter(Boolean).slice(0, 5).map(p => ({ kind: 'quick', prompt: p, limit: 30 }));
      const t = arr(r && r.translate).map(x => ({ kind: 'translate', prompt: str(x && x.pl), expected: str(x && x.en), trap: str(x && x.trap), limit: 20 })).filter(x => x.prompt).slice(0, 6);
      if (q.length + t.length < 3) throw { code: 'invalid_json' };
      lastIdx.current = -1;
      setItems(q.concat(t)); ansRef.current = []; curRef.current = ''; setCur(''); setI(0); t0.current = Date.now(); setPhase('run');
    } catch (e) { setErr(errText(e)); setPhase('intro'); }
  }
  function next() {
    const it = items[i];
    if (!it || lastIdx.current === i) return;
    lastIdx.current = i;
    ansRef.current = ansRef.current.concat({ given: curRef.current.trim(), secs: Math.min(it.limit, Math.round((Date.now() - t0.current) / 1000)) });
    curRef.current = ''; setCur('');
    if (i + 1 < items.length) { setI(i + 1); t0.current = Date.now(); }
    else check();
  }
  async function check() {
    setPhase('checking'); setErr('');
    const a = ansRef.current;
    try {
      const list = items.map((x, k) => ({ i: k, kind: x.kind, prompt: x.prompt, expected: x.expected, trap: x.trap, secs: a[k] ? a[k].secs : x.limit, given: a[k] ? a[k].given : '' }));
      const r = await aiJSON(sprintCheckPrompt(list), { modelTier: 'default' });
      const rs = arr(r && r.items);
      const out = items.map((x, k) => {
        const y = rs.find(z => z && Number(z.i) === k) || {};
        return { ok: !!y.ok && !!(a[k] && a[k].given), feedback: str(y.feedback), natural: str(y.natural) || x.expected || '', key: slug(y.mistake_key), label: str(y.mistake_label), calque: !!y.polish_calque };
      });
      let rec = false;
      out.forEach((o, k) => { if (!o.ok && o.key && a[k] && a[k].given && o.natural) { o.repeat = Mistakes.record({ mistake_key: o.key, mistake_label: o.label, you_said: a[k].given, better: o.natural, more_natural: o.natural, why: o.feedback, polish_calque: o.calque }); rec = true; } });
      if (rec) commit('mistakes');
      const sc = (r && r.scores) || {};
      const scores = { fluency: score10(sc.fluency), grammar: score10(sc.grammar), vocabulary: null, naturalness: score10(sc.naturalness), confidence: null };
      recordSession({ mode: 'sprint', title: 'Think in English', scores, calques: out.filter(o => o.calque).length, corrections: out.filter(o => !o.ok).length, minutes: Math.max(1, Math.round(a.reduce((n, x) => n + x.secs, 0) / 60)), words: a.reduce((n, x) => n + words(x.given), 0) });
      setRes({ items: out, summary: str(r && r.summary), scores });
      setPhase('result');
    } catch (e) { setErr(errText(e)); setPhase('checkfail'); }
  }
  const head = html`<header class="page-h"><${PageBack} go=${go} /><h1>Think in English</h1></header>`;
  if (phase === 'intro' || phase === 'loading') return html`<div class="page">${head}
    <p class="lead">A speed drill that trains you to answer straight in English instead of translating in your head. About 5 minutes.</p>
    <div class="opts">
      <div class="opt" style="cursor:default"><span class="lbl">Part 1 · 5 questions</span><span class="t">30-second answers</span><span class="d">Personal questions. Answer in 1–2 sentences before the time runs out. Simple English is fine; speed matters more than perfection.</span></div>
      <div class="opt" style="cursor:default"><span class="lbl">Part 2 · 6 sentences</span><span class="t">Polish → English sprint</span><span class="d">Short Polish sentences built around the traps you fall into. 20 seconds each. Say what the sentence means, not what the words are.</span></div>
    </div>
    ${err ? html`<p class="err" role="alert">${err}</p>` : null}
    <div class="row">${phase === 'loading' ? html`<${Thinking} label="Preparing your drill" />` : html`<button class="btn primary" onClick=${start}>Start the drill</button><span class="small muted">Tip: use dictation and answer out loud.</span>`}</div>
  </div>`;
  if (phase === 'run') {
    const it = items[i];
    return html`<div class="page">${head}
      <div class="fcard" style="max-width:760px">
        <div class="row"><span class="lbl">${it.kind === 'quick' ? 'Part 1 · answer in English' : 'Part 2 · say it in English'} · ${i + 1} of ${items.length}</span></div>
        <${Countdown} key=${i} secs=${it.limit} onUp=${next} />
        <p class="fc-front">${it.prompt}</p>
        <textarea id="sp-in" ref=${ta} class="input" rows="3" value=${cur} onInput=${e => { curRef.current = e.target.value; setCur(e.target.value); }} onKeyDown=${e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); next(); } }} placeholder=${it.kind === 'quick' ? 'Your answer…' : 'In English…'} aria-label="Your answer"></textarea>
        <div class="row"><span class="small muted">Don’t translate word for word. Say what you can.</span><div class="grow"></div><button class="btn primary" onClick=${next}>${i + 1 < items.length ? 'Next' : 'Finish'}</button></div>
      </div>
    </div>`;
  }
  if (phase === 'checking' || phase === 'checkfail') return html`<div class="page">${head}
    ${phase === 'checking' ? html`<${Thinking} label="Checking your answers" />` : html`<div class="chat-err" role="alert"><span>${err}</span><button class="btn sm" onClick=${check}>Try again</button></div>`}
  </div>`;
  const a = ansRef.current;
  const answered = a.filter(x => x.given).length;
  const secs = a.filter(x => x.given).map(x => x.secs);
  return html`<div class="page">${head}
    <div class="ov-sum">
      <div class="ov-item"><span class="lbl">Answered</span><b>${answered} / ${items.length}</b><small>in time</small></div>
      <div class="ov-item"><span class="lbl">Average time</span><b>${secs.length ? Math.round(avg(secs)) + 's' : '–'}</b><small>per answer</small></div>
      <div class="ov-item"><span class="lbl">Correct</span><b>${res.items.filter(x => x.ok).length}</b><small>natural enough</small></div>
      <div class="ov-item"><span class="lbl">From Polish</span><b>${res.items.filter(x => x.calque).length}</b><small>word-for-word slips</small></div>
    </div>
    <${FeedbackPanel} fb=${{ headline: res.summary, scores: res.scores }} dims=${['fluency', 'grammar', 'naturalness']} title="Your drill" />
    <div class="exs">${items.map((it, k) => { const o = res.items[k]; return html`<div class=${'ex' + (o.ok ? ' ok' : ' no')}>
      <span class="lbl">${k + 1}. ${it.kind === 'quick' ? 'Question' : 'Polish → English'}</span>
      <p class="ex-p">${it.prompt}</p>
      <p>${a[k] && a[k].given ? a[k].given : html`<span class="muted">No answer in time</span>`}</p>
      <div class="ex-r"><div>${o.ok ? html`<b class="okt"><${Icon} n="check" s=${15} /> Good</b>` : html`<b class="not">Not quite</b>`}${o.feedback ? ' · ' + o.feedback : ''}</div>
        ${o.natural ? html`<div class="ex-better"><span class="lbl">Natural</span> <span class="native">${o.natural}</span> <${Say} text=${o.natural} /></div>` : null}
        ${it.trap && !o.ok ? html`<div class="small muted">Trap: ${it.trap}</div>` : null}</div>
    </div>`; })}</div>
    <div class="row"><button class="btn primary" onClick=${start}>New drill</button><button class="btn" onClick=${() => go('home')}>Home</button></div>
  </div>`;
}

/* shadowing: listen, repeat with dictation, compare */
const SHADOW_THEMES = [['mine', 'From my phrases', 'Example sentences from your vocabulary list'], ['everyday', 'Everyday conversation', 'Plans, opinions, small talk'], ['work', 'Work and meetings', 'Updates, questions, polite disagreement'], ['travel', 'Travel', 'Hotels, directions, problems on the way'], ['sounds', 'Tricky sounds', 'th, w/v, -ed endings and word stress']];
function Shadowing({ go }) {
  const [phase, setPhase] = useState('setup');
  const [items, setItems] = useState([]);
  const [i, setI] = useState(0);
  const [attempt, setAttempt] = useState('');
  const [showText, setShowText] = useState(false);
  const [checked, setChecked] = useState(null);
  const [results, setResults] = useState([]);
  const [err, setErr] = useState('');
  const started = useRef(Date.now());
  const head = html`<header class="page-h"><${PageBack} go=${go} /><h1>Shadowing</h1></header>`;
  if (!TTS.ok) return html`<div class="page">${head}<p class="empty">This browser can’t read text aloud, so shadowing isn’t available here. Try the page in Chrome, Edge or Safari, or in the Claude app on your phone.</p></div>`;
  function begin(its) { setItems(its); setI(0); setResults([]); setAttempt(''); setShowText(false); setChecked(null); started.current = Date.now(); setPhase('run'); }
  async function start(k) {
    setErr('');
    const theme = SHADOW_THEMES.find(t => t[0] === k);
    if (k === 'mine') {
      const ex = Store.vocab.items.filter(v => v.example && words(v.example) >= 4);
      if (ex.length < 3) { setErr('You need at least 3 phrases with example sentences in My vocabulary. Pick another theme for now.'); return; }
      begin(shuffle(ex).slice(0, 6).map(v => ({ text: v.example, tip: 'Key phrase: ' + v.en })));
      return;
    }
    setPhase('loading');
    try {
      const r = await aiJSON(shadowGenPrompt(theme[1] + ' (' + theme[2] + ')'), { modelTier: 'default', cache: false });
      const its = arr(r && r.items).map(x => ({ text: str(x && x.text), tip: str(x && x.tip) })).filter(x => words(x.text) >= 3).slice(0, 6);
      if (!its.length) throw { code: 'invalid_json' };
      begin(its);
    } catch (e) { setErr(errText(e)); setPhase('setup'); }
  }
  function check() {
    const target = items[i].text;
    const ops = diffWords(norm(target), norm(attempt)) || [];
    const tw = words(norm(target));
    let eq = 0;
    const missed = [];
    ops.forEach(o => { if (o.t === 'eq') eq += words(o.s); else if (o.t === 'del') o.s.trim().split(/\s+/).forEach(w => { if (w) missed.push(w); }); });
    const acc = tw ? Math.round(eq / tw * 100) : 0;
    setChecked({ acc, missed, ops });
    setShowText(true);
    const rs = results.slice(); rs[i] = { acc, missed }; setResults(rs);
  }
  function retry() { setAttempt(''); setChecked(null); setShowText(false); }
  function nextItem() {
    if (i + 1 < items.length) { setI(i + 1); setAttempt(''); setShowText(false); setChecked(null); window.scrollTo(0, 0); }
    else { setPhase('done'); recordSession({ mode: 'shadowing', title: 'Shadowing', minutes: Math.max(1, Math.round((Date.now() - started.current) / 60000)) }); }
  }
  if (phase === 'setup' || phase === 'loading') return html`<div class="page">${head}
    <p class="lead">Listen to a natural sentence, repeat it straight away out loud and copy the rhythm. Your device’s dictation types what you said, and the app compares it with the original.</p>
    <aside class="note"><b>How to repeat out loud:</b> click into the answer box and start dictation: <span class="kbd">Win</span>+<span class="kbd">H</span> on Windows, <span class="kbd">Fn</span> twice on Mac, or the mic key on your phone’s keyboard. If dictation writes a different word, it probably didn’t catch your pronunciation clearly. It’s a rough signal, not a pronunciation grade.</aside>
    <div class="scen-grid">${SHADOW_THEMES.map(t => html`<button class="scen" disabled=${phase === 'loading'} onClick=${() => start(t[0])}><b>${t[1]}</b><span>${t[2]}</span></button>`)}</div>
    ${phase === 'loading' ? html`<${Thinking} label="Writing sentences for you" />` : null}
    ${err ? html`<p class="err" role="alert">${err}</p>` : null}
  </div>`;
  if (phase === 'done') {
    const accs = results.filter(Boolean).map(r => r.acc);
    const missed = Array.from(new Set(results.filter(Boolean).flatMap(r => r.missed))).slice(0, 16);
    return html`<div class="page">${head}
      <div class="ov-sum">
        <div class="ov-item"><span class="lbl">Match</span><b>${accs.length ? Math.round(avg(accs)) + '%' : '–'}</b><small>average of ${accs.length} sentences</small></div>
        <div class="ov-item"><span class="lbl">Sentences</span><b>${items.length}</b><small>practised</small></div>
      </div>
      ${missed.length ? html`<section class="block"><div class="block-h"><h2>Words to practise</h2><span class="small muted">Dictation missed these. Listen and repeat each one slowly.</span></div>
        <div class="chips">${missed.map(w => html`<button class="chip" onClick=${() => TTS.speak(w, 0.8)}><${Icon} n="speaker" s=${14} /> ${w}</button>`)}</div></section>` : html`<p class="praise"><${Icon} n="check" s=${16} /><span>Dictation caught every word. Try a harder theme next time.</span></p>`}
      <div class="row"><button class="btn primary" onClick=${() => setPhase('setup')}>Another set</button><button class="btn" onClick=${() => go('home')}>Home</button></div>
    </div>`;
  }
  const it = items[i];
  return html`<div class="page">${head}
    <div class="fcard" style="max-width:760px">
      <div class="row"><span class="lbl">Sentence ${i + 1} of ${items.length}</span></div>
      <div class="progressbar"><i style=${'width:' + (i / items.length * 100) + '%'}></i></div>
      <div class="row"><button class="btn primary" onClick=${() => TTS.speak(it.text)}><${Icon} n="play" s=${16} /> Listen</button><button class="btn" onClick=${() => TTS.speak(it.text, 0.72)}>Slowly</button><div class="grow"></div><button class="linkbtn" onClick=${() => setShowText(!showText)}>${showText ? 'Hide text' : 'Show text'}</button></div>
      <p class=${'sh-text' + (showText ? '' : ' blur')} aria-hidden=${showText ? 'false' : 'true'}>${it.text}</p>
      <ol class="small muted" style="display:flex;flex-direction:column;gap:2px"><li>Listen once or twice without reading.</li><li>Repeat it out loud straight away with dictation, copying the rhythm.</li><li>Check, then listen again.</li></ol>
      <textarea id="sh-in" class="input" rows="2" value=${attempt} onInput=${e => setAttempt(e.target.value)} readOnly=${!!checked} placeholder="Your dictated words appear here (or type what you heard)" aria-label="What you said"></textarea>
      ${!checked ? html`<div class="row"><button class="btn primary" disabled=${!attempt.trim()} onClick=${check}>Check</button></div>` : html`
        <div class="fc-back">
          <div class="row"><span class="acc">${checked.acc}%</span><span class="muted">of the words matched</span></div>
          <p class="small">Compared with the original: <${DiffView} ops=${checked.ops} fallback=${attempt} /></p>
          ${checked.missed.length ? html`<div class="chips">${checked.missed.slice(0, 8).map(w => html`<button class="chip" onClick=${() => TTS.speak(w, 0.8)}><${Icon} n="speaker" s=${14} /> ${w}</button>`)}</div>` : null}
          ${it.tip ? html`<p class="pattern" style="font-weight:400">${it.tip}</p>` : null}
        </div>
        <div class="row"><button class="btn" onClick=${retry}>Try again</button><button class="btn primary" onClick=${nextItem}>${i + 1 < items.length ? 'Next sentence' : 'Finish'}</button></div>`}
    </div>
  </div>`;
}

/* weekly report */
function weekStats() {
  const now = Date.now(), w1 = now - 7 * DAY, w2 = now - 14 * DAY;
  const ss = Store.profile.sessions.map(s => Object.assign({ t: Date.parse(s.date) || 0 }, s));
  const cur = ss.filter(s => s.t >= w1), prev = ss.filter(s => s.t >= w2 && s.t < w1);
  const dimAvg = (list, d) => { const v = list.filter(s => s.scores && s.scores[d] != null).map(s => s.scores[d]); return v.length ? avg(v) : null; };
  const dims = DIMS.map(d => ({ d, cur: dimAvg(cur, d), prev: dimAvg(prev, d) }));
  const minutes = cur.reduce((n, s) => n + (s.minutes || 0), 0);
  const days = new Set(cur.map(s => s.day)).size;
  const prevDays = new Set(prev.map(s => s.day)).size;
  const modes = {};
  cur.forEach(s => { modes[s.mode] = (modes[s.mode] || 0) + 1; });
  const v = Store.vocab.items;
  const newPhrases = v.filter(x => (x.added || 0) >= w1).length;
  const mastered = v.filter(x => x.status === 'mastered' && Math.max(x.lastReviewed || 0, x.lastUsed || 0) >= w1).length;
  const ms = Mistakes.items.map(m => { const h = arr(m.hist); return { m, c1: h.filter(t => t >= w1).length, c0: h.filter(t => t >= w2 && t < w1).length }; });
  const better = ms.filter(x => x.c0 > 0 && x.c1 < x.c0).sort((a, b) => (b.c0 - b.c1) - (a.c0 - a.c1)).slice(0, 4);
  const back = ms.filter(x => x.c1 >= 2 || (x.c1 > 0 && x.c1 > x.c0)).sort((a, b) => b.c1 - a.c1).slice(0, 4);
  const calques = cur.reduce((n, s) => n + (s.calques || 0), 0);
  const f = x => x == null ? 'n/a' : x.toFixed(1);
  const text = [
    'Days practised: ' + days + '/7 (week before: ' + prevDays + '); sessions: ' + cur.length + ' (week before: ' + prev.length + '); about ' + minutes + ' minutes.',
    'Session types: ' + (Object.keys(modes).map(k => (MODE_LABEL[k] || k) + ' ' + modes[k]).join(', ') || 'none'),
    'Average scores this week (week before): ' + dims.map(x => x.d + ' ' + f(x.cur) + ' (' + f(x.prev) + ')').join(', '),
    'New phrases: ' + newPhrases + '; phrases mastered this week: ' + mastered + '.',
    'Mistakes getting better: ' + (better.map(x => x.m.label + ' (' + x.c0 + ' -> ' + x.c1 + ')').join('; ') || 'none yet'),
    'Mistakes coming back: ' + (back.map(x => x.m.label + ' (' + x.c1 + 'x this week)').join('; ') || 'none'),
    'Word-for-word translations from Polish this week: ' + calques + '.'
  ].join('\n');
  return { w1, now, cur, dims, minutes, days, newPhrases, mastered, better, back, calques, text };
}
const PLAN_MODES = { speaking: 'speaking', writing: 'writing', daily: 'daily', review: 'review', sprint: 'sprint', shadow: 'shadow' };
function WeeklyReport({ go }) {
  const w = weekStats();
  const p = Store.profile;
  const last = arr(p.reports)[0];
  const fresh = last && Date.now() - last.at < 7 * DAY ? last : null;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function write() {
    setBusy(true); setErr('');
    try {
      const r = await aiJSON(reportPrompt(w), { modelTier: 'default', cache: false });
      const rep = {
        at: Date.now(), summary: str(r && r.summary),
        wins: arr(r && r.wins).map(str).filter(Boolean).slice(0, 3),
        focus: arr(r && r.focus).map(x => ({ title: str(x && x.title), why: str(x && x.why), how: str(x && x.how) })).filter(x => x.title).slice(0, 3),
        plan: arr(r && r.plan).map(x => ({ day: str(x && x.day).slice(0, 3), task: str(x && x.task), mode: PLAN_MODES[str(x && x.mode)] || 'daily' })).filter(x => x.task).slice(0, 7)
      };
      if (!rep.summary && !rep.focus.length) throw { code: 'invalid_json' };
      p.reports = [rep].concat(arr(p.reports)).slice(0, 6);
      commit('profile');
    } catch (e) { setErr(errText(e)); }
    finally { setBusy(false); }
  }
  const f = x => x == null ? '–' : x.toFixed(1);
  return html`<div class="block" style="gap:24px">
    <div class="block-h"><h2>${fmtDay(w.w1)} – ${fmtDay(w.now)}</h2><span class="small muted">The last 7 days compared with the 7 before</span></div>
    <div class="ov-sum">
      <div class="ov-item"><span class="lbl">Days practised</span><b>${w.days}/7</b><small>${w.cur.length} session${w.cur.length === 1 ? '' : 's'}</small></div>
      <div class="ov-item"><span class="lbl">Time</span><b>${w.minutes}</b><small>minutes</small></div>
      <div class="ov-item"><span class="lbl">New phrases</span><b>${w.newPhrases}</b><small>${w.mastered} mastered this week</small></div>
      <div class="ov-item"><span class="lbl">From Polish</span><b>${w.calques}</b><small>word-for-word slips</small></div>
    </div>
    ${w.dims.some(x => x.cur != null || x.prev != null) ? html`<div style="overflow-x:auto"><div class="wk">
      <span class="h">Skill</span><span class="h">This week</span><span class="h">Before</span><span class="h">Change</span>
      ${w.dims.map(x => { const d = x.cur != null && x.prev != null ? x.cur - x.prev : null; return html`<span>${DIM_LABEL[x.d]}</span><span>${f(x.cur)}</span><span>${f(x.prev)}</span><span class=${'stat-d ' + (d == null ? 'flat' : d > 0.05 ? 'up' : d < -0.05 ? 'down' : 'flat')} style="font-size:14px">${d == null ? '–' : (d > 0.05 ? '▲ +' : d < -0.05 ? '▼ ' : '■ ') + d.toFixed(1)}</span>`; })}
    </div></div>` : null}
    <div class="fb-cols">
      <div class="block" style="gap:8px"><span class="lbl">Getting better</span>${w.better.length ? w.better.map(x => html`<div class="row" style="gap:8px"><span>${x.m.label}</span><span class="tag">${x.c0} → ${x.c1}</span></div>`) : html`<p class="small muted">Shows up once a mistake appears less often than the week before.</p>`}</div>
      <div class="block" style="gap:8px"><span class="lbl">Keep an eye on</span>${w.back.length ? w.back.map(x => html`<div class="row" style="gap:8px"><span>${x.m.label}</span><span class="tag err">×${x.c1} this week</span></div>`) : html`<p class="small muted">No mistake kept coming back this week.</p>`}</div>
    </div>
    <section class="block">
      <div class="block-h"><h2>Your coach’s report</h2>${busy ? html`<${Thinking} label="Writing your report" />` : html`<button class=${'btn ' + (fresh ? 'sm' : 'primary')} onClick=${write}>${fresh ? 'Write a new one' : 'Write my weekly report'}</button>`}</div>
      ${err ? html`<p class="err" role="alert">${err}</p>` : null}
      ${fresh ? html`
        <p class="small muted">Written ${fmtDay(fresh.at)}</p>
        ${fresh.summary ? html`<p class="lead" style="color:var(--ink)">${fresh.summary}</p>` : null}
        ${fresh.wins.length ? html`<div><span class="lbl">Wins</span><ul style="margin-top:6px">${fresh.wins.map(x => html`<li>${x}</li>`)}</ul></div>` : null}
        ${fresh.focus.length ? html`<div class="block" style="gap:8px"><span class="lbl">Focus for next week</span>${fresh.focus.map((x, k) => html`<div class="focus-item"><b>${k + 1}. ${x.title}</b>${x.why ? html`<span class="small muted">${x.why}</span>` : null}${x.how ? html`<span class="small">${x.how}</span>` : null}</div>`)}</div>` : null}
        ${fresh.plan.length ? html`<div class="block" style="gap:8px"><span class="lbl">Plan for the next 7 days</span><div class="plan">${fresh.plan.map(x => html`<div class="plan-row"><span class="plan-day">${x.day}</span><span>${x.task}</span><button class="btn sm" onClick=${() => go(x.mode)}>Start</button></div>`)}</div></div>` : null}
      ` : html`<p class="muted">A short summary of your week, your wins, three priorities and a day-by-day plan built from your data.</p>`}
    </section>
  </div>`;
}

/* about me */
function AboutMe({ go }) {
  const a = Store.profile.about || {};
  const [f, setF] = useState(() => ({ role: a.role || '', uses: arr(a.uses).slice(), goals: a.goals || '', interests: a.interests || '', notes: a.notes || '' }));
  const [saved, setSaved] = useState(false);
  const upd = (k, v) => { setF(Object.assign({}, f, { [k]: v })); setSaved(false); };
  const toggleUse = u => upd('uses', f.uses.includes(u) ? f.uses.filter(x => x !== u) : f.uses.concat(u));
  function save() {
    Store.profile.about = { role: str(f.role).slice(0, 160), uses: f.uses, goals: str(f.goals).slice(0, 400), interests: str(f.interests).slice(0, 200), notes: str(f.notes).slice(0, 400) };
    commit('profile');
    setSaved(true);
    toast('Saved. Your coach uses this from now on.');
  }
  return html`<div class="block">
    <p class="muted">Your coach uses this in every conversation, role-play, drill and set of phrases, so practice matches your real life. Write in English or Polish.</p>
    <div class="form" style="max-width:680px">
      <label class="lbl" for="ab-role">What do you do?</label>
      <input id="ab-role" class="input" value=${f.role} onInput=${e => upd('role', e.target.value)} placeholder="e.g. project manager at a software company, nurse, student" />
      <span class="lbl">Where do you use English?</span>
      <div class="chips">${USES.map(u => html`<button class=${'chip' + (f.uses.includes(u) ? ' on' : '')} onClick=${() => toggleUse(u)} aria-pressed=${f.uses.includes(u)}>${u}</button>`)}</div>
      <label class="lbl" for="ab-goals">What do you want to be able to do?</label>
      <textarea id="ab-goals" class="input" rows="3" value=${f.goals} onInput=${e => upd('goals', e.target.value)} placeholder="e.g. speak up in meetings without preparing, write emails faster, pass a job interview"></textarea>
      <label class="lbl" for="ab-int">Interests</label>
      <input id="ab-int" class="input" value=${f.interests} onInput=${e => upd('interests', e.target.value)} placeholder="e.g. cycling, cooking, sci-fi series" />
      <label class="lbl" for="ab-notes">Anything else your coach should know?</label>
      <textarea id="ab-notes" class="input" rows="2" value=${f.notes} onInput=${e => upd('notes', e.target.value)} placeholder="e.g. weekly calls with a client in London; I freeze when people speak fast"></textarea>
      <div class="row"><button class="btn primary" onClick=${save}>Save</button>${saved ? html`<span class="okt small"><${Icon} n="check" s=${15} /> Saved</span><button class="linkbtn" onClick=${() => go('speaking')}>Create role-plays from my profile →</button>` : null}</div>
    </div>
  </div>`;
}
