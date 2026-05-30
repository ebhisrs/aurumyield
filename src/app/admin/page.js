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
  const [allTx, setAllTx] = useState([]);
  const [msg, setMsg] = useState('');
  const [profitForm, setProfitForm] = useState({program:'Conservative',percentage:'4',note:''});
  const [showProfitModal, setShowProfitModal] = useState(false);
  const [viewDoc, setViewDoc] = useState(null);
  const [viewDocData, setViewDocData] = useState(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [viewProof, setViewProof] = useState(null);
  const [viewProofData, setViewProofData] = useState(null);
  const [loadingProof, setLoadingProof] = useState(false);
  const [rptFrom, setRptFrom] = useState('');
  const [rptTo, setRptTo] = useState('');
  const [rptType, setRptType] = useState('all');
  const [rptClient, setRptClient] = useState('all');
  // Edit modals
  const [editClient, setEditClient] = useState(null);
  const [editDeposit, setEditDeposit] = useState(null);
  const [editWithdrawal, setEditWithdrawal] = useState(null);

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
    const [c, d, w, a, k, tx] = await Promise.all([
      fetch('/api/clients', { headers: hd }).then(r => r.json()),
      fetch('/api/deposits', { headers: hd }).then(r => r.json()),
      fetch('/api/withdrawals', { headers: hd }).then(r => r.json()),
      fetch('/api/profit?type=audit', { headers: hd }).then(r => r.json()),
      fetch('/api/kyc', { headers: hd }).then(r => r.json()).catch(() => ({ documents: [] })),
      fetch('/api/profit?type=transactions', { headers: hd }).then(r => r.json()).catch(() => []),
    ]);
    setClients(Array.isArray(c)?c:[]);setDeposits(Array.isArray(d)?d:[]);setWithdrawals(Array.isArray(w)?w:[]);setAudit(Array.isArray(a)?a:[]);setKycDocs(k.documents||[]);setAllTx(Array.isArray(tx)?tx:[]);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };
  const usd = (n) => `$${Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const logout = () => { localStorage.clear(); window.location.href = '/login'; };

  // Client actions
  const clientAction = async (userId, action) => { await fetch('/api/clients', { method:'PUT', headers:h(), body:JSON.stringify({userId,action}) }); flash(`Client ${action}d`); load(); };
  const saveClient = async () => { if (!editClient) return; await fetch('/api/clients', { method:'PUT', headers:h(), body:JSON.stringify({userId:editClient.id,action:'edit',...editClient}) }); flash('Client updated'); setEditClient(null); load(); };
  const delClient = async (id, name) => { if (!confirm(`Delete client ${name}? This removes all their data.`)) return; await fetch(`/api/clients?userId=${id}`, { method:'DELETE', headers:h() }); flash('Client deleted'); load(); };
  // Deposit actions
  const depositAction = async (depositId, action) => { await fetch('/api/deposits', { method:'POST', headers:h(), body:JSON.stringify({depositId,action}) }); flash(`Deposit ${action}d`); load(); };
  const saveDeposit = async () => { if (!editDeposit) return; await fetch('/api/deposits', { method:'POST', headers:h(), body:JSON.stringify({depositId:editDeposit.id,action:'edit',amount:editDeposit.amount,status:editDeposit.status,method:editDeposit.method}) }); flash('Deposit updated'); setEditDeposit(null); load(); };
  const delDeposit = async (id, ref) => { if (!confirm(`Delete deposit ${ref}?`)) return; await fetch('/api/deposits', { method:'POST', headers:h(), body:JSON.stringify({depositId:id,action:'delete'}) }); flash('Deposit deleted'); load(); };
  // Withdrawal actions
  const withdrawalAction = async (withdrawalId, action) => { const res = await fetch('/api/withdrawals', { method:'POST', headers:h(), body:JSON.stringify({withdrawalId,action}) }); const d = await res.json(); if (!res.ok) flash(d.error||'Error'); else { flash(`Withdrawal ${action}d`); load(); } };
  const saveWithdrawal = async () => { if (!editWithdrawal) return; await fetch('/api/withdrawals', { method:'POST', headers:h(), body:JSON.stringify({withdrawalId:editWithdrawal.id,action:'edit',amount:editWithdrawal.amount,status:editWithdrawal.status,method:editWithdrawal.method,destination:editWithdrawal.destination}) }); flash('Withdrawal updated'); setEditWithdrawal(null); load(); };
  const delWithdrawal = async (id) => { if (!confirm('Delete this withdrawal?')) return; await fetch('/api/withdrawals', { method:'POST', headers:h(), body:JSON.stringify({withdrawalId:id,action:'delete'}) }); flash('Withdrawal deleted'); load(); };
  // KYC
  const kycAction = async (docId, action) => { await fetch('/api/kyc', { method:'POST', headers:h(), body:JSON.stringify({docId,action}) }); flash(`Document ${action}d`); setViewDoc(null); setViewDocData(null); load(); };
  const openDoc = async (doc) => { setViewDoc(doc); setViewDocData(null); setLoadingDoc(true); try { const res = await fetch(`/api/kyc?docId=${doc.id}&download=true`, { headers:{Authorization:`Bearer ${token}`} }); if (res.ok) setViewDocData((await res.json()).data); } catch {} setLoadingDoc(false); };
  const openProof = async (dep) => { setViewProof(dep); setViewProofData(null); setLoadingProof(true); try { const res = await fetch(`/api/deposits?depositId=${dep.id}&proof=true`, { headers:{Authorization:`Bearer ${token}`} }); if (res.ok) setViewProofData((await res.json()).proof); } catch {} setLoadingProof(false); };
  // Profit
  const postProfit = async () => { const res = await fetch('/api/profit', { method:'POST', headers:h(), body:JSON.stringify(profitForm) }); const d = await res.json(); if (!res.ok) flash(d.error||'Error'); else { flash(`Profit posted to ${d.clients} clients`); setShowProfitModal(false); load(); } };

  // Derived
  const activeClients = clients.filter(c => c.status === 'approved');
  const totalAum = activeClients.reduce((s, c) => s + (c.balance || 0), 0);
  const pendingDeposits = deposits.filter(d => d.status === 'pending');
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
  const pendingClients = clients.filter(c => c.status === 'pending');
  const pendingKyc = kycDocs.filter(d => d.status === 'pending');
  const eligibleForProfit = clients.filter(c => c.program === profitForm.program && c.status === 'approved');

  // Risk
  const riskAlerts = [];
  pendingWithdrawals.filter(w => w.amount >= 5000).forEach(w => { const cl = clients.find(c => c.id === w.userId); riskAlerts.push({ level:'high', msg:`Large withdrawal: ${usd(w.amount)} from ${cl?.name||'?'}` }); });
  clients.filter(c => c.status === 'disabled' && c.balance > 0).forEach(c => riskAlerts.push({ level:'medium', msg:`Disabled ${c.name} has ${usd(c.balance)}` }));
  pendingClients.forEach(c => riskAlerts.push({ level:'low', msg:`${c.name} awaiting approval` }));

  // Reports
  const filteredRptTx = allTx.filter(t => { if (rptFrom && t.date < rptFrom) return false; if (rptTo && t.date > rptTo) return false; if (rptType !== 'all' && t.type !== rptType) return false; if (rptClient !== 'all' && t.userId !== Number(rptClient)) return false; return true; });
  const exportAdminPDF = async () => { try { const { default: jsPDF } = await import('jspdf'); await import('jspdf-autotable'); const doc = new jsPDF('landscape'); doc.setFontSize(18); doc.text('8QMM Gold Admin Report', 14, 22); doc.autoTable({ startY:30, head:[['Date','Client','Type','Description','Amount','Status']], body:filteredRptTx.map(t => { const cl=clients.find(c=>c.id===t.userId); return [t.date,cl?.name||'',t.type,t.desc,(t.amount>=0?'+':'')+usd(Math.abs(t.amount)),t.status]; }), headStyles:{fillColor:[217,164,65]} }); doc.save('8QMM Gold_Report.pdf'); } catch { flash('Export failed'); } };
  const exportAdminExcel = async () => { try { const XLSX = await import('xlsx'); const ws = XLSX.utils.json_to_sheet(filteredRptTx.map(t => { const cl=clients.find(c=>c.id===t.userId); return { Date:t.date,Client:cl?.name,Type:t.type,Description:t.desc,Amount:t.amount,Status:t.status }; })); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Report'); XLSX.writeFile(wb,'8QMM Gold_Report.xlsx'); } catch { flash('Export failed'); } };

  if (!token) return <div style={{background:'var(--bg)',minHeight:'100vh'}} />;
  const navItems = ['overview','clients','deposits','withdrawals','profit','kyc','reports','risk','audit'];

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <div className="brand" style={{marginBottom:34}}><img src="/logo-dark.jpeg" alt="8QMM Gold" style={{width:42,height:42,borderRadius:"50%",objectFit:"cover"}} /><div><span style={{fontWeight:900,fontSize:18}}>8QMM Gold</span><small style={{display:'block',color:'var(--muted)',fontWeight:600,fontSize:12}}>Admin</small></div></div>
        <nav className="sidebar-nav">
          {navItems.map(t => <a key={t} className={tab===t?'active':''} onClick={()=>setTab(t)} style={{cursor:'pointer',textTransform:'capitalize',position:'relative'}}>{t==='profit'?'Post Profit':t==='kyc'?'KYC Review':t==='risk'?'Risk Alerts':t}{t==='kyc'&&pendingKyc.length>0&&<span style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'var(--gold)',color:'#111',borderRadius:'50%',width:20,height:20,display:'grid',placeItems:'center',fontSize:10,fontWeight:900}}>{pendingKyc.length}</span>}{t==='risk'&&riskAlerts.length>0&&<span style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'var(--red)',color:'#fff',borderRadius:'50%',width:20,height:20,display:'grid',placeItems:'center',fontSize:10,fontWeight:900}}>{riskAlerts.length}</span>}</a>)}
        </nav>
        <div className="side-card"><strong style={{display:'block',marginBottom:8}}>Safety</strong><p className="muted" style={{fontSize:13}}>All actions are audited.</p></div>
      </aside>

      <main className="app-main">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:24,flexWrap:'wrap'}}>
          <h1 style={{fontSize:'clamp(24px,3.5vw,38px)',letterSpacing:-1.5}}>Admin Dashboard</h1>
          <div style={{display:'flex',gap:8}}><div style={{display:'flex',gap:6,alignItems:'center',padding:'8px 14px',border:'1px solid var(--white)',borderRadius:999,background:'rgba(255,255,255,.04)',fontSize:13,fontWeight:700}}><span style={{width:8,height:8,borderRadius:'50%',background:'var(--green)'}} />Admin</div><button onClick={logout} className="btn btn-small btn-secondary">Logout</button></div>
        </div>
        {msg && <div className="success-msg" style={{marginBottom:14}}>{msg}</div>}

        {/* STATS */}
        <div className="stats-grid">
          <div className="card stat"><div className="stat-label">Total AUM</div><div className="stat-value">{usd(totalAum)}</div></div>
          <div className="card stat"><div className="stat-label">Active Clients</div><div className="stat-value">{activeClients.length}</div></div>
          <div className="card stat"><div className="stat-label">Pending Deps</div><div className="stat-value">{pendingDeposits.length}</div></div>
          <div className="card stat"><div className="stat-label">Pending WDs</div><div className="stat-value">{pendingWithdrawals.length}</div></div>
        </div>

        {/* OVERVIEW */}
        {tab==='overview'&&<>
          {riskAlerts.filter(a=>a.level==='high').length>0&&<div style={{padding:14,borderRadius:16,background:'rgba(240,127,127,.08)',border:'1px solid rgba(240,127,127,.25)',marginBottom:16,color:'#ffd5d5'}}><strong>⚠ {riskAlerts.filter(a=>a.level==='high').length} high-priority alert(s)</strong> <button className="btn btn-small btn-danger" style={{marginLeft:10}} onClick={()=>setTab('risk')}>View</button></div>}
          {pendingClients.length>0&&<div className="card" style={{padding:20,marginBottom:16}}><h3 style={{fontSize:16,fontWeight:800,marginBottom:12}}>Pending Approvals ({pendingClients.length})</h3>{pendingClients.map(c=><div key={c.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:10,border:'1px solid var(--white)',borderRadius:12,marginBottom:6,flexWrap:'wrap',gap:6}}><div><strong>{c.name}</strong> <span className="muted" style={{fontSize:12}}>{c.email}</span></div><div style={{display:'flex',gap:6}}><button className="btn btn-ok btn-small" onClick={()=>clientAction(c.id,'approve')}>Approve</button><button className="btn btn-danger btn-small" onClick={()=>clientAction(c.id,'disable')}>Reject</button></div></div>)}</div>}
          <div className="card" style={{padding:20}}><h3 style={{fontSize:16,fontWeight:800,marginBottom:12}}>Recent Activity</h3>{audit.slice(0,6).map((a,i)=><div key={i} className="audit-item"><strong style={{fontSize:12}}>{a.action}</strong><span className="muted" style={{fontSize:11,display:'block',marginTop:2}}>{a.admin} — {new Date(a.date).toLocaleString()}</span></div>)}</div>
        </>}

        {/* CLIENTS */}
        {tab==='clients'&&<div className="card" style={{padding:24,marginTop:16}}>
          <div style={{marginBottom:18}}><span className="eyebrow">CLIENTS</span><h2 style={{fontSize:22,fontWeight:800,marginTop:8}}>Full Client Management</h2></div>
          <div className="table-wrap"><table><thead><tr><th>Client</th><th>Program</th><th>Status</th><th>Balance</th><th>Withdrawable</th><th>Capital</th><th>KYC</th><th>Actions</th></tr></thead><tbody>
            {clients.map(c=>{const ck=kycDocs.filter(d=>d.userId===c.id);return <tr key={c.id}>
              <td><strong>{c.name}</strong><br/><span className="muted" style={{fontSize:11}}>{c.email}</span></td>
              <td><span className="tag" style={{color:c.program==='Growth'?'var(--blue)':'var(--gold2)'}}>{c.program}</span></td>
              <td><span className={`tag ${c.status}`}>{c.status}</span></td>
              <td style={{fontWeight:700}}>{usd(c.balance)}</td>
              <td>{usd(c.withdrawable)}</td>
              <td>{usd(c.lockedCapital)}</td>
              <td>{ck.length===0?<span className="muted" style={{fontSize:11}}>—</span>:<span className="tag">{ck.filter(d=>d.status==='approved').length}/{ck.length}</span>}</td>
              <td><div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                <button className="btn btn-small btn-secondary" onClick={()=>setEditClient({...c})}>Edit</button>
                {c.status==='pending'&&<button className="btn btn-ok btn-small" onClick={()=>clientAction(c.id,'approve')}>Approve</button>}
                {c.status!=='disabled'&&<button className="btn btn-danger btn-small" onClick={()=>clientAction(c.id,'disable')}>Disable</button>}
                {c.status==='disabled'&&<button className="btn btn-ok btn-small" onClick={()=>clientAction(c.id,'enable')}>Enable</button>}
                <button className="btn btn-small" style={{color:'var(--red)',borderColor:'rgba(240,127,127,.2)'}} onClick={()=>delClient(c.id,c.name)}>Delete</button>
              </div></td>
            </tr>})}
          </tbody></table></div>
        </div>}

        {/* DEPOSITS */}
        {tab==='deposits'&&<div className="card" style={{padding:24,marginTop:16}}>
          <div style={{marginBottom:18}}><span className="eyebrow">DEPOSITS</span><h2 style={{fontSize:22,fontWeight:800,marginTop:8}}>Deposit Management</h2></div>
          <div className="table-wrap"><table><thead><tr><th>Client</th><th>Amount</th><th>Method</th><th>Proof</th><th>Status</th><th>Ref</th><th>Date</th><th>Actions</th></tr></thead><tbody>
            {deposits.map(d=>{const cl=clients.find(c=>c.id===d.userId);return <tr key={d.id}>
              <td>{cl?.name||'?'}</td><td style={{fontWeight:700}}>{usd(d.amount)}</td><td>{d.method}</td>
              <td>{d.hasProof?<button className="btn btn-small btn-secondary" onClick={()=>openProof(d)}>View</button>:<span className="muted" style={{fontSize:11}}>—</span>}</td>
              <td><span className={`tag ${d.status}`}>{d.status}</span></td><td>{d.ref}</td><td>{d.date}</td>
              <td><div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                <button className="btn btn-small btn-secondary" onClick={()=>setEditDeposit({...d})}>Edit</button>
                {d.status==='pending'&&<><button className="btn btn-ok btn-small" onClick={()=>depositAction(d.id,'approve')}>Approve</button><button className="btn btn-danger btn-small" onClick={()=>depositAction(d.id,'reject')}>Reject</button></>}
                <button className="btn btn-small" style={{color:'var(--red)',borderColor:'rgba(240,127,127,.2)'}} onClick={()=>delDeposit(d.id,d.ref)}>Del</button>
              </div></td>
            </tr>})}
          </tbody></table></div>
        </div>}

        {/* WITHDRAWALS */}
        {tab==='withdrawals'&&<div className="card" style={{padding:24,marginTop:16}}>
          <div style={{marginBottom:18}}><span className="eyebrow">WITHDRAWALS</span><h2 style={{fontSize:22,fontWeight:800,marginTop:8}}>Withdrawal Management</h2></div>
          <div className="table-wrap"><table><thead><tr><th>Client</th><th>Amount</th><th>Method</th><th>Destination</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead><tbody>
            {withdrawals.map(w=>{const cl=clients.find(c=>c.id===w.userId);return <tr key={w.id}>
              <td>{cl?.name||'?'}</td><td style={{fontWeight:700}}>{usd(w.amount)}</td><td>{w.method}</td><td>{w.destination}</td>
              <td><span className={`tag ${w.status}`}>{w.status}</span></td><td>{w.date}</td>
              <td><div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                <button className="btn btn-small btn-secondary" onClick={()=>setEditWithdrawal({...w})}>Edit</button>
                {w.status==='pending'&&<><button className="btn btn-ok btn-small" onClick={()=>withdrawalAction(w.id,'approve')}>Approve</button><button className="btn btn-danger btn-small" onClick={()=>withdrawalAction(w.id,'reject')}>Reject</button></>}
                <button className="btn btn-small" style={{color:'var(--red)',borderColor:'rgba(240,127,127,.2)'}} onClick={()=>delWithdrawal(w.id)}>Del</button>
              </div></td>
            </tr>})}
          </tbody></table></div>
        </div>}

        {/* PROFIT */}
        {tab==='profit'&&<div className="card" style={{padding:24,marginTop:16}}>
          <div style={{marginBottom:18}}><span className="eyebrow">PROFIT</span><h2 style={{fontSize:22,fontWeight:800,marginTop:8}}>Post Monthly Profit</h2></div>
          <div className="fields" style={{marginBottom:18}}>
            <div className="field"><label>Program</label><select value={profitForm.program} onChange={e=>setProfitForm({...profitForm,program:e.target.value})}><option>Conservative</option><option>Growth</option></select></div>
            <div className="field"><label>Percentage (%)</label><input type="number" step="0.1" value={profitForm.percentage} onChange={e=>setProfitForm({...profitForm,percentage:e.target.value})} /></div>
            <div className="field full"><label>Note</label><input value={profitForm.note} onChange={e=>setProfitForm({...profitForm,note:e.target.value})} placeholder="May 2026" /></div>
          </div>
          <div className="notice" style={{marginBottom:16}}><strong>Preview:</strong> {eligibleForProfit.length} client(s) at {profitForm.percentage}% = {usd(eligibleForProfit.reduce((s,c)=>s+(c.lockedCapital||c.balance)*Number(profitForm.percentage)/100,0))}</div>
          {eligibleForProfit.length>0&&<div className="table-wrap" style={{marginBottom:16}}><table><thead><tr><th>Client</th><th>Capital</th><th>Pref</th><th>Profit</th><th>Effect</th></tr></thead><tbody>{eligibleForProfit.map(c=>{const cap=c.lockedCapital||c.balance;const pr=Math.round(cap*Number(profitForm.percentage)/100*100)/100;const isC=c.profitPref&&(c.profitPref.toLowerCase().includes('reinvest')||c.profitPref.toLowerCase().includes('compound'));return <tr key={c.id}><td>{c.name}</td><td>{usd(cap)}</td><td><span className="tag" style={{fontSize:10,color:isC?'var(--blue)':'var(--green)'}}>{isC?'Compound':'Withdraw'}</span></td><td style={{color:'var(--green)',fontWeight:700}}>+{usd(pr)}</td><td style={{fontSize:12}}>{isC?`Capital→${usd(cap+pr)}`:'→Withdrawable'}</td></tr>})}</tbody></table></div>}
          <button className="btn btn-primary" onClick={()=>setShowProfitModal(true)} disabled={!eligibleForProfit.length}>Post Profit</button>
        </div>}

        {/* KYC */}
        {tab==='kyc'&&<div className="card" style={{padding:24,marginTop:16}}>
          <div style={{marginBottom:18}}><span className="eyebrow">KYC</span><h2 style={{fontSize:22,fontWeight:800,marginTop:8}}>Document Review</h2></div>
          {kycDocs.length===0?<p className="muted" style={{textAlign:'center',padding:20}}>No documents yet.</p>:
          <div className="table-wrap"><table><thead><tr><th>Client</th><th>Type</th><th>File</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead><tbody>
            {kycDocs.map(d=><tr key={d.id}><td><strong>{d.userName||'?'}</strong><br/><span className="muted" style={{fontSize:11}}>{d.userEmail}</span></td><td style={{textTransform:'capitalize'}}>{(d.type||'').replace(/_/g,' ')}</td><td className="muted" style={{fontSize:12}}>{d.fileName}</td><td><span className={`tag ${d.status}`}>{d.status}</span></td><td style={{fontSize:12}}>{d.date?new Date(d.date).toLocaleDateString():''}</td>
              <td><div style={{display:'flex',gap:4,flexWrap:'wrap'}}><button className="btn btn-small btn-secondary" onClick={()=>openDoc(d)}>View</button>{d.status==='pending'&&<><button className="btn btn-ok btn-small" onClick={()=>kycAction(d.id,'approve')}>Approve</button><button className="btn btn-danger btn-small" onClick={()=>kycAction(d.id,'reject')}>Reject</button></>}</div></td></tr>)}
          </tbody></table></div>}
        </div>}

        {/* REPORTS */}
        {tab==='reports'&&<div className="card" style={{padding:24,marginTop:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18,flexWrap:'wrap',gap:10}}>
            <div><span className="eyebrow">REPORTS</span><h2 style={{fontSize:22,fontWeight:800,marginTop:8}}>All Transactions</h2></div>
            {filteredRptTx.length>0&&<div style={{display:'flex',gap:6}}><button className="btn btn-small btn-primary" onClick={exportAdminPDF}>PDF</button><button className="btn btn-small btn-secondary" onClick={exportAdminExcel}>Excel</button></div>}
          </div>
          <div className="fields" style={{marginBottom:16}}>
            <div className="field"><label>Client</label><select value={rptClient} onChange={e=>setRptClient(e.target.value)}><option value="all">All</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div className="field"><label>Type</label><select value={rptType} onChange={e=>setRptType(e.target.value)}><option value="all">All</option><option value="deposit">Deposits</option><option value="withdrawal">Withdrawals</option><option value="performance">Profit</option></select></div>
            <div className="field"><label>From</label><input type="date" value={rptFrom} onChange={e=>setRptFrom(e.target.value)} /></div>
            <div className="field"><label>To</label><input type="date" value={rptTo} onChange={e=>setRptTo(e.target.value)} /></div>
          </div>
          <div className="table-wrap"><table><thead><tr><th>Date</th><th>Client</th><th>Type</th><th>Description</th><th>Amount</th><th>Status</th></tr></thead><tbody>
            {filteredRptTx.length===0?<tr><td colSpan={6} className="muted" style={{textAlign:'center'}}>No data</td></tr>:filteredRptTx.map(t=>{const cl=clients.find(c=>c.id===t.userId);return <tr key={t.id}><td>{t.date}</td><td>{cl?.name||''}</td><td style={{textTransform:'capitalize'}}>{t.type}</td><td>{t.desc}</td><td style={{color:t.amount>=0?'var(--green)':'var(--red)',fontWeight:700}}>{t.amount>=0?'+':''}{usd(Math.abs(t.amount))}</td><td><span className={'tag '+(t.status||'').toLowerCase()}>{t.status}</span></td></tr>})}
          </tbody></table></div>
        </div>}

        {/* RISK */}
        {tab==='risk'&&<div className="card" style={{padding:24,marginTop:16}}>
          <div style={{marginBottom:18}}><span className="eyebrow">RISK</span><h2 style={{fontSize:22,fontWeight:800,marginTop:8}}>Risk Alerts ({riskAlerts.length})</h2></div>
          {riskAlerts.length===0?<p className="muted" style={{textAlign:'center',padding:20}}>All clear.</p>:
          <div style={{display:'grid',gap:8}}>{riskAlerts.sort((a,b)=>a.level==='high'?-1:b.level==='high'?1:0).map((a,i)=><div key={i} style={{padding:14,borderRadius:14,border:'1px solid '+(a.level==='high'?'rgba(240,127,127,.3)':a.level==='medium'?'var(--line)':'var(--white)'),background:a.level==='high'?'rgba(240,127,127,.06)':'rgba(0,0,0,.1)',display:'flex',gap:10,alignItems:'center'}}><span>{a.level==='high'?'🔴':a.level==='medium'?'🟡':'🟢'}</span><span style={{fontSize:13,flex:1}}>{a.msg}</span><span className="tag" style={{fontSize:10}}>{a.level}</span></div>)}</div>}
        </div>}

        {/* AUDIT */}
        {tab==='audit'&&<div className="card" style={{padding:24,marginTop:16}}>
          <div style={{marginBottom:18}}><span className="eyebrow">AUDIT</span><h2 style={{fontSize:22,fontWeight:800,marginTop:8}}>Full Activity Log</h2></div>
          {audit.map((a,i)=><div key={i} className="audit-item"><strong style={{fontSize:12}}>{a.action}</strong><span className="muted" style={{fontSize:11,display:'block',marginTop:2}}>{a.admin} — {new Date(a.date).toLocaleString()}</span></div>)}
        </div>}

        {/* ═══ MODALS ═══ */}

        {/* EDIT CLIENT */}
        {editClient&&<div className="modal-overlay" onClick={()=>setEditClient(null)}><div className="modal-box" onClick={e=>e.stopPropagation()}>
          <h3 style={{fontSize:22,fontWeight:800,marginBottom:16}}>Edit Client: {editClient.name}</h3>
          <div className="fields">
            <div className="field"><label>Name</label><input value={editClient.name||''} onChange={e=>setEditClient({...editClient,name:e.target.value})} /></div>
            <div className="field"><label>Email</label><input value={editClient.email||''} onChange={e=>setEditClient({...editClient,email:e.target.value})} /></div>
            <div className="field"><label>Phone</label><input value={editClient.phone||''} onChange={e=>setEditClient({...editClient,phone:e.target.value})} /></div>
            <div className="field"><label>Country</label><input value={editClient.country||''} onChange={e=>setEditClient({...editClient,country:e.target.value})} /></div>
            <div className="field"><label>Program</label><select value={editClient.program||''} onChange={e=>setEditClient({...editClient,program:e.target.value})}><option>Conservative</option><option>Growth</option></select></div>
            <div className="field"><label>Status</label><select value={editClient.status||''} onChange={e=>setEditClient({...editClient,status:e.target.value})}><option>pending</option><option>approved</option><option>disabled</option></select></div>
            <div className="field"><label>Profit Preference</label><select value={editClient.profitPref||''} onChange={e=>setEditClient({...editClient,profitPref:e.target.value})}><option>Monthly income withdrawals</option><option>Reinvest profits quarterly</option><option>Reinvest profits semi-annually</option><option>Reinvest profits annually</option></select></div>
            <div className="field"><label>Balance</label><input type="number" value={editClient.balance||0} onChange={e=>setEditClient({...editClient,balance:Number(e.target.value)})} /></div>
            <div className="field"><label>Withdrawable</label><input type="number" value={editClient.withdrawable||0} onChange={e=>setEditClient({...editClient,withdrawable:Number(e.target.value)})} /></div>
            <div className="field"><label>Locked Capital</label><input type="number" value={editClient.lockedCapital||0} onChange={e=>setEditClient({...editClient,lockedCapital:Number(e.target.value)})} /></div>
            <div className="field full" style={{borderTop:'1px solid var(--white)',paddingTop:14,marginTop:6}}>
              <label>Reset Password <span className="muted" style={{fontWeight:400,fontSize:12}}>(leave empty to keep current)</span></label>
              <input type="password" value={editClient.newPassword||''} onChange={e=>setEditClient({...editClient,newPassword:e.target.value})} placeholder="New password (min 6 chars)" />
            </div>
          </div>
          <div style={{display:'flex',gap:10,marginTop:20}}><button className="btn btn-primary" onClick={saveClient}>Save Changes</button><button className="btn btn-secondary" onClick={()=>setEditClient(null)}>Cancel</button></div>
        </div></div>}

        {/* EDIT DEPOSIT */}
        {editDeposit&&<div className="modal-overlay" onClick={()=>setEditDeposit(null)}><div className="modal-box" onClick={e=>e.stopPropagation()}>
          <h3 style={{fontSize:22,fontWeight:800,marginBottom:16}}>Edit Deposit: {editDeposit.ref}</h3>
          <div className="fields">
            <div className="field"><label>Amount</label><input type="number" value={editDeposit.amount||0} onChange={e=>setEditDeposit({...editDeposit,amount:Number(e.target.value)})} /></div>
            <div className="field"><label>Method</label><select value={editDeposit.method||''} onChange={e=>setEditDeposit({...editDeposit,method:e.target.value})}><option>Bank Transfer</option><option>Card Payment</option><option>USDT / Stablecoin</option></select></div>
            <div className="field"><label>Status</label><select value={editDeposit.status||''} onChange={e=>setEditDeposit({...editDeposit,status:e.target.value})}><option>pending</option><option>approved</option><option>rejected</option></select></div>
          </div>
          <div style={{display:'flex',gap:10,marginTop:20}}><button className="btn btn-primary" onClick={saveDeposit}>Save</button><button className="btn btn-secondary" onClick={()=>setEditDeposit(null)}>Cancel</button></div>
        </div></div>}

        {/* EDIT WITHDRAWAL */}
        {editWithdrawal&&<div className="modal-overlay" onClick={()=>setEditWithdrawal(null)}><div className="modal-box" onClick={e=>e.stopPropagation()}>
          <h3 style={{fontSize:22,fontWeight:800,marginBottom:16}}>Edit Withdrawal #{editWithdrawal.id}</h3>
          <div className="fields">
            <div className="field"><label>Amount</label><input type="number" value={editWithdrawal.amount||0} onChange={e=>setEditWithdrawal({...editWithdrawal,amount:Number(e.target.value)})} /></div>
            <div className="field"><label>Method</label><select value={editWithdrawal.method||''} onChange={e=>setEditWithdrawal({...editWithdrawal,method:e.target.value})}><option>Bank Transfer</option><option>Crypto Wallet</option></select></div>
            <div className="field"><label>Destination</label><input value={editWithdrawal.destination||''} onChange={e=>setEditWithdrawal({...editWithdrawal,destination:e.target.value})} /></div>
            <div className="field"><label>Status</label><select value={editWithdrawal.status||''} onChange={e=>setEditWithdrawal({...editWithdrawal,status:e.target.value})}><option>pending</option><option>approved</option><option>rejected</option></select></div>
          </div>
          <div style={{display:'flex',gap:10,marginTop:20}}><button className="btn btn-primary" onClick={saveWithdrawal}>Save</button><button className="btn btn-secondary" onClick={()=>setEditWithdrawal(null)}>Cancel</button></div>
        </div></div>}

        {/* PROFIT CONFIRM */}
        {showProfitModal&&<div className="modal-overlay" onClick={()=>setShowProfitModal(false)}><div className="modal-box" onClick={e=>e.stopPropagation()}>
          <h3 style={{fontSize:22,fontWeight:800,marginBottom:12}}>Confirm Profit Posting</h3>
          <p className="muted" style={{marginBottom:18}}>{profitForm.percentage}% to {eligibleForProfit.length} {profitForm.program} client(s). Total: {usd(eligibleForProfit.reduce((s,c)=>s+(c.lockedCapital||c.balance)*Number(profitForm.percentage)/100,0))}</p>
          <div className="notice" style={{marginBottom:18}}>Cannot be undone.</div>
          <div style={{display:'flex',gap:10}}><button className="btn btn-primary" onClick={postProfit}>Confirm</button><button className="btn btn-secondary" onClick={()=>setShowProfitModal(false)}>Cancel</button></div>
        </div></div>}

        {/* VIEW KYC DOC */}
        {viewDoc&&<div className="modal-overlay" onClick={()=>{setViewDoc(null);setViewDocData(null)}}><div className="modal-box" style={{maxWidth:800,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}><div><h3 style={{fontSize:20,fontWeight:800}}>KYC: {viewDoc.userName}</h3><p className="muted">{(viewDoc.type||'').replace(/_/g,' ')} — {viewDoc.fileName}</p></div><button className="btn btn-small btn-secondary" onClick={()=>{setViewDoc(null);setViewDocData(null)}}>Close</button></div>
          {loadingDoc&&<p className="muted" style={{textAlign:'center',padding:30}}>Loading...</p>}
          {viewDocData&&<div style={{borderRadius:14,overflow:'hidden',border:'1px solid var(--white)',marginBottom:16}}>{viewDoc.fileName?.endsWith('.pdf')?<iframe src={`data:application/pdf;base64,${viewDocData}`} style={{width:'100%',height:500,border:0}} />:<img src={`data:image/jpeg;base64,${viewDocData}`} style={{width:'100%'}} alt="doc" />}</div>}
          {viewDoc.status==='pending'&&<div style={{display:'flex',gap:8}}><button className="btn btn-ok" onClick={()=>kycAction(viewDoc.id,'approve')}>Approve</button><button className="btn btn-danger" onClick={()=>kycAction(viewDoc.id,'reject')}>Reject</button></div>}
        </div></div>}

        {/* VIEW PROOF */}
        {viewProof&&<div className="modal-overlay" onClick={()=>{setViewProof(null);setViewProofData(null)}}><div className="modal-box" style={{maxWidth:800,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}><div><h3 style={{fontSize:20,fontWeight:800}}>Payment Proof</h3><p className="muted">{viewProof.ref} — {usd(viewProof.amount)}</p></div><button className="btn btn-small btn-secondary" onClick={()=>{setViewProof(null);setViewProofData(null)}}>Close</button></div>
          {loadingProof&&<p className="muted" style={{textAlign:'center',padding:30}}>Loading...</p>}
          {viewProofData&&<div style={{borderRadius:14,overflow:'hidden',border:'1px solid var(--white)',marginBottom:16}}><img src={`data:image/jpeg;base64,${viewProofData}`} style={{width:'100%'}} alt="proof" onError={e=>{e.target.outerHTML=`<iframe src="data:application/pdf;base64,${viewProofData}" style="width:100%;height:500px;border:0"></iframe>`;}} /></div>}
          {viewProof.status==='pending'&&<div style={{display:'flex',gap:8}}><button className="btn btn-ok" onClick={()=>{depositAction(viewProof.id,'approve');setViewProof(null)}}>Approve</button><button className="btn btn-danger" onClick={()=>{depositAction(viewProof.id,'reject');setViewProof(null)}}>Reject</button></div>}
        </div></div>}

      </main>
    </div>
  );
}
