// Overview tab — index card of all the screens, with click-throughs.
window.WFScreens = window.WFScreens || {};

function ScreenCard({ id, num, title, sub, onOpen, accent, children }) {
  return (
    <div className="frame" style={{cursor:'pointer'}} onClick={() => onOpen(id)}>
      <span className="frame-label">{num} · {title}</span>
      {accent && <span className="frame-tag">{accent}</span>}
      <div style={{aspectRatio:'4/3', marginTop: 8, position:'relative', overflow:'hidden', borderRadius: 8, border:'2px solid var(--ink)', background:'#fdfaf0'}}>
        {children}
      </div>
      <p className="scribble" style={{marginTop: 10, marginBottom: 4}}>{sub}</p>
      <div className="row between center">
        <span className="mono">tap to open →</span>
        <span className="btn sm">view</span>
      </div>
    </div>
  );
}

function MiniHome() {
  return (
    <div style={{padding:10, height:'100%'}}>
      <div style={{display:'flex', gap:6, marginBottom:8}}>
        <div style={{width:20, height:6, background:'var(--ink)', borderRadius:3}}/>
        <div style={{width:30, height:6, background:'var(--rule)', borderRadius:3}}/>
        <div style={{width:30, height:6, background:'var(--rule)', borderRadius:3}}/>
        <div style={{width:30, height:6, background:'var(--rule)', borderRadius:3}}/>
        <div style={{flex:1}}/>
        <div style={{width:14, height:14, borderRadius:'50%', background:'var(--note-blue)', border:'1.5px solid var(--ink)'}}/>
      </div>
      <div style={{height:'62%', border:'2px dashed var(--ink)', borderRadius:6, padding:10, background:'rgba(255,255,255,0.5)'}}>
        <div style={{font:'700 16px Caveat'}}>Winter Fair is LIVE</div>
        <div className="mono">Hero · countdown · CTAs</div>
        <div style={{display:'flex', gap:4, marginTop:8}}>
          <div className="count" style={{transform:'scale(0.6)', transformOrigin:'left top'}}>
            <div className="d">07<small>D</small></div>
            <div className="d">12<small>H</small></div>
            <div className="d">44<small>M</small></div>
          </div>
        </div>
      </div>
      <div style={{display:'flex', gap:6, marginTop:8}}>
        <div style={{flex:1, height:30, border:'1.5px solid var(--ink)', borderRadius:4, background:'var(--note)'}}/>
        <div style={{flex:1, height:30, border:'1.5px solid var(--ink)', borderRadius:4, background:'var(--note-pink)'}}/>
        <div style={{flex:1, height:30, border:'1.5px solid var(--ink)', borderRadius:4, background:'var(--note-blue)'}}/>
      </div>
    </div>
  );
}

function MiniMap() {
  return (
    <div style={{display:'grid', gridTemplateColumns:'40% 1fr', height:'100%'}}>
      <div style={{borderRight:'2px dashed var(--rule)', padding:10}}>
        <div className="mono">filters</div>
        <div style={{height:8, background:'var(--rule)', margin:'8px 0', borderRadius:3}}/>
        <div style={{height:8, background:'var(--rule)', margin:'8px 0', width:'70%', borderRadius:3}}/>
        <div style={{height:8, background:'var(--rule)', margin:'8px 0', width:'40%', borderRadius:3}}/>
        <div className="mono mt-12">vendors · 24</div>
        {[1,2,3].map(i => (
          <div key={i} style={{borderBottom:'1.5px dashed var(--rule)', padding:'6px 0', fontSize:12}}>
            <div style={{height:6, background:'var(--ink)', width:'70%'}}/>
            <div style={{height:5, background:'var(--rule)', width:'45%', marginTop:3}}/>
          </div>
        ))}
      </div>
      <div className="map-ph" style={{borderRadius:0, border:0, position:'relative'}}>
        <span className="map-pin" style={{top:'30%', left:'25%'}}><span>1</span></span>
        <span className="map-pin sel" style={{top:'45%', left:'55%'}}><span>2</span></span>
        <span className="map-pin fac" style={{top:'65%', left:'40%'}}><span>F</span></span>
        <span className="map-pin" style={{top:'25%', left:'70%'}}><span>3</span></span>
      </div>
    </div>
  );
}

function MiniAbout() {
  return (
    <div style={{padding:10, height:'100%'}}>
      <div style={{font:'700 18px Caveat'}}>About FestivKids</div>
      <div style={{height:6, background:'var(--rule)', marginTop:6, borderRadius:3}}/>
      <div style={{height:6, background:'var(--rule)', marginTop:4, borderRadius:3, width:'80%'}}/>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginTop:10}}>
        <div className="ph" style={{height:48, fontSize:9}}>banner</div>
        <div className="ph" style={{height:48, fontSize:9}}>banner</div>
      </div>
      <div className="mono mt-12">past events · team · contact</div>
    </div>
  );
}

