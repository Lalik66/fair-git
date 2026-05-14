// Visitor profile + Vendor dashboard
window.WFScreens = window.WFScreens || {};

function RoleSidebar({ role='vendor', active='Dashboard' }) {
  const items = role==='vendor'
    ? [['Dashboard','/vendor'],['Bookings','/vendor/bookings'],['Applications','/vendor/applications'],['Profile','/vendor/profile']]
    : [['Profile','/profile']];
  return (
    <aside style={{width:220, borderRight:'2px solid var(--ink)', padding:14, background:'rgba(255,255,255,0.4)'}}>
      <div className="row gap-8 center">
        <div style={{width:36, height:36, borderRadius:8, border:'2px solid var(--ink)', background:'var(--note-pink)'}}/>
        <div>
          <div className="scribble strong">Foxie Café</div>
          <div className="mono">{role}</div>
        </div>
      </div>
      <div style={{borderTop:'2px dashed var(--rule)', margin:'12px 0'}}/>
      <div className="col gap-6">
        {items.map(([n,p])=>(
          <div key={n} className="row between center" style={{padding:'6px 8px', borderRadius:6, background: n===active?'var(--ink)':'transparent', color: n===active?'var(--paper)':'var(--ink)'}}>
            <span className="scribble strong">{n}</span>
            <span className="mono" style={{color:'inherit', opacity:0.7}}>{p}</span>
          </div>
        ))}
      </div>
      <div style={{borderTop:'2px dashed var(--rule)', margin:'12px 0'}}/>
      <span className="btn sm" style={{width:'100%', justifyContent:'center'}}>Logout</span>
    </aside>
  );
}

