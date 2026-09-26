/* ---------- writing ---------- */
function Writing() {
  const [tab, setTab] = useState('text');
  return html`<div class="page">
    <header class="page-h"><h1>Writing</h1><p class="lead">Check a whole text, or test one sentence against the question every learner asks: would a native speaker really say this?</p></header>
    <div class="tabs" role="tablist">
      <button role="tab" aria-selected=${tab === 'text'} class=${'tab' + (tab === 'text' ? ' on' : '')} onClick=${() => setTab('text')}>Check a text</button>
      <button role="tab" aria-selected=${tab === 'sentence'} class=${'tab' + (tab === 'sentence' ? ' on' : '')} onClick=${() => setTab('sentence')}>Would a native say this?</button>
    </div>
    ${tab === 'text' ? html`<${TextCheck} />` : html`<${SentenceCheck} />`}
  </div>`;
}

function markOriginal(text, mistakes) {
  const ranges = [];
  mistakes.forEach((m, idx) => {
    const s = m.original;
    if (!s) return;
    let pos = text.indexOf(s);
    if (pos < 0) pos = text.toLowerCase().indexOf(s.toLowerCase());
    if (pos < 0) return;
    if (ranges.some(r => pos < r.end && pos + s.length > r.start)) return;
    ranges.push({ start: pos, end: pos + s.length, idx });
  });
  ranges.sort((a, b) => a.start - b.start);
  const out = [];
  let cur = 0;
  ranges.forEach(r => {
    if (r.start > cur) out.push(text.slice(cur, r.start));
    out.push(html`<mark class="m" title=${mistakes[r.idx].corrected}>${text.slice(r.start, r.end)}<sup>${r.idx + 1}</sup></mark>`);
    cur = r.end;
  });
  out.push(text.slice(cur));
  return out;
}

function WMistake({ m, i }) {
  const same = !m.natural || norm(m.natural) === norm(m.corrected);
  return html`<article class="corr">
    <div class="corr-tags"><span class="num">${i + 1}</span><span class="tag">${m.type}</span>
      ${m.repeat >= 2 ? html`<span class="tag err">Repeated ×${m.repeat}</span>` : null}
      ${m.polish_calque ? html`<span class="tag warn">Translated from Polish</span>` : null}
      ${m.mistake_label && !(m.polish_calque && m.mistake_key === 'polish-calque') ? html`<span class="tag">${MISTAKE_TYPES[m.mistake_key] || m.mistake_label}</span>` : null}</div>
    <dl class="cgrid">
      <dt>Original</dt><dd class="said">“${m.original}”</dd>
      <dt>Corrected</dt><dd><${DiffView} ops=${diffWords(m.original, m.corrected)} fallback=${m.corrected} /></dd>
      ${m.why ? html`<dt>Why</dt><dd>${m.why}</dd>` : null}
      <dt>Natural</dt><dd>${same ? html`<span>${m.corrected}</span>` : html`<span class="native">${m.natural}</span>`}</dd>
    </dl>
  </article>`;
}

function WritingResult({ res, orig }) {
  const ops = useMemo(() => diffText(orig, res.corrected), [orig, res.corrected]);
  const sc = res.scores;
  const fb = { scores: { grammar: sc.grammar, vocabulary: sc.vocabulary, naturalness: sc.naturalness, clarity: sc.clarity } };
  const ds = ['grammar', 'vocabulary', 'naturalness', 'clarity'].filter(d => fb.scores[d] != null);
  return html`<div class="wres">
    <section class="wsec"><h3><span class="letter">A</span>Original</h3>
      <div class="textbox">${markOriginal(orig, res.mistakes)}</div>
      <p class="small muted">Underlined parts are explained in D. Key mistakes.</p></section>
    <section class="wsec"><h3><span class="letter">B</span>Corrected version</h3>
      <p class="small muted">Only the necessary changes: <del>removed</del> <ins>added</ins></p>
      <div class="textbox"><${DiffView} ops=${ops} fallback=${res.corrected} /></div></section>
    <section class="wsec"><h3><span class="letter">C</span>More natural version</h3>
      <div class="textbox natural">${res.natural || res.corrected}</div>
      <div class="row"><button class="btn sm" onClick=${() => copyText(res.natural || res.corrected)}><${Icon} n="copy" s=${15} /> Copy</button>${res.tone ? html`<span class="small muted">${res.tone}</span>` : null}</div></section>
    <section class="wsec"><h3><span class="letter">D</span>Key mistakes</h3>
      ${res.mistakes.length ? res.mistakes.map((m, i) => html`<${WMistake} m=${m} i=${i} />`) : html`<p class="muted">No important mistakes. Nice work.</p>`}</section>
    <section class="wsec"><h3><span class="letter">E</span>Useful expressions</h3>
      ${res.expressions.length ? html`<${PhraseList} list=${res.expressions} /><p class="small muted">Saved to My vocabulary.</p>` : html`<p class="muted">No suggestions this time.</p>`}</section>
    <section class="wsec"><h3><span class="letter">F</span>Level estimate</h3>
      <div class="lvlbox"><div class="biglevel">${res.level.cefr || '–'}</div><div class="block" style="gap:6px">${res.level.comment ? html`<p>${res.level.comment}</p>` : null}${res.did_well ? html`<p class="praise"><${Icon} n="check" s=${16} /><span>${res.did_well}</span></p>` : null}</div></div>
      ${ds.length ? html`<div class="meters">${ds.map(d => html`<div class="meter"><span>${DIM_LABEL[d]}</span><div class="track"><i style=${'width:' + fb.scores[d] * 10 + '%'}></i></div><b>${fb.scores[d]}<small>/10</small></b></div>`)}</div><p class="small muted">A trend line for you, not a grade.</p>` : null}
    </section>
  </div>`;
}

