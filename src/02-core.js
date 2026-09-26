/* ---------- utilities ---------- */
const DAY = 864e5;
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5);
const arr = x => Array.isArray(x) ? x : [];
const str = x => (typeof x === 'string' ? x : (x == null ? '' : String(x))).trim();
const words = s => (str(s).match(/\S+/g) || []).length;
const norm = s => str(s).toLowerCase().replace(/[’‘]/g, "'").replace(/[.!?,;:"“”()…]/g, ' ').replace(/\s+/g, ' ').trim();
const slug = s => str(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const pick = a => a[Math.floor(Math.random() * a.length)];
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const score10 = x => { const n = Number(x); return Number.isFinite(n) && n > 0 ? Math.max(1, Math.min(10, Math.round(n))) : null; };
const dayKey = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const fmtDay = t => { try { return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); } catch (e) { return ''; } };
const reduceMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
function lsGet(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

/* ---------- content ---------- */
const LEVELS = ['A1', 'A2', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C2'];
const lvlRank = l => LEVELS.indexOf(l);
function levelNorm(s) {
  const m = str(s).toUpperCase().match(/\b(A1|A2|B1|B2|C1|C2)(\+)?/);
  if (!m) return null;
  const l = m[1] + (m[2] && (m[1] === 'B1' || m[1] === 'B2') ? '+' : '');
  return LEVELS.includes(l) ? l : m[1];
}
const LEVEL_INFO = {
  A1: 'I know basic words and phrases.',
  A2: 'I can handle simple, everyday situations.',
  B1: 'I can talk about familiar topics, but I often search for words.',
  'B1+': 'I can keep a conversation going, with quite a few mistakes.',
  B2: 'I can talk about most topics. I want to sound more natural.',
  'B2+': 'I’m comfortable, but I keep making the same mistakes.',
  C1: 'I’m fluent. I want polish and idiomatic English.',
  C2: 'Near-native. I want the finest details.'
};
const DIMS = ['fluency', 'grammar', 'vocabulary', 'naturalness', 'confidence'];
const DIM_LABEL = { fluency: 'Fluency', grammar: 'Grammar', vocabulary: 'Vocabulary', naturalness: 'Naturalness', confidence: 'Confidence', clarity: 'Clarity' };
const RUNGS = ['Correct', 'Natural', 'More natural', 'Native-like'];
const RUNG_IDX = { correct: 0, natural: 1, more_natural: 2, native: 3 };

const MISTAKE_TYPES = {
  'present-perfect-vs-past-simple': 'Present Perfect vs Past Simple',
  'articles': 'Articles: a / an / the',
  'prepositions': 'Prepositions',
  'word-order': 'Word order',
  'false-friends': 'False friends',
  'polish-calque': 'Word-for-word translation from Polish',
  'missing-auxiliary': 'Missing auxiliary verbs (do / does / did, be)',
  'question-formation': 'Forming questions',
  'verb-tenses': 'Verb tenses',
  'subject-verb-agreement': 'Subject–verb agreement (he goes)',
  'countable-uncountable': 'Countable vs uncountable nouns',
  'gerund-infinitive': 'Gerund vs infinitive (-ing / to)',
  'conditionals': 'Conditionals',
  'collocations': 'Collocations (make / do, take / have)',
  'phrasal-verbs': 'Phrasal verbs',
  'word-choice': 'Word choice',
  'too-simple-vocabulary': 'Overly simple vocabulary',
  'register': 'Tone and formality',
  'plurals': 'Plural forms',
  'pronouns': 'Pronouns',
  'comparatives': 'Comparatives and superlatives',
  'modal-verbs': 'Modal verbs',
  'passive-voice': 'Passive voice',
  'spelling': 'Spelling',
  'punctuation': 'Punctuation'
};

const TOPICS = [
  { id: 'everyday', label: 'Everyday life', seed: 'routines, the week, small plans' },
  { id: 'work', label: 'Work', seed: 'the learner’s job, colleagues, a typical workday' },
  { id: 'travel', label: 'Travel', seed: 'trips, places, travel stories and plans' },
  { id: 'technology', label: 'Technology', seed: 'apps, gadgets, AI, how tech changes daily life' },
  { id: 'business', label: 'Business', seed: 'companies, ideas, customers, running a business' },
  { id: 'hobbies', label: 'Hobbies', seed: 'free time, sport, creative things' },
  { id: 'relationships', label: 'Relationships', seed: 'friends, family, meeting people; keep it light and respectful' },
  { id: 'food', label: 'Food', seed: 'cooking, restaurants, favourite dishes' },
  { id: 'news', label: 'Current events', seed: 'what is happening in the world; you cannot know today’s news, so ask what the learner has been following' },
  { id: 'opinions', label: 'Opinions', seed: 'a light debatable question, e.g. remote work, social media, city vs countryside' },
  { id: 'hypothetical', label: 'Hypothetical situations', seed: '“what would you do if…” questions' },
  { id: 'smalltalk', label: 'Small talk', seed: 'weather, the weekend, light everyday chat' }
];

const SCENARIOS = [
  { id: 'hotel', title: 'Hotel room problem', situation: 'You’ve just checked into a hotel and there’s a problem with your room.', me: 'the guest', ai: 'the receptionist at a busy city-centre hotel', goal: 'Explain the problem and get it solved.', twist: 'the hotel is almost fully booked tonight' },
  { id: 'interview', title: 'Job interview', situation: 'You’re in a job interview for a role in your field.', me: 'the candidate', ai: 'a friendly but thorough hiring manager', goal: 'Present your experience and handle follow-up questions.', twist: 'one unexpected question, e.g. about a failure or salary expectations' },
  { id: 'colleague', title: 'Project update with a colleague', situation: 'A colleague stops by to ask how your project is going.', me: 'the person leading the project', ai: 'a colleague from another team who depends on the project', goal: 'Explain the status and agree on next steps.', twist: 'their deadline has just been moved a week earlier' },
  { id: 'first-meet', title: 'Meeting someone new', situation: 'You’re meeting someone for the first time at a friend’s barbecue.', me: 'a guest', ai: 'another guest, a friend of the host', goal: 'Introduce yourself and find something in common.', twist: 'it turns out you both know someone unexpected' },
  { id: 'party', title: 'Small talk at a party', situation: 'You’re at a work party and end up next to someone at the drinks table.', me: 'a guest', ai: 'someone from a different department', goal: 'Keep a light conversation going for a few minutes.', twist: 'they ask your opinion on something slightly awkward, like a new office policy' },
  { id: 'negotiate', title: 'Negotiating a price', situation: 'You want to buy a used car you saw advertised online.', me: 'the buyer', ai: 'the private seller, friendly but firm on price', goal: 'Get a better price or a better deal.', twist: 'another buyer is supposedly coming to see the car tomorrow' },
  { id: 'support', title: 'Calling customer support', situation: 'Your internet connection at home keeps dropping, so you call customer support.', me: 'the customer', ai: 'a customer support agent who follows a script', goal: 'Explain the problem clearly and get a solution.', twist: 'the agent first suggests restarting the router, which you already did' },
  { id: 'meeting', title: 'Your opinion in a meeting', situation: 'In a team meeting, your manager asks what you think about moving all meetings to Friday afternoons.', me: 'a team member', ai: 'the manager running the meeting (you may also voice other colleagues)', goal: 'Give your opinion politely and back it up.', twist: 'a colleague strongly disagrees with you' },
  { id: 'presentation', title: 'Presentation Q&A', situation: 'You’ve just finished a short presentation about a project and it’s time for questions.', me: 'the presenter', ai: 'someone in the audience asking questions', goal: 'Answer clearly, even the tricky questions.', twist: 'a question you don’t know the answer to' },
  { id: 'ordering', title: 'Ordering at a restaurant', situation: 'You’re at a restaurant with a friend and ready to order.', me: 'the customer', ai: 'the waiter', goal: 'Order food and drinks, and ask about the menu.', twist: 'the dish you want is sold out' },
  { id: 'complaint', title: 'Making a complaint', situation: 'The headphones you bought arrived damaged, so you go to the shop’s service desk.', me: 'the customer', ai: 'the service desk employee', goal: 'Get a refund or a replacement.', twist: 'you don’t have the receipt with you' }
];

const findScenario = id => id ? (SCENARIOS.find(x => x.id === id) || arr(Store.profile.customScenarios).find(x => x.id === id) || null) : null;
const USES = ['Meetings', 'Emails and chat', 'Calls with clients', 'Presentations', 'Job interviews', 'Travel', 'Friends and social life', 'Films and series', 'Exams', 'Moving abroad'];

const DIAG = [
  { q: 'I ___ to London three times, but I ___ there last year.', opts: ['have been / didn’t go', 'was / haven’t gone', 'went / haven’t been', 'have gone / didn’t went'], ans: 0, key: 'present-perfect-vs-past-simple', why: 'Doświadczenie bez podanego czasu → Present Perfect (have been). Konkretny czas w przeszłości (last year) → Past Simple (didn’t go).' },
  { q: 'She’s ___ engineer at ___ company I told you about.', opts: ['an / the', 'a / a', 'the / a', '– / the'], ans: 0, key: 'articles', why: '„An” przed samogłoską w wymowie (an engineer). „The”, bo chodzi o konkretną firmę, o której już była mowa.' },
  { q: 'Could you give me ___ advice?', opts: ['an', 'some', 'a few', 'many'], ans: 1, key: 'countable-uncountable', why: '„Advice” jest niepoliczalne: nie ma „an advice” ani „advices”. Mówimy „some advice” albo „a piece of advice”.' },
  { q: 'She’s really good ___ solving problems.', opts: ['in', 'at', 'on', 'for'], ans: 1, key: 'prepositions', why: '„Good at something” to stałe połączenie. „Good in” to kalka z „dobry w”.' },
  { q: 'Can you ___ me a favour?', opts: ['make', 'do', 'give', 'take'], ans: 1, key: 'collocations', why: 'Po angielsku „do someone a favour”. „Make” i „do” najlepiej zapamiętywać w gotowych połączeniach.' },
  { q: 'What are you working on ___?', opts: ['actually', 'currently', 'actual', 'eventually'], ans: 1, key: 'false-friends', why: '„Actually” znaczy „właściwie / tak naprawdę”, a nie „aktualnie”. „Aktualnie” to „currently” albo „at the moment”.' },
  { q: 'If I ___ more time, I’d learn to play the guitar.', opts: ['have', 'had', 'would have', 'will have'], ans: 1, key: 'conditionals', why: 'Drugi tryb warunkowy (sytuacja nierealna teraz): If + Past Simple, a potem would + czasownik.' },
  { q: 'How long ___ here?', opts: ['do you work', 'are you working', 'have you been working', 'did you work'], ans: 2, key: 'verb-tenses', why: 'Pytając, jak długo coś trwa do teraz, używamy Present Perfect (Continuous). „How long do you work here?” to dosłowne tłumaczenie z polskiego.' },
  { q: 'I’m looking forward ___ you next week.', opts: ['to see', 'seeing', 'to seeing', 'see'], ans: 2, key: 'gerund-infinitive', why: 'W „look forward to” słowo „to” jest przyimkiem, więc po nim stoi forma -ing: „looking forward to seeing you”.' },
  { q: 'The meeting was ___ because the manager was ill.', opts: ['put off', 'put out', 'put up', 'put on'], ans: 0, key: 'phrasal-verbs', why: '„Put off” = przełożyć na później. „Put out” = zgasić, „put up” = powiesić albo przenocować, „put on” = założyć.' },
  { q: 'Which sounds most natural after a long day at work?', opts: ['I am very tired because I worked a lot today.', 'I’m exhausted. I’ve been working all day.', 'I have big tiredness after today.', 'I’m tired from the working today.'], ans: 1, key: 'too-simple-vocabulary', whole: true, why: 'Pierwsza wersja jest poprawna, ale native speaker powie raczej „I’m exhausted” zamiast „very tired” i użyje „I’ve been working all day”.' },
  { q: 'Hardly ___ the office when it started to rain.', opts: ['I had left', 'had I left', 'I left', 'did I leave'], ans: 1, key: 'word-order', why: 'Po „Hardly”, „No sooner” czy „Never” na początku zdania stosujemy inwersję: „Hardly had I left…”. To poziom C1.' }
];
function fillBlank(q, i) {
  if (q.whole) return q.opts[i];
  const parts = q.opts[i].split(' / ');
  let k = 0;
  return q.q.replace(/___/g, () => { const p = parts[Math.min(k++, parts.length - 1)]; return p === '–' ? '' : p; }).replace(/\s{2,}/g, ' ');
}
function mcToLevel(s) { return s <= 4 ? 'A2' : s <= 6 ? 'B1' : s <= 8 ? 'B1+' : s <= 10 ? 'B2' : s === 11 ? 'B2+' : 'C1'; }

const TEXT_TYPES = [['email', 'Email'], ['message', 'Message'], ['linkedin', 'LinkedIn message'], ['work', 'Work communication'], ['story', 'Story'], ['opinion', 'Opinion'], ['diary', 'Diary'], ['social', 'Social media post'], ['business', 'Business communication'], ['other', 'Something else']];
const typeLabel = t => (TEXT_TYPES.find(x => x[0] === t) || ['', 'Text'])[1];
const EXAMPLE_TEXT = 'Hi Mark,\n\nThank you for your message. I am interesting in this offer and I would like to know more details. Can we make a meeting next week? I have time on Tuesday or Wednesday after 2 pm.\n\nBest regards,\nKasia';

/* ---------- store & persistence ---------- */
const LS = 'sayitnat.v1.';
const DRAFT_SPEAK = LS + 'draft.speaking';
const DRAFT_DAILY = LS + 'draft.daily';
const DRAFT_WRITE = LS + 'draft.writing';
const DOCS = ['profile', 'mistakes', 'vocab'];
const defaultProfile = () => ({ v: 1, onboarded: false, level: null, levelSource: null, levelHistory: [], explainMode: 'auto', correctionsEvery: 4, voice: 'en-GB', rate: 1, strengths: [], sessions: [], lastTopics: [], about: defaultAbout(), customScenarios: [], reports: [], updatedAt: 0 });
const defaultAbout = () => ({ role: '', uses: [], goals: '', interests: '', notes: '' });
function sanitizeDoc(name, d) {
  if (!d || typeof d !== 'object') return null;
  if (name === 'profile') {
    const p = Object.assign(defaultProfile(), d);
    ['levelHistory', 'strengths', 'sessions', 'lastTopics', 'customScenarios', 'reports'].forEach(k => { p[k] = arr(p[k]); });
    p.about = Object.assign(defaultAbout(), p.about && typeof p.about === 'object' ? p.about : {});
    p.about.uses = arr(p.about.uses);
    return p;
  }
  return { items: arr(d.items), updatedAt: d.updatedAt || 0 };
}
const Store = { profile: defaultProfile(), mistakes: { items: [], updatedAt: 0 }, vocab: { items: [], updatedAt: 0 }, subs: new Set() };
DOCS.forEach(n => { const d = sanitizeDoc(n, lsGet(LS + n)); if (d) Store[n] = d; });
function emit() { Store.subs.forEach(f => { try { f(); } catch (e) {} }); }
function commit(n) { Store[n].updatedAt = Date.now(); Persist.save(n); emit(); }

function fitDoc(n) {
  const size = () => JSON.stringify(Store[n]).length;
  let guard = 0;
  while (size() > 230000 && guard++ < 200) {
    if (n === 'profile' && Store.profile.sessions.length > 10) Store.profile.sessions.shift();
    else if (n === 'mistakes') { const m = Store.mistakes.items.find(x => x.lesson); if (m) m.lesson = null; else Store.mistakes.items.pop(); }
    else if (n === 'vocab') Store.vocab.items.pop();
    else break;
  }
}

const Persist = {
  mode: 'local', settled: false, db: null, path: null, writing: {}, dirty: {}, timers: {}, fails: {},
  async init() {
    try {
      const c = window.claude;
      if (!c || typeof c.use !== 'function') return;
      const [db, user] = await Promise.all([c.use('db').catch(() => null), c.use('user').catch(() => null)]);
      if (!db || !user) return;
      const id = await user.id();
      if (!id) return;
      this.path = n => 'data/users/' + id + '/' + n;
      for (const n of DOCS) {
        let snap = null;
        try { snap = await db.doc(this.path(n)).get(); }
        catch (e) {
          if (e && e.code === 'unavailable') { await sleep(700 + Math.random() * 700); snap = await db.doc(this.path(n)).get().catch(() => null); }
        }
        if (!snap) return;
        const remote = snap.exists ? sanitizeDoc(n, JSON.parse(JSON.stringify(snap.data()))) : null;
        if (remote && (remote.updatedAt || 0) >= (Store[n].updatedAt || 0)) { Store[n] = remote; lsSet(LS + n, remote); }
      }
      this.db = db; this.mode = 'cloud';
      DOCS.forEach(n => { if ((Store[n].updatedAt || 0) > 0) this.write(n); });
    } catch (e) { /* stays in browser storage */ }
    finally { this.settled = true; emit(); }
  },
  save(n) {
    fitDoc(n);
    lsSet(LS + n, Store[n]);
    if (!this.db) return;
    clearTimeout(this.timers[n]);
    this.fails[n] = 0;
    this.timers[n] = setTimeout(() => this.write(n), 900);
  },
  async write(n) {
    if (!this.db) return;
    if (this.writing[n]) { this.dirty[n] = true; return; }
    this.writing[n] = true;
    try { await this.db.doc(this.path(n)).set(JSON.parse(JSON.stringify(Store[n]))); this.fails[n] = 0; }
    catch (e) {
      const c = e && e.code;
      if (c === 'unavailable' || c === 'resource_exhausted') {
        this.fails[n] = (this.fails[n] || 0) + 1;
        if (this.fails[n] < 3) { this.dirty[n] = true; await sleep(1500 + Math.random() * 1500); }
      } else { this.db = null; this.mode = 'local'; emit(); }
    } finally {
      this.writing[n] = false;
      if (this.dirty[n] && this.db) { this.dirty[n] = false; this.write(n); }
    }
  }
};

/* ---------- learner model ---------- */
const INTERVALS = [1, 2, 4, 7, 15, 30];
const Mistakes = {
  get items() { return Store.mistakes.items; },
  find(k) { return this.items.find(m => m.key === k); },
  record(c) {
    const key = slug(c.mistake_key) || slug(c.mistake_label) || 'other';
    const now = Date.now();
    let m = this.find(key);
    const prev = m ? m.count : 0;
    if (!m) {
      m = { key, label: MISTAKE_TYPES[key] || str(c.mistake_label) || cap(key.replace(/-/g, ' ')), count: 0, firstSeen: now, lastSeen: now, box: 0, due: now, calques: 0, examples: [], lesson: null };
      this.items.push(m);
    }
    m.count += 1; m.lastSeen = now; m.box = 0; m.due = now;
    m.hist = [now].concat(arr(m.hist)).slice(0, 30);
    if (c.polish_calque) m.calques = (m.calques || 0) + 1;
    const ex = { wrong: str(c.you_said), right: str(c.better), natural: str(c.more_natural), why: str(c.why), at: now };
    if (ex.wrong && ex.right && !m.examples.some(e => norm(e.wrong) === norm(ex.wrong))) { m.examples.unshift(ex); m.examples = m.examples.slice(0, 4); }
    if (this.items.length > 60) {
      Store.mistakes.items = this.items.slice().sort((a, b) => (b.count * 10 + b.lastSeen / DAY) - (a.count * 10 + a.lastSeen / DAY)).slice(0, 60);
    }
    return prev + 1;
  },
  review(key, ok) {
    const m = this.find(key);
    if (!m) return;
    m.box = ok ? Math.min(5, m.box + 1) : 0;
    const f = m.count >= 5 ? 0.5 : m.count >= 3 ? 0.75 : 1;
    m.due = Date.now() + INTERVALS[m.box] * f * DAY;
    m.reviews = (m.reviews || 0) + 1; m.lastReview = Date.now();
  },
  priority(m) {
    const now = Date.now();
    const over = Math.max(0, (now - m.due) / DAY);
    return m.count * 2 + Math.min(over, 10) + (now >= m.due ? 4 : 0) - m.box * 1.5;
  },
  top(n) { return this.items.slice().sort((a, b) => this.priority(b) - this.priority(a)).slice(0, n); },
  status(m) {
    if (m.box >= 4) return ['control', 'Under control'];
    if (m.box >= 2) return ['improving', 'Improving'];
    if (m.count >= 2) return ['recurring', 'Recurring'];
    return ['new', 'Seen once'];
  }
};

const normPhrase = p => {
  const d = str(p && p.difficulty).toUpperCase();
  return { en: str(p && p.en), pl: str(p && p.pl), example: str(p && p.example), alternatives: arr(p && p.alternatives).map(str).filter(Boolean).slice(0, 3), difficulty: ['A2', 'B1', 'B2', 'C1', 'C2'].includes(d) ? d : 'B2', kind: str(p && p.kind).toLowerCase().slice(0, 24) };
};
const V_INT = [0, 1, 3, 7, 14, 30];
const vStatus = sc => sc >= 3 ? 'mastered' : sc >= 1 ? 'learning' : 'new';
function coreOf(en) {
  return norm(en.replace(/\(.*?\)/g, ' ').replace(/\+.*$/, ' ').replace(/(\.\.\.|…)/g, ' ').replace(/\b(sb|sth|someone|something|somebody|smb|one's)\b/gi, ' '));
}
const Vocab = {
  get items() { return Store.vocab.items; },
  add(p, source) {
    const x = normPhrase(p);
    if (!x.en) return null;
    const k = norm(x.en);
    let v = this.items.find(i => norm(i.en) === k);
    if (v) return v;
    v = Object.assign({ id: uid() }, x, { status: 'new', score: 0, used: 0, added: Date.now(), source: source || '' });
    this.items.unshift(v);
    if (this.items.length > 400) this.items.length = 400;
    return v;
  },
  bump(id, ok) {
    const v = this.items.find(i => i.id === id);
    if (!v) return;
    v.score = ok ? (v.score || 0) + 1 : Math.max(0, (v.score || 0) - 1);
    v.status = vStatus(v.score); v.lastReviewed = Date.now();
  },
  set(id, status) {
    const v = this.items.find(i => i.id === id);
    if (!v) return;
    v.status = status;
    v.score = status === 'mastered' ? 3 : status === 'learning' ? Math.min(2, Math.max(1, v.score || 1)) : 0;
  },
  remove(id) { Store.vocab.items = this.items.filter(i => i.id !== id); },
  review(id, g) {
    const v = this.items.find(i => i.id === id);
    if (!v) return;
    const now = Date.now();
    v.reviews = (v.reviews || 0) + 1; v.lastReviewed = now;
    if (g === 2) { v.box = Math.min(5, (v.box || 0) + 1); v.score = (v.score || 0) + 1; v.due = now + V_INT[v.box] * DAY; }
    else if (g === 1) { v.box = Math.max(1, v.box || 0); v.due = now + DAY; }
    else { v.box = 0; v.score = Math.max(0, (v.score || 0) - 1); v.due = now; }
    v.status = vStatus(v.score);
  },
  isDue(v, now) { return v.due == null ? v.status !== 'mastered' : v.due <= now; },
  due(n) {
    const now = Date.now();
    const rank = { learning: 0, new: 1, mastered: 2 };
    return this.items.filter(v => this.isDue(v, now)).sort((a, b) => (rank[a.status] - rank[b.status]) || ((a.due || a.added || 0) - (b.due || b.added || 0))).slice(0, n || 999);
  },
  nextDue() { const t = this.items.filter(v => v.due != null && v.due > Date.now()).map(v => v.due); return t.length ? Math.min.apply(null, t) : null; },
  detectUse(text) {
    const t = ' ' + norm(text) + ' ';
    const now = Date.now();
    const used = [];
    this.items.forEach(v => {
      if (v.status === 'mastered') return;
      const core = coreOf(v.en);
      if (core.length < 4 || core.indexOf(' ') < 0) return;
      if (t.includes(' ' + core + ' ') && !(v.lastUsed && now - v.lastUsed < 10 * 60000)) {
        v.used = (v.used || 0) + 1; v.score = (v.score || 0) + 1; v.status = vStatus(v.score); v.lastUsed = now;
        used.push(v);
      }
    });
    return used;
  }
};

function recentScores() {
  const ss = Store.profile.sessions.filter(s => s.scores).slice(-5);
  if (!ss.length) return null;
  const out = {};
  DIMS.forEach(d => { const v = ss.map(s => s.scores[d]).filter(x => x != null); out[d] = v.length ? avg(v) : null; });
  return out;
}
function explainMode() {
  const m = Store.profile.explainMode;
  if (m === 'pl' || m === 'mix' || m === 'en') return m;
  const r = lvlRank(Store.profile.level);
  const rs = recentScores();
  const vals = rs ? ['grammar', 'vocabulary', 'naturalness'].map(d => rs[d]).filter(x => x != null) : [];
  const a = vals.length ? avg(vals) : null;
  if (r >= lvlRank('C1') || (a != null && a >= 8)) return 'en';
  if (r >= lvlRank('B2') || (a != null && a >= 6.5)) return 'mix';
  return 'pl';
}
const EXPLAIN_LABEL = { pl: 'Polish', mix: 'Polish + English', en: 'English' };
function streak() {
  const days = new Set(Store.profile.sessions.map(s => s.day));
  let n = 0;
  const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function recordSession(x) {
  const p = Store.profile;
  const now = new Date();
  p.sessions.push({ id: uid(), date: now.toISOString(), day: dayKey(now), mode: x.mode, title: x.title || '', scores: x.scores || null, remember: arr(x.remember).slice(0, 3), level: x.level || null, calques: x.calques || 0, corrections: x.corrections || 0, minutes: x.minutes || 0, words: x.words || 0 });
  if (p.sessions.length > 150) p.sessions.splice(0, p.sessions.length - 150);
  if (x.level && LEVELS.includes(x.level)) {
    p.levelHistory.push({ date: now.toISOString(), level: x.level, source: x.mode });
    if (p.levelHistory.length > 30) p.levelHistory.splice(0, p.levelHistory.length - 30);
    const last = p.levelHistory.slice(-3).map(h => lvlRank(h.level)).filter(r => r >= 0).sort((a, b) => a - b);
    if (last.length) { p.level = LEVELS[last[Math.floor(last.length / 2)]]; p.levelSource = 'ai'; }
  }
  if (arr(x.strengths).length) p.strengths = x.strengths.slice(0, 4);
  commit('profile');
}
function aboutText() {
  const a = Store.profile.about || {};
  const parts = [];
  if (a.role) parts.push('Work / role: ' + a.role);
  if (arr(a.uses).length) parts.push('Uses English for: ' + a.uses.join(', '));
  if (a.goals) parts.push('Goals: ' + a.goals);
  if (a.interests) parts.push('Interests: ' + a.interests);
  if (a.notes) parts.push('Other: ' + a.notes);
  return parts.join('; ').slice(0, 900);
}
function noteTopic(id) {
  const p = Store.profile;
  p.lastTopics = [id].concat(arr(p.lastTopics).filter(x => x !== id)).slice(0, 6);
  commit('profile');
}
