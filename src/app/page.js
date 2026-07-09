'use client';
import { useState } from 'react';

export default function Home() {
  const [calcAmount, setCalcAmount] = useState(10000);
  const [calcRate, setCalcRate] = useState(0.04);
  const usdFmt = (n) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
  const monthly = calcAmount * calcRate;
  const annualSimple = monthly * 12;
  const compoundVal = calcAmount * Math.pow(1 + calcRate, 12);

  return (
    <div>
      {/* NAV */}
      <nav className="hp-nav">
        <div className="container hp-nav-inner">
          <a href="/" className="hp-brand"><img src="/logo-dark.jpeg" alt="8QMM Gold" style={{width:56,height:56,borderRadius:"50%",objectFit:"cover"}} /><span>8QMM Gold</span></a>
          <div className="hp-nav-links">
            <a href="#idea">The Idea</a>
            <a href="#programs">Programs</a>
            <a href="#compound">Compounding</a>
            <a href="#examples">Examples</a>
            <a href="#trust">Trust</a>
            <a href="#faq">FAQ</a>
          </div>
          <div style={{display:'flex',gap:10}}>
            <a className="hp-btn hp-btn-secondary" href="/login">Sign In</a>
            <a className="hp-btn hp-btn-primary" href="/register">Open Account</a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="hp-hero">
        <div className="container hp-hero-grid">
          <div>
            <div className="hp-eyebrow">Digital Gold • Monthly Income Opportunities • MENA Focused</div>
            <h1 className="hp-h1">Own Gold. <span className="hp-gold">Earn Yield.</span> Compound Wealth.</h1>
            <p className="hp-lead">A modern digital gold wealth platform combining real gold exposure, professionally managed precious metals strategies, monthly income opportunities, and optional compounded growth for long-term investors.</p>
            <div className="hp-hero-actions">
              <a className="hp-btn hp-btn-primary" href="/register">Start From $1,000</a>
              <a className="hp-btn hp-btn-secondary" href="#programs">View Programs</a>
            </div>
            <div className="hp-trust-row">
              {['Real Gold Exposure','Monthly Reporting','Risk-Managed Strategies','Compound Growth Option','Global Access'].map(p => <span key={p} className="hp-pill">{p}</span>)}
            </div>
          </div>
          <div className="hp-hero-card">
            <div className="hp-vault-glow" />
            <div className="hp-dashboard">
              <div className="hp-dash-top">
                <div><div className="hp-dash-title">Digital Gold Portfolio</div><div className="hp-balance">$24,860</div></div>
                <div className="hp-positive">+4.0%</div>
              </div>
              <div className="hp-chart">
                <svg viewBox="0 0 600 180" preserveAspectRatio="none">
                  <path d="M0,130 C60,120 80,80 140,95 C210,115 230,50 300,70 C370,90 390,35 460,48 C520,60 550,30 600,42" fill="none" stroke="#f2d184" strokeWidth="5"/>
                  <path d="M0,130 C60,120 80,80 140,95 C210,115 230,50 300,70 C370,90 390,35 460,48 C520,60 550,30 600,42 L600,180 L0,180 Z" fill="rgba(217,164,65,.15)"/>
                </svg>
              </div>
              <div className="hp-mini-grid">
                <div className="hp-mini-card"><span>Gold Strategy</span><strong>Income</strong></div>
                <div className="hp-mini-card"><span>Target Yield</span><strong>Up to 4%</strong></div>
                <div className="hp-mini-card"><span>Risk Objective</span><strong>10%</strong></div>
                <div className="hp-mini-card"><span>Next Report</span><strong>Month End</strong></div>
              </div>
              <div className="hp-floating"><strong>Compounding Engine:</strong> withdraw monthly income or automatically reinvest profits to grow your gold portfolio month after month.</div>
            </div>
          </div>
        </div>
      </header>

      {/* THE IDEA */}
      <section id="idea" className="hp-section">
        <div className="container">
          <div className="hp-section-head">
            <div className="hp-kicker">The Platform Idea</div>
            <h2 className="hp-h2">Gold should do more than sit in a vault.</h2>
            <p className="muted">8QMM Gold brings together three powerful investment concepts into one user-friendly experience: digital gold ownership, yield generation on precious metals, and luxury monthly-income positioning.</p>
          </div>
          <div className="hp-cards-4">
            {[{n:'01',t:'Digital Gold Ownership',d:'Buy and monitor gold exposure digitally without storage hassle, shipping concerns, or large entry barriers.'},{n:'02',t:'Precious Metals Yield',d:'Access professionally managed gold and silver strategies designed to seek monthly performance opportunities.'},{n:'03',t:'Compounded Interest Option',d:'Instead of withdrawing monthly profit, investors can reinvest positive performance so the next month starts from a larger balance.'},{n:'04',t:'Luxury Wealth Experience',d:'A premium investor journey with clear onboarding, transparent reports, dedicated support, and long-term growth positioning.'}].map(c => (
              <div key={c.n} className="hp-info-card"><div className="hp-icon">{c.n}</div><h3>{c.t}</h3><p className="muted">{c.d}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="start" className="hp-section">
        <div className="container">
          <div className="hp-section-head">
            <div className="hp-kicker">How It Works</div>
            <h2 className="hp-h2">Open your gold investment account in two simple steps.</h2>
          </div>
          <div className="hp-process">
            <div className="hp-step"><div className="hp-step-num">1</div><h3>Register Your Information</h3><p className="muted">Create your investor profile and complete secure verification through our online onboarding process.</p></div>
            <div className="hp-step"><div className="hp-step-num">2</div><h3>Fund Your Account</h3><p className="muted">Start from $1,000, select your investment strategy, and choose whether to withdraw or reinvest monthly performance.</p></div>
          </div>
        </div>
      </section>

      {/* PROGRAMS */}
      <section id="programs" className="hp-section">
        <div className="container">
          <div className="hp-section-head">
            <div className="hp-kicker">Investment Programs</div>
            <h2 className="hp-h2">Choose the gold strategy that matches your risk profile.</h2>
            <p className="muted">Target returns are objectives only and are not guaranteed. Capital is at risk.</p>
          </div>
          <div className="hp-programs">
            <div className="hp-program-card hp-featured">
              <span className="hp-program-tag">Conservative</span>
              <h3>Gold Income Program</h3>
              <p className="muted">Designed for investors seeking disciplined growth, monthly income opportunities, and lower risk exposure.</p>
              <div className="hp-metrics">
                <div className="hp-metric"><span>Monthly Target Yield</span><strong>Up to 4%</strong></div>
                <div className="hp-metric"><span>Risk Objective</span><strong>10%</strong></div>
                <div className="hp-metric"><span>Minimum Start</span><strong>$1,000</strong></div>
                <div className="hp-metric"><span>Focus</span><strong>Gold & Silver</strong></div>
              </div>
              <ul><li>Monthly performance reporting</li><li>Option to withdraw monthly profit</li><li>Option to reinvest for compounding</li><li>Designed for capital preservation</li></ul>
            </div>
            <div className="hp-program-card">
              <span className="hp-program-tag">Growth</span>
              <h3>Gold Growth Program</h3>
              <p className="muted">Designed for investors seeking higher return potential through active precious metals market exposure.</p>
              <div className="hp-metrics">
                <div className="hp-metric"><span>Monthly Target Yield</span><strong>Up to 8%</strong></div>
                <div className="hp-metric"><span>Risk Objective</span><strong>20%</strong></div>
                <div className="hp-metric"><span>Minimum Start</span><strong>$1,000</strong></div>
                <div className="hp-metric"><span>Focus</span><strong>Dynamic</strong></div>
              </div>
              <ul><li>Higher growth potential</li><li>Active market opportunities</li><li>Compound growth options</li><li>For higher-risk investors</li></ul>
            </div>
          </div>
        </div>
      </section>

      {/* COMPOUNDING */}
      <section id="compound" className="hp-section">
        <div className="container hp-compound-wrap">
          <div className="hp-compound-card">
            <div className="hp-kicker">Compounded Interest</div>
            <h2 className="hp-h2">Let your monthly performance work for the next month.</h2>
            <p className="muted">Compounding is the core wealth-building option on the platform. When positive monthly performance is reinvested, your new balance becomes the base for the next month&#39;s calculation.</p>
            <div className="hp-compound-highlight">Profit on profit</div>
            <p className="muted">Investors can choose: take monthly income, reinvest automatically, or combine both based on their personal cash-flow needs.</p>
          </div>
          <div className="hp-compound-card">
            <h3>Example: $10,000 at 4% monthly target</h3>
            <div className="hp-compare-bars">
              <div className="hp-bar"><span><strong>Withdraw monthly profits</strong><strong>$14,800 after 12 months*</strong></span><div className="hp-bar-line"><div className="hp-bar-fill" style={{width:'74%'}} /></div></div>
              <div className="hp-bar"><span><strong>Reinvest monthly profits</strong><strong>$16,010 after 12 months*</strong></span><div className="hp-bar-line"><div className="hp-bar-fill" style={{width:'86%'}} /></div></div>
              <div className="hp-bar"><span><strong>Compounding advantage</strong><strong>+$1,210 more*</strong></span><div className="hp-bar-line"><div className="hp-bar-fill" style={{width:'38%'}} /></div></div>
            </div>
            <p className="muted" style={{marginTop:18}}>*Illustrative only. Returns are targets, not guarantees. Market losses can occur.</p>
          </div>
        </div>
      </section>

      {/* EXAMPLES */}
      <section id="examples" className="hp-section">
        <div className="container">
          <div className="hp-section-head">
            <div className="hp-kicker">Performance Examples</div>
            <h2 className="hp-h2">Monthly income or compounded growth — the investor chooses.</h2>
            <p className="muted">These examples are hypothetical and for illustration only. They do not represent guaranteed returns.</p>
          </div>
          <div className="hp-tables">
            <div className="hp-table-card"><h3>Conservative Program — 4% Monthly Target</h3><table><thead><tr><th>Capital</th><th>Monthly</th><th>Annual Simple</th></tr></thead><tbody><tr><td><strong>$1,000</strong></td><td>$40</td><td>$480</td></tr><tr><td><strong>$10,000</strong></td><td>$400</td><td>$4,800</td></tr><tr><td><strong>$100,000</strong></td><td>$4,000</td><td>$48,000</td></tr></tbody></table></div>
            <div className="hp-table-card"><h3>Growth Program — 8% Monthly Target</h3><table><thead><tr><th>Capital</th><th>Monthly</th><th>Annual Simple</th></tr></thead><tbody><tr><td><strong>$1,000</strong></td><td>$80</td><td>$960</td></tr><tr><td><strong>$10,000</strong></td><td>$800</td><td>$9,600</td></tr><tr><td><strong>$100,000</strong></td><td>$8,000</td><td>$96,000</td></tr></tbody></table></div>
          </div>
        </div>
      </section>

      {/* CALCULATOR */}
      <section className="hp-section">
        <div className="container hp-calculator">
          <div className="hp-section-head">
            <div className="hp-kicker">Investor Calculator</div>
            <h2 className="hp-h2">Estimate monthly income and compound growth.</h2>
            <p className="muted">Enter your capital and select a strategy to compare monthly income, simple annual income, and 12-month compounded value.</p>
          </div>
          <div className="hp-calc-panel">
            <label>Investment Amount</label>
            <input type="number" min="1000" value={calcAmount} onChange={e => setCalcAmount(Math.max(Number(e.target.value),0))} />
            <label>Program</label>
            <select value={calcRate} onChange={e => setCalcRate(Number(e.target.value))}>
              <option value={0.04}>Conservative — up to 4% monthly</option>
              <option value={0.08}>Growth — up to 8% monthly</option>
            </select>
            <div className="hp-calc-result">
              <div className="hp-result-box"><span>Estimated Monthly</span><strong>{usdFmt(monthly)}</strong></div>
              <div className="hp-result-box"><span>Annual Simple</span><strong>{usdFmt(annualSimple)}</strong></div>
              <div className="hp-result-box"><span>12-Month Compound Value</span><strong>{usdFmt(compoundVal)}</strong></div>
              <div className="hp-result-box"><span>Minimum Start</span><strong>$1,000</strong></div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section id="trust" className="hp-section">
        <div className="container">
          <div className="hp-section-head">
            <div className="hp-kicker">Trust & Transparency</div>
            <h2 className="hp-h2">Built around investor confidence.</h2>
          </div>
          <div className="hp-trust-grid">
            {[{t:'Secure Onboarding',d:'Structured registration and verification process for eligible investors.'},{t:'Clear Reporting',d:'Monthly performance updates and dashboard visibility.'},{t:'Risk Framework',d:'Defined risk objectives for each program and disciplined strategy controls.'},{t:'Investor Support',d:'Dedicated support for deposits, withdrawals, reports, and reinvestment choices.'}].map(c => (
              <div key={c.t} className="hp-trust-card"><h3>{c.t}</h3><p className="muted">{c.d}</p></div>
            ))}
          </div>
          <div className="hp-risk-box"><strong>Important Risk Notice:</strong> This website is for concept and marketing purposes only. Investment services may require financial licensing, custody arrangements, AML/KYC, audited reporting, legal agreements, and jurisdiction-specific regulatory approval. Returns are not guaranteed and capital is at risk.</div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="hp-section">
        <div className="container">
          <div className="hp-section-head">
            <div className="hp-kicker">FAQ</div>
            <h2 className="hp-h2">Common investor questions.</h2>
          </div>
          <div className="hp-faq-grid">
            {[{q:'Are returns guaranteed?',a:'No. All returns are target objectives only. Market conditions can affect performance and capital value.'},{q:'Can I withdraw monthly profits?',a:'Investors may choose monthly distributions when eligible and when positive account performance is generated.'},{q:'Can I reinvest profits?',a:'Yes. Investors can choose quarterly, semi-annual, or annual compounding options.'},{q:'What markets are used?',a:'Strategies focus on precious metals, primarily gold and silver market opportunities.'}].map(f => (
              <div key={f.q} className="hp-faq-item"><h3>{f.q}</h3><p className="muted">{f.a}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="hp-cta">
        <div className="container">
          <div className="hp-cta-box">
            <h2 className="hp-h2">Start building your digital gold portfolio today.</h2>
            <p>Join a modern generation of investors using gold strategies designed for wealth preservation, monthly income opportunities, and long-term compounded growth.</p>
            <div className="hp-hero-actions" style={{justifyContent:'center'}}>
              <a className="hp-btn hp-btn-primary" href="/register">Open Gold Account</a>
              <a className="hp-btn hp-btn-secondary" href="/login">Client Login</a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="hp-footer">
        <div className="container hp-footer-inner">
          <div>© 2026 8QMM Gold. Digital Gold Wealth Platform.</div>
          <div>Risk Disclosure • Terms • Privacy • Compliance</div>
        </div>
      </footer>
    </div>
  );
}
