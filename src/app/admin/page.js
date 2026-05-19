'use client';
import { useState, useEffect, useCallback } from 'react';

export default function AdminPage() {
  const [token, setToken] = useState(null);
  const [tab, setTab] = useState('overview');
  const [clients, setClients] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [audit, setAudit] = useState([]);
  const [msg, setMsg] = useState('');
  const [profitForm, setProfitForm] = useState({program:'Conservative',percentage:'4',note:''});
  const [showProfitModal, setShowProfitModal] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('ay_token');
    const r = localStorage.getItem('ay_role');
    if (!t || (r !== 'admin' && r !== 'superadmin')) { window.location.href = '/login'; return; }
    setToken(t);
  }, []);

  const h = useCallback(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);

  const load = useCallback(async () => {
    if (!token) return;
    const hd = { Authorization: `Bearer ${token}` };
    const [c, d, w, a] = await Promise.all([
      fetch('/api/clients', { headers: hd }).then(r => r.json()),
      fetch('/api/deposits', { headers: hd }).then(r => r.json()),
      fetch('/api/withdrawals', { headers: hd }).then(r => r.json()),
      fetch('/api/profit?type=audit', { headers: hd }).then(r => r.json()),
    ]);
    setClients(Array.isArray(c)?c:[]); setDeposits(Array.isArray(d)?d:[]); setWithdrawals(Array.isArray(w)?w:[]); setAudit(Array.isArray(a)?a:[]);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };
  const usd = (n) => `$${Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;

  const clientAction = async (userId, action) => {
    await fetch('/api/clients', { method: 'PUT', headers: h(), body: JSON.stringify({ userId, action }) });
    flash(`Client ${action}d`); load();
  };

  const depositAction = async (depositId, action) => {
    await fetch('/api/deposits', { method: 'POST', headers: h(), body: JSON.stringify({ depositId, action }) });
    flash(`Deposit ${action}d`); load();
  };

  const withdrawalAction = async (withdrawalId, action) => {
    const res = await fetch('/api/withdrawals', { method: 'POST', headers: h(), body: JSON.stringify({ withdrawalId, action }) });
    const data = await res.json();
    if (!res.ok) flash(data.error || 'Error');
    else { flash(`Withdrawal ${action}d`); load(); }
  };

  const postProfit = async () => {
    const res = await fetch('/api/profit', { method: 'POST', headers: h(), body: JSON.stringify(profitForm) });
    const data = await res.json();
    if (!res.ok) flash(data.error || 'Error');
    else { flash(`Profit posted to ${data.clients} clients. Total: ${usd(data.totalProfit)}`); setShowProfitModal(false); load(); }
  };

  const logout = () => { localStorage.clear(); window.location.href = '/login'; };

  const activeClients = clients.filter(c => c.status === 'approved');
  const totalAum = activeClients.reduce((s, c) => s + (c.balance || 0), 0);
  const pendingDeposits = deposits.filter(d => d.status === 'pending');
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
  const pendingClients = clients.filter(c => c.status === 'pending');
  const eligibleForProfit = clients.filter(c => c.program === profitForm.program && c.status === 'approved');

  if (!token) return <div style={{background:'var(--bg)',minHeight:'100vh'}} />;

  const navItems = ['overview','profit','clients','deposits','withdrawals','audit'];

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <div className="brand" style={{marginBottom:34}}><div className="brand-mark">A</div><div><span style={{fontWeight:900,fontSize:18}}>AurumYield</span><small style={{display:'block',color:'var(--muted)',fontWeight:600,fontSize:12}}>Admin Cabinet</small></div></div>
        <nav className="sidebar-nav">
          {navItems.map(t => <a key={t} className={tab===t?'active':''} onClick={() => setTab(t)} style={{cursor:'pointer',textTransform:'capitalize'}}>{t === 'profit' ? 'Post Profit' : t}</a>)}
        </nav>
        <div className="side-card"><strong style={{display:'block',marginBottom:8}}>Admin Safety Rule</strong><p className="muted" style={{fontSize:13}}>Every balance-changing action creates an audit record.</p></div>
      </aside>

      <main className="app-main">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,marginBottom:24,flexWrap:'wrap'}}>
          <div><h1 style={{fontSize:'clamp(26px,3.5vw,40px)',letterSpacing:-1.5,lineHeight:1}}>Admin Dashboard</h1><p className="muted" style={{marginTop:8}}>Manage clients, deposits, withdrawals, and profit allocation.</p></div>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <div style={{display:'flex',gap:8,alignItems:'center',padding:'10px 16px',border:'1px solid var(--white)',borderRadius:999,background:'rgba(255,255,255,.04)'}}>
              <span style={{width:10,height:10,borderRadius:'50%',background:'var(--green)',boxShadow:'0 0 18px rgba(126,224,161,.6)'}} />
              <span style={{fontSize:13,fontWeight:700}}>Admin</span>
            </div>
            <button onClick={logout} className="btn btn-small btn-secondary">Logout</button>
          </div>
        </div>

        {msg && <div className="success-msg" style={{marginBottom:16}}>{msg}</div>}

        {/* STATS */}
        <div className="stats-grid">
          <div className="card stat"><div className="stat-label">Total AUM</div><div className="stat-value">{usd(totalAum)}</div></div>
          <div className="card stat"><div className="stat-label">Active Clients</div><div className="stat-value">{activeClients.length}</div></div>
          <div className="card stat"><div className="stat-label">Pending Deposits</div><div className="stat-value">{pendingDeposits.length}</div></div>
          <div className="card stat"><div className="stat-label">Pending Withdrawals</div><div className="stat-value">{pendingWithdrawals.length}</div></div>
        </div>

        {/* PROFIT POSTING */}
        {tab === 'profit' && (
          <div className="card" style={{padding:24,marginTop:18}}>
            <div style={{marginBottom:18}}><span className="eyebrow">PROFIT ALLOCATION</span><h2 style={{fontSize:22,fontWeight:800,marginTop:8}}>Post Monthly Profit</h2><p className="muted" style={{fontSize:13}}>Apply profit percentage to all active clients in a selected program.</p></div>
            <div className="fields" style={{marginBottom:18}}>
              <div className="field"><label>Program</label><select value={profitForm.program} onChange={e => setProfitForm({...profitForm,program:e.target.value})}><option>Conservative</option><option>Growth</option></select></div>
              <div className="field"><label>Profit Percentage (%)</label><input type="number" step="0.1" min="0" max="20" value={profitForm.percentage} onChange={e => setProfitForm({...profitForm,percentage:e.target.value})} /></div>
              <div className="field full"><label>Note</label><input value={profitForm.note} onChange={e => setProfitForm({...profitForm,note:e.target.value})} placeholder="e.g. May 2026 monthly allocation" /></div>
            </div>
            <div className="notice" style={{marginBottom:16}}>
              <strong>Preview:</strong> {eligibleForProfit.length} active {profitForm.program} clients will receive {profitForm.percentage}% profit.
              Total: {usd(eligibleForProfit.reduce((s, c) => s + c.balance * Number(profitForm.percentage) / 100, 0))}
            </div>
            <button className="btn btn-primary" onClick={() => setShowProfitModal(true)} disabled={eligibleForProfit.length===0}>Post Profit to All Eligible Clients</button>
          </div>
        )}

        {/* CLIENTS */}
        {(tab === 'overview' || tab === 'clients') && (
          <div className="card" style={{padding:24,marginTop:18}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
              <div><span className="eyebrow">CLIENTS</span><h2 style={{fontSize:22,fontWeight:800,marginTop:8}}>Client Management</h2></div>
              {pendingClients.length > 0 && <span className="tag pending">{pendingClients.length} pending</span>}
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Client</th><th>Program</th><th>Status</th><th>Balance</th><th>Withdrawable</th><th>Last Profit</th><th>Actions</th></tr></thead>
                <tbody>
                  {clients.map(c => (
                    <tr key={c.id}>
                      <td><strong>{c.name}</strong><br/><span className="muted" style={{fontSize:12}}>{c.email}</span></td>
                      <td><span className="tag" style={{color:c.program==='Growth'?'var(--blue)':'var(--gold2)',background:c.program==='Growth'?'rgba(133,183,255,.09)':'rgba(217,164,65,.09)'}}>{c.program}</span></td>
                      <td><span className={`tag ${c.status}`}>{c.status}</span></td>
                      <td style={{fontWeight:700}}>{usd(c.balance)}</td>
                      <td>{usd(c.withdrawable)}</td>
                      <td>{c.lastProfit}</td>
                      <td>
                        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                          {c.status === 'pending' && <button className="btn btn-ok btn-small" onClick={() => clientAction(c.id,'approve')}>Approve</button>}
                          {c.status !== 'disabled' && <button className="btn btn-danger btn-small" onClick={() => clientAction(c.id,'disable')}>Disable</button>}
                          {c.status === 'disabled' && <button className="btn btn-ok btn-small" onClick={() => clientAction(c.id,'enable')}>Enable</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DEPOSITS */}
        {(tab === 'overview' || tab === 'deposits') && (
          <div className="card" style={{padding:24,marginTop:18}}>
            <div style={{marginBottom:18}}><span className="eyebrow">DEPOSITS</span><h2 style={{fontSize:22,fontWeight:800,marginTop:8}}>Deposit Requests</h2></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Client</th><th>Amount</th><th>Method</th><th>Status</th><th>Ref</th><th>Date</th><th>Actions</th></tr></thead>
                <tbody>
                  {deposits.map(d => {
                    const client = clients.find(c => c.id === d.userId);
                    return (
                      <tr key={d.id}>
                        <td>{client?.name || 'Unknown'}</td>
                        <td style={{fontWeight:700}}>{usd(d.amount)}</td>
                        <td>{d.method}</td>
                        <td><span className={`tag ${d.status}`}>{d.status}</span></td>
                        <td>{d.ref}</td>
                        <td>{d.date}</td>
                        <td>
                          {d.status === 'pending' ? (
                            <div style={{display:'flex',gap:6}}>
                              <button className="btn btn-ok btn-small" onClick={() => depositAction(d.id,'approve')}>Approve</button>
                              <button className="btn btn-danger btn-small" onClick={() => depositAction(d.id,'reject')}>Reject</button>
                            </div>
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* WITHDRAWALS */}
        {(tab === 'overview' || tab === 'withdrawals') && (
          <div className="card" style={{padding:24,marginTop:18}}>
            <div style={{marginBottom:18}}><span className="eyebrow">WITHDRAWALS</span><h2 style={{fontSize:22,fontWeight:800,marginTop:8}}>Withdrawal Requests</h2></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Client</th><th>Amount</th><th>Destination</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
                <tbody>
                  {withdrawals.map(w => {
                    const client = clients.find(c => c.id === w.userId);
                    return (
                      <tr key={w.id}>
                        <td>{client?.name || 'Unknown'}</td>
                        <td style={{fontWeight:700}}>{usd(w.amount)}</td>
                        <td>{w.destination}</td>
                        <td><span className={`tag ${w.status}`}>{w.status}</span></td>
                        <td>{w.date}</td>
                        <td>
                          {w.status === 'pending' ? (
                            <div style={{display:'flex',gap:6}}>
                              <button className="btn btn-ok btn-small" onClick={() => withdrawalAction(w.id,'approve')}>Approve</button>
                              <button className="btn btn-danger btn-small" onClick={() => withdrawalAction(w.id,'reject')}>Reject</button>
                            </div>
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AUDIT LOG */}
        {(tab === 'overview' || tab === 'audit') && (
          <div className="card" style={{padding:24,marginTop:18}}>
            <div style={{marginBottom:18}}><span className="eyebrow">AUDIT LOG</span><h2 style={{fontSize:22,fontWeight:800,marginTop:8}}>Activity Log</h2></div>
            {audit.slice(0,15).map((a, i) => (
              <div key={i} className="audit-item">
                <strong style={{fontSize:13}}>{a.action}</strong>
                <span className="muted" style={{fontSize:12,display:'block',marginTop:4}}>{a.admin} — {new Date(a.date).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* PROFIT MODAL */}
        {showProfitModal && (
          <div className="modal-overlay" onClick={() => setShowProfitModal(false)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <h3 style={{fontSize:22,fontWeight:800,marginBottom:12}}>Confirm Profit Posting</h3>
              <p className="muted" style={{marginBottom:18}}>
                Apply {profitForm.percentage}% profit to {eligibleForProfit.length} active {profitForm.program} client(s)?
                This will add {usd(eligibleForProfit.reduce((s,c) => s + c.balance * Number(profitForm.percentage)/100, 0))} total to their balances.
              </p>
              <div className="notice" style={{marginBottom:18}}>This action cannot be undone. A reversal transaction would need to be created manually.</div>
              <div style={{display:'flex',gap:10}}>
                <button className="btn btn-primary" onClick={postProfit}>Confirm & Post</button>
                <button className="btn btn-secondary" onClick={() => setShowProfitModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