function TextCheck() {
  const init = useRef(lsGet(DRAFT_WRITE) || {}).current;
  const [type, setType] = useState(init.type || 'email');
  const [ctx, setCtx] = useState(init.ctx || '');
  const [text, setText] = useState(init.text || '');
  const [res, setRes] = useState(init.res || null);
  const [orig, setOrig] = useState(init.orig || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const ctl = useRef(null);
  const resRef = useRef(null);
  useEffect(() => { const t = setTimeout(() => lsSet(DRAFT_WRITE, { type, ctx, text, res, orig }), 400); return () => clearTimeout(t); }, [type, ctx, text, res, orig]);
  async function check() {
    const t = text.trim();
    if (words(t) < 3) { setErr('Write at least a sentence or two first.'); return; }
    if (t.length > 6000) { setErr('That’s a long text. Check up to about 900 words at a time.'); return; }
    setBusy(true); setErr('');
    const c = new AbortController(); ctl.current = c;
    try {
      const r = normWriting(await aiJSON(writingPrompt(type, ctx, t), { modelTier: 'default', signal: c.signal }));
      if (!r.corrected) r.corrected = t;
      r.mistakes.forEach(m => { m.repeat = Mistakes.record({ mistake_key: m.mistake_key, mistake_label: m.mistake_label, you_said: m.original, better: m.corrected, more_natural: m.natural, why: m.why, polish_calque: m.polish_calque }); });
      if (r.mistakes.length) commit('mistakes');
      r.expressions.forEach(p => Vocab.add(p, 'writing'));
      Vocab.detectUse(t);
      commit('vocab');
      const wc = words(t);
      recordSession({ mode: 'writing', title: typeLabel(type), scores: { fluency: null, grammar: r.scores.grammar, vocabulary: r.scores.vocabulary, naturalness: r.scores.naturalness, confidence: null }, level: wc >= 60 ? r.level.cefr : null, calques: r.mistakes.filter(m => m.polish_calque).length, corrections: r.mistakes.length, minutes: Math.max(2, Math.round(wc / 12)), words: wc });
      setRes(r); setOrig(t);
      setTimeout(() => { if (resRef.current) resRef.current.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' }); }, 60);
    } catch (e) { if (!(e && e.code === 'cancelled')) setErr(errText(e)); }
    finally { setBusy(false); }
  }
  return html`<div class="block" style="gap:28px">
    <div class="form">
      <span class="lbl">What are you writing?</span>
      <div class="chips">${TEXT_TYPES.map(([k, l]) => html`<button class=${'chip' + (type === k ? ' on' : '')} onClick=${() => setType(k)} aria-pressed=${type === k}>${l}</button>`)}</div>
      <label class="lbl" for="w-ctx">Who is it for? (optional)</label>
      <input id="w-ctx" class="input" value=${ctx} onInput=${e => setCtx(e.target.value)} placeholder="e.g. a recruiter I haven’t met, my manager, friends on Instagram" />
      <label class="lbl" for="w-text">Your text</label>
      <textarea id="w-text" class="input area" rows="9" value=${text} onInput=${e => setText(e.target.value)} placeholder=${'Write or paste your text here, for example:\n\n' + EXAMPLE_TEXT}></textarea>
      ${err ? html`<p class="err" role="alert">${err}</p>` : null}
      <div class="row">
        <span class="small muted">${words(text)} words</span>
        ${!text.trim() ? html`<button class="linkbtn" onClick=${() => setText(EXAMPLE_TEXT)}>Load the example</button>` : null}
        <div class="grow"></div>
        ${busy ? html`<${Thinking} label="Checking your text" /><button class="btn sm" onClick=${() => ctl.current && ctl.current.abort()}><${Icon} n="stop" s=${14} /> Stop</button>` : html`<button class="btn primary" onClick=${check}>Check my text</button>`}
      </div>
    </div>
    ${res ? html`<div ref=${resRef} style="scroll-margin-top:80px"><${WritingResult} res=${res} orig=${orig} /></div>` : null}
  </div>`;
}

function SentenceCheck() {
  const [s, setS] = useState('');
  const [ctx, setCtx] = useState('');
  const [res, setRes] = useState(null);
  const [asked, setAsked] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState(false);
  async function check() {
    const t = s.trim();
    if (words(t) < 2) { setErr('Type a sentence first.'); return; }
    setBusy(true); setErr(''); setSaved(false);
    try {
      const r = await aiJSON(sentencePrompt(t, ctx.trim()), { modelTier: 'default' });
      const kp = r && r.key_phrase ? normPhrase(r.key_phrase) : null;
      setRes({ rating: str(r && r.rating), correct: str(r && r.correct), natural: str(r && r.natural), more_natural: str(r && r.more_natural), native: str(r && r.native), why: str(r && r.why), alternatives: arr(r && r.alternatives).map(a => ({ text: str(a && a.text), note: str(a && a.note) })).filter(a => a.text).slice(0, 3), key: kp && kp.en ? kp : null });
      setAsked(t);
    } catch (e) { setErr(errText(e)); }
    finally { setBusy(false); }
  }
  const ri = res ? (res.rating in RUNG_IDX ? RUNG_IDX[res.rating] : -1) : -1;
  const rows = res ? [['correct', 0], ['natural', 1], ['more_natural', 2], ['native', 3]].map(([k, i]) => ({ i, text: res[k] })) : [];
  return html`<div class="block" style="gap:24px">
    <div class="form">
      <label class="lbl" for="s-text">Your sentence</label>
      <input id="s-text" class="input" value=${s} onInput=${e => setS(e.target.value)} onKeyDown=${e => { if (e.key === 'Enter') check(); }} placeholder="e.g. I am very tired because I worked a lot today." />
      <label class="lbl" for="s-ctx">Situation (optional)</label>
      <input id="s-ctx" class="input" value=${ctx} onInput=${e => setCtx(e.target.value)} placeholder="e.g. talking to a friend after work, an email to a client" />
      ${err ? html`<p class="err" role="alert">${err}</p>` : null}
      <div class="row">${!s.trim() ? html`<button class="linkbtn" onClick=${() => setS('I am very tired because I worked a lot today.')}>Try an example</button>` : null}<div class="grow"></div>
        ${busy ? html`<${Thinking} label="Asking a native ear" />` : html`<button class="btn primary" onClick=${check}>Check it</button>`}</div>
    </div>
    ${res ? html`<div class="block">
      <div class="nat"><${Ladder} you=${ri} up=${3} /><div class="nat-row"><span class="lbl">You wrote</span><span>${asked}</span><${RatingChip} i=${ri} /></div></div>
      <div class="ladder-rows">${rows.map((r, k) => html`<div class=${'lrow' + (r.i === 3 ? ' top' : '')}>
        <span class="lbl">${RUNGS[r.i]}</span>
        <span>${k > 0 && norm(r.text) === norm(rows[k - 1].text) ? html`<span class="muted">Same as above</span>` : html`<span class=${r.i === 3 ? 'native' : ''}>${r.text}</span>`}</span>
        <${Say} text=${r.text} /></div>`)}</div>
      ${res.why ? html`<p>${res.why}</p>` : null}
      ${res.alternatives.length ? html`<div><span class="lbl">Other ways to say it</span><ul style="margin-top:6px">${res.alternatives.map(a => html`<li>${a.text} ${a.note ? html`<span class="tag">${a.note}</span>` : null}</li>`)}</ul></div>` : null}
      ${res.key ? html`<div class="row"><span class="small muted">Key phrase: <b style="color:var(--ink)">${res.key.en}</b>${res.key.pl ? ' · ' + res.key.pl : ''}</span>
        <button class="btn sm" disabled=${saved} onClick=${() => { Vocab.add(res.key, 'sentence'); commit('vocab'); setSaved(true); toast('Saved to My vocabulary'); }}>${saved ? 'Saved' : html`<${Icon} n="plus" s=${15} /> Save phrase`}</button></div>` : null}
    </div>` : html`<p class="muted">You’ll get four versions on a ladder, <b>Correct → Natural → More natural → Native-like</b>, with a short explanation of the difference.</p>`}
  </div>`;
}
