// States, errors, mobile patterns, 404
window.WFScreens = window.WFScreens || {};

function States({ tweaks }) {
  return (
    <section className="tabpanel" data-tab="states" data-screen-label="08 States and mobile" data-om-validate>
      <div className="page-head">
        <div>
          <p className="page-sub">08 · States &amp; mobile</p>
          <h1 className="page-title">States, <span className="underline">errors &amp; mobile</span></h1>
        </div>
        <div className="page-meta">empty · loading · error · 404 · mobile nav · mobile map</div>
      </div>
      <div className="rule"></div>

      <div className="grid grid-3" style={{gap:16}}>
        <div className="frame">
          <span className="frame-label">Empty · no upcoming fair</span>
          <div className="ph mt-8" style={{height:100, fontSize:10}}>fox napping illustration</div>
          <h3 className="fh mt-8">No fair scheduled.</h3>
          <p className="scribble small">We're planning the next one. Drop your email and we'll let you know.</p>
          <div className="input mt-8"><span>email…</span><span className="ph-bar"/></div>
          <span className="btn sm primary mt-8">Notify me</span>
        </div>
        <div className="frame">
          <span className="frame-label">Loading · skeleton</span>
          <div className="col gap-8 mt-8">
            <div style={{height:24, background:'var(--rule)', borderRadius:4}}/>
            <div style={{height:14, background:'var(--rule-soft)', borderRadius:4, width:'70%'}}/>
            <div style={{height:14, background:'var(--rule-soft)', borderRadius:4, width:'85%'}}/>
            <div style={{height:120, background:'var(--rule-soft)', borderRadius:4}}/>
          </div>
        </div>
        <div className="frame" style={{background:'var(--marker-soft)'}}>
          <span className="frame-label">Error · API down</span>
          <h3 className="fh mt-8">Foxie can't reach the server.</h3>
          <p className="scribble small">We'll keep trying. If it persists, check status.festivkids.az.</p>
          <div className="row gap-6 mt-8">
            <span className="btn sm primary">Retry</span>
            <span className="btn sm">Status page</span>
          </div>
        </div>

        <div className="frame">
          <span className="frame-label">404</span>
          <div className="ph mt-8" style={{height:100, fontSize:10}}>fox holding a "?" sign</div>
          <h3 className="fh mt-8">Lost in the snow.</h3>
          <p className="scribble small">This page doesn't exist (or melted away).</p>
          <span className="btn sm primary mt-8">Back to home</span>
        </div>

        <div className="frame">
          <span className="frame-label">Cookie / location prompt</span>
          <p className="scribble small mt-8"><b>Share your location?</b> Friends will see where you are during the fair. You can turn this off anytime.</p>
          <div className="row gap-6 mt-8">
            <span className="btn sm primary">Share</span>
            <span className="btn sm">Not now</span>
          </div>
        </div>

        <div className="frame">
          <span className="frame-label">OAuth error banner</span>
          <div className="panel" style={{background:'var(--marker-soft)', borderColor:'var(--ink)'}}>
            <b className="scribble">Account deactivated.</b>
            <p className="scribble small">Contact an admin or try a different account.</p>
          </div>
        </div>
      </div>

      {/* Mobile patterns */}
      <div className="row between center mt-24">
        <span className="mono">Mobile patterns</span>
        <span className="scribble small">375 px</span>
      </div>
      <div className="row gap-16 wrap mt-8">
        {/* Phone home */}
        <div style={{width:280, border:'2.5px solid var(--ink)', borderRadius:30, padding:10, background:'#fbf6e9', boxShadow:'4px 4px 0 var(--ink)'}}>
          <div style={{height:14, background:'var(--ink)', borderRadius:8, margin:'0 auto 8px', width:80}}/>
          <div style={{borderRadius:18, overflow:'hidden', border:'2px solid var(--ink)'}}>
            <div style={{padding:8, background:'var(--paper)', borderBottom:'2px solid var(--ink)', display:'flex', alignItems:'center', gap:6}}>
              <div style={{width:22, height:22, borderRadius:6, background:'var(--marker)', border:'1.5px solid var(--ink)'}}/>
              <b className="scribble">FestivKids</b>
              <div style={{flex:1}}/>
              <div style={{width:24, height:18, border:'1.5px solid var(--ink)'}}/>
            </div>
            <div style={{padding:10}}>
              <span className="mono">Live</span>
              <h3 className="fh" style={{fontSize:22, margin:'4px 0'}}>Winter Fair</h3>
              <Countdown7Mobile/>
              <div className="row gap-6 mt-8">
                <span className="btn sm primary" style={{flex:1, justifyContent:'center'}}>Map</span>
                <span className="btn sm" style={{flex:1, justifyContent:'center'}}>Apply</span>
              </div>
              <div className="ph mt-8" style={{height:80, fontSize:9}}>fox + train</div>
            </div>
            <div style={{borderTop:'2px solid var(--ink)', display:'flex', justifyContent:'space-around', padding:'6px 0', background:'var(--paper-2)'}}>
              <span className="mono">Home</span><span className="mono" style={{color:'var(--marker)'}}>Map</span><span className="mono">About</span><span className="mono">Me</span>
            </div>
          </div>
        </div>

        {/* Phone map */}
        <div style={{width:280, border:'2.5px solid var(--ink)', borderRadius:30, padding:10, background:'#fbf6e9', boxShadow:'4px 4px 0 var(--ink)'}}>
          <div style={{height:14, background:'var(--ink)', borderRadius:8, margin:'0 auto 8px', width:80}}/>
          <div style={{borderRadius:18, overflow:'hidden', border:'2px solid var(--ink)', position:'relative', height:480}}>
            <div className="map-ph" style={{position:'absolute', inset:0, borderRadius:0, border:0}}>
              <span className="map-pin" style={{top:'25%', left:'25%'}}><span>1</span></span>
              <span className="map-pin sel" style={{top:'45%', left:'50%'}}><span>2</span></span>
              <span className="map-pin fac" style={{top:'70%', left:'30%'}}><span>F</span></span>
            </div>
            <div style={{position:'absolute', top:8, left:8, right:8}}>
              <div className="input" style={{background:'#fff'}}><span className="mono">⌕</span><span>Search</span><span className="ph-bar"/></div>
            </div>
            <div style={{position:'absolute', bottom:0, left:0, right:0, background:'#fff', borderTop:'2px solid var(--ink)', padding:10}}>
              <div style={{width:40, height:4, background:'var(--rule)', margin:'0 auto 8px', borderRadius:2}}/>
              <b className="scribble">Foxie Café · B-12</b>
              <div className="mono">Food · open</div>
              <div className="row gap-6 mt-8">
                <span className="btn sm primary" style={{flex:1, justifyContent:'center'}}>360°</span>
                <span className="btn sm" style={{flex:1, justifyContent:'center'}}>Route</span>
              </div>
            </div>
          </div>
        </div>

        {/* Phone vendor app */}
        <div style={{width:280, border:'2.5px solid var(--ink)', borderRadius:30, padding:10, background:'#fbf6e9', boxShadow:'4px 4px 0 var(--ink)'}}>
          <div style={{height:14, background:'var(--ink)', borderRadius:8, margin:'0 auto 8px', width:80}}/>
          <div style={{borderRadius:18, overflow:'hidden', border:'2px solid var(--ink)'}}>
            <div style={{padding:10, borderBottom:'2px solid var(--ink)'}}>
              <div className="mono">Vendor</div>
              <h3 className="fh">Foxie Café</h3>
            </div>
            <div style={{padding:10}}>
              <div className="grid grid-2" style={{gap:8}}>
                {[
                  {l:'Bookings',n:3,c:'var(--note-blue)'},
                  {l:'Pending',n:2,c:'var(--note)'},
                  {l:'Profile',n:'',c:'#fff'},
                  {l:'New app',n:'',c:'var(--note-pink)'},
                ].map((c,i)=>(
                  <div key={i} className="frame" style={{padding:10, background:c.c}}>
                    <span className="mono">{c.l}</span>
                    {c.n!=='' && <h3 className="fh" style={{fontSize:24}}>{c.n}</h3>}
                    <span className="btn sm mt-8">Open →</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{borderTop:'2px solid var(--ink)', display:'flex', justifyContent:'space-around', padding:'6px 0', background:'var(--paper-2)'}}>
              <span className="mono" style={{color:'var(--marker)'}}>Home</span><span className="mono">Book</span><span className="mono">Apply</span><span className="mono">Me</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hamburger nav */}
      <div className="mt-24">
        <span className="mono">Mobile · hamburger drawer</span>
        <div className="frame mt-8" style={{padding:14, maxWidth:300}}>
          <div className="row between center">
            <b className="scribble">Menu</b>
            <span className="btn sm">✕</span>
          </div>
          <div style={{borderTop:'2px dashed var(--rule)', margin:'10px 0'}}/>
          <div className="col gap-8">
            {['Home','Map','About','Login','Apply as vendor','Language: EN ▾'].map((s,i)=>(
              <div key={i} className="row between center" style={{padding:'6px 0'}}>
                <span className="scribble strong">{s}</span>
                <span className="mono">›</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Countdown7Mobile() {
  return (
    <div style={{display:'flex', gap:4}}>
      {[['07','D'],['12','H'],['44','M']].map(([n,l],i)=>(
        <div key={i} style={{flex:1, border:'1.5px solid var(--ink)', borderRadius:6, padding:'4px 0', textAlign:'center', background:'#fff', boxShadow:'1.5px 1.5px 0 var(--ink)'}}>
          <div style={{font:'700 16px JetBrains Mono'}}>{n}</div>
          <div className="mono" style={{fontSize:9}}>{l}</div>
        </div>
      ))}
    </div>
  );
}

window.WFScreens.States = States;