function MiniAuth() {
  return (
    <div style={{padding:10, height:'100%', display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div className="auth-card" style={{width:'80%'}}>
        <div className="mono">log in</div>
        <div className="field">email</div>
        <div className="field">password</div>
        <div style={{display:'flex', gap:6, marginTop:8}}>
          <span className="btn sm primary" style={{flex:1, justifyContent:'center'}}>enter</span>
          <span className="btn sm" style={{flex:1, justifyContent:'center'}}>google</span>
        </div>
      </div>
    </div>
  );
}

function MiniDash({ rows }) {
  return (
    <div style={{padding:10, height:'100%'}}>
      <div className="mono">{rows[0]}</div>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginTop:6}}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{border:'1.5px solid var(--ink)', borderRadius:6, padding:6, background:'#fff'}}>
            <div style={{height:6, background:'var(--ink)', width:'60%'}}/>
            <div style={{height:5, background:'var(--rule)', width:'80%', marginTop:4}}/>
          </div>
        ))}
      </div>
      <div className="mono mt-12">{rows[1]}</div>
    </div>
  );
}

function Overview({ setTab }) {
  return (
    <section className="tabpanel" data-tab="overview" data-active="true" data-screen-label="00 Overview" data-om-validate>
      <div className="page-head">
        <div>
          <p className="page-sub">FestivKids · Fair Marketplace</p>
          <h1 className="page-title">Wireframes <span className="underline">Overview</span></h1>
        </div>
        <div className="page-meta">
          ROUND 1 · LO-FI<br/>
          <b>9 surfaces</b> · 2 home + 2 map variants<br/>
          tweaks: season · lang · density
        </div>
      </div>
      <div className="rule"></div>

      <div className="row gap-16 wrap" style={{marginBottom:16}}>
        <div className="sticky" style={{maxWidth:280}}>
          <div className="pin"></div>
          <b>What this is.</b> Lo-fi structure for the
          three audiences — Visitor, Vendor, Admin — plus public, map and auth.
          Decisions to be made before pixels.
        </div>
        <div className="sticky pink" style={{transform:'rotate(1.5deg)', maxWidth:280}}>
          <div className="pin"></div>
          <b>Read me.</b> Each tab has 1–2 layout takes.
          Toggle <kbd>Tweaks</kbd> (toolbar) to flip season,
          language, density, and variant selectors.
        </div>
        <div className="sticky blue" style={{transform:'rotate(-2deg)', maxWidth:280}}>
          <div className="pin"></div>
          <b>Open questions.</b> Friends/social — peer or
          private? AI scope (home only?). i18n parity for
          long AZ strings. Map mobile pattern.
        </div>
      </div>

      <div className="grid grid-3" style={{gap:18}}>
        <ScreenCard num="01" id="home" title="Home" accent="2 variants" onOpen={setTab}
          sub="Hero, live/upcoming countdown, fair cards, AI chat, Foxie reacts to fair status."><MiniHome/></ScreenCard>
        <ScreenCard num="02" id="about" title="About" onOpen={setTab}
          sub="CMS sections (mission · team · contact), past events, bilingual."><MiniAbout/></ScreenCard>
        <ScreenCard num="03" id="map" title="Map" accent="2 variants · core" onOpen={setTab}
          sub="Split list+map, filters, fair selector, 360°, geocoder, friends layer."><MiniMap/></ScreenCard>
        <ScreenCard num="04" id="auth" title="Auth" onOpen={setTab}
          sub="Login · OAuth · select role · invite · forced password change."><MiniAuth/></ScreenCard>
        <ScreenCard num="05" id="visitor" title="Visitor profile" onOpen={setTab}
          sub="Account, language, become-a-vendor upgrade flow."><MiniDash rows={['profile · upgrade','language preference']}/></ScreenCard>
        <ScreenCard num="06" id="vendor" title="Vendor dashboard" onOpen={setTab}
          sub="Bookings, applications, company profile with logo + gallery."><MiniDash rows={['bookings · 3 active','applications · 2 pending']}/></ScreenCard>
        <ScreenCard num="07" id="admin" title="Admin" accent="6 sub-routes" onOpen={setTab}
          sub="Users, fairs, applications, about CMS, map CMS, audit logs."><MiniDash rows={['users · fairs · apps','about · map · logs']}/></ScreenCard>
        <ScreenCard num="08" id="states" title="States &amp; mobile" onOpen={setTab}
          sub="Empty, error, loading, 404, mobile map and nav."><MiniDash rows={['empty · error · 404','mobile patterns']}/></ScreenCard>
      </div>

      <div className="legend-bar">
        <div className="legend">
          <span><span className="sw" style={{background:'var(--marker)'}}></span> primary action / focus</span>
          <span><span className="sw" style={{background:'var(--note)'}}></span> note / annotation</span>
          <span><span className="sw" style={{background:'var(--note-blue)'}}></span> auth-only / friends</span>
          <span><span className="sw" style={{background:'var(--highlight)'}}></span> selected state</span>
        </div>
        <span>FestivKids · wires v0.1 · {new Date().toISOString().slice(0,10)}</span>
      </div>
    </section>
  );
}

window.WFScreens.Overview = Overview;
