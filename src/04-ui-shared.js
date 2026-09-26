/* ---------- small UI pieces ---------- */
const ICONS = {
  chat: () => html`<path d="M4 5.5h16v10.5H10l-6 4.5z"/><path d="M8 9.5h8M8 12.5h5"/>`,
  pen: () => html`<path d="M4 20l4.2-1L19 8.2 15.8 5 5 15.8z"/><path d="M13.8 7l3.2 3.2"/>`,
  daily: () => html`<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/><path d="M9 15l2 2 4-4"/>`,
  chart: () => html`<path d="M4 4v16h16"/><path d="M7.5 15l4-4.5 3 3L20 7"/>`,
  sun: () => html`<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>`,
  moon: () => html`<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>`,
  speaker: () => html`<path d="M4 9.5v5h4l5 4v-13l-5 4z"/><path d="M16.5 9a4 4 0 0 1 0 6"/>`,
  back: () => html`<path d="M15 5l-7 7 7 7"/>`,
  send: () => html`<path d="M5 12h13M13 6l6 6-6 6"/>`,
  check: () => html`<path d="M5 12.5l4.5 4.5L19 7.5"/>`,
  copy: () => html`<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>`,
  trash: () => html`<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>`,
  plus: () => html`<path d="M12 5v14M5 12h14"/>`,
  stop: () => html`<rect x="6.5" y="6.5" width="11" height="11" rx="2"/>`
};
function Icon({ n, s }) {
  const size = s || 18;
  return html`<svg width=${size} height=${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[n] ? ICONS[n]() : null}</svg>`;
}
function Say({ text, label }) {
  if (!TTS.ok || !text) return null;
  return html`<button class="say" onClick=${() => TTS.speak(text)} aria-label=${label || 'Listen'} title="Listen"><${Icon} n="speaker" s=${15} /></button>`;
}

let toastFn = null;
function toast(msg) { if (toastFn) toastFn(msg); }
function Toaster() {
  const [m, setM] = useState(null);
  useEffect(() => {
    let t;
    toastFn = x => { setM(x); clearTimeout(t); t = setTimeout(() => setM(null), 2800); };
    return () => { toastFn = null; clearTimeout(t); };
  }, []);
  return m ? html`<div class="toast" role="status">${m}</div>` : null;
}
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); toast('Copied'); }
  catch (e) { toast('Copy didn’t work here. Select the text and copy it manually.'); }
}
function useElapsed(active) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!active) { setT(0); return; }
    const s = Date.now();
    const id = setInterval(() => setT(Math.floor((Date.now() - s) / 1000)), 1000);
    return () => clearInterval(id);
  }, [active]);
  return t;
}
function Thinking({ label }) {
  const t = useElapsed(true);
  return html`<div class="thinking" role="status"><span class="dots"><i></i><i></i><i></i></span>${label || 'Thinking'}…${t >= 4 ? html` <span class="small" style="color:var(--ink-3)">${t}s</span>` : null}</div>`;
}
function DiffView({ ops, fallback }) {
  if (!ops) return html`<span>${fallback}</span>`;
  return html`<span>${ops.map(o => {
    if (o.t === 'eq') return o.s;
    const tail = (o.s.match(/\s*$/) || [''])[0] || ' ';
    return o.t === 'del' ? html`<del>${o.s.trimEnd()}</del>${' '}` : html`<ins>${o.s.trimEnd()}</ins>${tail}`;
  })}</span>`;
}
function Ladder({ you, up }) {
  return html`<div class="ladder" aria-hidden="true">${RUNGS.map((r, i) => html`<div class=${'rung' + (i <= you ? ' you' : '') + (i === you ? ' here' : '') + (i === up ? ' up' : '') + (up > i && i > you ? ' gap' : '')}><i></i><span>${r}</span></div>`)}</div>`;
}
function RatingChip({ i }) {
  if (i < 0) return html`<span class="rchip rx">Not correct yet</span>`;
  return html`<span class=${'rchip r' + i}>${RUNGS[i]}</span>`;
}

