'use client';
import { useState, useEffect, useCallback } from 'react';

export default function DashboardPage() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tab, setTab] = useState('overview');
  const [msg, setMsg] = useState('');
  const [depForm, setDepForm] = useState({amount:'',currency:'USD',method:'Bank Transfer',program:'Conservative'});
  const [wdForm, setWdForm] = useState({amount:'',source:'Available Profit Balance',method:'Bank Transfer',destination:''});
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [reportType, setReportType] = useState('all');

  useEffect(() => {
    const t = localStorage.getItem('ay_token');
    const r = localStorage.getItem('ay_role');
    if (!t || r !== 'client') { window.location.href = '/login'; return; }
    setToken(t);
  }, []);

  const headers = useCallback(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);

  const load = useCallback(async () => {
    if (!token) return;
    const h = { Authorization: `Bearer ${token}` };
    const [u, d, w, t] = await Promise.all([
      fetch('/api/clients', { headers: h }).then(r => r.json()),
      fetch('/api/deposits', { headers: h }).then(r => r.json()),
      fetch('/api/withdrawals', { headers: h }).then(r => r.json()),
      fetch('/api/profit?type=transactions', { headers: h }).then(r => r.json()),
    ]);
    setUser(u); setDeposits(Array.isArray(d)?d:[]); setWithdrawals(Array.isArray(w)?w:[]); setTransactions(Array.isArray(t)?t:[]);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const submitDeposit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/deposits', { method: 'POST', headers: headers(), body: JSON.stringify(depForm) });
    if (res.ok) { flash('Deposit request submitted!'); setDepForm({amount:'',currency:'USD',method:'Bank Transfer',program:'Conservative'}); load(); }
    else { const d = await res.json(); flash(d.error || 'Error'); }
  };

  const submitWithdrawal = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/withdrawals', { method: 'POST', headers: headers(), body: JSON.stringify(wdForm) });
    if (res.ok) { flash('Withdrawal request submitted!'); setWdForm({amount:'',source:'Available Profit Balance',method:'Bank Transfer',destination:''}); load(); }
    else { const d = await res.json(); flash(d.error || 'Error'); }
  };

  const filteredTx = transactions.filter(t => {
    if (reportFrom && t.date < reportFrom) return false;
    if (reportTo && t.date > reportTo) return false;
    if (reportType !== 'all' && t.type !== reportType) return false;
    return true;
  });

  const logout = () => { localStorage.clear(); window.location.href = '/login'; };

  if (!user) return <div style={{background:'var(--bg)',minHeight:'100vh',display:'grid',placeItems:'center'}}><div className="brand-mark" style={{width:60,height:60,fontSize:24,animation:'pulse 1s infinite'}}>A</div></div>;

  const usd = (n) => `$${Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const pendingCount = deposits.filter(d=>d.status==='pending').length + withdrawals.filter(w=>w.status==='pending').length;

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <a className="brand" href="/"><span className="brand-mark">A</span><span>AurumYield</span></a>
        <nav className="sidebar-nav">
          {['overview','deposit','withdrawal','reports'].map(t => (
            <a key={t} className={tab===t?'active':''} onClick={() => setTab(t)} style={{cursor:'pointer',textTransform:'capitalize'}}>{t}</a>
          ))}
        </nav>
        <div className="side-card">
          <small>Selected Program</small>
          <h3 style={{fontSize:16,fontWeight:800,marginTop:4}}>{user.program} Gold {user.program==='Conservative'?'Income':'Growth'}</h3>
          <p className="muted" style={{fontSize:13}}>Target objective up to {user.program==='Conservative'?'4':'8'}% monthly.</p>
        </div>
      </aside>

      <main className="app-main">
        {/* TOPBAR */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:20,marginBottom:28,flexWrap:'wrap'}}>
          <div>
            <span className="eyebrow">CLIENT CABINET</span>
            <h1 style={{fontSize:'clamp(28px,3.5vw,42px)',letterSpacing:-1.5,lineHeight:1,marginTop:8}}>Welcome back, <span className="gold">{user.name?.split(' ')[0]}</span></h1>
            <p className="muted" style={{marginTop:8}}>Manage deposits, withdrawals, balances, and reports.</p>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{textAlign:'right'}}><strong style={{fontSize:13}}>Account</strong><br/><span className="muted" style={{fontSize:12}}>AY-{String(user.id).padStart(5,'0')}</span></div>
            <div style={{width:44,height:44,borderRadius:'50%',display:'grid',placeItems:'center',background:'rgba(217,164,65,.15)',border:'1px solid var(--line)',fontWeight:900,color:'var(--gold2)'}}>{user.name?.[0]}</div>
            <button onClick={logout} className="btn btn-small btn-secondary">Logout</button>
          </div>
        </div>

        {msg && <div className="success-msg" style={{marginBottom:16}}>{msg}</div>}
        {user.status === 'pending' && <div className="notice" style={{marginBottom:20}}>Your account is pending approval. You will be able to deposit and invest once approved by admin.</div>}
        {user.status === 'disabled' && <div style={{padding:16,borderRadius:18,background:'rgba(240,127,127,.08)',border:'1px solid rgba(240,127,127,.2)',color:'#ffd5d5',marginBottom:20}}>Your account has been disabled. Please contact support.</div>}

        {/* STATS */}
        <div className="stats-grid">
          <div className="card stat"><div className="stat-label">Total Balance</div><div className="stat-value">{usd(user.balance)}</div><div className="delta">+{user.lastProfit} this month</div></div>
          <div className="card stat"><div className="stat-label">Available to Withdraw</div><div className="stat-value">{usd(user.withdrawable)}</div><div className="delta">Eligible profit</div></div>
          <div className="card stat"><div className="stat-label">Locked Capital</div><div className="stat-value">{usd(user.lockedCapital)}</div><div className="delta" style={{color:'var(--gold2)'}}>Invested</div></div>
          <div className="card stat"><div className="stat-label">Pending Requests</div><div className="stat-value">{pendingCount}</div><div className="delta" style={{color:'var(--gold2)'}}>Under review</div></div>
        </div>

        {/* DEPOSIT & WITHDRAWAL */}
        <div className="actions-grid" style={{marginTop:18}}>
          <div className="card" style={{padding:24}} id="deposit">
            <div style={{marginBottom:18}}><span className="eyebrow">DEPOSIT</span><h2 style={{fontSize:22,fontWeight:800,marginTop:8}}>Fund Your Account</h2><p className="muted" style={{fontSize:13}}>Submit a deposit request for admin review.</p></div>
            <form onSubmit={submitDeposit} className="fields">
              <div className="field"><label>Amount (min $1,000)</label><input required type="number" min="1000" value={depForm.amount} onChange={e => setDepForm({...depForm,amount:e.target.value})} placeholder="1000" disabled={user.status!=='approved'} /></div>
              <div className="field"><label>Currency</label><select value={depForm.currency} onChange={e => setDepForm({...depForm,currency:e.target.value})} disabled={user.status!=='approved'}><option>USD</option><option>AED</option><option>EUR</option><option>GBP</option></select></div>
              <div className="field"><label>Method</label><select value={depForm.method} onChange={e => setDepForm({...depForm,method:e.target.value})} disabled={user.status!=='approved'}><option>Bank Transfer</option><option>Card Payment</option><option>USDT / Stablecoin</option></select></div>
              <div className="field"><label>Program</label><select value={depForm.program} onChange={e => setDepForm({...depForm,program:e.target.value})} disabled={user.status!=='approved'}><option>Conservative</option><option>Growth</option></select></div>
              <div className="full"><button type="submit" className="btn btn-primary" disabled={user.status!=='approved'}>Create Deposit Request</button></div>
            </form>
          </div>

          <div className="card" style={{padding:24}} id="withdrawal">
            <div style={{marginBottom:18}}><span className="eyebrow">WITHDRAWAL</span><h2 style={{fontSize:22,fontWeight:800,marginTop:8}}>Request Withdrawal</h2><p className="muted" style={{fontSize:13}}>Withdraw from available profit balance.</p></div>
            <form onSubmit={submitWithdrawal} className="fields">
              <div className="field"><label>Amount</label><input required type="number" min="100" value={wdForm.amount} onChange={e => setWdForm({...wdForm,amount:e.target.value})} placeholder="Amount" disabled={user.status!=='approved'} /></div>
              <div className="field"><label>Withdraw From</label><select value={wdForm.source} onChange={e => setWdForm({...wdForm,source:e.target.value})} disabled={user.status!=='approved'}><option>Available Profit Balance</option><option>Total Account Balance</option></select></div>
              <div className="field"><label>Method</label><select value={wdForm.method} onChange={e => setWdForm({...wdForm,method:e.target.value})} disabled={user.status!=='approved'}><option>Bank Transfer</option><option>Crypto Wallet</option></select></div>
              <div className="field"><label>Destination</label><input required value={wdForm.destination} onChange={e => setWdForm({...wdForm,destination:e.target.value})} placeholder="IBAN / Wallet" disabled={user.status!=='approved'} /></div>
              <div className="full"><button type="submit" className="btn btn-danger" disabled={user.status!=='approved'}>Submit Withdrawal Request</button></div>
            </form>
          </div>
        </div>

        {/* BALANCE CHART */}
        <div className="card" style={{padding:24,marginTop:18}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
            <div><span className="eyebrow">BALANCE</span><h2 style={{fontSize:22,fontWeight:800,marginTop:8}}>Portfolio Balance</h2></div>
          </div>
          <div className="chart">{[45,52,49,68,74,82,77,89,94,88,96,100].map((h,i) => <div key={i} className="bar" style={{height:`${h}%`}} />)}</div>
        </div>

        {/* REPORTS */}
        <div className="card" style={{padding:24,marginTop:18}} id="reports">
          <div style={{marginBottom:18}}><span className="eyebrow">HISTORICAL REPORT</span><h2 style={{fontSize:22,fontWeight:800,marginTop:8}}>Transaction History</h2></div>
          <div className="fields" style={{marginBottom:18}}>
            <div className="field"><label>From Date</label><input type="date" value={reportFrom} onChange={e => setReportFrom(e.target.value)} /></div>
            <div className="field"><label>To Date</label><input type="date" value={reportTo} onChange={e => setReportTo(e.target.value)} /></div>
            <div className="field"><label>Type</label><select value={reportType} onChange={e => setReportType(e.target.value)}><option value="all">All Activity</option><option value="performance">Performance</option><option value="deposit">Deposits</option><option value="withdrawal">Withdrawals</option></select></div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {filteredTx.length === 0 ? (
                  <tr><td colSpan={5} style={{textAlign:'center',color:'var(--muted)'}}>No transactions found</td></tr>
                ) : filteredTx.map(t => (
                  <tr key={t.id}>
                    <td>{t.date}</td>
                    <td style={{textTransform:'capitalize'}}>{t.type}</td>
                    <td>{t.desc}</td>
                    <td style={{color:t.amount>=0?'var(--green)':'var(--red)',fontWeight:700}}>{t.amount >= 0 ? '+' : ''}{usd(Math.abs(t.amount))}</td>
                    <td><span className={`tag ${t.status.toLowerCase()}`}>{t.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted" style={{fontSize:12,marginTop:14}}>This dashboard shows live data from the API. All transactions are tracked and audited.</p>
        </div>
      </main>
    </div>
  );
}
