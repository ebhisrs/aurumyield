'use client';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setLoading(true); setErr('');
    try {
      // Try admin login first
      let res = await fetch('/api/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, loginType: 'admin' }),
      });
      let data = await res.json();

      // If admin login fails, try client login
      if (!res.ok) {
        res = await fetch('/api/auth', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: pass, loginType: 'client' }),
        });
        data = await res.json();
      }

      if (!res.ok) throw new Error(data.error || 'Invalid credentials');

      localStorage.setItem('ay_token', data.token);
      localStorage.setItem('ay_role', data.role);
      if (data.permissions) localStorage.setItem('ay_permissions', JSON.stringify(data.permissions));
      if (data.user) localStorage.setItem('ay_user', JSON.stringify(data.user));

      if (data.role === 'superadmin') window.location.href = '/superadmin';
      else if (data.role === 'admin') window.location.href = '/admin';
      else window.location.href = '/dashboard';
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div>
      <nav className="site-nav"><div className="container nav-inner"><a className="brand" href="/"><img src="/logo-dark.jpeg" alt="8QMM Gold" style={{width:42,height:42,borderRadius:"50%",objectFit:"cover"}} /><span>8QMM Gold</span></a></div></nav>
      <main style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',padding:'80px 16px'}}>
        <div className="panel" style={{width:'100%',maxWidth:440,padding:'clamp(24px,4vw,36px)'}}>
          <div style={{textAlign:'center',marginBottom:24}}>
            <img src="/logo-dark.jpeg" alt="8QMM Gold" style={{width:56,height:56,borderRadius:"50%",objectFit:"cover",margin:"0 auto 16px"}} />
            <h2 style={{fontSize:24,fontWeight:800}}>Sign In</h2>
            <p className="muted" style={{fontSize:13,marginTop:6}}>Access your account</p>
          </div>

          {err && <div style={{color:'#f07f7f',fontSize:13,textAlign:'center',marginBottom:12,padding:10,borderRadius:12,background:'rgba(240,127,127,.08)',border:'1px solid rgba(240,127,127,.2)'}}>{err}</div>}

          <form onSubmit={submit}>
            <div className="field" style={{marginBottom:16}}>
              <label>Email or Username</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email or username" required />
            </div>
            <div className="field" style={{marginBottom:24}}>
              <label>Password</label>
              <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" required />
            </div>
            <button type="submit" className="btn btn-primary" style={{width:'100%',opacity:loading?0.6:1}} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{textAlign:'center',marginTop:20}}>
            <p className="muted" style={{fontSize:12}}>Don&apos;t have an account? <a href="/register" style={{color:'var(--gold2)'}}>Open Account</a></p>
          </div>
        </div>
      </main>
    </div>
  );
}
