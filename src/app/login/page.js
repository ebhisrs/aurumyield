'use client';
import { useState } from 'react';

export default function LoginPage() {
  const [tab, setTab] = useState('client');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setLoading(true); setErr('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, loginType: tab }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('ay_token', data.token);
      localStorage.setItem('ay_role', data.role);
      if (data.user) localStorage.setItem('ay_user', JSON.stringify(data.user));
      window.location.href = data.role === 'admin' ? '/admin' : '/dashboard';
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div>
      <nav className="site-nav"><div className="container nav-inner"><a className="brand" href="/"><span className="brand-mark">A</span><span>AurumYield</span></a></div></nav>
      <main style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',padding:'80px 20px'}}>
        <div className="panel" style={{width:420,padding:36}}>
          <div style={{textAlign:'center',marginBottom:24}}>
            <div className="brand-mark" style={{width:52,height:52,fontSize:22,margin:'0 auto 16px'}}>A</div>
            <h2 style={{fontSize:24,fontWeight:800}}>Sign In</h2>
            <p className="muted" style={{fontSize:13,marginTop:6}}>Access your account</p>
          </div>

          <div style={{display:'flex',gap:8,marginBottom:24}}>
            <button onClick={() => setTab('client')} className={`btn ${tab==='client'?'btn-primary':'btn-secondary'}`} style={{flex:1,fontSize:13}}>Client</button>
            <button onClick={() => setTab('admin')} className={`btn ${tab==='admin'?'btn-primary':'btn-secondary'}`} style={{flex:1,fontSize:13}}>Admin</button>
          </div>

          {err && <div style={{color:'#f07f7f',fontSize:13,textAlign:'center',marginBottom:12}}>{err}</div>}

          <form onSubmit={submit}>
            <div className="field" style={{marginBottom:16}}>
              <label>{tab === 'admin' ? 'Username' : 'Email'}</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder={tab === 'admin' ? 'admin' : 'name@email.com'} required />
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
            <p className="muted" style={{fontSize:12}}>
              {tab === 'client' ? (
                <>Don&apos;t have an account? <a href="/register" style={{color:'var(--gold2)'}}>Open Account</a></>
              ) : (
                <>Default: admin / admin123</>
              )}
            </p>
            {tab === 'client' && (
              <p className="muted" style={{fontSize:11,marginTop:8}}>Demo: ahmed@example.com / client123</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
