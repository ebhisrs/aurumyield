'use client';

export default function Home() {
  return (
    <div>
      <nav className="site-nav">
        <div className="container nav-inner">
          <a className="brand" href="/"><span className="brand-mark">A</span><span>AurumYield</span></a>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <a href="/login" className="btn btn-secondary">Sign In</a>
            <a href="/register" className="btn btn-primary">Open Account</a>
          </div>
        </div>
      </nav>
      <main style={{padding:'clamp(60px,12vw,120px) 0 60px',textAlign:'center'}}>
        <div className="container">
          <div className="eyebrow" style={{marginBottom:20}}>DIGITAL GOLD INVESTMENT</div>
          <h1 style={{fontSize:'clamp(32px,6vw,72px)',letterSpacing:'-0.03em',lineHeight:1.05,marginBottom:20}}>
            Invest in <span className="gold">gold</span>,<br/>grow your wealth.
          </h1>
          <p className="muted" style={{fontSize:'clamp(15px,2vw,18px)',maxWidth:600,margin:'0 auto 32px',padding:'0 8px'}}>
            Professional gold investment platform with risk-managed programs. Start from $1,000 with monthly reporting and full transparency.
          </p>
          <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
            <a href="/register" className="btn btn-primary" style={{padding:'14px 28px',fontSize:'clamp(14px,2vw,16px)'}}>Open Account</a>
            <a href="/login" className="btn btn-secondary" style={{padding:'14px 28px',fontSize:'clamp(14px,2vw,16px)'}}>Client Login</a>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:16,marginTop:'clamp(40px,8vw,80px)',maxWidth:900,margin:'clamp(40px,8vw,80px) auto 0'}}>
            {[
              {icon:'🛡',title:'Conservative Program',desc:'Target up to 4% monthly. Max targeted drawdown: 10%.'},
              {icon:'📈',title:'Growth Program',desc:'Target up to 8% monthly. Max targeted drawdown: 20%.'},
              {icon:'💰',title:'Start from $1,000',desc:'Monthly reporting, transparent fees, risk-managed strategies.'},
            ].map((f,i) => (
              <div key={i} className="card" style={{padding:'clamp(20px,3vw,28px)',textAlign:'left'}}>
                <div style={{fontSize:28,marginBottom:10}}>{f.icon}</div>
                <h3 style={{fontSize:16,fontWeight:800,marginBottom:6}}>{f.title}</h3>
                <p className="muted" style={{fontSize:13}}>{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="notice" style={{maxWidth:700,margin:'40px auto 0',textAlign:'left'}}>
            <strong>Important:</strong> Target returns are investment objectives, not guarantees. Capital is at risk and performance may vary depending on market conditions.
          </div>
        </div>
      </main>
      <footer style={{padding:'20px 16px',borderTop:'1px solid var(--white)',textAlign:'center'}}>
        <p className="muted" style={{fontSize:12}}>© 2026 AurumYield. Investment performance is not guaranteed and capital is at risk.</p>
      </footer>
    </div>
  );
}