function Visitor({ tweaks }) {
  const AppNav = window.WFAppNav;
  return (
    <section className="tabpanel" data-tab="visitor" data-screen-label="05 Visitor" data-om-validate>
      <div className="page-head">
        <div>
          <p className="page-sub">05 · Visitor (role: user)</p>
          <h1 className="page-title">Profile <span className="underline">/profile</span></h1>
        </div>
        <div className="page-meta">become-a-vendor · language preference · saved places</div>
      </div>
      <div className="rule"></div>

      <div className="browser">
        <div className="browser-bar">
          <div className="browser-dots"><span/><span/><span/></div>
          <div className="browser-url">festivkids.az<b>/profile</b></div>
        </div>
        <AppNav active="Profile" tweaks={tweaks}/>
        <div style={{padding:24, display:'grid', gridTemplateColumns:'1fr 320px', gap:24}}>
          <div>
            <div className="frame">
              <span className="frame-label">Account</span>
              <div className="row gap-16 center">
                <div style={{width:80, height:80, borderRadius:'50%', border:'2px solid var(--ink)', background:'var(--note-blue)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Caveat', fontSize:32}}>L</div>
                <div>
                  <h2 className="fh" style={{fontSize:32}}>Leyla H.</h2>
                  <p className="mono">leyla@example.az · joined Dec 2025</p>
                  <span className="pill ok mt-8">Visitor</span>
                </div>
              </div>
              <div style={{borderTop:'2px dashed var(--rule)', margin:'14px 0'}}/>
              <div className="grid grid-2" style={{gap:12}}>
                <div>
                  <div className="mono">DISPLAY NAME</div>
                  <div className="field">Leyla H.</div>
                </div>
                <div>
                  <div className="mono">LANGUAGE</div>
                  <div className="row gap-6 mt-8">
                    <span className="chip on">EN</span>
                    <span className="chip">AZ</span>
                  </div>
                </div>
                <div>
                  <div className="mono">EMAIL</div>
                  <div className="field">leyla@example.az</div>
                </div>
                <div>
                  <div className="mono">PASSWORD</div>
                  <span className="btn sm">Change</span>
                </div>
              </div>
            </div>

            <div className="frame mt-16" style={{background:'var(--note)'}}>
              <span className="frame-label">Become a vendor</span>
              <div className="row gap-16 between center">
                <div style={{maxWidth:520}}>
                  <h3 className="fh">Run a house at the next fair.</h3>
                  <p className="scribble small">Upgrade your account, fill the company profile, then apply for an open house. Takes ~5 min.</p>
                </div>
                <span className="btn primary">Upgrade to vendor →</span>
              </div>
              <div className="annot mt-12">confirmation modal · API moves user to /vendor on success</div>
            </div>

            <div className="frame mt-16">
              <span className="frame-label">Saved places · 4</span>
              <div className="grid grid-4 mt-8" style={{gap:10}}>
                {['Foxie Café','LunaToys','Restrooms B','Snowy Mtn'].map((n,i)=>(
                  <div key={i} className="panel" style={{padding:10}}>
                    <div className="ph" style={{height:60, fontSize:9}}>photo</div>
                    <div className="scribble strong mt-8">{n}</div>
                    <div className="mono">winter '26</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside>
            <div className="sticky">
              <div className="pin"></div>
              <b>Friends panel</b> lives on /map. This page is account-focused.
            </div>
            <div className="frame mt-16">
              <span className="frame-label">Sessions</span>
              <div className="scribble small">Chrome · Baku · just now</div>
              <div className="scribble small mt-8" style={{color:'var(--ink-soft)'}}>iPhone · Baku · 3 days ago</div>
              <span className="btn sm mt-12">Sign out other devices</span>
            </div>
            <div className="frame mt-16">
              <span className="frame-label">Danger zone</span>
              <span className="btn sm" style={{background:'var(--marker-soft)'}}>Delete account</span>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function Vendor({ tweaks }) {
  return (
    <section className="tabpanel" data-tab="vendor" data-screen-label="06 Vendor" data-om-validate>
      <div className="page-head">
        <div>
          <p className="page-sub">06 · Vendor (role: vendor)</p>
          <h1 className="page-title">Vendor <span className="underline">dashboard</span></h1>
        </div>
        <div className="page-meta">/vendor · /vendor/bookings · /vendor/applications · /vendor/profile</div>
      </div>
      <div className="rule"></div>

      {/* Dashboard */}
      <div className="browser">
        <div className="browser-bar">
          <div className="browser-dots"><span/><span/><span/></div>
          <div className="browser-url">festivkids.az<b>/vendor</b></div>
        </div>
        <div style={{display:'flex'}}>
          <RoleSidebar role="vendor" active="Dashboard"/>
          <div style={{flex:1, padding:24}}>
            <div className="row between center">
              <div>
                <span className="mono">Welcome back</span>
                <h2 className="fh" style={{fontSize:36, margin:0}}>Foxie Café 🦊</h2>
              </div>
              <span className="btn primary">+ New application</span>
            </div>
            <div className="grid grid-4 mt-16" style={{gap:14}}>
              {[
                {t:'New application',d:'Find a house on the map',n:'',c:'var(--note)'},
                {t:'My bookings',d:'Approved fairs',n:'3',c:'var(--note-blue)'},
                {t:'My applications',d:'2 pending · 1 approved',n:'3',c:'var(--note-pink)'},
                {t:'My profile',d:'Logo · gallery · bio',n:'',c:'#fff'},
              ].map((c,i)=>(
                <div key={i} className="frame" style={{padding:14, background:c.c}}>
                  <div className="row between">
                    <span className="mono">{i===1?'BOOKINGS':i===2?'APPLICATIONS':i===0?'NEW':'PROFILE'}</span>
                    {c.n && <span className="pill">{c.n}</span>}
                  </div>
                  <h3 className="fh mt-8">{c.t}</h3>
                  <p className="scribble small">{c.d}</p>
                  <span className="btn sm mt-12">Open →</span>
                </div>
              ))}
            </div>

            <div className="grid grid-2 mt-24" style={{gap:16}}>
              <div className="frame">
                <span className="frame-label">Activity</span>
                <table className="wf">
                  <tbody>
                    <tr><td>Application B-12 · Winter '26</td><td><span className="pill ok">approved</span></td><td className="mono">2d ago</td></tr>
                    <tr><td>Booking H-3 · Spring '26</td><td><span className="pill warn">awaiting payment</span></td><td className="mono">4d</td></tr>
                    <tr><td>Profile · 3 photos uploaded</td><td><span className="pill muted">info</span></td><td className="mono">1w</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="frame" style={{background:'var(--note)'}}>
                <span className="frame-label">Tip</span>
                <h3 className="fh">Add a 360° tour.</h3>
                <p className="scribble small">Houses with panoramas get 3× more saved by visitors. Admin uploads on your behalf.</p>
                <span className="btn sm mt-8">Request panorama upload</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Applications */}
      <div className="row between center mt-24">
        <span className="mono">/vendor/applications</span>
        <span className="scribble small">submit + track</span>
      </div>
      <div className="browser mt-8">
        <div className="browser-bar">
          <div className="browser-dots"><span/><span/><span/></div>
          <div className="browser-url">festivkids.az<b>/vendor/applications</b></div>
        </div>
        <div style={{display:'flex'}}>
          <RoleSidebar role="vendor" active="Applications"/>
          <div style={{flex:1, padding:24}}>
            <div className="row between center">
              <h2 className="fh" style={{fontSize:30, margin:0}}>Applications</h2>
              <div className="row gap-8 center">
                <div className="input"><span>Search</span><span className="ph-bar"/></div>
                <span className="chip on">All</span><span className="chip">Pending</span><span className="chip">Approved</span><span className="chip">Rejected</span>
              </div>
            </div>
            <div className="frame mt-16" style={{padding:0}}>
              <table className="wf" style={{margin:0}}>
                <thead><tr><th>House</th><th>Fair</th><th>Submitted</th><th>Status</th><th>Reason</th><th></th></tr></thead>
                <tbody>
                  <tr><td><b>B-12</b> · Hall B</td><td>Winter '26</td><td className="mono">Nov 02</td><td><span className="pill ok">approved</span></td><td className="mono">—</td><td><span className="btn sm">view</span></td></tr>
                  <tr><td><b>H-3</b> · Hall H</td><td>Spring '26</td><td className="mono">Nov 10</td><td><span className="pill warn">pending</span></td><td className="mono">in review · 2d</td><td><span className="btn sm">view</span></td></tr>
                  <tr><td><b>A-1</b> · Hall A</td><td>Winter '26</td><td className="mono">Oct 28</td><td><span className="pill bad">rejected</span></td><td className="scribble small">"Category mismatch — try Hall B"</td><td><span className="btn sm">view</span></td></tr>
                </tbody>
              </table>
            </div>

            <div className="frame mt-16">
              <span className="frame-label">New application · step 2 of 4</span>
              <div className="grid grid-2 mt-8" style={{gap:14}}>
                <div>
                  <div className="mono">SELECTED HOUSE</div>
                  <div className="field">B-12 · Hall B · Food</div>
                  <div className="mono mt-8">FAIR</div>
                  <div className="field">Winter Baku 2026</div>
                  <div className="mono mt-8">PRODUCTS (AZ + EN)</div>
                  <div className="field" style={{minHeight:60}}>pastry · pirojki · hot cocoa…</div>
                </div>
                <div>
                  <div className="mono">SAMPLE PHOTOS</div>
                  <div className="grid grid-3 mt-8" style={{gap:6}}>
                    <div className="ph" style={{height:60, fontSize:9}}>+ upload</div>
                    <div className="ph" style={{height:60, fontSize:9}}>img 1</div>
                    <div className="ph" style={{height:60, fontSize:9}}>img 2</div>
                  </div>
                  <div className="mono mt-12">NOTES TO ADMIN</div>
                  <div className="field" style={{minHeight:60, color:'var(--ink-soft)'}}>optional…</div>
                </div>
              </div>
              <div className="row between center mt-16">
                <div className="row gap-6">
                  <span style={{width:24, height:6, background:'var(--ink)', borderRadius:3}}/>
                  <span style={{width:24, height:6, background:'var(--ink)', borderRadius:3}}/>
                  <span style={{width:24, height:6, background:'var(--rule)', borderRadius:3}}/>
                  <span style={{width:24, height:6, background:'var(--rule)', borderRadius:3}}/>
                </div>
                <div className="row gap-6">
                  <span className="btn">Back</span>
                  <span className="btn primary">Continue →</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile */}
      <div className="row between center mt-24">
        <span className="mono">/vendor/profile</span>
        <span className="scribble small">company info · cloudinary uploads</span>
      </div>
      <div className="browser mt-8">
        <div className="browser-bar">
          <div className="browser-dots"><span/><span/><span/></div>
          <div className="browser-url">festivkids.az<b>/vendor/profile</b></div>
        </div>
        <div style={{display:'flex'}}>
          <RoleSidebar role="vendor" active="Profile"/>
          <div style={{flex:1, padding:24}}>
            <div className="grid grid-2" style={{gap:16}}>
              <div className="frame">
                <span className="frame-label">Company · EN</span>
                <div className="mono">NAME</div>
                <div className="field">Foxie Café</div>
                <div className="mono mt-8">ABOUT</div>
                <div className="field" style={{minHeight:80}}>Cozy bakery & hot drinks. Family run since 2018.</div>
                <div className="mono mt-8">CATEGORY</div>
                <div className="row gap-6 mt-8">
                  <span className="chip on">Food</span>
                  <span className="chip">Workshops</span>
                  <span className="chip">Crafts</span>
                </div>
              </div>
              <div className="frame">
                <span className="frame-label">Şirkət · AZ</span>
                <div className="mono">AD</div>
                <div className="field">Foxie Café</div>
                <div className="mono mt-8">HAQQINDA</div>
                <div className="field" style={{minHeight:80}}>Rahat çörəkxana və isti içkilər. Ailə işi.</div>
                <div className="annot mt-12">Both languages required for public listing.</div>
              </div>
            </div>

            <div className="grid grid-2 mt-16" style={{gap:16}}>
              <div className="frame">
                <span className="frame-label">Logo</span>
                <div className="row gap-12 center mt-8">
                  <div style={{width:80, height:80, borderRadius:8, border:'2px solid var(--ink)', background:'var(--note-pink)', display:'flex', alignItems:'center', justifyContent:'center'}}>🦊</div>
                  <div className="col gap-6">
                    <span className="btn sm">Replace</span>
                    <span className="btn sm" style={{background:'var(--marker-soft)'}}>Remove</span>
                  </div>
                </div>
                <div className="mono mt-12">SVG / PNG · ≤ 1MB · square recommended</div>
              </div>
              <div className="frame">
                <span className="frame-label">Product gallery</span>
                <div className="grid grid-4 mt-8" style={{gap:6}}>
                  {Array.from({length:8}).map((_,i)=>(
                    <div key={i} className="ph" style={{height:50, fontSize:9}}>{i<6?'img '+(i+1):'+ add'}</div>
                  ))}
                </div>
                <div className="mono mt-8">drag to reorder · cloudinary backed</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

window.WFScreens.Visitor = Visitor;
window.WFScreens.Vendor = Vendor;
window.WFRoleSidebar = RoleSidebar;
