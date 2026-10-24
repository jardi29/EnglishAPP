/* ---------- career English: listings, CV, applications, growth ---------- */
const GOAL_LABEL = { job: 'a job', clients: 'freelance / B2B clients', both: 'a job and freelance / B2B clients' };
function careerContext(maxCv) {
  const c = Store.career, pf = c.prefs;
  return `CANDIDATE
- Industry: ${pf.industry}; current role: ${pf.role || 'not given'}; experience: ${pf.years || 'not given'}
- Looking for: ${GOAL_LABEL[pf.goal] || GOAL_LABEL.both}; location: ${pf.location || 'not given'}; expected pay: ${pf.pay || 'not given'}
- Certificates: ${pf.certs || 'none listed'}; languages: ${pf.languages || 'Polish, English'}; English level: ${Store.profile.level || 'B1/B2'}
- About: ${aboutText() || 'not provided'}
CV:
"""
${c.cv ? c.cv.slice(0, maxCv || 9000) : '(no CV provided yet: work from the profile and say what the CV should add)'}
"""`;
}
const HONESTY = 'Never invent employers, dates, certificates, tools or numbers that are not in the CV or profile. Where a number would help, use a placeholder like [X] and say the candidate should fill it in.';

function competencyPrompt() {
  return `You are a senior career advisor for IT networking and cybersecurity in Poland and the EU, and an English coach for a Polish professional.

${careerContext()}

${MARKET_NOTES}

Build an honest competency map based on the CV and profile. ${HONESTY}
Return:
- "summary": 2-3 sentences on where the candidate stands in this market.
- "strengths": up to 6 {"skill", "evidence" (quote or paraphrase the CV, or "not evidenced in the CV yet"), "level": "basic" | "solid" | "strong"}.
- "gaps": up to 5 {"skill", "why" (market reason), "how" (one concrete step: lab, project, course or certificate)}.
- "path": 4-6 steps for the next 12 months, each {"when": "Months 1-2", "step", "outcome"}.
- "roles": 4-6 realistic target roles {"title", "fit": "high" | "medium" | "stretch", "why"}.
- "clients": 3-4 freelance / B2B client segments {"segment", "offer" (a fixed-price package), "where" (how to reach them)}.
- "outreach": {"linkedin": "a short English LinkedIn message to a potential client or recruiter (max 80 words)", "email": "a short cold email in Polish to a Polish SME about the technical side of NIS2/KSC readiness (max 120 words)"}.
- "phrases": 8 English phrases this person needs at work (network/security meetings, incident calls, client calls), each {"en", "pl", "example"}.
${explainRule()} This applies to "summary", "why", "how" and "outcome". Outreach texts use the language stated above.
Reply with only JSON: {"summary":"","strengths":[{"skill":"","evidence":"","level":"solid"}],"gaps":[{"skill":"","why":"","how":""}],"path":[{"when":"","step":"","outcome":""}],"roles":[{"title":"","fit":"high","why":""}],"clients":[{"segment":"","offer":"","where":""}],"outreach":{"linkedin":"","email":""},"phrases":[{"en":"","pl":"","example":""}]}`;
}

function packPrompt(listing, link) {
  return `You are an expert recruiter and career coach for IT networking and cybersecurity roles. Prepare a complete, ready-to-send application pack for the listing below.

${careerContext(7000)}

${MARKET_NOTES}

LISTING${link ? ' (' + link + ')' : ''}:
"""
${listing.slice(0, 8000)}
"""

RULES
- ${HONESTY}
- Write "letter", "message" and "follow_up" in the listing's language (Polish or English). Also give "letter_en", an English version of the letter (repeat "letter" if the listing is in English).
- Be specific to this listing: mirror its key requirements, no clichés, no generic praise.
- If the listing is for a freelance project or a client brief, write the letter as a short proposal (approach, timeline, price placeholder).

Return:
- "company", "role", "language" ("pl" or "en"), "source_guess" (the portal, if visible).
- "fit": {"score": 0-100, "matches": up to 6 strings "requirement → evidence", "missing": up to 5 strings "gap → how to handle it honestly", "red_flags": up to 3 strings (unclear pay, unrealistic scope, etc.)}.
- "keywords": up to 10 ATS keywords from the listing to put in the CV.
- "letter": cover letter or proposal, 150-230 words. "letter_en": English version.
- "message": short recruiter / LinkedIn message, max 70 words.
- "screening": 4 likely screening or interview questions with strong, honest answers in English [{"q", "a"}].
- "follow_up": short follow-up email to send 7 days later.
- "interview": a role-play setup for interview practice {"title", "situation" (one sentence starting with "You're"), "ai" (who the interviewer is), "goal", "twist" (one hard technical or behavioural question based on this listing)}.
- "phrases": 5 English phrases from the letter and answers worth learning, each {"en", "pl", "example"}.
${explainRule()} This applies to "missing" and "red_flags".
Reply with only JSON: {"company":"","role":"","language":"en","source_guess":"","fit":{"score":0,"matches":[""],"missing":[""],"red_flags":[""]},"keywords":[""],"letter":"","letter_en":"","message":"","screening":[{"q":"","a":""}],"follow_up":"","interview":{"title":"","situation":"","ai":"","goal":"","twist":""},"phrases":[{"en":"","pl":"","example":""}]}`;
}

