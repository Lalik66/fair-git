// Admin shell — overview + 6 sub-routes
window.WFScreens = window.WFScreens || {};

function AdminShell({ active='Overview', crumb=['Admin'], children }) {
  const items = [
    ['Overview','/admin'],['Users','/admin/users'],['Logs','/admin/logs'],
    ['Fairs','/admin/fairs'],['Applications','/admin/applications'],
    ['About CMS','/admin/about-us'],['Map CMS','/admin/map'],
  ];
  return (
    <div className="browser">
      <div className="browser-bar">
        <div className="browser-dots"><span/><span/><span/></div>
        <div className="browser-url">festivkids.az<b>{items.find(i=>i[0]===active)?.[1] || '/admin'}</b></div>
      </div>
      <div style={{display:'flex'}}>
        <aside style={{width:220, borderRight:'2px solid var(--ink)', padding:14, background:'rgba(255,255,255,0.4)'}}>
          <div className="mono">FestivKids · admin</div>
          <div style={{borderTop:'2px dashed var(--rule)', margin:'10px 0'}}/>
          <div className="col gap-6">
            {items.map(([n,p])=>(
              <div key={n} className="row between center" style={{padding:'6px 8px', borderRadius:6, background: n===active?'var(--ink)':'transparent', color: n===active?'var(--paper)':'var(--ink)'}}>
                <span className="scribble strong">{n}</span>
                <span className="mono" style={{opacity:0.6}}>{p.split('/').pop()||'·'}</span>
              </div>
            ))}
          </div>
          <div style={{borderTop:'2px dashed var(--rule)', margin:'12px 0'}}/>
          <div className="row gap-8 center">
            <div style={{width:28, height:28, borderRadius:'50%', border:'1.5px solid var(--ink)', background:'var(--note-pink)'}}/>
            <div>
              <div className="scribble strong">Aysel</div>
              <div className="mono">admin</div>
            </div>
          </div>
          <span className="btn sm mt-12" style={{width:'100%', justifyContent:'center'}}>Logout</span>
        </aside>
        <div style={{flex:1, padding:24}}>
          <div className="row between center">
            <div className="mono">{crumb.map((c,i)=> <span key={i}>{c}{i<crumb.length-1?' › ':''}</span>)}</div>
            <div className="row gap-6 center">
              <span className="chip">EN ▾</span>
              <span className="btn sm">Help</span>
            </div>
          </div>
          <div style={{borderTop:'2px dashed var(--rule)', margin:'12px 0'}}/>
          {children}
        </div>
      </div>
    </div>
  );
}

