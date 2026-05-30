'use client';
import { useState } from 'react';

export default function RegisterPage() {
  const [form, setForm] = useState({ fullName:'', email:'', phone:'', country:'', program:'', amount:'', profitPreference:'', investorType:'', experience:'', risk:'', message:'', password:'', confirm:'' });
  const [checks, setChecks] = useState([false,false,false]);
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({...f, [k]: v}));
  const toggleCheck = (i) => setChecks(c => c.map((v, j) => j === i ? !v : v));

  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (!checks.every(Boolean)) { setErr('Please accept all declarations'); return; }
    if (form.password !== form.confirm) { setErr('Passwords do not match'); return; }
    if (form.password.length < 6) { setErr('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(true);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div>
      <nav className="site-nav"><div className="container nav-inner">
        <a className="brand" href="/"><img src="/logo-dark.jpeg" alt="8QMM Gold" style={{width:42,height:42,borderRadius:"50%",objectFit:"cover"}} /><span>8QMM Gold</span></a>
        <a className="btn btn-secondary" href="/">Back to Website</a>
      </div></nav>

      <main style={{padding:'clamp(60px,10vw,100px) 0 60px'}}>
        <div className="container reg-grid">
          {/* LEFT SIDE */}
          <aside className="panel reg-aside" style={{padding:'clamp(20px,3vw,28px)'}}>
            <div className="eyebrow">OPEN GOLD ACCOUNT</div>
            <h1 style={{fontSize:'clamp(36px,4.5vw,56px)',lineHeight:1,letterSpacing:-2,margin:'18px 0 20px'}}>
              Start your <span className="gold">digital gold</span> journey.
            </h1>
            <p className="muted" style={{fontSize:16,marginBottom:22}}>Register your information, choose your preferred gold strategy, and request investor onboarding.</p>
            <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
              {['Minimum $1,000','Monthly Reporting','Risk-Managed Programs'].map(p => (
                <span key={p} style={{border:'1px solid var(--white)',background:'rgba(255,255,255,.035)',color:'#ddd2bd',padding:'9px 12px',borderRadius:999,fontSize:13}}>{p}</span>
              ))}
            </div>
            <div style={{display:'flex',gap:14,margin:'20px 0'}}>
              <div style={{width:34,height:34,borderRadius:'50%',display:'grid',placeItems:'center',background:'rgba(217,164,65,.16)',color:'var(--gold2)',fontWeight:900,border:'1px solid var(--line)',flexShrink:0}}>1</div>
              <div><strong>Register your information</strong><p className="muted" style={{fontSize:13}}>Submit your basic details and investment preferences.</p></div>
            </div>
            <div style={{display:'flex',gap:14}}>
              <div style={{width:34,height:34,borderRadius:'50%',display:'grid',placeItems:'center',background:'rgba(217,164,65,.16)',color:'var(--gold2)',fontWeight:900,border:'1px solid var(--line)',flexShrink:0}}>2</div>
              <div><strong>Fund your account</strong><p className="muted" style={{fontSize:13}}>After approval, receive instructions to fund your account securely.</p></div>
            </div>
            <div className="notice" style={{marginTop:22}}>
              <strong>Important:</strong> Target returns are investment objectives, not guarantees. Capital is at risk.
            </div>
          </aside>

          {/* RIGHT FORM */}
          <section className="panel" style={{padding:'clamp(20px,3vw,30px)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:26,gap:18,flexWrap:'wrap'}}>
              <div>
                <div className="eyebrow">INVESTOR REGISTRATION</div>
                <h2 style={{fontSize:22,fontWeight:800,marginTop:10}}>Open Account Form</h2>
                <p className="muted" style={{fontSize:13,marginTop:6}}>Final onboarding may require identity verification and signed agreements.</p>
              </div>
              <span style={{padding:'8px 12px',borderRadius:999,background:'rgba(217,164,65,.1)',border:'1px solid var(--line)',color:'var(--gold2)',fontSize:12,fontWeight:800,whiteSpace:'nowrap'}}>Secure Registration</span>
            </div>

            {success ? (
              <div className="success-msg" style={{padding:24,textAlign:'center'}}>
                <div style={{fontSize:48,marginBottom:16}}>✓</div>
                <h3 style={{fontSize:20,fontWeight:800,marginBottom:8}}>Registration Submitted!</h3>
                <p className="muted">Your account is pending admin approval. You will be contacted shortly.</p>
                <a href="/login" className="btn btn-primary" style={{marginTop:20}}>Go to Login</a>
              </div>
            ) : (
              <form onSubmit={submit}>
                {err && <div style={{color:'#f07f7f',fontSize:13,marginBottom:16,padding:12,borderRadius:12,background:'rgba(240,127,127,.08)',border:'1px solid rgba(240,127,127,.2)'}}>{err}</div>}

                <fieldset style={{border:0,marginBottom:26}}>
                  <legend style={{fontSize:18,fontWeight:900,marginBottom:14,color:'var(--gold2)'}}>1. Personal Information</legend>
                  <div className="fields">
                    <div className="field"><label>Full Name *</label><input required value={form.fullName} onChange={e => set('fullName',e.target.value)} placeholder="Your full name" /></div>
                    <div className="field"><label>Email Address *</label><input required type="email" value={form.email} onChange={e => set('email',e.target.value)} placeholder="name@email.com" /></div>
                    <div className="field"><label>Phone / WhatsApp *</label><input required value={form.phone} onChange={e => set('phone',e.target.value)} placeholder="+971 / +962 / +966" /></div>
                    <div className="field"><label>Country of Residence *</label><input required value={form.country} onChange={e => set('country',e.target.value)} placeholder="UAE, Jordan, Saudi Arabia..." /></div>
                  </div>
                </fieldset>

                <fieldset style={{border:0,marginBottom:26}}>
                  <legend style={{fontSize:18,fontWeight:900,marginBottom:14,color:'var(--gold2)'}}>2. Investment Preferences</legend>
                  <div className="fields">
                    <div className="field"><label>Preferred Program *</label>
                      <select required value={form.program} onChange={e => set('program',e.target.value)}>
                        <option value="">Select program</option>
                        <option value="Conservative">Conservative Gold Income — Target up to 4% monthly</option>
                        <option value="Growth">Gold Growth Program — Target up to 8% monthly</option>
                        <option value="">Not sure — I need guidance</option>
                      </select>
                    </div>
                    <div className="field"><label>Starting Amount *</label>
                      <select required value={form.amount} onChange={e => set('amount',e.target.value)}>
                        <option value="">Select amount</option>
                        <option>$1,000 - $5,000</option><option>$5,000 - $10,000</option><option>$10,000 - $50,000</option><option>$50,000 - $100,000</option><option>$100,000+</option>
                      </select>
                    </div>
                    <div className="field"><label>Profit Preference *</label>
                      <select required value={form.profitPreference} onChange={e => set('profitPreference',e.target.value)}>
                        <option value="">Select option</option>
                        <option>Monthly income withdrawals</option><option>Reinvest profits quarterly</option><option>Reinvest profits semi-annually</option><option>Reinvest profits annually</option>
                      </select>
                    </div>
                    <div className="field"><label>Investor Type *</label>
                      <select required value={form.investorType} onChange={e => set('investorType',e.target.value)}>
                        <option value="">Select type</option>
                        <option>Individual investor</option><option>Business / Company</option><option>Family office</option><option>Professional / accredited investor</option>
                      </select>
                    </div>
                  </div>
                </fieldset>

                <fieldset style={{border:0,marginBottom:26}}>
                  <legend style={{fontSize:18,fontWeight:900,marginBottom:14,color:'var(--gold2)'}}>3. Account Security</legend>
                  <div className="fields">
                    <div className="field"><label>Create Password *</label><input required type="password" value={form.password} onChange={e => set('password',e.target.value)} placeholder="Min 6 characters" /></div>
                    <div className="field"><label>Confirm Password *</label><input required type="password" value={form.confirm} onChange={e => set('confirm',e.target.value)} placeholder="Repeat password" /></div>
                  </div>
                </fieldset>

                <fieldset style={{border:0,marginBottom:26}}>
                  <legend style={{fontSize:18,fontWeight:900,marginBottom:14,color:'var(--gold2)'}}>4. Declarations</legend>
                  <div style={{display:'grid',gap:12}}>
                    {[
                      'I understand that target returns are not guaranteed and my capital may be at risk.',
                      'I confirm that the information submitted is accurate and I agree to be contacted for onboarding.',
                      'I agree that final account approval may require KYC, AML checks, and signed investment documents.',
                    ].map((text, i) => (
                      <label key={i} style={{display:'flex',gap:10,alignItems:'flex-start',color:'var(--muted)',fontSize:13,cursor:'pointer'}}>
                        <input type="checkbox" checked={checks[i]} onChange={() => toggleCheck(i)} style={{width:18,height:18,marginTop:2,accentColor:'#d9a441'}} />
                        <span>{text}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
                  <button type="submit" className="btn btn-primary" style={{opacity:loading?0.6:1}} disabled={loading}>
                    {loading ? 'Submitting...' : 'Submit Registration'}
                  </button>
                  <span className="muted" style={{fontSize:12}}>No funds are collected through this form.</span>
                </div>
              </form>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