/* ---------- corrections ---------- */
function CorrectionCard({ c }) {
  const better = c.better || c.more_natural;
  const ops = diffWords(c.you_said, better);
  const same = !c.more_natural || norm(c.more_natural) === norm(better);
  return html`<article class="corr">
    <div class="corr-tags">
      ${c.repeat >= 2 ? html`<span class="tag err">Repeated ×${c.repeat}</span>` : null}
      ${c.polish_calque ? html`<span class="tag warn">Translated from Polish</span>` : null}
      ${c.mistake_label && !(c.polish_calque && c.mistake_key === 'polish-calque') ? html`<span class="tag">${MISTAKE_TYPES[c.mistake_key] || c.mistake_label}</span>` : null}
    </div>
    <dl class="cgrid">
      <dt>You said</dt><dd class="said">“${c.you_said}”</dd>
      <dt>Better</dt><dd><${DiffView} ops=${ops} fallback=${better} /></dd>
      <dt>More natural</dt><dd>${same ? html`<span>${better}</span> <span class="small" style="color:var(--ink-3)">· this is how natives say it</span>` : html`<span class="native">${c.more_natural}</span>`} <${Say} text=${same ? better : c.more_natural} /></dd>
      ${c.why ? html`<dt>Why</dt><dd>${c.why}</dd>` : null}
      ${c.remember ? html`<dt>Remember</dt><dd class="hook">${c.remember}</dd>` : null}
    </dl>
  </article>`;
}
function NaturalRow({ n }) {
  const ri = n.rating in RUNG_IDX ? RUNG_IDX[n.rating] : 0;
  const ui = n.upgrade ? (RUNG_IDX[n.upgrade_rating] || 3) : -1;
  return html`<div class="nat">
    <${Ladder} you=${ri} up=${ui} />
    <div class="nat-row"><span class="lbl">You</span><span>${n.sentence}</span><${RatingChip} i=${ri} /></div>
    ${n.upgrade ? html`<div class="nat-row"><span class="lbl">${RUNGS[ui]}</span><span class=${ui === 3 ? 'native' : ''}>${n.upgrade}</span><${Say} text=${n.upgrade} /></div>` : null}
    ${n.why ? html`<p class="nat-why">${n.why}</p>` : null}
  </div>`;
}
function PhraseList({ list }) {
  return html`<div class="phrases">${list.map(p => html`<div class="phrase">
    <div class="phrase-top"><b class="phrase-en">${p.en}</b>${p.kind ? html`<span class="tag">${p.kind}</span>` : null}${p.difficulty ? html`<span class="tag acc">${p.difficulty}</span>` : null}<${Say} text=${p.en} /></div>
    ${p.pl ? html`<div class="phrase-pl">${p.pl}</div>` : null}
    ${p.example ? html`<div class="phrase-ex">“${p.example}”</div>` : null}
    ${p.alternatives && p.alternatives.length ? html`<div class="phrase-alt">Also: ${p.alternatives.join(' · ')}</div>` : null}
  </div>`)}</div>`;
}
function Corrections({ batch, title, hidePhrases }) {
  const r = batch.result;
  const cs = r.corrections;
  const [open, setOpen] = useState(true);
  const groups = [
    ['Mistakes you keep making', c => c.repeat >= 2],
    ['Grammar', c => c.type === 'grammar'],
    ['Vocabulary', c => c.type === 'vocabulary'],
    ['Unnatural expressions', c => c.type === 'unnatural']
  ];
  const taken = new Set();
  const grouped = groups.map(([t, f]) => {
    const list = cs.filter(c => c.type !== 'pronunciation' && !taken.has(c) && f(c));
    list.forEach(c => taken.add(c));
    return [t, list];
  }).filter(g => g[1].length);
  const pron = r.pronunciation.concat(cs.filter(c => c.type === 'pronunciation').map(c => ({ word: c.you_said, tip: c.why })));
  return html`<section class="corrs" aria-label="Your corrections">
    <header class="corrs-h"><div><span class="lbl">${title || 'Your corrections'}</span>${batch.count ? html`<span class="corrs-sub">${batch.count} message${batch.count === 1 ? '' : 's'} checked</span>` : null}</div>
      <button class="linkbtn" onClick=${() => setOpen(!open)} aria-expanded=${open}>${open ? 'Hide' : 'Show'}</button></header>
    ${open ? html`
      ${r.praise ? html`<p class="praise"><${Icon} n="check" s=${16} /><span>${r.praise}</span></p>` : null}
      ${!cs.length ? html`<p class="muted">No important mistakes here. Keep going!</p>` : null}
      ${grouped.map(([t, list]) => html`<div class="cgroup"><h4>${t}</h4>${list.map(c => html`<${CorrectionCard} c=${c} />`)}</div>`)}
      ${pron.length ? html`<div class="cgroup"><h4>Pronunciation <span class="small" style="text-transform:none;letter-spacing:0;font-weight:400;color:var(--ink-3)">· based on the words you used, not your voice</span></h4>${pron.map(p => html`<div class="pron"><b>${p.word}</b><span class="muted">${p.tip}</span><${Say} text=${p.word} /></div>`)}</div>` : null}
      ${r.naturalness.length ? html`<div class="cgroup"><h4>Would a native say it?</h4>${r.naturalness.map(n => html`<${NaturalRow} n=${n} />`)}</div>` : null}
      ${!hidePhrases && r.phrases.length ? html`<div class="cgroup"><h4>Useful phrases <span class="small" style="text-transform:none;letter-spacing:0;font-weight:400;color:var(--ink-3)">· saved to My vocabulary</span></h4><${PhraseList} list=${r.phrases} /></div>` : null}
    ` : null}
  </section>`;
}