function cvReviewPrompt(lang) {
  return `You are an expert CV reviewer for IT networking and cybersecurity roles (Polish and EU market, ATS systems) and an English editor.

${careerContext(12000)}

Target: ${GOAL_LABEL[Store.career.prefs.goal] || GOAL_LABEL.both}. Write the improved CV in ${lang === 'pl' ? 'Polish' : 'English'}.
${HONESTY}
Return:
- "scores": {"ats", "impact", "clarity", "english"}, each 1-10 ("english" rates the language quality of the original CV).
- "issues": up to 8 {"section", "problem", "fix"}, most important first.
- "bullets": up to 6 rewritten bullet points {"before", "after"}: action verb, scope, tools, result.
- "cv": the full improved CV in Markdown with sections Summary, Skills (grouped: Networking, Security, Systems and Cloud, Tools), Experience, Certifications, Education, Languages. At most about 2 pages.
- "headline": an English LinkedIn headline (max 220 characters).
- "about": an English LinkedIn About section (120-180 words, first person).
- "keywords": 10-15 keywords recruiters search for with this profile.
${explainRule()} This applies to "problem" and "fix".
Reply with only JSON: {"scores":{"ats":0,"impact":0,"clarity":0,"english":0},"issues":[{"section":"","problem":"","fix":""}],"bullets":[{"before":"","after":""}],"cv":"","headline":"","about":"","keywords":[""]}`;
}

const strs = (x, n) => arr(x).map(str).filter(Boolean).slice(0, n);
function normPack(r, listing, link) {
  r = r || {};
  const f = r.fit || {}, iv = r.interview || {};
  return {
    id: uid(), at: Date.now(), link: str(link).slice(0, 300), listing: listing.slice(0, 2500),
    company: str(r.company).slice(0, 80) || 'Company', role: str(r.role).slice(0, 120) || 'Role', language: r.language === 'pl' ? 'pl' : 'en', source: str(r.source_guess).slice(0, 40),
    fit: { score: Math.max(0, Math.min(100, Math.round(Number(f.score) || 0))), matches: strs(f.matches, 6), missing: strs(f.missing, 5), flags: strs(f.red_flags, 3) },
    keywords: strs(r.keywords, 10), letter: str(r.letter), letter_en: str(r.letter_en) || str(r.letter), message: str(r.message), follow_up: str(r.follow_up),
    screening: arr(r.screening).map(x => ({ q: str(x && x.q), a: str(x && x.a) })).filter(x => x.q).slice(0, 5),
    interview: { title: str(iv.title), situation: str(iv.situation), ai: str(iv.ai), goal: str(iv.goal), twist: str(iv.twist) },
    phrases: arr(r.phrases).map(normPhrase).filter(p => p.en).slice(0, 5)
  };
}

async function saveFile(filename, data) {
  try {
    const dl = window.claude && typeof window.claude.use === 'function' ? await window.claude.use('downloads') : null;
    if (!dl) { toast('Saving files isn’t available here. Use Copy instead.'); return; }
    await dl.save({ filename, data });
    toast('Saved');
  } catch (e) {
    if (e && e.code === 'declined') return;
    toast(e && e.code === 'rate_limited' ? 'A save is already waiting for your answer.' : 'Couldn’t save the file here. Use Copy instead.');
  }
}

