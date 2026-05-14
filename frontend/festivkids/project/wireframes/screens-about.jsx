// About page — bilingual CMS-style.
window.WFScreens = window.WFScreens || {};

function About({ tweaks }) {
  const AppNav = window.WFAppNav;
  return (
    <section className="tabpanel" data-tab="about" data-screen-label="02 About" data-om-validate>
      <div className="page-head">
        <div>
          <p className="page-sub">02 · Public</p>
          <h1 className="page-title">About <span className="underline">/about</span></h1>
        </div>
        <div className="page-meta">
          CMS-driven · bilingual<br/>
          mission · history · team · contact · past events
        </div>
      </div>
      <div className="rule"></div>

      <div className="browser">
        <div className="browser-bar">
          <div className="browser-dots"><span/><span/><span/></div>
          <div className="browser-url">festivkids.az<b>/about</b></div>
        </div>
        <AppNav active="About" tweaks={tweaks}/>
        <div style={{padding:24}}>
          <div style={{display:'grid', gridTemplateColumns:'1fr 280px', gap:32}}>
            <div>
              <span className="mono">Mission</span>
              <h2 className="fh" style={{fontSize:48, marginTop:4}}>
                <I18n en="Bringing seasons to life," az="Mövsümləri canlandırırıq,"/><br/>
                <I18n en="block by block." az="məhəllə-məhəllə."/>
              </h2>
              <p className="scribble" style={{fontSize:15, maxWidth:600, marginTop:8}}>
                <I18n en="FestivKids organizes recurring city fairs across Azerbaijan. We map every house, vendor and facility so families can plan their visit before they arrive."
                      az="FestivKids Azərbaycanda mövsümi şəhər yarmarkaları təşkil edir. Hər ev, satıcı və obyekt xəritələnir."/>
              </p>

              <div style={{borderTop:'2px dashed var(--rule)', margin:'24px 0'}}/>
              <span className="mono">History · since 2019</span>
              <div className="grid grid-3 mt-12" style={{gap:12}}>
                {['2019 · first fair','2022 · 4 cities','2026 · digital map'].map((s,i)=>(
                  <div key={i} className="panel">
                    <h3 className="fh">{s.split('·')[0]}</h3>
                    <p className="scribble small">{s.split('·')[1]}</p>
                  </div>
                ))}
              </div>

              <div style={{borderTop:'2px dashed var(--rule)', margin:'24px 0'}}/>
              <span className="mono">Team</span>
              <div className="grid grid-4 mt-8" style={{gap:12}}>
                {['Aysel · Director','Rauf · Ops','Lana · Vendor lead','Tural · Maps'].map((s,i)=>(
                  <div key={i} className="panel" style={{textAlign:'center'}}>
                    <div style={{width:60, height:60, margin:'0 auto', borderRadius:'50%', border:'2px solid var(--ink)', background:'var(--note-blue)'}}/>
                    <div className="scribble mt-8">{s.split('·')[0]}</div>
                    <div className="mono">{s.split('·')[1]}</div>
                  </div>
                ))}
              </div>

              <div style={{borderTop:'2px dashed var(--rule)', margin:'24px 0'}}/>
              <span className="mono">Past events · with vendor logos</span>
              <div className="grid grid-2 mt-12" style={{gap:14}}>
                {['Winter Fair · 2025','Spring Fair · 2025'].map((s,i)=>(
                  <div key={i} className="frame" style={{padding:0}}>
                    <div className="ph" style={{height:120, borderTop:'none', borderLeft:'none', borderRight:'none'}}>banner photo</div>
                    <div style={{padding:12}}>
                      <h3 className="fh">{s}</h3>
                      <p className="mono">28 vendors · 4 categories</p>
                      <div className="row wrap gap-6 mt-8">
                        {['Bake&Co','LunaToys','Fox Café','Snowy Mtn','Yarn Yard','+ 23'].map((v,j)=>(
                          <span key={j} className="chip" style={{fontSize:11}}>{v}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <aside>
              <div className="frame" style={{padding:14}}>
                <span className="frame-label">Contact</span>
                <div className="mono mt-8">phone</div>
                <div className="scribble">+994 12 555 0140</div>
                <div className="mono mt-8">email</div>
                <div className="scribble">hi@festivkids.az</div>
                <div className="mono mt-8">social</div>
                <div className="row gap-6 mt-8">
                  <span className="chip">IG</span><span className="chip">FB</span><span className="chip">TG</span><span className="chip">YT</span>
                </div>
              </div>
              <div className="frame mt-16" style={{padding:14, background:'var(--note)'}}>
                <span className="frame-label">Upcoming</span>
                <h3 className="fh mt-8">Spring · Ganja</h3>
                <p className="mono">Apr 4 → Apr 19, 2026</p>
                <p className="scribble small">38 vendors confirmed · 6 facilities</p>
                <span className="btn sm primary mt-8">See on map →</span>
              </div>
              <div className="annot mt-16">all sections from public About API · AZ + EN parity</div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
window.WFScreens.About = About;
