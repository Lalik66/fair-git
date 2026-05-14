// Map — two variants: A split list+map, B map-first w/ floating panels.
window.WFScreens = window.WFScreens || {};

function MapPins({ variant='A' }) {
  return (
    <>
      <span className="map-pin" style={{top:'25%', left:'18%'}}><span>1</span></span>
      <span className="map-pin" style={{top:'30%', left:'34%'}}><span>2</span></span>
      <span className="map-pin sel" style={{top:'42%', left:'48%'}}><span>3</span></span>
      <span className="map-pin" style={{top:'55%', left:'62%'}}><span>4</span></span>
      <span className="map-pin fac" style={{top:'68%', left:'30%'}}><span>F</span></span>
      <span className="map-pin fac" style={{top:'40%', left:'72%'}}><span>F</span></span>
      <span className="map-pin" style={{top:'62%', left:'78%'}}><span>5</span></span>
      <span className="map-pin" style={{top:'20%', left:'58%'}}><span>6</span></span>
      {/* friend dots */}
      <span style={{position:'absolute', top:'48%', left:'40%', width:14, height:14, borderRadius:'50%', background:'var(--note-blue)', border:'2px solid var(--ink)'}}/>
      <span style={{position:'absolute', top:'52%', left:'58%', width:14, height:14, borderRadius:'50%', background:'#ffd', border:'2px solid var(--ink)'}}/>
      {/* route dashed */}
      <svg style={{position:'absolute', inset:0, pointerEvents:'none'}} viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M 40 48 Q 46 40, 48 42 T 58 52" stroke="#d83a2c" strokeWidth="0.6" strokeDasharray="1.2 1" fill="none"/>
      </svg>
    </>
  );
}

