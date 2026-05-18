'use client';

export default function Home() {
  return (
    <div>
      <nav className="site-nav">
        <div className="container nav-inner">
          <a className="brand" href="/"><span className="brand-mark">A</span><span>AurumYield</span></a>
          <div style={{display:'flex',gap:10}}>
            <a href="/login" className="btn btn-secondary">Sign In</a>
            <a href="/register" className="btn btn-primary">Open Account</a>
          </div>
        </div>
      </nav>
      <main style={{padding:'120px 0 80px',textAlign:'center'}}>
        <div className="container">
          <div className="eyebrow" style={{marginBottom:24}}>DIGITAL GOLD INVESTMENT</div>
          <h1 style={{fontSize:'clamp(44px,6vw,72px)',letterSpacing:-3,lineHeight:1,marginBottom:24}}>
            Invest in <span className="gold">gold</span>,<br/>grow your wealth.
          </h1>
          <p className="muted" style={{fontSize:18,maxWidth:600,margin:'0 auto 40px'}}>
            Professional gold investment platform with risk-managed programs. Start from $1,000 with monthly reporting and full transparency.
          </p>
          <div style={{display:'flex',gap:16,justifyContent:'center',flexWrap:'wrap'}}>
            <a href="/register" className="btn btn-primary" style={{padding:'16px 36px',fontSize:16}}>Open Account</a>
            <a href="/login" className="btn btn-secondary" style={{padding:'16px 36px',fontSize:16}}>Client Login</a>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20,marginTop:80,maxWidth:900,margin:'80px auto 0'}}>
            {[
              {icon:'🛡',title:'Conservative Program',desc:'Target up to 4% monthly. Max targeted drawdown: 10%.'},
              {icon:'📈',title:'Growth Program',desc:'Target up to 8% monthly. Max targeted drawdown: 20%.'},
              {icon:'💰',title:'Start from $1,000',desc:'Monthly reporting, transparent fees, risk-managed strategies.'},
            ].map((f,i) => (
              <div key={i} className="card" style={{padding:28,textAlign:'left'}}>
                <div style={{fontSize:32,marginBottom:12}}>{f.icon}</div>
                <h3 style={{fontSize:17,fontWeight:800,marginBottom:8}}>{f.title}</h3>
                <p className="muted" style={{fontSize:13}}>{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="notice" style={{maxWidth:700,margin:'60px auto 0',textAlign:'left'}}>
            <strong>Important:</strong> Target returns are investment objectives, not guarantees. Capital is at risk and performance may vary depending on market conditions.
          </div>
        </div>
      </main>
      <footer style={{padding:24,borderTop:'1px solid var(--white)',textAlign:'center'}}>
        <p className="muted" style={{fontSize:12}}>© 2026 AurumYield. Investment performance is not guaranteed and capital is at risk.</p>
      </footer>
    </div>
  );
}