function Admin({ tweaks }) {
  return (
    <section className="tabpanel" data-tab="admin" data-screen-label="07 Admin" data-om-validate>
      <div className="page-head">
        <div>
          <p className="page-sub">07 · Admin</p>
          <h1 className="page-title">Admin <span className="underline">/admin</span></h1>
        </div>
        <div className="page-meta">
          users · fairs · applications<br/>
          about CMS · map CMS · logs
        </div>
      </div>
      <div className="rule"></div>

      {/* Overview */}
      <AdminShell active="Overview" crumb={['Admin','Overview']}>
        <div className="row between center">
          <h2 className="fh" style={{fontSize:36, margin:0}}>Operations · today</h2>
          <span className="btn primary">+ New fair</span>
        </div>
        <div className="grid grid-4 mt-16" style={{gap:14}}>
          {[
            {l:'Pending applications',n:14,c:'var(--note)'},
            {l:'Active bookings',n:62,c:'var(--note-blue)'},
            {l:'Vendors total',n:148,c:'#fff'},
            {l:'Live now',n:1,c:'var(--note-pink)'},
          ].map((s,i)=>(
            <div key={i} className="frame" style={{padding:14, background:s.c}}>
              <span className="mono">{s.l}</span>
              <h3 className="fh" style={{fontSize:42, margin:'4px 0'}}>{s.n}</h3>
              <span className="scribble small">vs last week ↑ 12%</span>
            </div>
          ))}
        </div>
        <div className="grid grid-2 mt-16" style={{gap:16}}>
          <div className="frame">
            <span className="frame-label">Recent admin actions</span>
            <table className="wf">
              <tbody>
                <tr><td>Approved B-12 · Foxie Café</td><td className="mono">Aysel</td><td className="mono">10:24</td></tr>
                <tr><td>Created fair · Spring Ganja '26</td><td className="mono">Rauf</td><td className="mono">09:11</td></tr>
                <tr><td>Disabled vendor · OldShop LLC</td><td className="mono">Aysel</td><td className="mono">Yest</td></tr>
                <tr><td>Uploaded panorama · A-7</td><td className="mono">Tural</td><td className="mono">Yest</td></tr>
              </tbody>
            </table>
          </div>
          <div className="frame" style={{background:'var(--note)'}}>
            <span className="frame-label">Needs attention</span>
            <ul className="scribble" style={{paddingLeft:18}}>
              <li>3 applications awaiting review &gt; 48h</li>
              <li>2 houses missing panoramas (Hall H)</li>
              <li>About page · Spring section out of date</li>
            </ul>
            <span className="btn sm mt-8">Open queue →</span>
          </div>
        </div>
      </AdminShell>

      {/* Users */}
      <div className="row between center mt-24"><span className="mono">/admin/users</span><span className="scribble small">manage roles · enable/disable · create admin</span></div>
      <div className="mt-8">
        <AdminShell active="Users" crumb={['Admin','Users']}>
          <div className="row between center">
            <h2 className="fh" style={{fontSize:30, margin:0}}>Users · 412</h2>
            <div className="row gap-8 center">
              <div className="input"><span>Search name, email…</span><span className="ph-bar"/></div>
              <span className="chip on">All</span><span className="chip">Visitors</span><span className="chip">Vendors</span><span className="chip">Admins</span>
              <span className="btn primary">+ Create admin</span>
            </div>
          </div>
          <div className="frame mt-16" style={{padding:0}}>
            <table className="wf" style={{margin:0}}>
              <thead><tr><th></th><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {[
                  ['L','Leyla H.','leyla@example.az','Visitor','Dec 25','active'],
                  ['F','Foxie Café','hi@foxie.az','Vendor','Oct 12','active'],
                  ['M','Murad Q.','murad@example.az','Visitor','Jan 04','active'],
                  ['A','Aysel B.','aysel@fk.az','Admin','—','active'],
                  ['O','OldShop LLC','old@oldshop.az','Vendor','2023','disabled'],
                ].map((r,i)=>(
                  <tr key={i}>
                    <td><div style={{width:28, height:28, borderRadius:'50%', border:'1.5px solid var(--ink)', background:'var(--note-blue)', display:'flex', alignItems:'center', justifyContent:'center'}}>{r[0]}</div></td>
                    <td><b>{r[1]}</b></td>
                    <td className="mono">{r[2]}</td>
                    <td><span className="pill">{r[3]}</span></td>
                    <td className="mono">{r[4]}</td>
                    <td><span className={'pill ' + (r[5]==='active'?'ok':'bad')}>{r[5]}</span></td>
                    <td><span className="btn sm">⋯</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminShell>
      </div>

      {/* Applications review */}
      <div className="row between center mt-24"><span className="mono">/admin/applications</span><span className="scribble small">review · approve / reject · export</span></div>
      <div className="mt-8">
        <AdminShell active="Applications" crumb={['Admin','Applications']}>
          <div className="row between center">
            <h2 className="fh" style={{fontSize:30, margin:0}}>Applications · 14 pending</h2>
            <div className="row gap-8 center">
              <span className="chip on">Pending</span>
              <span className="chip">Approved</span>
              <span className="chip">Rejected</span>
              <span className="btn sm">⤓ Export CSV</span>
              <span className="btn sm">⤓ Export PDF</span>
            </div>
          </div>
          <div className="grid" style={{gridTemplateColumns:'1fr 360px', gap:16, marginTop:16}}>
            <div className="frame" style={{padding:0}}>
              <table className="wf" style={{margin:0}}>
                <thead><tr><th>Vendor</th><th>House</th><th>Fair</th><th>Submitted</th><th>Cat</th><th></th></tr></thead>
                <tbody>
                  <tr style={{background:'rgba(247,226,107,0.4)'}}>
                    <td><b>Foxie Café</b></td><td>B-12</td><td>Winter '26</td><td className="mono">Nov 02</td><td><span className="chip">Food</span></td>
                    <td><span className="btn sm primary">Review</span></td>
                  </tr>
                  <tr><td>LunaToys</td><td>H-3</td><td>Spring '26</td><td className="mono">Nov 05</td><td><span className="chip">Toys</span></td><td><span className="btn sm">Review</span></td></tr>
                  <tr><td>Yarn Yard</td><td>A-1</td><td>Winter '26</td><td className="mono">Nov 07</td><td><span className="chip">Crafts</span></td><td><span className="btn sm">Review</span></td></tr>
                  <tr><td>Snowy Mtn</td><td>C-9</td><td>Winter '26</td><td className="mono">Nov 09</td><td><span className="chip">Workshops</span></td><td><span className="btn sm">Review</span></td></tr>
                </tbody>
              </table>
            </div>
            <div className="frame">
              <span className="frame-label">Review · Foxie Café · B-12</span>
              <div className="row gap-8 center">
                <div style={{width:48, height:48, borderRadius:8, border:'2px solid var(--ink)', background:'var(--note-pink)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20}}>🦊</div>
                <div>
                  <b className="scribble">Foxie Café</b>
                  <div className="mono">Food · est 2018</div>
                </div>
              </div>
              <div className="mono mt-12">PRODUCTS</div>
              <div className="scribble small">Pastries, hot cocoa, pirojki</div>
              <div className="grid grid-3 mt-8" style={{gap:6}}>
                {[1,2,3].map(i=><div key={i} className="ph" style={{height:54, fontSize:9}}>img {i}</div>)}
              </div>
              <div className="mono mt-12">REJECTION REASON (if rejecting)</div>
              <div className="field" style={{minHeight:54, color:'var(--ink-soft)'}}>optional · sent in email</div>
              <div className="row gap-6 mt-12">
                <span className="btn primary" style={{flex:1, justifyContent:'center'}}>Approve</span>
                <span className="btn" style={{background:'var(--marker-soft)'}}>Reject</span>
              </div>
              <div className="annot mt-12">Email sent to vendor in their language</div>
            </div>
          </div>
        </AdminShell>
      </div>

      {/* Fairs / Map / About / Logs — compact previews */}
      <div className="grid grid-2 mt-24" style={{gap:24}}>
        <div>
          <div className="row between center"><span className="mono">/admin/fairs</span><span className="scribble small">create · edit · archive</span></div>
          <div className="mt-8">
            <AdminShell active="Fairs" crumb={['Admin','Fairs']}>
              <div className="row between center">
                <h3 className="fh" style={{fontSize:24, margin:0}}>Fairs</h3>
                <span className="btn primary sm">+ New fair</span>
              </div>
              <table className="wf mt-12">
                <thead><tr><th>Fair</th><th>Dates</th><th>Status</th><th>Bookings</th><th></th></tr></thead>
                <tbody>
                  <tr><td><b>Winter Baku '26</b></td><td className="mono">Dec 18 → Jan 6</td><td><span className="pill ok">live</span></td><td>62</td><td><span className="btn sm">edit</span></td></tr>
                  <tr><td>Spring Ganja '26</td><td className="mono">Apr 4 → 19</td><td><span className="pill warn">draft</span></td><td>0</td><td><span className="btn sm">edit</span></td></tr>
                  <tr><td>Winter Baku '25</td><td className="mono">past</td><td><span className="pill muted">archived</span></td><td>54</td><td><span className="btn sm">view</span></td></tr>
                </tbody>
              </table>
            </AdminShell>
          </div>
        </div>

        <div>
          <div className="row between center"><span className="mono">/admin/map</span><span className="scribble small">houses · facilities · 360°</span></div>
          <div className="mt-8">
            <AdminShell active="Map CMS" crumb={['Admin','Map CMS']}>
              <div className="row between center">
                <h3 className="fh" style={{fontSize:24, margin:0}}>Map content</h3>
                <div className="row gap-6 center">
                  <span className="chip on">Houses · 38</span>
                  <span className="chip">Facilities · 12</span>
                  <span className="btn sm primary">+ Add</span>
                </div>
              </div>
              <div className="grid grid-2 mt-12" style={{gap:10}}>
                <div className="map-ph" style={{height:200}}>
                  <span className="map-pin" style={{top:'30%',left:'30%'}}><span>1</span></span>
                  <span className="map-pin sel" style={{top:'50%',left:'55%'}}><span>2</span></span>
                  <span className="map-pin fac" style={{top:'70%',left:'40%'}}><span>F</span></span>
                </div>
                <div>
                  <div className="frame" style={{padding:12}}>
                    <span className="frame-label">B-12 · selected</span>
                    <div className="mono mt-8">PANORAMA</div>
                    <div className="ph" style={{height:60, fontSize:10}}>upload 360° image · ≥ 4096px</div>
                    <div className="row gap-6 mt-8">
                      <span className="btn sm">Replace</span>
                      <span className="btn sm">Use demo</span>
                    </div>
                  </div>
                </div>
              </div>
            </AdminShell>
          </div>
        </div>

        <div>
          <div className="row between center"><span className="mono">/admin/about-us</span><span className="scribble small">CMS sections · AZ + EN</span></div>
          <div className="mt-8">
            <AdminShell active="About CMS" crumb={['Admin','About CMS']}>
              <div className="row between center">
                <h3 className="fh" style={{fontSize:24, margin:0}}>About content</h3>
                <span className="btn primary sm">Save &amp; publish</span>
              </div>
              <div className="grid grid-2 mt-12" style={{gap:10}}>
                <div>
                  <div className="mono">MISSION · EN</div>
                  <div className="field" style={{minHeight:80}}>Bringing seasons to life…</div>
                </div>
                <div>
                  <div className="mono">MISSION · AZ</div>
                  <div className="field" style={{minHeight:80}}>Mövsümləri canlandırırıq…</div>
                </div>
              </div>
              <div className="row gap-6 mt-12 wrap">
                <span className="chip on">Mission</span>
                <span className="chip">History</span>
                <span className="chip">Team</span>
                <span className="chip">Contact</span>
                <span className="chip">Past events</span>
              </div>
              <div className="annot mt-12">unsaved changes warn on navigate</div>
            </AdminShell>
          </div>
        </div>

        <div>
          <div className="row between center"><span className="mono">/admin/logs</span><span className="scribble small">audit trail</span></div>
          <div className="mt-8">
            <AdminShell active="Logs" crumb={['Admin','Logs']}>
              <div className="row between center">
                <h3 className="fh" style={{fontSize:24, margin:0}}>Activity logs</h3>
                <div className="row gap-6 center">
                  <span className="chip on">All</span>
                  <span className="chip">Approvals</span>
                  <span className="chip">Auth</span>
                  <span className="chip">CMS</span>
                </div>
              </div>
              <table className="wf mt-12">
                <tbody>
                  <tr><td className="mono">10:24</td><td>application.approve · B-12</td><td>Aysel</td></tr>
                  <tr><td className="mono">09:11</td><td>fair.create · Spring '26</td><td>Rauf</td></tr>
                  <tr><td className="mono">Yest</td><td>vendor.disable · OldShop</td><td>Aysel</td></tr>
                  <tr><td className="mono">Yest</td><td>panorama.upload · A-7</td><td>Tural</td></tr>
                  <tr><td className="mono">2d</td><td>about.publish · history</td><td>Aysel</td></tr>
                </tbody>
              </table>
            </AdminShell>
          </div>
        </div>
      </div>
    </section>
  );
}

window.WFScreens.Admin = Admin;