const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/';
function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('load')); document.head.appendChild(s); });
}
async function pdfText(file) {
  if (!window.pdfjsLib) {
    // The worker script runs on the main thread: the page cannot start workers from another site.
    if (!window.pdfjsWorker) await loadScript(PDFJS + 'pdf.worker.min.js');
    await loadScript(PDFJS + 'pdf.min.js');
  }
  const lib = window.pdfjsLib;
  lib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js';
  const doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages = [];
  for (let i = 1; i <= Math.min(doc.numPages, 8); i++) {
    const tc = await (await doc.getPage(i)).getTextContent();
    const lines = [];
    let line = '', lastY = null;
    tc.items.forEach(it => {
      const y = it.transform ? it.transform[5] : 0;
      if (lastY !== null && Math.abs(y - lastY) > 2) { lines.push(line); line = ''; }
      line += (line && !/\s$/.test(line) && !/^\s/.test(it.str) ? ' ' : '') + it.str;
      lastY = y;
    });
    lines.push(line);
    pages.push(lines.map(l => l.trim()).join('\n'));
  }
  return pages.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

function CopyBtn({ text, label }) {
  return html`<button class="btn sm" onClick=${() => copyText(text)}><${Icon} n="copy" s=${15} /> ${label || 'Copy'}</button>`;
}
function TextBlock({ title, text, extra }) {
  if (!text) return null;
  return html`<div class="block" style="gap:8px"><div class="block-h"><span class="lbl">${title}</span><div class="row">${extra || null}<${CopyBtn} text=${text} /></div></div><div class="textbox">${text}</div></div>`;
}

/* main screen */
function Career({ go, tab }) {
  const c = Store.career;
  const [t, setT] = useState(tab || (c.cv ? 'apply' : 'cv'));
  const due = c.apps.filter(a => a.next && a.next <= dayKey() && (a.status === 'applied' || a.status === 'interview')).length;
  const tabs = [['apply', 'Apply to a listing'], ['tracker', 'Applications' + (due ? ' (' + due + ')' : '')], ['cv', 'CV'], ['skills', 'Skills and growth'], ['where', 'Where to look'], ['profile', 'Profile']];
  return html`<div class="page">
    <header class="page-h"><h1>Career English</h1><p class="lead">Real material from your career as English practice: tailored applications, a stronger CV, interview role-plays and a plan for growth in networking and cybersecurity. Drafts only: you send everything yourself.</p></header>
    ${c.prefs.assumed ? html`<div class="banner" role="status">Your career profile uses assumptions (IT networking and cybersecurity; job and B2B clients; Poland and remote). <button class="linkbtn" onClick=${() => setT('profile')}>Check your profile →</button></div>` : null}
    <div class="tabs" role="tablist">${tabs.map(([k, l]) => html`<button role="tab" aria-selected=${t === k} class=${'tab' + (t === k ? ' on' : '')} onClick=${() => setT(k)}>${l}</button>`)}</div>
    ${t === 'apply' ? html`<${ApplyTab} go=${go} setT=${setT} />` : t === 'tracker' ? html`<${TrackerTab} setT=${setT} go=${go} />` : t === 'cv' ? html`<${CvTab} />` : t === 'skills' ? html`<${SkillsTab} setT=${setT} />` : t === 'where' ? html`<${WhereTab} />` : html`<${CareerProfile} done=${() => setT(c.cv ? 'apply' : 'cv')} />`}
  </div>`;
}

function CareerProfile({ done }) {
  const pf = Store.career.prefs;
  const [f, setF] = useState(() => Object.assign({}, pf));
  const upd = (k, v) => setF(Object.assign({}, f, { [k]: v }));
  function save() {
    Store.career.prefs = Object.assign({}, f, { assumed: false });
    commit('career');
    toast('Career profile saved');
    done();
  }
  const field = (id, label, k, ph) => html`<label class="lbl" for=${id}>${label}</label><input id=${id} class="input" value=${f[k]} onInput=${e => upd(k, e.target.value)} placeholder=${ph} />`;
  return html`<div class="form" style="max-width:680px">
    ${field('cp-ind', 'Industry', 'industry', 'e.g. IT: networking and cybersecurity')}
    ${field('cp-role', 'Current role', 'role', 'e.g. network administrator, junior SOC analyst')}
    ${field('cp-years', 'Years of experience', 'years', 'e.g. 3 years in networking, 1 in security')}
    <span class="lbl">What are you looking for?</span>
    <div class="chips">${[['job', 'A job'], ['clients', 'Freelance / B2B clients'], ['both', 'Both']].map(([k, l]) => html`<button class=${'chip' + (f.goal === k ? ' on' : '')} onClick=${() => upd('goal', k)} aria-pressed=${f.goal === k}>${l}</button>`)}</div>
    ${field('cp-loc', 'Location and remote', 'location', 'e.g. Wrocław or remote, EU time zones')}
    ${field('cp-pay', 'Expected salary or rate', 'pay', 'e.g. 15-18k PLN net B2B, or 120 PLN/h')}
    ${field('cp-certs', 'Certificates', 'certs', 'e.g. CCNA, Security+')}
    ${field('cp-lang', 'Languages', 'languages', 'e.g. Polish (native), English B2')}
    <div class="row"><button class="btn primary" onClick=${save}>Save profile</button></div>
  </div>`;
}

function CvTab() {
  const c = Store.career;
  const [text, setText] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [lang, setLang] = useState('en');
  const [confirmDel, setConfirmDel] = useState(false);
  const [replace, setReplace] = useState(false);
  function store(t, name) {
    Store.career.cv = t.slice(0, 20000); Store.career.cvName = name || 'Pasted CV'; Store.career.cvAt = Date.now(); Store.career.review = null;
    commit('career'); setText(''); setReplace(false); toast('CV saved privately to your account');
  }
  async function onFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setErr('');
    try {
      if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
        setBusy('pdf');
        const t = await pdfText(file);
        if (words(t) < 30) throw new Error('empty');
        setText(t);
      } else if (/\.(txt|md|markdown)$/i.test(file.name) || /^text\//.test(file.type)) {
        setText(await file.text());
      } else setErr('Use a PDF, TXT or MD file. For Word files, save as PDF first or paste the text.');
    } catch (x) { setErr('Couldn’t read text from this file (a scanned PDF has no text layer). Paste the text instead.'); }
    finally { setBusy(''); }
  }
  async function review() {
    setBusy('review'); setErr('');
    try {
      const r = await aiJSON(cvReviewPrompt(lang), { modelTier: 'default' });
      const sc = (r && r.scores) || {};
      Store.career.review = {
        at: Date.now(), lang,
        scores: { ats: score10(sc.ats), impact: score10(sc.impact), clarity: score10(sc.clarity), english: score10(sc.english) },
        issues: arr(r && r.issues).map(x => ({ section: str(x && x.section), problem: str(x && x.problem), fix: str(x && x.fix) })).filter(x => x.problem).slice(0, 8),
        bullets: arr(r && r.bullets).map(x => ({ before: str(x && x.before), after: str(x && x.after) })).filter(x => x.after).slice(0, 6),
        cv: str(r && r.cv), headline: str(r && r.headline), about: str(r && r.about), keywords: strs(r && r.keywords, 15)
      };
      if (!Store.career.review.cv && !Store.career.review.issues.length) throw { code: 'invalid_json' };
      commit('career');
    } catch (e) { setErr(errText(e)); }
    finally { setBusy(''); }
  }
  function del() { Store.career.cv = ''; Store.career.cvName = ''; Store.career.cvAt = 0; Store.career.review = null; commit('career'); setConfirmDel(false); toast('CV deleted'); }
  const rv = c.review;
  const input = html`<div class="form">
    <p class="muted">Paste your CV or upload a PDF, TXT or MD file. It’s stored only in your private part of the app’s database (not visible to anyone else) and you can delete it at any time.</p>
    <div class="row"><label class="btn sm" for="cv-file" style="cursor:pointer"><${Icon} n="plus" s=${15} /> Upload a file</label><input id="cv-file" type="file" accept=".pdf,.txt,.md,application/pdf,text/plain" onChange=${onFile} style="position:absolute;left:-9999px" />${busy === 'pdf' ? html`<${Thinking} label="Reading the PDF" />` : null}</div>
    <label class="lbl" for="cv-text">CV text</label>
    <textarea id="cv-text" class="input area" rows="10" value=${text} onInput=${e => setText(e.target.value)} placeholder="Paste your CV here"></textarea>
    <div class="row"><span class="small muted">${words(text)} words</span><div class="grow"></div>${replace ? html`<button class="btn" onClick=${() => { setReplace(false); setText(''); }}>Cancel</button>` : null}<button class="btn primary" disabled=${words(text) < 30} onClick=${() => store(text.trim(), 'Uploaded or pasted CV')}>Save CV</button></div>
  </div>`;
  if (!c.cv || replace) return html`<div class="block">${input}${err ? html`<p class="err" role="alert">${err}</p>` : null}</div>`;
  return html`<div class="block" style="gap:24px">
    <div class="row"><span><b>${c.cvName || 'Your CV'}</b> <span class="muted small">· ${words(c.cv)} words · saved ${fmtDay(c.cvAt)}</span></span><div class="grow"></div>
      <button class="btn sm" onClick=${() => { setText(c.cv); setReplace(true); }}>Edit or replace</button>
      ${confirmDel ? html`<span class="err small">Delete your CV and its review?</span><button class="btn sm" style="border-color:var(--err);color:var(--err)" onClick=${del}>Yes, delete</button><button class="btn sm" onClick=${() => setConfirmDel(false)}>Cancel</button>` : html`<button class="btn sm" onClick=${() => setConfirmDel(true)}><${Icon} n="trash" s=${15} /> Delete my CV</button>`}</div>
    <section class="block">
      <div class="block-h"><h2>Review and improve</h2><div class="row"><div class="chips">${[['en', 'English CV'], ['pl', 'Polish CV']].map(([k, l]) => html`<button class=${'chip' + (lang === k ? ' on' : '')} onClick=${() => setLang(k)} aria-pressed=${lang === k}>${l}</button>`)}</div>${busy === 'review' ? html`<${Thinking} label="Reviewing your CV" />` : html`<button class="btn primary" onClick=${review}>${rv ? 'Review again' : 'Review my CV'}</button>`}</div></div>
      ${err ? html`<p class="err" role="alert">${err}</p>` : null}
      ${!rv ? html`<p class="muted">You’ll get scores (ATS, impact, clarity, English), the most important fixes, rewritten bullet points, a full improved CV and a LinkedIn headline and About section.</p>` : html`
        <p class="small muted">Reviewed ${fmtDay(rv.at)} · ${rv.lang === 'pl' ? 'Polish' : 'English'} version</p>
        <div class="meters">${[['ats', 'ATS-friendly'], ['impact', 'Impact'], ['clarity', 'Clarity'], ['english', 'English']].filter(([k]) => rv.scores[k] != null).map(([k, l]) => html`<div class="meter"><span>${l}</span><div class="track"><i style=${'width:' + rv.scores[k] * 10 + '%'}></i></div><b>${rv.scores[k]}<small>/10</small></b></div>`)}</div>
        ${rv.issues.length ? html`<div class="block" style="gap:8px"><span class="lbl">Fix these first</span>${rv.issues.map((x, k) => html`<div class="focus-item"><b>${k + 1}. ${x.section ? x.section + ': ' : ''}${x.problem}</b>${x.fix ? html`<span class="small">${x.fix}</span>` : null}</div>`)}</div>` : null}
        ${rv.bullets.length ? html`<div class="block" style="gap:8px"><span class="lbl">Stronger bullet points</span>${rv.bullets.map(b => html`<div class="focus-item">${b.before ? html`<span class="small"><del>${b.before}</del></span>` : null}<span><ins>${b.after}</ins></span></div>`)}</div>` : null}
        <${TextBlock} title="Improved CV (Markdown)" text=${rv.cv} extra=${html`<button class="btn sm" onClick=${() => saveFile('CV-' + (rv.lang === 'pl' ? 'PL' : 'EN') + '.md', rv.cv)}>Save .md</button><button class="btn sm" onClick=${() => saveFile('CV-' + (rv.lang === 'pl' ? 'PL' : 'EN') + '.txt', rv.cv.replace(/[#*_`]/g, ''))}>Save .txt</button>`} />
        <${TextBlock} title="LinkedIn headline" text=${rv.headline} />
        <${TextBlock} title="LinkedIn About" text=${rv.about} />
        ${rv.keywords.length ? html`<div><span class="lbl">Keywords recruiters search for</span><div class="chips" style="margin-top:8px">${rv.keywords.map(k => html`<span class="tag acc">${k}</span>`)}</div></div>` : null}
      `}
    </section>
  </div>`;
}

function ApplyTab({ go, setT }) {
  const c = Store.career;
  const [listing, setListing] = useState(() => lsGet(LS + 'draft.listing') || '');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [openId, setOpenId] = useState(() => (c.packs[0] && Date.now() - c.packs[0].at < 2 * DAY ? c.packs[0].id : null));
  const ctl = useRef(null);
  useEffect(() => { const t = setTimeout(() => lsSet(LS + 'draft.listing', listing), 400); return () => clearTimeout(t); }, [listing]);
  async function prepare() {
    const t = listing.trim();
    if (words(t) < 25) { setErr('Paste the full listing text (at least a few lines with the requirements).'); return; }
    setBusy(true); setErr('');
    const ac = new AbortController(); ctl.current = ac;
    try {
      const p = normPack(await aiJSON(packPrompt(t, link.trim()), { modelTier: 'default', signal: ac.signal }), t, link.trim());
      if (!p.letter) throw { code: 'invalid_json' };
      p.phrases.forEach(x => Vocab.add(x, 'career'));
      if (p.phrases.length) commit('vocab');
      Store.career.packs = [p].concat(Store.career.packs).slice(0, 12);
      commit('career');
      setOpenId(p.id); setListing(''); setLink(''); lsDel(LS + 'draft.listing');
    } catch (e) { if (!(e && e.code === 'cancelled')) setErr(errText(e)); }
    finally { setBusy(false); }
  }
  const open = c.packs.find(p => p.id === openId);
  return html`<div class="block" style="gap:24px">
    ${!c.cv ? html`<div class="nudge" role="note"><${Icon} n="user" s=${20} /><span><b>Add your CV first</b> for applications that use your real experience. Without it the drafts stay generic. <button class="linkbtn" onClick=${() => setT('cv')}>Add my CV →</button></span></div>` : null}
    <div class="form">
      <label class="lbl" for="ap-listing">Job listing or client brief</label>
      <textarea id="ap-listing" class="input area" rows="8" value=${listing} onInput=${e => setListing(e.target.value)} placeholder="Open the listing on JustJoin.it, No Fluff Jobs, LinkedIn, Useme… select all the text, copy and paste it here"></textarea>
      <label class="lbl" for="ap-link">Link to the listing (optional)</label>
      <input id="ap-link" class="input" value=${link} onInput=${e => setLink(e.target.value)} placeholder="https://…" />
      ${err ? html`<p class="err" role="alert">${err}</p>` : null}
      <div class="row"><span class="small muted">The app can’t open websites itself, so paste the text.</span><div class="grow"></div>
        ${busy ? html`<${Thinking} label="Preparing your application" /><button class="btn sm" onClick=${() => ctl.current && ctl.current.abort()}><${Icon} n="stop" s=${14} /> Stop</button>` : html`<button class="btn primary" onClick=${prepare}>Prepare my application</button>`}</div>
    </div>
    ${open ? html`<${PackView} key=${open.id} pack=${open} go=${go} setT=${setT} close=${() => setOpenId(null)} />` : null}
    ${c.packs.length ? html`<section class="block"><div class="block-h"><h2>Earlier applications</h2></div>
      <div class="hlist">${c.packs.map(p => html`<button class="hrow" style="text-align:left;border-left:0;border-right:0;border-bottom:0;background:none;color:var(--ink);width:100%" onClick=${() => { setOpenId(p.id); window.scrollTo(0, 0); }}><span class="hdate">${fmtDay(p.at)}</span><span><b>${p.role}</b> · ${p.company} <span class=${'tag ' + (p.fit.score >= 70 ? 'acc' : '')}>fit ${p.fit.score}</span></span></button>`)}</div></section>` : null}
  </div>`;
}

function PackView({ pack, go, setT, close }) {
  const [edit, setEdit] = useState(false);
  const [mine, setMine] = useState(pack.letter_en || pack.letter);
  const [chk, setChk] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const tracked = Store.career.apps.some(a => a.packId === pack.id);
  function track(status) {
    const a = { id: uid(), created: Date.now(), company: pack.company, role: pack.role, link: pack.link, source: pack.source, status, date: dayKey(), next: status === 'applied' ? dayKey(new Date(Date.now() + 7 * DAY)) : '', notes: '', packId: pack.id };
    Store.career.apps = [a].concat(Store.career.apps);
    commit('career');
    toast(status === 'applied' ? 'Added to Applications. Follow-up reminder in 7 days.' : 'Saved to Applications');
  }
  function practise() {
    const sc = normScenario({ title: ('Interview: ' + pack.company).slice(0, 60), situation: pack.interview.situation || 'You’re in a job interview for the ' + pack.role + ' role at ' + pack.company + '.', me: 'the candidate', ai: pack.interview.ai || 'the hiring manager at ' + pack.company, goal: pack.interview.goal || 'Show you fit the role and answer follow-up questions.', twist: pack.interview.twist || 'a hard technical question from the listing' });
    if (!sc) return;
    Store.profile.customScenarios = [sc].concat(arr(Store.profile.customScenarios)).slice(0, 16);
    commit('profile');
    go('speaking', { start: sc.id });
  }
  async function checkMine() {
    const t = mine.trim();
    if (words(t) < 20) return;
    setBusy(true); setErr('');
    try {
      const r = normWriting(await aiJSON(writingPrompt('business', 'a cover letter for the ' + pack.role + ' role at ' + pack.company, t), { modelTier: 'default' }));
      if (!r.corrected) r.corrected = t;
      r.mistakes.forEach(m => { m.repeat = Mistakes.record({ mistake_key: m.mistake_key, mistake_label: m.mistake_label, you_said: m.original, better: m.corrected, more_natural: m.natural, why: m.why, polish_calque: m.polish_calque }); });
      if (r.mistakes.length) commit('mistakes');
      r.expressions.forEach(p => Vocab.add(p, 'career'));
      if (r.expressions.length) commit('vocab');
      recordSession({ mode: 'writing', title: 'Cover letter', scores: { fluency: null, grammar: r.scores.grammar, vocabulary: r.scores.vocabulary, naturalness: r.scores.naturalness, confidence: null }, corrections: r.mistakes.length, calques: r.mistakes.filter(m => m.polish_calque).length, minutes: Math.max(2, Math.round(words(t) / 12)), words: words(t) });
      setChk({ res: r, orig: t });
    } catch (e) { setErr(errText(e)); }
    finally { setBusy(false); }
  }
  const f = pack.fit;
  return html`<section class="fb" aria-label="Application pack">
    <div class="block-h"><div><span class="lbl">Application pack · ${fmtDay(pack.at)}${pack.source ? ' · ' + pack.source : ''}</span><h2 class="fb-head">${pack.role}</h2><p class="muted">${pack.company}${pack.link ? html` · <a href=${pack.link} target="_blank" rel="noopener noreferrer">open listing</a>` : null}</p></div><button class="linkbtn" onClick=${close}>Close</button></div>
    <div class="meter"><span>Fit</span><div class="track"><i style=${'width:' + f.score + '%'}></i></div><b>${f.score}<small>/100</small></b></div>
    <div class="fb-cols">
      ${f.matches.length ? html`<div><div class="lbl">Where you match</div><ul>${f.matches.map(x => html`<li>${x}</li>`)}</ul></div>` : null}
      ${f.missing.length ? html`<div><div class="lbl">Gaps and how to handle them</div><ul>${f.missing.map(x => html`<li>${x}</li>`)}</ul></div>` : null}
    </div>
    ${f.flags.length ? html`<div><div class="lbl">Watch out</div><ul>${f.flags.map(x => html`<li>${x}</li>`)}</ul></div>` : null}
    ${pack.keywords.length ? html`<div><span class="lbl">Put these keywords in your CV</span><div class="chips" style="margin-top:8px">${pack.keywords.map(k => html`<span class="tag acc">${k}</span>`)}</div></div>` : null}
    <div class="row">
      ${tracked ? html`<span class="okt small"><${Icon} n="check" s=${15} /> In Applications</span><button class="linkbtn" onClick=${() => setT('tracker')}>Open Applications →</button>` : html`<button class="btn primary" onClick=${() => track('applied')}>I’ve applied: track it</button><button class="btn" onClick=${() => track('saved')}>Save for later</button>`}
      <button class="btn" onClick=${practise}><${Icon} n="chat" s=${16} /> Practise the interview</button>
    </div>
    <${TextBlock} title=${pack.language === 'pl' ? 'Cover letter (Polish, like the listing)' : 'Cover letter'} text=${pack.letter} />
    ${pack.language === 'pl' ? html`<${TextBlock} title="Cover letter in English" text=${pack.letter_en} />` : null}
    <${TextBlock} title="Short message to the recruiter" text=${pack.message} />
    ${pack.screening.length ? html`<div class="block" style="gap:8px"><span class="lbl">Likely questions, with answers to practise</span>${pack.screening.map(x => html`<div class="focus-item"><b>${x.q}</b><span>${x.a}</span><span><${Say} text=${x.a} label="Listen to the answer" /></span></div>`)}</div>` : null}
    <${TextBlock} title="Follow-up email (send after 7 days)" text=${pack.follow_up} />
    ${pack.phrases.length ? html`<div class="block" style="gap:8px"><span class="lbl">Phrases worth learning · saved to My vocabulary</span><${PhraseList} list=${pack.phrases} /></div>` : null}
    <div class="block" style="gap:8px">
      <div class="block-h"><span class="lbl">Make it yours and learn from it</span>${!edit ? html`<button class="btn sm" onClick=${() => setEdit(true)}>Edit the English letter and check it</button>` : null}</div>
      ${edit ? html`<textarea id="pk-mine" class="input area" rows="9" value=${mine} onInput=${e => setMine(e.target.value)} aria-label="Your version of the letter"></textarea>
        <div class="row"><span class="small muted">Change it into your own words, then check your English. Mistakes go to My common mistakes.</span><div class="grow"></div>${busy ? html`<${Thinking} label="Checking" />` : html`<button class="btn primary" onClick=${checkMine}>Check my English</button>`}</div>` : null}
      ${err ? html`<p class="err" role="alert">${err}</p>` : null}
      ${chk ? html`<${WritingResult} res=${chk.res} orig=${chk.orig} />` : null}
    </div>
    <p class="small muted">Nothing is sent from here. Copy the texts, check names and facts, then apply on the portal yourself.</p>
  </section>`;
}

function TrackerTab({ setT, go }) {
  const c = Store.career;
  const [f, setF] = useState({ company: '', role: '', link: '', source: '' });
  const [filter, setFilter] = useState('all');
  const today = dayKey();
  function add() {
    if (!f.company.trim() || !f.role.trim()) return;
    Store.career.apps = [{ id: uid(), created: Date.now(), company: f.company.trim().slice(0, 80), role: f.role.trim().slice(0, 120), link: f.link.trim().slice(0, 300), source: f.source.trim().slice(0, 40), status: 'applied', date: today, next: dayKey(new Date(Date.now() + 7 * DAY)), notes: '', packId: null }].concat(Store.career.apps);
    commit('career');
    setF({ company: '', role: '', link: '', source: '' });
  }
  function upd(id, patch) {
    const a = Store.career.apps.find(x => x.id === id);
    if (!a) return;
    Object.assign(a, patch);
    if (patch.status === 'applied' && !a.next) a.next = dayKey(new Date(Date.now() + 7 * DAY));
    if (patch.status === 'offer' || patch.status === 'rejected') a.next = '';
    commit('career');
  }
  function remove(id) { Store.career.apps = Store.career.apps.filter(x => x.id !== id); commit('career'); toast('Removed'); }
  function csv() {
    const q = v => '"' + String(v || '').replace(/"/g, '""') + '"';
    const rows = [['Company', 'Role', 'Source', 'Link', 'Status', 'Applied', 'Follow-up', 'Notes']].concat(c.apps.map(a => [a.company, a.role, a.source, a.link, a.status, a.date, a.next, a.notes]));
    saveFile('applications.csv', rows.map(r => r.map(q).join(',')).join('\n'));
  }
  const counts = {};
  c.apps.forEach(a => { counts[a.status] = (counts[a.status] || 0) + 1; });
  const list = c.apps.filter(a => filter === 'all' || a.status === filter);
  const dueN = c.apps.filter(a => a.next && a.next <= today && (a.status === 'applied' || a.status === 'interview')).length;
  return html`<div class="block" style="gap:20px">
    <div class="chips">${[['all', 'All', c.apps.length]].concat(APP_STATUS.map(([k, l]) => [k, l, counts[k] || 0])).map(([k, l, n]) => html`<button class=${'chip' + (filter === k ? ' on' : '')} onClick=${() => setFilter(k)} aria-pressed=${filter === k}>${l} · ${n}</button>`)}</div>
    ${dueN ? html`<p class="pattern" style="font-weight:400">${dueN} follow-up${dueN === 1 ? '' : 's'} due. Open the application pack for a ready follow-up email.</p>` : null}
    ${list.length ? html`<div class="hlist">${list.map(a => { const due = a.next && a.next <= today && (a.status === 'applied' || a.status === 'interview'); return html`<div class="trow" key=${a.id}>
      <div class="vmain"><b>${a.role}</b><span class="muted small">${a.company}${a.source ? ' · ' + a.source : ''} · applied ${a.date}</span>${a.link ? html`<a class="small" href=${a.link} target="_blank" rel="noopener noreferrer">open listing</a>` : null}
        <input id=${'tn-' + a.id} class="input" style="margin-top:6px;font-size:14px;padding:6px 10px" value=${a.notes} onChange=${e => upd(a.id, { notes: e.target.value.slice(0, 300) })} placeholder="Notes (contact person, interview date…)" aria-label="Notes" /></div>
      <div class="vmeta">
        <select id=${'ts-' + a.id} value=${a.status} onChange=${e => upd(a.id, { status: e.target.value })} aria-label="Status">${APP_STATUS.map(([k, l]) => html`<option value=${k}>${l}</option>`)}</select>
        <label class="small muted" for=${'tf-' + a.id}>${due ? html`<b class="not">Follow up</b>` : 'Follow-up'}</label>
        <input id=${'tf-' + a.id} type="date" class="input" style="font-size:13px;padding:4px 8px;width:auto" value=${a.next || ''} onChange=${e => upd(a.id, { next: e.target.value })} />
        <div class="row" style="gap:4px">${a.packId && Store.career.packs.some(p => p.id === a.packId) ? html`<button class="btn sm" onClick=${() => setT('apply')}>Pack</button>` : null}<button class="iconbtn" onClick=${() => remove(a.id)} aria-label=${'Delete ' + a.role}><${Icon} n="trash" s=${16} /></button></div>
      </div>
    </div>`; })}</div>` : html`<p class="empty">${c.apps.length ? 'Nothing with this status.' : 'No applications yet. Prepare one in “Apply to a listing”, or add one you sent elsewhere.'}</p>`}
    <section class="block"><div class="block-h"><h2>Add an application</h2>${c.apps.length ? html`<button class="btn sm" onClick=${csv}>Export CSV</button>` : null}</div>
      <div class="row">
        <input id="tr-company" class="input" style="flex:1;min-width:150px" value=${f.company} onInput=${e => setF(Object.assign({}, f, { company: e.target.value }))} placeholder="Company" aria-label="Company" />
        <input id="tr-role" class="input" style="flex:1;min-width:150px" value=${f.role} onInput=${e => setF(Object.assign({}, f, { role: e.target.value }))} placeholder="Role" aria-label="Role" />
        <input id="tr-source" class="input" style="flex:1;min-width:120px" value=${f.source} onInput=${e => setF(Object.assign({}, f, { source: e.target.value }))} placeholder="Where (e.g. JustJoin.it)" aria-label="Source" />
        <input id="tr-link" class="input" style="flex:2;min-width:180px" value=${f.link} onInput=${e => setF(Object.assign({}, f, { link: e.target.value }))} placeholder="Link (optional)" aria-label="Link" />
        <button class="btn" onClick=${add} disabled=${!f.company.trim() || !f.role.trim()}><${Icon} n="plus" s=${16} /> Add</button>
      </div></section>
  </div>`;
}

function SkillsTab({ setT }) {
  const c = Store.career, k = c.comp;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function build() {
    setBusy(true); setErr('');
    try {
      const r = await aiJSON(competencyPrompt(), { modelTier: 'default', cache: false });
      const o = r && r.outreach || {};
      const comp = {
        at: Date.now(), summary: str(r && r.summary),
        strengths: arr(r && r.strengths).map(x => ({ skill: str(x && x.skill), evidence: str(x && x.evidence), level: ['basic', 'solid', 'strong'].includes(x && x.level) ? x.level : 'solid' })).filter(x => x.skill).slice(0, 6),
        gaps: arr(r && r.gaps).map(x => ({ skill: str(x && x.skill), why: str(x && x.why), how: str(x && x.how) })).filter(x => x.skill).slice(0, 5),
        path: arr(r && r.path).map(x => ({ when: str(x && x.when), step: str(x && x.step), outcome: str(x && x.outcome) })).filter(x => x.step).slice(0, 6),
        roles: arr(r && r.roles).map(x => ({ title: str(x && x.title), fit: ['high', 'medium', 'stretch'].includes(x && x.fit) ? x.fit : 'medium', why: str(x && x.why) })).filter(x => x.title).slice(0, 6),
        clients: arr(r && r.clients).map(x => ({ segment: str(x && x.segment), offer: str(x && x.offer), where: str(x && x.where) })).filter(x => x.segment).slice(0, 4),
        outreach: { linkedin: str(o.linkedin), email: str(o.email) },
        phrases: arr(r && r.phrases).map(normPhrase).filter(p => p.en).slice(0, 8)
      };
      if (!comp.summary && !comp.strengths.length) throw { code: 'invalid_json' };
      comp.phrases.forEach(p => Vocab.add(p, 'career'));
      if (comp.phrases.length) commit('vocab');
      Store.career.comp = comp;
      commit('career');
    } catch (e) { setErr(errText(e)); }
    finally { setBusy(false); }
  }
  return html`<div class="block" style="gap:22px">
    <div class="block-h"><p class="muted" style="max-width:62ch">A map of your strengths and gaps against the networking and security market in Poland and the EU, a 12-month plan, realistic roles and client segments. Based on your CV, profile and the researched market notes (${GUIDE_CHECKED}).</p>
      ${busy ? html`<${Thinking} label="Building your map" />` : html`<button class=${'btn ' + (k ? 'sm' : 'primary')} onClick=${build}>${k ? 'Rebuild' : 'Build my competency map'}</button>`}</div>
    ${!c.cv ? html`<p class="small muted">Tip: <button class="linkbtn" onClick=${() => setT('cv')}>add your CV</button> first for a map based on your real experience.</p>` : null}
    ${err ? html`<p class="err" role="alert">${err}</p>` : null}
    ${k ? html`
      <p class="small muted">Built ${fmtDay(k.at)}</p>
      ${k.summary ? html`<p class="lead" style="color:var(--ink)">${k.summary}</p>` : null}
      <div class="fb-cols">
        <div class="block" style="gap:8px"><span class="lbl">Strengths</span>${k.strengths.map(x => html`<div class="focus-item"><div class="row" style="gap:8px"><b>${x.skill}</b><span class=${'tag ' + (x.level === 'strong' ? 'acc' : '')}>${x.level}</span></div><span class="small muted">${x.evidence}</span></div>`)}</div>
        <div class="block" style="gap:8px"><span class="lbl">Gaps to close</span>${k.gaps.map(x => html`<div class="focus-item"><b>${x.skill}</b><span class="small muted">${x.why}</span><span class="small">${x.how}</span></div>`)}</div>
      </div>
      ${k.path.length ? html`<div class="block" style="gap:8px"><span class="lbl">Your next 12 months</span><div class="plan">${k.path.map(x => html`<div class="plan-row" style="grid-template-columns:110px 1fr"><span class="plan-day">${x.when}</span><span><b>${x.step}</b>${x.outcome ? html`<br /><span class="small muted">${x.outcome}</span>` : null}</span></div>`)}</div></div>` : null}
      ${k.roles.length ? html`<div class="block" style="gap:8px"><span class="lbl">Roles to target</span>${k.roles.map(x => html`<div class="row" style="gap:8px"><span class=${'tag ' + (x.fit === 'high' ? 'acc' : x.fit === 'stretch' ? 'warn' : '')}>${x.fit}</span><b>${x.title}</b><span class="small muted">${x.why}</span></div>`)}</div>` : null}
      ${k.clients.length ? html`<div class="block" style="gap:8px"><span class="lbl">Client segments (freelance / B2B)</span>${k.clients.map(x => html`<div class="focus-item"><b>${x.segment}</b><span class="small">${x.offer}</span><span class="small muted">${x.where}</span></div>`)}</div>` : null}
      <${TextBlock} title="LinkedIn message (English)" text=${k.outreach.linkedin} />
      <${TextBlock} title="Cold email to a Polish company (Polish)" text=${k.outreach.email} />
      ${k.phrases.length ? html`<div class="block" style="gap:8px"><span class="lbl">English for your job · saved to My vocabulary</span><${PhraseList} list=${k.phrases} /></div>` : null}
    ` : null}
  </div>`;
}

function WhereTab() {
  return html`<div class="block" style="gap:24px">
    <p class="muted">Where to find jobs and clients in networking and cybersecurity, and how applying works on each. Items marked <span class="tag acc">checked</span> were confirmed with web research on ${GUIDE_CHECKED}; the others are well-known options to verify yourself. Fees, rules and dates change, so check before you rely on them.</p>
    ${GUIDE.map(sec => html`<section class="block" style="gap:10px"><h2 style="font-size:19px">${sec.title}</h2>
      ${sec.items.map(it => html`<div class="focus-item">
        <div class="row" style="gap:8px"><b>${it.url ? html`<a href=${it.url} target="_blank" rel="noopener noreferrer">${it.name}</a>` : it.name}</b>${it.checked ? html`<span class="tag acc">checked</span>` : html`<span class="tag">verify</span>`}<span class="tag">${it.lang}</span></div>
        <span>${it.good}</span>
        <span class="small"><b>How to apply:</b> ${it.how}</span>
        <span class="small muted"><b>Cost:</b> ${it.cost} · <b>Tip:</b> ${it.tip}</span>
      </div>`)}
    </section>`)}
    <details><summary class="lbl" style="cursor:pointer">Sources (${GUIDE_SOURCES.length})</summary>
      <ul class="small" style="margin-top:8px;display:flex;flex-direction:column;gap:4px">${GUIDE_SOURCES.map(([t, u]) => html`<li><a href=${u} target="_blank" rel="noopener noreferrer">${t}</a></li>`)}</ul></details>
  </div>`;
}
