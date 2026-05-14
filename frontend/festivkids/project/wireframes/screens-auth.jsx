// Auth flow — login, oauth callback, role select, invite, password change.
window.WFScreens = window.WFScreens || {};

function AuthCard({ url, title, children, label, tag }) {
  return (
    <div className="browser" style={{maxWidth:520}}>
      <div className="browser-bar">
        <div className="browser-dots"><span/><span/><span/></div>
        <div className="browser-url">festivkids.az<b>{url}</b></div>
      </div>
      <div style={{padding:24, background:'#fdfaf0'}}>
        <div className="frame" style={{padding:18, background:'#fff'}}>
          <span className="frame-label">{label}</span>
          {tag && <span className="frame-tag">{tag}</span>}
          <h2 className="fh mt-8" style={{fontSize:30}}>{title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
}

function Auth({ tweaks }) {
  return (
    <section className="tabpanel" data-tab="auth" data-screen-label="04 Auth" data-om-validate>
      <div className="page-head">
        <div>
          <p className="page-sub">04 · Auth</p>
          <h1 className="page-title">Auth <span className="underline">flow</span></h1>
        </div>
        <div className="page-meta">
          /login · /oauth-callback · /select-role<br/>
          /change-password · /invite/:token
        </div>
      </div>
      <div className="rule"></div>

      <div className="row wrap gap-24" style={{rowGap:32}}>
        <AuthCard url="/login" label="01 · Sign in" title="Welcome back.">
          <div className="mono mt-12">EMAIL</div>
          <div className="auth-card" style={{boxShadow:'none', padding:8, marginTop:4}}>
            <div className="field">you@festivkids.az</div>
          </div>
          <div className="mono mt-12">PASSWORD</div>
          <div className="auth-card" style={{boxShadow:'none', padding:8, marginTop:4}}>
            <div className="field">••••••••••</div>
          </div>
          <div className="row between center mt-12">
            <span className="scribble small">Forgot password?</span>
            <span className="scribble small"><I18n en="EN" az="AZ"/> ▾</span>
          </div>
          <div className="row gap-8 mt-12">
            <span className="btn primary" style={{flex:1, justifyContent:'center'}}>Sign in</span>
            <span className="btn"><span className="mono">G</span> Google</span>
          </div>
          <div className="annot mt-12">OAuth visible only when server flag enabled</div>
          <div className="sticky pink mt-16" style={{transform:'rotate(0.5deg)'}}>
            <b>Error states:</b> wrong creds · deactivated · OAuth declined ?error= shows top-banner.
          </div>
        </AuthCard>

        <AuthCard url="/oauth-callback?code=…" label="02 · OAuth callback" title="Hold on a sec…" tag="loading">
          <div className="mt-12 row gap-8 center">
            <div style={{width:24, height:24, border:'3px solid var(--ink)', borderRightColor:'transparent', borderRadius:'50%'}}/>
            <span className="scribble">Connecting to Google · finishing sign-in</span>
          </div>
          <div className="annot mt-16">Branches: existing user → role dashboard · new user → /select-role · error → /login?error=…</div>
        </AuthCard>

        <AuthCard url="/select-role" label="03 · Select role" title="How will you use FestivKids?" tag="first OAuth">
          <div className="grid grid-2 mt-12" style={{gap:10}}>
            {[
              {t:'Visitor',d:'Browse the map, save favorites, find friends.',c:'var(--note-blue)'},
              {t:'Vendor',d:'Apply for a house, manage bookings & profile.',c:'var(--note)'},
            ].map((r,i)=>(
              <div key={i} className="frame" style={{padding:12, background:r.c, cursor:'pointer'}}>
                <h3 className="fh">{r.t}</h3>
                <p className="scribble small">{r.d}</p>
                <span className="btn sm primary mt-8">Choose →</span>
              </div>
            ))}
          </div>
          <div className="annot mt-12">Admin role NEVER selectable — assigned by an existing admin.</div>
        </AuthCard>

        <AuthCard url="/change-password" label="04 · Forced password change" title="Set a new password." tag="protected">
          <p className="scribble small">Your account requires a fresh password before continuing.</p>
          <div className="mono mt-12">NEW PASSWORD</div>
          <div className="field">••••••••••</div>
          <div className="mono mt-8">CONFIRM</div>
          <div className="field">••••••••••</div>
          <div className="row gap-8 mt-12">
            <span className="btn primary" style={{flex:1, justifyContent:'center'}}>Save &amp; continue</span>
          </div>
          <div className="sticky mt-16">
            <b>Validator chips:</b> 8+ chars · upper · number · symbol — green when met.
          </div>
        </AuthCard>

        <AuthCard url="/invite/abc123" label="05 · Friend invite" title="Aytan invited you to FestivKids." tag="needs login">
          <div className="row gap-12 center mt-12">
            <div style={{width:60, height:60, borderRadius:'50%', border:'2px solid var(--ink)', background:'var(--note-blue)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Caveat', fontSize:24}}>A</div>
            <div>
              <div className="scribble strong">Aytan Mammadova</div>
              <div className="mono">Joined Dec 2025 · Baku</div>
            </div>
          </div>
          <p className="scribble small mt-12">Sign in to accept and become friends. You'll see each other on the map during the fair.</p>
          <div className="row gap-8 mt-12">
            <span className="btn primary" style={{flex:1, justifyContent:'center'}}>Sign in &amp; accept</span>
            <span className="btn">Decline</span>
          </div>
          <div className="annot mt-12">Token in URL is validated server-side; expired → friendly error screen.</div>
        </AuthCard>
      </div>
    </section>
  );
}
window.WFScreens.Auth = Auth;