function MapVariantA({ tweaks }) {
  const AppNav = window.WFAppNav;
  return (
    <div className="browser">
      <div className="browser-bar">
        <div className="browser-dots"><span/><span/><span/></div>
        <div className="browser-url">festivkids.az<b>/map</b>?fair=winter-2026&amp;sel=H-3</div>
        <span className="mono">Variant A · Split panel</span>
      </div>
      <AppNav active="Map" tweaks={tweaks}/>
      <div style={{display:'grid', gridTemplateColumns:'380px 1fr 280px', height:680}}>
        {/* Sidebar list */}
        <aside style={{borderRight:'2px solid var(--ink)', padding:14, overflow:'hidden', display:'flex', flexDirection:'column'}}>
          <div className="row between center">
            <span className="mono">Fair</span>
            <span className="chip on">Winter · Baku 2026 ▾</span>
          </div>
          <div className="scribble small" style={{color:'var(--ink-soft)'}}>Dec 18 → Jan 6 · Yasamal Park</div>

          <div className="input mt-12">
            <span className="mono">⌕</span>
            <span>Search vendors, facilities…</span>
            <span className="ph-bar"/>
          </div>

          <div className="row gap-6 mt-12 wrap">
            <span className="chip on">Vendors</span>
            <span className="chip">Facilities</span>
            <span className="chip">Toys</span>
            <span className="chip">Food</span>
            <span className="chip">Crafts</span>
            <span className="chip">Workshops</span>
          </div>
          <div className="row between mt-8 center">
            <span className="mono">24 results</span>
            <span className="scribble small">sort: nearest ▾</span>
          </div>

          <div style={{flex:1, overflow:'auto', marginTop:8, borderTop:'2px dashed var(--rule)'}}>
            {[
              {n:'1 · Bake & Co',c:'Food · pastry',s:'open'},
              {n:'2 · LunaToys',c:'Toys',s:'busy'},
              {n:'3 · Foxie Café',c:'Food',s:'open',sel:true},
              {n:'4 · Yarn Yard',c:'Crafts',s:'open'},
              {n:'F · Restrooms B',c:'Facility',s:''},
              {n:'5 · Snowy Mtn',c:'Workshops',s:'soon'},
            ].map((v,i)=>(
              <div key={i} className="row gap-8 center" style={{padding:'10px 4px', borderBottom:'1.5px dashed var(--rule)', background: v.sel?'rgba(247,226,107,0.5)':'transparent'}}>
                <div style={{width:34, height:34, borderRadius:6, border:'1.5px solid var(--ink)', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'JetBrains Mono', fontSize:11}}>{v.n.split(' ')[0]}</div>
                <div style={{flex:1}}>
                  <div className="scribble strong">{v.n}</div>
                  <div className="mono">{v.c}</div>
                </div>
                {v.s && <span className={'pill ' + (v.s==='open'?'ok':v.s==='busy'?'warn':'muted')}>{v.s}</span>}
              </div>
            ))}
          </div>
        </aside>

        {/* Map canvas */}
        <div style={{position:'relative'}}>
          <div className="map-ph" style={{position:'absolute', inset:0, borderRadius:0, border:0}}>
            <MapPins/>
          </div>
          {/* geocoder */}
          <div style={{position:'absolute', top:14, left:14, right:140}}>
            <div className="input" style={{boxShadow:'2px 2px 0 var(--ink)', background:'#fff'}}>
              <span className="mono">geocoder</span>
              <span>Search a place — “Foxie Café”</span>
              <span className="ph-bar"/>
            </div>
          </div>
          {/* zoom */}
          <div style={{position:'absolute', top:14, right:14, display:'flex', flexDirection:'column', gap:4}}>
            <span className="btn sm" style={{background:'#fff', justifyContent:'center', width:34}}>+</span>
            <span className="btn sm" style={{background:'#fff', justifyContent:'center', width:34}}>−</span>
            <span className="btn sm" style={{background:'#fff', justifyContent:'center', width:34}}>⌖</span>
          </div>
          {/* selected card */}
          <div style={{position:'absolute', bottom:14, left:14, right:14}}>
            <div className="frame" style={{padding:0, background:'#fff'}}>
              <span className="frame-label">House #3 · Foxie Café</span>
              <span className="frame-tag">selected</span>
              <div style={{display:'grid', gridTemplateColumns:'200px 1fr auto', gap:14, padding:14, alignItems:'center'}}>
                <div className="ph" style={{height:120, borderRadius:6}}>360° panorama<br/>(demo fallback)</div>
                <div>
                  <div className="row between center">
                    <h3 className="fh" style={{fontSize:24}}>Foxie Café · B-12</h3>
                    <span className="pill warn">demo panorama</span>
                  </div>
                  <p className="mono">Food · pastries, hot chocolate · open 10–22</p>
                  <p className="scribble small mt-8">A cozy corner near the train. Try the cinnamon stars.</p>
                </div>
                <div className="col gap-6">
                  <span className="btn primary sm">Open 360°</span>
                  <span className="btn sm">Route here</span>
                  <span className="btn ghost sm">Share link</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Friends sidebar */}
        <aside style={{borderLeft:'2px solid var(--ink)', padding:14, background:'rgba(255,255,255,0.4)'}}>
          <div className="row between center">
            <span className="mono">Friends</span>
            <span className="btn sm">+ invite</span>
          </div>
          <div className="scribble small">3 nearby · 1 unread</div>
          {[
            {n:'Aytan',d:'120 m',m:2,e:'❄️'},
            {n:'Murad',d:'310 m',m:0,e:'🦊'},
            {n:'Leyla',d:'450 m',m:1,e:'🍪'},
          ].map((f,i)=>(
            <div key={i} className="row gap-8 center" style={{padding:'10px 0', borderBottom:'1.5px dashed var(--rule)'}}>
              <div style={{width:30, height:30, borderRadius:'50%', border:'1.5px solid var(--ink)', background:'var(--note-blue)', display:'flex', alignItems:'center', justifyContent:'center'}}>{f.e}</div>
              <div style={{flex:1}}>
                <div className="scribble strong">{f.n}</div>
                <div className="mono">{f.d} away</div>
              </div>
              {f.m>0 && <span className="pill bad">{f.m}</span>}
            </div>
          ))}

          <div className="frame mt-16" style={{padding:10, background:'var(--note-blue)'}}>
            <span className="frame-label">Routing</span>
            <p className="scribble small mt-8"><b>To Murad</b> · 310 m · 4 min</p>
            <ol className="scribble small" style={{paddingLeft:18, margin:'6px 0'}}>
              <li>Past Bake &amp; Co (1)</li>
              <li>Right at fountain</li>
              <li>Arrive · Hall B</li>
            </ol>
          </div>

          <div className="frame mt-16" style={{padding:10}}>
            <span className="frame-label">React</span>
            <div className="row wrap gap-6 mt-8">
              {['❤','🔥','❄','🦊','✨','🍪'].map((e,i)=>
                <span key={i} className="chip">{e}</span>
              )}
            </div>
            <div className="mono mt-8">live via websocket</div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function MapVariantB({ tweaks }) {
  const AppNav = window.WFAppNav;
  return (
    <div className="browser">
      <div className="browser-bar">
        <div className="browser-dots"><span/><span/><span/></div>
        <div className="browser-url">festivkids.az<b>/map</b></div>
        <span className="mono">Variant B · Map-first / floating</span>
      </div>
      <AppNav active="Map" tweaks={tweaks}/>
      <div style={{position:'relative', height:680}}>
        <div className="map-ph" style={{position:'absolute', inset:0, borderRadius:0, border:0}}>
          <MapPins/>
        </div>

        {/* Top floating bar */}
        <div style={{position:'absolute', top:14, left:14, right:14, display:'flex', gap:10}}>
          <div className="frame" style={{padding:'8px 12px', background:'#fff', display:'flex', alignItems:'center', gap:10}}>
            <span className="mono">FAIR</span>
            <span className="chip on">Winter Baku ’26 ▾</span>
            <span className="scribble small">all fairs · upcoming · past</span>
          </div>
          <div className="frame" style={{padding:'8px 12px', background:'#fff', flex:1, display:'flex', alignItems:'center', gap:10}}>
            <span className="mono">⌕</span>
            <span className="scribble small">Search vendors, facilities, products…</span>
            <div className="ph-bar" style={{flex:1}}/>
          </div>
          <div className="frame" style={{padding:'6px 8px', background:'#fff'}}>
            <span className="btn sm">Friends</span>
          </div>
        </div>

        {/* Filters chip rail */}
        <div style={{position:'absolute', top:80, left:14, right:14, display:'flex', gap:6, flexWrap:'wrap'}}>
          {['Vendors','Facilities','Toys','Food','Crafts','Workshops','Open now','My list'].map((c,i)=>(
            <span key={i} className={'chip '+(i<2?'on':'')} style={{background: i<2?'var(--ink)':'#fff', color: i<2?'var(--paper)':'var(--ink)'}}>{c}</span>
          ))}
        </div>

        {/* Bottom drawer (peek) */}
        <div style={{position:'absolute', bottom:0, left:0, right:0}}>
          <div style={{borderTop:'2px solid var(--ink)', background:'#fff', padding:14, boxShadow:'0 -10px 24px -12px rgba(0,0,0,0.2)'}}>
            <div className="row between center">
              <span className="mono">24 places · scroll for more</span>
              <span className="scribble small">drag ↑ to expand</span>
            </div>
            <div className="row gap-12 mt-8" style={{overflow:'hidden'}}>
              {[
                {n:'Foxie Café',c:'Food',sel:true},
                {n:'LunaToys',c:'Toys'},
                {n:'Yarn Yard',c:'Crafts'},
                {n:'Snowy Mtn',c:'Workshops'},
                {n:'Bake & Co',c:'Food'},
              ].map((v,i)=>(
                <div key={i} className="frame" style={{padding:10, minWidth:180, transform:`rotate(${i%2?0.4:-0.3}deg)`, background: v.sel?'var(--note)':'#fff'}}>
                  <div className="ph" style={{height:60, fontSize:9}}>photo</div>
                  <div className="row between center mt-8">
                    <b className="scribble">{v.n}</b>
                    <span className="pill ok">open</span>
                  </div>
                  <div className="mono">{v.c}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Floating selected detail */}
        <div style={{position:'absolute', top:140, right:14, width:300}}>
          <div className="frame" style={{background:'#fff'}}>
            <span className="frame-label">House #3</span>
            <span className="frame-tag">selected</span>
            <div className="ph" style={{height:140, marginTop:8}}>360° preview</div>
            <h3 className="fh mt-8">Foxie Café · B-12</h3>
            <p className="mono">Food · open 10–22</p>
            <div className="row gap-6 mt-8">
              <span className="btn sm primary">360°</span>
              <span className="btn sm">Route</span>
              <span className="btn sm ghost">Share</span>
            </div>
          </div>
        </div>

        {/* Zoom */}
        <div style={{position:'absolute', top:140, left:14, display:'flex', flexDirection:'column', gap:4}}>
          <span className="btn sm" style={{background:'#fff', justifyContent:'center', width:34}}>+</span>
          <span className="btn sm" style={{background:'#fff', justifyContent:'center', width:34}}>−</span>
          <span className="btn sm" style={{background:'#fff', justifyContent:'center', width:34}}>⌖</span>
        </div>
      </div>
    </div>
  );
}

function MapScreen({ tweaks, setTweak }) {
  const v = tweaks?.mapVariant || 'A';
  return (
    <section className="tabpanel" data-tab="map" data-screen-label="03 Map" data-om-validate>
      <div className="page-head">
        <div>
          <p className="page-sub">03 · Core product</p>
          <h1 className="page-title">Map <span className="underline">/map</span></h1>
        </div>
        <div className="row gap-16 center">
          <div className="variants" role="tablist">
            <button aria-selected={v==='A'} onClick={()=>setTweak('mapVariant','A')}>A · Split</button>
            <button aria-selected={v==='B'} onClick={()=>setTweak('mapVariant','B')}>B · Map-first</button>
          </div>
          <div className="page-meta">
            mapbox · 360° viewer · friends layer<br/>
            geocoder · routing · deep-link
          </div>
        </div>
      </div>
      <div className="rule"></div>

      <div className="row gap-16 wrap" style={{marginBottom:16}}>
        <div className="sticky" style={{maxWidth:280}}>
          <div className="pin"></div>
          <b>A vs B.</b> A has a fixed list — better for browsing. B foregrounds the map — better for in-fair use on tablet/mobile.
        </div>
        <div className="sticky pink" style={{maxWidth:280, transform:'rotate(1deg)'}}>
          <div className="pin"></div>
          <b>Friends layer.</b> Auth-only. Always opt-in for location. Shows last-seen + reactions; messages open inline.
        </div>
        <div className="sticky blue" style={{maxWidth:280, transform:'rotate(-1deg)'}}>
          <div className="pin"></div>
          <b>360°.</b> Photo Sphere viewer modal. If a house has no panorama, show "demo" fallback w/ stamped pill.
        </div>
      </div>

      {v==='A' ? <MapVariantA tweaks={tweaks}/> : <MapVariantB tweaks={tweaks}/>}

      {/* 360 modal preview block */}
      <div style={{marginTop:24}}>
        <span className="mono">Modal · 360° viewer</span>
        <div className="frame mt-8" style={{padding:0}}>
          <div style={{display:'grid', gridTemplateColumns:'1fr 240px'}}>
            <div className="ph" style={{height:300, borderRadius:0, border:0, borderRight:'2px solid var(--ink)'}}>
              360° photo · drag to look around · Photo Sphere Viewer
            </div>
            <div style={{padding:14}}>
              <span className="mono">House info</span>
              <h3 className="fh mt-8">Foxie Café · B-12</h3>
              <p className="scribble small">Food · pastries, hot chocolate</p>
              <div className="row gap-6 mt-8">
                <span className="btn sm primary">Apply for B-12</span>
                <span className="btn sm">Close</span>
              </div>
              <div className="annot mt-16">vendor-only CTA hidden when not logged in</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
window.WFScreens.Map = MapScreen;
