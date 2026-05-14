// Home — two variants (A: hero, B: editorial). Tweakable via tweaks.homeVariant.
window.WFScreens = window.WFScreens || {};

function AppNav({ active='Home', tweaks }) {
  const items = ['Home','Map','About','Login'];
  const lang = tweaks?.lang || 'en';
  return (
    <div className="appnav">
      <div className="logo">FestivKids 🦊</div>
      <div className="links">
        {items.map(i => <span key={i} className={i===active?'active':''}>{i}</span>)}
      </div>
      <div className="right">
        <span className="lang">{lang === 'az' ? 'AZ · EN' : 'EN · AZ'}</span>
        <span className="btn sm">Sign in</span>
      </div>
    </div>
  );
}

function Countdown() {
  return (
    <div className="count">
      <div className="d">07<small>DAYS</small></div>
      <div className="d">12<small>HRS</small></div>
      <div className="d">44<small>MIN</small></div>
      <div className="d">08<small>SEC</small></div>
    </div>
  );
}

function FoxieScene({ live }) {
  return (
    <div style={{position:'relative', height:160}}>
      {/* snowflakes */}
      <svg style={{position:'absolute', inset:0, opacity:0.45}} viewBox="0 0 400 160" aria-hidden="true">
        {Array.from({length:14}).map((_,i)=>{
          const x = (i*29)%400, y = (i*53)%160;
          return <text key={i} x={x} y={y} fontFamily="Caveat" fontSize="14" fill="#1a1a1a">❄</text>;
        })}
      </svg>
      {/* train track */}
      <div style={{position:'absolute', bottom:18, left:0, right:0, height:6, borderTop:'2px dashed #1a1a1a'}}/>
      <div style={{position:'absolute', bottom:24, left:'30%'}}>
        <svg width="120" height="40" viewBox="0 0 120 40">
          <g fill="none" stroke="#1a1a1a" strokeWidth="2">
            <rect x="2" y="10" width="50" height="20" fill="#d83a2c"/>
            <rect x="55" y="6" width="30" height="24" fill="#fbf6e9"/>
            <rect x="88" y="14" width="20" height="16" fill="#bfe4ee"/>
            <circle cx="14" cy="34" r="4" fill="#fbf6e9"/>
            <circle cx="44" cy="34" r="4" fill="#fbf6e9"/>
            <circle cx="72" cy="34" r="4" fill="#fbf6e9"/>
            <circle cx="98" cy="34" r="4" fill="#fbf6e9"/>
            <path d="M58 6 L58 -2 L62 -2 L62 6" fill="#1a1a1a"/>
          </g>
        </svg>
      </div>
      {/* fox */}
      <div style={{position:'absolute', right: 16, bottom: 14}}>
        <svg width="70" height="80" viewBox="0 0 70 80">
          <g fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinejoin="round">
            <path d="M10 26 L20 14 L24 28 Z" fill="#d83a2c"/>
            <path d="M58 26 L48 14 L44 28 Z" fill="#d83a2c"/>
            <path d="M14 30 C 14 56, 24 70, 34 70 C 44 70, 54 56, 54 30 Z" fill="#e8702a"/>
            <path d="M22 44 C 26 40, 42 40, 46 44 C 44 54, 24 54, 22 44 Z" fill="#fbf6e9"/>
            <circle cx="24" cy="38" r="2" fill="#1a1a1a"/>
            <circle cx="44" cy="38" r="2" fill="#1a1a1a"/>
            <text x="14" y="14" fontFamily="Caveat" fontSize="12" fill="#1a1a1a">{live ? '✨ live!' : 'soon...'}</text>
          </g>
        </svg>
      </div>
    </div>
  );
}

