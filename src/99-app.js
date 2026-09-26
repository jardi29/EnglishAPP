/* ---------- app ---------- */
function App() {
  const [, setTick] = useState(0);
  useEffect(() => { const f = () => setTick(t => t + 1); Store.subs.add(f); return () => { Store.subs.delete(f); }; }, []);
  const [route, setRoute] = useState(() => {
    let h = '';
    try { h = (location.hash || '').slice(1); } catch (e) {}
    return ['speaking', 'writing', 'daily', 'progress', 'review', 'sprint', 'shadow'].includes(h) ? { name: h } : { name: 'home' };
  });
  const go = (name, extra) => { if (TTS.ok) { try { speechSynthesis.cancel(); } catch (e) {} } setRoute(Object.assign({ name }, extra || {})); window.scrollTo(0, 0); };
  const p = Store.profile;
  let view;
  if (!p.onboarded && !Persist.settled) view = html`<div class="boot"><${Thinking} label="Loading your progress" /></div>`;
  else if (!p.onboarded || route.name === 'onboard') view = html`<${Onboarding} go=${go} retake=${p.onboarded && route.name === 'onboard'} />`;
  else if (route.name === 'speaking') view = html`<${Speaking} go=${go} />`;
  else if (route.name === 'writing') view = html`<${Writing} />`;
  else if (route.name === 'daily') view = html`<${DailyHost} go=${go} />`;
  else if (route.name === 'review') view = html`<${VocabReview} go=${go} />`;
  else if (route.name === 'sprint') view = html`<${Sprint} go=${go} />`;
  else if (route.name === 'shadow') view = html`<${Shadowing} go=${go} />`;
  else if (route.name === 'progress') view = html`<${Progress} key=${route.tab || 'p'} go=${go} tab=${route.tab} />`;
  else view = html`<${Home} go=${go} />`;
  return html`<${TopBar} route=${route} go=${go} /><main class="wrap"><${AIBanner} />${view}</main><${Toaster} />`;
}

appEl.textContent = '';
render(html`<${App} />`, appEl);
Persist.init();