/* ---------- feedback ---------- */
function FeedbackPanel({ fb, dims, title }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' }); }, []);
  const ds = (dims || DIMS).filter(d => fb.scores && fb.scores[d] != null);
  return html`<section class="fb" ref=${ref}>
    <div class="lbl">${title || 'Today’s performance'}</div>
    ${fb.headline ? html`<h2 class="fb-head">${fb.headline}</h2>` : null}
    ${ds.length ? html`<div class="meters">${ds.map(d => html`<div class="meter"><span>${DIM_LABEL[d]}</span><div class="track"><i style=${'width:' + fb.scores[d] * 10 + '%'}></i></div><b>${fb.scores[d]}<small>/10</small></b></div>`)}</div>
    <p class="small muted">These numbers show your trend over time. They’re not school grades.</p>` : null}
    <div class="fb-cols">
      ${fb.did_well && fb.did_well.length ? html`<div><div class="lbl">What you did well</div><ul>${fb.did_well.map(x => html`<li>${x}</li>`)}</ul></div>` : null}
      ${fb.improve && fb.improve.length ? html`<div><div class="lbl">What to improve</div><ul>${fb.improve.map(x => html`<li>${x}</li>`)}</ul></div>` : null}
    </div>
    ${fb.remember && fb.remember.length ? html`<div><div class="lbl">${fb.remember.length} things to remember</div><ol class="remember">${fb.remember.map(x => html`<li>${x}</li>`)}</ol></div>` : null}
  </section>`;
}