function HomeVariantA({ tweaks }) {
  const live = false;
  return (
    <div className="browser">
      <div className="browser-bar">
        <div className="browser-dots"><span/><span/><span/></div>
        <div className="browser-url">festivkids.az<b>/</b></div>
        <span className="mono">Variant A · Hero</span>
      </div>
      <AppNav active="Home" tweaks={tweaks}/>
      <div style={{padding:24, display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:24}}>
        <div>
          <span className="mono">Welcome</span>
          <h2 className="fh" style={{fontSize:64, marginTop:6, lineHeight:0.95}}>
            <I18n en="Where winter" az="Qışın"/><br/>
            <span className="underline" style={{display:'inline-block', position:'relative'}}>
              <I18n en="meets wonder." az="möcüzəyə qovuşduğu yer."/>
              <span style={{position:'absolute', left:0, right:0, bottom:-6, height:8, background:'var(--marker)', clipPath:'polygon(0 50%, 4% 10%, 10% 80%, 18% 30%, 28% 70%, 36% 20%, 46% 80%, 56% 30%, 66% 70%, 76% 20%, 86% 80%, 94% 30%, 100% 60%, 100% 100%, 0 100%)'}}/>
            </span>
          </h2>
          <p className="scribble" style={{fontSize:16, maxWidth:520, marginTop:12}}>
            <I18n en="Family-friendly fairs across Baku — vendor houses, food, workshops and a 360° walk-through map. Two seasons, one wonderland."
                  az="Bakıda ailə dostu yarmarkalar — satıcı evləri, yemək, ustad-dərslər və 360° interaktiv xəritə."/>
          </p>
          <div className="row gap-8 mt-16">
            <span className="btn primary"><I18n en="Browse the map →" az="Xəritəyə bax →"/></span>
            <span className="btn"><I18n en="Apply as vendor" az="Satıcı kimi müraciət"/></span>
          </div>
          <div className="row gap-16 mt-24 wrap">
            <div className="panel" style={{flex:'1 1 280px'}}>
              <div className="row between center">
                <span className="mono">Next fair</span>
                <span className="chip" style={{background: live?'#cfe9c8':'var(--note)'}}>
                  <span className={'dot ' + (live?'live':'')}/> {live?'LIVE NOW':'UPCOMING'}
                </span>
              </div>
              <h3 className="fh mt-8" style={{fontSize:28}}>Winter Fair · Baku 2026</h3>
              <p className="mono">Dec 18 — Jan 6 · Yasamal Park</p>
              <div className="mt-12"><Countdown/></div>
              <div className="row between mt-12 center">
                <span className="scribble small">opens in 7 days</span>
                <span className="btn sm primary">view on map →</span>
              </div>
            </div>
            <div style={{flex:'0 0 220px'}}>
              <div className="ai-float">
                <div className="row between center">
                  <b>Foxie · ask anything</b>
                  <span className="mono">AI</span>
                </div>
                <div style={{borderTop:'1.5px dashed var(--rule)', margin:'6px 0'}}/>
                <div className="scribble small" style={{color:'var(--ink-soft)'}}>“Where are the workshops?”</div>
                <div className="scribble small mt-8">“Vendor B7 has 3 toy-making sessions on Sat.”</div>
                <div className="input mt-8" style={{padding:'4px 8px'}}>
                  <span>Ask…</span><span className="ph-bar"/><span className="mono">↵</span>
                </div>
              </div>
              <div className="annot" style={{marginTop:8, marginLeft:6}}>floats bottom-right on real page</div>
            </div>
          </div>
        </div>
        <div>
          <div className="frame tilt-r" style={{padding:0, overflow:'hidden'}}>
            <span className="frame-label">Hero scene</span>
            <span className="tape" style={{top:-6, left:'40%'}}/>
            <FoxieScene live={live}/>
          </div>
          <div className="mt-16">
            <span className="mono">Upcoming events</span>
            <div className="grid grid-2 mt-8" style={{gap:10}}>
              {['Winter · Dec 18','Spring · Apr 4','Summer night · Jun 7','Harvest · Sep 12'].map((s,i)=>(
                <div key={i} className="panel" style={{padding:10}}>
                  <div className="ph" style={{height:48, fontSize:9, marginBottom:6}}>banner image</div>
                  <div className="row between center">
                    <b className="scribble">{s}</b>
                    <span className="pill muted">soon</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HomeVariantB({ tweaks }) {
  return (
    <div className="browser">
      <div className="browser-bar">
        <div className="browser-dots"><span/><span/><span/></div>
        <div className="browser-url">festivkids.az<b>/</b></div>
        <span className="mono">Variant B · Editorial</span>
      </div>
      <AppNav active="Home" tweaks={tweaks}/>
      <div style={{padding:24}}>
        <div style={{display:'grid', gridTemplateColumns:'160px 1fr 200px', gap:24, alignItems:'end', borderBottom:'2px solid var(--ink)', paddingBottom:18}}>
          <div className="mono">ISSUE №07<br/>WINTER 2026<br/>BAKU · AZ/EN</div>
          <h2 className="fh" style={{fontSize:88, lineHeight:0.85, margin:0}}>
            <I18n en="The Fair," az="Yarmarka,"/>
            <br/>
            <i><I18n en="reimagined." az="yenidən."/></i>
          </h2>
          <div className="scribble small">
            <I18n
              en="A walkable city festival — vendors, food, workshops — mapped end-to-end."
              az="Gəzilən şəhər festivalı — satıcılar, yemək, dərslər — başdan-sona xəritələnmiş."
            />
          </div>
        </div>

        <div className="grid grid-3 mt-16" style={{gap:16}}>
          <div className="panel">
            <span className="mono">01 · Live status</span>
            <h3 className="fh mt-8">Winter Fair</h3>
            <p className="scribble small">Dec 18 → Jan 6 · Yasamal Park</p>
            <Countdown/>
            <span className="btn sm primary mt-12">Open the map →</span>
          </div>
          <div className="panel" style={{background:'var(--note)'}}>
            <span className="mono">02 · For vendors</span>
            <h3 className="fh mt-8">Apply for a house.</h3>
            <p className="scribble small">3 spots open in Hall B. Application takes ~5 min.</p>
            <span className="btn sm mt-12">Become a vendor</span>
          </div>
          <div className="panel" style={{background:'var(--note-blue)'}}>
            <span className="mono">03 · Foxie AI</span>
            <h3 className="fh mt-8">Ask Foxie anything.</h3>
            <p className="scribble small">Hours, vendors, panoramas, food allergens — Foxie knows.</p>
            <div className="input mt-12" style={{padding:'4px 8px'}}>
              <span>Type a question…</span><span className="ph-bar"/>
            </div>
          </div>
        </div>

        <div className="row between center mt-24">
          <span className="mono">Upcoming · 4 fairs</span>
          <span className="scribble small">scroll →</span>
        </div>
        <div className="grid grid-4 mt-8" style={{gap:12}}>
          {[
            {t:'Winter · Baku',d:'Dec 18 → Jan 6',tag:'live soon',c:'var(--note)'},
            {t:'Spring · Ganja',d:'Apr 4 → Apr 19',tag:'tickets',c:'var(--note-pink)'},
            {t:'Night Bazaar',d:'Jun 7 only',tag:'one-night',c:'var(--note-blue)'},
            {t:'Harvest Fair',d:'Sep 12 → 26',tag:'planning',c:'#e6e0cc'},
          ].map((e,i)=>(
            <div key={i} className="frame" style={{padding:12, transform:`rotate(${i%2?0.4:-0.3}deg)`}}>
              <div className="ph" style={{height:80, fontSize:10}}>banner</div>
              <h3 className="fh mt-8" style={{fontSize:22}}>{e.t}</h3>
              <div className="row between center mt-8">
                <span className="mono">{e.d}</span>
                <span className="chip" style={{background:e.c}}>{e.tag}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Home({ tweaks, setTweak }) {
  const v = tweaks?.homeVariant || 'A';
  return (
    <section className="tabpanel" data-tab="home" data-screen-label="01 Home" data-om-validate>
      <div className="page-head">
        <div>
          <p className="page-sub">01 · Public</p>
          <h1 className="page-title">Home <span className="underline">/</span></h1>
        </div>
        <div className="row gap-16 center">
          <div className="variants" role="tablist">
            <button aria-selected={v==='A'} onClick={()=>setTweak('homeVariant','A')}>A · Hero</button>
            <button aria-selected={v==='B'} onClick={()=>setTweak('homeVariant','B')}>B · Editorial</button>
          </div>
          <div className="page-meta">
            countdown · fox reacts to live<br/>
            ai chat · upcoming events grid
          </div>
        </div>
      </div>
      <div className="rule"></div>

      <div className="row gap-16 wrap mb-16" style={{marginBottom:16}}>
        <div className="sticky" style={{maxWidth:280}}>
          <div className="pin"></div>
          <b>Hierarchy.</b> Live status &gt; countdown &gt; primary CTA (Map). Vendor CTA secondary; AI tertiary &amp; floating.
        </div>
        <div className="sticky pink" style={{transform:'rotate(1deg)', maxWidth:280}}>
          <div className="pin"></div>
          <b>Foxie.</b> Mascot reacts to live/upcoming/empty. Replace with Spring fox in spring season.
        </div>
        <div className="sticky blue" style={{transform:'rotate(-1deg)', maxWidth:280}}>
          <div className="pin"></div>
          <b>Empty state.</b> If no upcoming fair, hero collapses to "no fair scheduled · sign up for updates".
        </div>
      </div>

      {v==='A' ? <HomeVariantA tweaks={tweaks}/> : <HomeVariantB tweaks={tweaks}/>}
    </section>
  );
}

window.WFScreens.Home = Home;
window.WFAppNav = AppNav;
