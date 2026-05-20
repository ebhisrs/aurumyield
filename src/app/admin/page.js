'use client';
import { useState, useEffect, useCallback } from 'react';

export default function AdminPage() {
  const [token, setToken] = useState(null);
  const [tab, setTab] = useState('overview');
  const [clients, setClients] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [audit, setAudit] = useState([]);
  const [kycDocs, setKycDocs] = useState([]);
  const [msg, setMsg] = useState('');
  const [profitForm, setProfitForm] = useState({program:'Conservative',percentage:'4',note:''});
  const [showProfitModal, setShowProfitModal] = useState(false);
  const [viewDoc, setViewDoc] = useState(null);
  const [viewDocData, setViewDocData] = useState(null);
  const [loadingDoc, setLoadingDoc] = useState(false);

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
    const [c, d, w, a, k] = await Promise.all([
      fetch('/api/clients', { headers: hd }).then(r => r.json()),
      fetch('/api/deposits', { headers: hd }).then(r => r.json()),
      fetch('/api/withdrawals', { headers: hd }).then(r => r.json()),
      fetch('/api/profit?type=audit', { headers: hd }).then(r => r.json()),
      fetch('/api/kyc', { headers: hd }).then(r => r.json()).catch(() => ({ documents: [] })),
    ]);
    setClients(Array.isArray(c)?c:[]); setDeposits(Array.isArray(d)?d:[]); setWithdrawals(Array.isArray(w)?w:[]); setAudit(Array.isArray(a)?a:[]);
    setKycDocs(k.documents || []);
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

  const kycAction = async (docId, action) => {
    const res = await fetch('/api/kyc', { method: 'POST', headers: h(), body: JSON.stringify({ docId, action }) });
    if (res.ok) { flash(`Document ${action}d`); setViewDoc(null); setViewDocData(null); load(); }
    else { const d = await res.json(); flash(d.error || 'Error'); }
  };

  const openDoc = async (doc) => {
    setViewDoc(doc);
    setViewDocData(null);
    setLoadingDoc(true);
    try {
      const res = await fetch(`/api/kyc?docId=${doc.id}&download=true`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setViewDocData(data.data);
      }
    } catch {}
    setLoadingDoc(false);
  };

  const logout = () => { localStorage.clear(); window.location.href = '/login'; };

  const activeClients = clients.filter(c => c.status === 'approved');
  const totalAum = activeClients.reduce((s, c) => s + (c.balance || 0), 0);
  const pendingDeposits = deposits.filter(d => d.status === 'pending');
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
  const pendingClients = clients.filter(c => c.status === 'pending');
  const pendingKyc = kycDocs.filter(d => d.status === 'pending');
  const eligibleForProfit = clients.filter(c => c.program === profitForm.program && c.status === 'approved');

  if (!token) return <div style={{background:'var(--bg)',minHeight:'100vh'}} />;

  const navItems = ['overview','profit','clients','deposits','withdrawals','kyc','audit'];

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <div className="brand" style={{marginBottom:34}}><div className="brand-mark">A</div><div><span style={{fontWeight:900,fontSize:18}}>AurumYield</span><small style={{display:'block',color:'var(--muted)',fontWeight:600,fontSize:12}}>Admin Cabinet</small></div></div>
        <nav className="sidebar-nav">
          {navItems.map(t => (
            <a key={t} className={tab===t?'active':''} onClick={() => setTab(t)} style={{cursor:'pointer',textTransform:'capitalize',position:'relative'}}>
              {t === 'profit' ? 'Post Profit' : t === 'kyc' ? 'KYC Review' : t}
              {t === 'kyc' && pendingKyc.length > 0 && (
                <span style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'var(--gold)',color:'#111',borderRadius:'50%',width:22,height:22,display:'grid',placeItems:'center',fontSize:11,fontWeight:900}}>{pendingKyc.length}</span>
              )}
            </a>
          ))}
        </nav>
        <div className="side-card"><strong style={{display:'block',marginBottom:8}}>Admin Safety Rule</strong><p className="muted" style={{fontSize:13}}>Every balance-changing action creates an audit record.</p></div>
      </aside>

      <main className="app-main">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,marginBottom:24,flexWrap:'wrap'}}>
          <div><h1 style={{fontSize:'clamp(26px,3.5vw,40px)',letterSpacing:-1.5,lineHeight:1}}>Admin Dashboard</h1><p className="muted" style={{marginTop:8}}>Manage clients, deposits, withdrawals, KYC, and profit allocation.</p></div>
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
          <div className="card stat"><div className="stat-label">Pending KYC</div><div className="stat-value" style={{color: pendingKyc.length > 0 ? 'var(--gold2)' : 'inherit'}}>{pendingKyc.length}</div></div>
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
                <thead><tr><th>Client</th><th>Program</th><th>Status</th><th>Balance</th><th>KYC</th><th>Actions</th></tr></thead>
                <tbody>
                  {clients.map(c => {
                    const clientKyc = kycDocs.filter(d => d.userId === c.id);
                    const kycCount = clientKyc.length;
                    const kycApproved = clientKyc.filter(d => d.status === 'approved').length;
                    return (
                      <tr key={c.id}>
                        <td><strong>{c.name}</strong><br/><span className="muted" style={{fontSize:12}}>{c.email}</span></td>
                        <td><span className="tag" style={{color:c.program==='Growth'?'var(--blue)':'var(--gold2)',background:c.program==='Growth'?'rgba(133,183,255,.09)':'rgba(217,164,65,.09)'}}>{c.program}</span></td>
                        <td><span className={`tag ${c.status}`}>{c.status}</span></td>
                        <td style={{fontWeight:700}}>{usd(c.balance)}</td>
                        <td>
                          {kycCount === 0 ? (
                            <span className="muted" style={{fontSize:12}}>No docs</span>
                          ) : (
                            <span className="tag" style={{color: kycApproved === kycCount ? 'var(--green)' : 'var(--gold2)', background: kycApproved === kycCount ? 'rgba(123,216,143,.08)' : 'rgba(217,164,65,.08)'}}>{kycApproved}/{kycCount} approved</span>
                          )}
                        </td>
                        <td>
                          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                            {c.status === 'pending' && <button className="btn btn-ok btn-small" onClick={() => clientAction(c.id,'approve')}>Approve</button>}
                            {c.status !== 'disabled' && <button className="btn btn-danger btn-small" onClick={() => clientAction(c.id,'disable')}>Disable</button>}
                            {c.status === 'disabled' && <button className="btn btn-ok btn-small" onClick={() => clientAction(c.id,'enable')}>Enable</button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* KYC REVIEW */}
        {(tab === 'overview' || tab === 'kyc') && (
          <div className="card" style={{padding:24,marginTop:18}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
              <div><span className="eyebrow">KYC REVIEW</span><h2 style={{fontSize:22,fontWeight:800,marginTop:8}}>Client Documents</h2><p className="muted" style={{fontSize:13}}>Review, approve, or reject uploaded KYC documents.</p></div>
              {pendingKyc.length > 0 && <span className="tag pending">{pendingKyc.length} pending review</span>}
            </div>
            {kycDocs.length === 0 ? (
              <p className="muted" style={{textAlign:'center',padding:24}}>No KYC documents uploaded yet.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Client</th><th>Document Type</th><th>File</th><th>Status</th><th>Uploaded</th><th>Actions</th></tr></thead>
                  <tbody>
                    {(tab === 'kyc' ? kycDocs : kycDocs.filter(d => d.status === 'pending')).map(d => (
                      <tr key={d.id}>
                        <td><strong>{d.userName || 'Unknown'}</strong><br/><span className="muted" style={{fontSize:12}}>{d.userEmail || ''}</span></td>
                        <td style={{textTransform:'capitalize'}}>{d.type ? d.type.replace(/_/g, ' ') : ''}</td>
                        <td><span className="muted" style={{fontSize:12}}>{d.fileName}</span></td>
                        <td><span className={`tag ${d.status}`}>{d.status}</span></td>
                        <td style={{fontSize:12}}>{d.date ? new Date(d.date).toLocaleDateString() : ''}</td>
                        <td>
                          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                            <button className="btn btn-small btn-secondary" onClick={() => openDoc(d)}>View</button>
                            {d.status === 'pending' && (
                              <>
                                <button className="btn btn-ok btn-small" onClick={() => kycAction(d.id, 'approve')}>Approve</button>
                                <button className="btn btn-danger btn-small" onClick={() => kycAction(d.id, 'reject')}>Reject</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
              <div className="notice" style={{marginBottom:18}}>This action cannot be undone.</div>
              <div style={{display:'flex',gap:10}}>
                <button className="btn btn-primary" onClick={postProfit}>Confirm & Post</button>
                <button className="btn btn-secondary" onClick={() => setShowProfitModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW DOCUMENT MODAL */}
        {viewDoc && (
          <div className="modal-overlay" onClick={() => { setViewDoc(null); setViewDocData(null); }}>
            <div className="modal-box" style={{maxWidth:800,maxHeight:'90vh',overflow:'auto'}} onClick={e => e.stopPropagation()}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
                <div>
                  <h3 style={{fontSize:22,fontWeight:800}}>KYC Document</h3>
                  <p className="muted" style={{marginTop:4}}>{viewDoc.userName} — {viewDoc.type ? viewDoc.type.replace(/_/g, ' ') : ''}</p>
                  <p className="muted" style={{fontSize:12}}>{viewDoc.fileName} • Status: <span className={`tag ${viewDoc.status}`} style={{display:'inline'}}>{viewDoc.status}</span></p>
                </div>
                <button className="btn btn-small btn-secondary" onClick={() => { setViewDoc(null); setViewDocData(null); }}>Close</button>
              </div>

              {loadingDoc && <div style={{textAlign:'center',padding:40}}><p className="muted">Loading document...</p></div>}

              {viewDocData && (
                <div style={{borderRadius:16,overflow:'hidden',border:'1px solid var(--white)',marginBottom:18}}>
                  {viewDoc.fileName && (viewDoc.fileName.endsWith('.pdf')) ? (
                    <iframe src={`data:application/pdf;base64,${viewDocData}`} style={{width:'100%',height:500,border:0}} />
                  ) : (
                    <img src={`data:image/jpeg;base64,${viewDocData}`} style={{width:'100%',display:'block'}} alt="KYC Document" />
                  )}
                </div>
              )}

              {!loadingDoc && !viewDocData && <div style={{textAlign:'center',padding:40}}><p className="muted">Could not load document preview.</p></div>}

              {viewDoc.status === 'pending' && (
                <div style={{display:'flex',gap:10}}>
                  <button className="btn btn-ok" onClick={() => kycAction(viewDoc.id, 'approve')}>Approve Document</button>
                  <button className="btn btn-danger" onClick={() => kycAction(viewDoc.id, 'reject')}>Reject Document</button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
