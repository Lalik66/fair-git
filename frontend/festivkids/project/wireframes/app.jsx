// Top-level app: tab switching, tweaks panel, season/lang/density.
const { useState, useEffect } = React;

function I18n({ az, en }) {
  const [, setT] = useState(0);
  useEffect(() => {
    const handler = () => setT(t => t + 1);
    window.addEventListener('lang-change', handler);
    return () => window.removeEventListener('lang-change', handler);
  }, []);
  const lang = window.__wfLang || 'en';
  return <span>{lang === 'az' ? az : en}</span>;
}
window.I18n = I18n;

function FKApp() {
  const [tab, setTab] = useState('overview');
  const fallbackDefaults = { season: 'winter', lang: 'en', density: 'cozy', homeVariant: 'A', mapVariant: 'A' };
  const result = window.useTweaks ? window.useTweaks(fallbackDefaults) : [fallbackDefaults, () => {}];
  const tweaks = Array.isArray(result) ? result[0] : (result.tweaks || fallbackDefaults);
  const setTweak = Array.isArray(result) ? result[1] : (result.setTweak || (() => {}));

  // apply season/density to body class
  useEffect(() => {
    document.body.classList.toggle('spring', tweaks.season === 'spring');
    document.body.classList.toggle('compact', tweaks.density === 'compact');
    window.__wfLang = tweaks.lang;
    window.dispatchEvent(new Event('lang-change'));
  }, [tweaks.season, tweaks.density, tweaks.lang]);

  // wire tabs
  useEffect(() => {
    const tabs = document.querySelectorAll('.tab');
    const handler = (e) => setTab(e.currentTarget.dataset.tab);
    tabs.forEach(t => t.addEventListener('click', handler));
    return () => tabs.forEach(t => t.removeEventListener('click', handler));
  }, []);
  useEffect(() => {
    document.querySelectorAll('.tab').forEach(el => {
      el.setAttribute('aria-selected', el.dataset.tab === tab ? 'true' : 'false');
    });
    document.querySelectorAll('.tabpanel').forEach(el => {
      el.dataset.active = el.dataset.tab === tab ? 'true' : 'false';
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [tab]);

  const Screens = window.WFScreens || {};

  return (
    <>
      <Screens.Overview tweaks={tweaks} setTweak={setTweak} setTab={setTab} />
      <Screens.Home tweaks={tweaks} setTweak={setTweak} />
      <Screens.About tweaks={tweaks} />
      <Screens.Map tweaks={tweaks} setTweak={setTweak} />
      <Screens.Auth tweaks={tweaks} />
      <Screens.Visitor tweaks={tweaks} />
      <Screens.Vendor tweaks={tweaks} />
      <Screens.Admin tweaks={tweaks} />
      <Screens.States tweaks={tweaks} />

      {window.TweaksPanel && (
        <window.TweaksPanel title="Tweaks">
          <window.TweakSection title="Theme">
            <window.TweakRadio
              label="Season"
              value={tweaks.season}
              onChange={(v) => setTweak('season', v)}
              options={[{value:'winter',label:'Winter'},{value:'spring',label:'Spring'}]}
            />
            <window.TweakRadio
              label="Density"
              value={tweaks.density}
              onChange={(v) => setTweak('density', v)}
              options={[{value:'cozy',label:'Cozy'},{value:'compact',label:'Compact'}]}
            />
          </window.TweakSection>
          <window.TweakSection title="Localization">
            <window.TweakRadio
              label="Language"
              value={tweaks.lang}
              onChange={(v) => setTweak('lang', v)}
              options={[{value:'en',label:'EN'},{value:'az',label:'AZ'}]}
            />
          </window.TweakSection>
          <window.TweakSection title="Variants">
            <window.TweakRadio
              label="Home layout"
              value={tweaks.homeVariant}
              onChange={(v) => setTweak('homeVariant', v)}
              options={[{value:'A',label:'A · Hero'},{value:'B',label:'B · Editorial'}]}
            />
            <window.TweakRadio
              label="Map layout"
              value={tweaks.mapVariant}
              onChange={(v) => setTweak('mapVariant', v)}
              options={[{value:'A',label:'A · Split'},{value:'B',label:'B · Map-first'}]}
            />
          </window.TweakSection>
        </window.TweaksPanel>
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<FKApp />);