/* ---------- exercises ---------- */
const EX_LABEL = { gap: 'Fill the gap', rewrite: 'Rewrite using the phrase', respond: 'Answer using the phrase', fix: 'Correct the mistake', translate: 'Say it in English' };
function Exercises({ items, initial, onChecked, idPrefix }) {
  const [ans, setAns] = useState(() => (initial && initial.answers) || items.map(() => ''));
  const [res, setRes] = useState(() => (initial && initial.results) || null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const setA = (i, v) => { const n = ans.slice(); n[i] = v; setAns(n); };
  async function check() {
    const todo = items.map((x, i) => Object.assign({}, x, { i, given: str(ans[i]) })).filter(x => x.given);
    if (!todo.length) { setErr('Type at least one answer first.'); return; }
    setBusy(true); setErr('');
    try {
      const r = await aiJSON(checkPrompt(todo), { modelTier: 'quick', cache: false });
      const list = arr(r && r.results);
      const out = items.map((x, i) => {
        if (!str(ans[i])) return { ok: false, skipped: true, feedback: '', better: x.answer };
        const y = list.find(z => z && Number(z.i) === i) || {};
        return { ok: !!y.ok, feedback: str(y.feedback), better: str(y.better) || x.answer };
      });
      const first = !res;
      setRes(out);
      if (onChecked) onChecked(out, ans, first);
    } catch (e) { setErr(errText(e)); }
    finally { setBusy(false); }
  }
  const score = res ? res.filter(x => x.ok).length : 0;
  return html`<div class="exs">
    ${items.map((x, i) => html`<div class=${'ex' + (res ? (res[i].ok ? ' ok' : ' no') : '')}>
      <div class="ex-h"><span class="lbl">${i + 1}. ${x.group ? x.group + ' · ' : ''}${EX_LABEL[x.type] || 'Exercise'}</span>${x.target ? html`<span class="ex-target">${x.target}</span>` : null}</div>
      <p class="ex-p">${x.prompt}</p>
      <textarea id=${idPrefix + '-' + i} class="input" rows="2" value=${ans[i] || ''} onInput=${e => setA(i, e.target.value)} disabled=${busy} placeholder="Your answer…" aria-label=${'Answer ' + (i + 1)}></textarea>
      ${res ? html`<div class="ex-r">
        <div>${res[i].ok ? html`<b class="okt"><${Icon} n="check" s=${15} /> Correct</b>` : html`<b class="not">${res[i].skipped ? 'Skipped' : 'Not quite'}</b>`}${res[i].feedback ? ' · ' + res[i].feedback : ''}</div>
        ${res[i].better ? html`<div class="ex-better"><span class="lbl">Natural answer</span> ${res[i].better}</div>` : null}
      </div>` : null}
    </div>`)}
    ${err ? html`<p class="err" role="alert">${err}</p>` : null}
    <div class="row">${res ? html`<span class="score">${score} / ${items.length} correct</span>` : null}<div class="grow"></div>
      ${busy ? html`<${Thinking} label="Checking" />` : html`<button class="btn primary" onClick=${check}>${res ? 'Check again' : 'Check answers'}</button>`}</div>
  </div>`;
}

/* ---------- theme ---------- */
function currentTheme() {
  const a = document.documentElement.getAttribute('data-theme');
  if (a === 'dark' || a === 'light') return a;
  try { return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch (e) { return 'light'; }
}
function toggleTheme() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  lsSet(LS + 'theme', next);
  emit();
}
(function () { const t = lsGet(LS + 'theme'); if (t === 'dark' || t === 'light') document.documentElement.setAttribute('data-theme', t); })();

function TopBar({ route, go }) {
  const p = Store.profile;
  const dark = currentTheme() === 'dark';
  const nav = [['speaking', 'Speaking'], ['writing', 'Writing'], ['daily', 'Daily practice'], ['progress', 'My progress']];
  return html`<header class="top"><div class="top-in">
    <button class="brand" onClick=${() => go('home')} aria-label="Say It Naturally, home">Say it <span class="hlw">naturally</span></button>
    ${p.onboarded ? html`<nav class="topnav" aria-label="Modes">${nav.map(([k, l]) => html`<button class=${'navlink' + (route.name === k ? ' on' : '')} onClick=${() => go(k)}>${l}</button>`)}</nav>` : null}
    <div class="top-r">
      ${p.level ? html`<button class="lvl" onClick=${() => go('progress')} title="Your estimated level">${p.level}</button>` : null}
      <button class="iconbtn" onClick=${toggleTheme} aria-label=${dark ? 'Switch to light theme' : 'Switch to dark theme'}><${Icon} n=${dark ? 'sun' : 'moon'} /></button>
    </div>
  </div></header>`;
}
function AIBanner() {
  if (AI.status === 'unavailable') return html`<div class="banner" role="status"><b>The AI tutor isn’t available in this view.</b> Open this page on claude.ai while signed in to chat, get corrections and feedback. Your saved mistakes and vocabulary still work here.</div>`;
  if (AI.status === 'denied') return html`<div class="banner" role="status"><b>AI access was declined for this page,</b> so the tutor can’t reply. Reload the page and choose Allow when asked. Each AI answer uses your own Claude usage.</div>`;
  return null;
}
