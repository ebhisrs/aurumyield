'use client';
import { useState, useEffect, useCallback } from 'react';

export default function DashboardPage() {
  const [token, setToken] = useState(null);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tab, setTab] = useState('overview');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('success');
  const [depForm, setDepForm] = useState({amount:'',currency:'USD',method:'Bank Transfer',program:'Conservative'});
  const [depProof, setDepProof] = useState(null);
  const [depProofName, setDepProofName] = useState('');
  const [wdForm, setWdForm] = useState({amount:'',source:'Available Profit Balance',method:'Bank Transfer',destination:''});
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [reportType, setReportType] = useState('all');
  const [kycUploading, setKycUploading] = useState(false);
  const [kycStatus, setKycStatus] = useState(null);

  useEffect(() => {
    const t = localStorage.getItem('ay_token');
    const r = localStorage.getItem('ay_role');
    if (!t || r !== 'client') { window.location.href = '/login'; return; }
    setToken(t);
    setReady(true);
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const hd = { Authorization: 'Bearer ' + token };
      const [uRes, dRes, wRes, tRes] = await Promise.all([
        fetch('/api/clients', { headers: hd }),
        fetch('/api/deposits', { headers: hd }),
        fetch('/api/withdrawals', { headers: hd }),
        fetch('/api/profit?type=transactions', { headers: hd }),
      ]);
      if (!uRes.ok) { localStorage.clear(); window.location.href = '/login'; return; }
      const u = await uRes.json();
      const d = await dRes.json();
      const w = await wRes.json();
      const tx = await tRes.json();
      setUser(u);
      setDeposits(Array.isArray(d) ? d : []);
      setWithdrawals(Array.isArray(w) ? w : []);
      setTransactions(Array.isArray(tx) ? tx : []);
      // Check KYC status
      try {
        const kRes = await fetch('/api/kyc', { headers: hd });
        if (kRes.ok) { const k = await kRes.json(); setKycStatus(k); }
      } catch {}
    } catch (err) { console.error('Load error:', err); }
  }, [token]);

  useEffect(() => { if (token) load(); }, [token, load]);

  const flash = (m, type) => { setMsg(m); setMsgType(type || 'success'); setTimeout(() => setMsg(''), 4000); };
  const usd = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const submitDeposit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...depForm };
      if (depProof) payload.proof = depProof;
      const res = await fetch('/api/deposits', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (res.ok) { flash('Deposit request submitted! Ref: ' + (d.ref || '')); setDepForm({amount:'',currency:'USD',method:'Bank Transfer',program:'Conservative'}); setDepProof(null); setDepProofName(''); load(); }
      else flash(d.error || 'Error', 'error');
    } catch { flash('Network error', 'error'); }
  };

  const handleProofUpload = (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { flash('File too large. Max 5MB.', 'error'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setDepProof(reader.result.split(',')[1]);
      setDepProofName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const submitWithdrawal = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(wdForm),
      });
      const d = await res.json();
      if (res.ok) { flash('Withdrawal request submitted!'); setWdForm({amount:'',source:'Available Profit Balance',method:'Bank Transfer',destination:''}); load(); }
      else flash(d.error || 'Error', 'error');
    } catch { flash('Network error', 'error'); }
  };

  const uploadKyc = async (type, file) => {
    if (!file) return;
    setKycUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        const res = await fetch('/api/kyc', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, fileName: file.name, data: base64 }),
        });
        if (res.ok) { flash(type + ' uploaded successfully!'); load(); }
        else { const d = await res.json(); flash(d.error || 'Upload failed', 'error'); }
        setKycUploading(false);
      };
      reader.readAsDataURL(file);
    } catch { flash('Upload failed', 'error'); setKycUploading(false); }
  };

  const filteredTx = transactions.filter(t => {
    if (reportFrom && t.date < reportFrom) return false;
    if (reportTo && t.date > reportTo) return false;
    if (reportType !== 'all' && t.type !== reportType) return false;
    return true;
  });

  const exportPDF = async (txList, usr) => {
    try {
      const { default: jsPDF } = await import('jspdf');
      await import('jspdf-autotable');
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('AurumYield — Transaction Report', 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(120);
      doc.text(`Client: ${usr.name} | Account: AY-${String(usr.id).padStart(5,'0')}`, 14, 32);
      doc.text(`Generated: ${new Date().toLocaleDateString()} | Period: ${reportFrom || 'All'} to ${reportTo || 'All'} | Type: ${reportType}`, 14, 39);
      doc.setTextColor(0);
      const rows = txList.map(t => [
        t.date || '', t.type || '', t.desc || '',
        (t.amount >= 0 ? '+' : '') + usd(Math.abs(t.amount)),
        t.balanceBefore != null ? usd(t.balanceBefore) : '-',
        t.balanceAfter != null ? usd(t.balanceAfter) : '-',
        t.status || ''
      ]);
      doc.autoTable({
        startY: 46,
        head: [['Date','Type','Description','Amount','Before','After','Status']],
        body: rows,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [217,164,65] },
      });
      doc.save(`AurumYield_Report_${usr.name.replace(/\s/g,'_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) { console.error('PDF export error:', e); flash('PDF export failed', 'error'); }
  };

  const exportExcel = async (txList, usr) => {
    try {
      const XLSX = await import('xlsx');
      const data = txList.map(t => ({
        Date: t.date || '',
        Type: t.type || '',
        Description: t.desc || '',
        Amount: t.amount || 0,
        'Balance Before': t.balanceBefore || 0,
        'Balance After': t.balanceAfter || 0,
        Status: t.status || '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
      // Add summary sheet
      const summary = [
        { Field: 'Client', Value: usr.name },
        { Field: 'Account', Value: 'AY-' + String(usr.id).padStart(5,'0') },
        { Field: 'Program', Value: usr.program },
        { Field: 'Total Balance', Value: usr.balance },
        { Field: 'Withdrawable', Value: usr.withdrawable },
        { Field: 'Locked Capital', Value: usr.lockedCapital },
        { Field: 'Report Period', Value: (reportFrom || 'All') + ' to ' + (reportTo || 'All') },
        { Field: 'Filter', Value: reportType },
        { Field: 'Generated', Value: new Date().toISOString() },
      ];
      const ws2 = XLSX.utils.json_to_sheet(summary);
      XLSX.utils.book_append_sheet(wb, ws2, 'Summary');
      XLSX.writeFile(wb, `AurumYield_Report_${usr.name.replace(/\s/g,'_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (e) { console.error('Excel export error:', e); flash('Excel export failed', 'error'); }
  };

  const logout = () => { localStorage.clear(); window.location.href = '/login'; };

  if (!ready) return null;

  if (!user) return (
    <div style={{background:'var(--bg)',minHeight:'100vh',display:'grid',placeItems:'center'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:60,height:60,borderRadius:'50%',background:'linear-gradient(135deg,var(--gold),var(--gold2))',display:'grid',placeItems:'center',color:'#111',fontWeight:900,fontSize:24,margin:'0 auto 16px'}}>A</div>
        <p className="muted">Loading dashboard...</p>
      </div>
    </div>
  );

  const isApproved = user.status === 'approved';
  const isPending = user.status === 'pending';
  const isDisabled = user.status === 'disabled';
  const pendingCount = deposits.filter(d => d.status === 'pending').length + withdrawals.filter(w => w.status === 'pending').length;

  // PENDING CLIENT VIEW — restricted dashboard
  if (isPending) {
    return (
      <div className="app-layout">
        <aside className="app-sidebar">
          <a className="brand" href="/"><span className="brand-mark">A</span><span>AurumYield</span></a>
          <nav className="sidebar-nav">
            <a className="active" style={{cursor:'pointer'}}>Account Status</a>
            <a onClick={() => setTab('kyc')} className={tab === 'kyc' ? 'active' : ''} style={{cursor:'pointer'}}>KYC Documents</a>
          </nav>
        </aside>
        <main className="app-main">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:20,marginBottom:28,flexWrap:'wrap'}}>
            <div>
              <span className="eyebrow">ACCOUNT PENDING</span>
              <h1 style={{fontSize:'clamp(28px,3.5vw,42px)',letterSpacing:-1.5,lineHeight:1,marginTop:8}}>Welcome, <span className="gold">{user.name ? user.name.split(' ')[0] : 'Investor'}</span></h1>
            </div>
            <button onClick={logout} className="btn btn-small btn-secondary">Logout</button>
          </div>

          {msg && <div className={msgType === 'error' ? 'notice' : 'success-msg'} style={{marginBottom:16}}>{msg}</div>}

          {tab !== 'kyc' && (
            <>
              <div className="card" style={{padding:32,textAlign:'center',marginBottom:24}}>
                <div style={{fontSize:48,marginBottom:16}}>⏳</div>
                <h2 style={{fontSize:24,fontWeight:800,marginBottom:12}}>Your Account is Under Review</h2>
                <p className="muted" style={{fontSize:15,maxWidth:500,margin:'0 auto 20px'}}>
                  Our team is reviewing your registration. Once approved, you will have full access to deposit, invest, and manage your portfolio.
                </p>
                <div className="tag pending" style={{fontSize:14,padding:'10px 18px'}}>Status: Pending Approval</div>
              </div>

              <div className="card" style={{padding:24,marginBottom:18}}>
                <h3 style={{fontSize:18,fontWeight:800,marginBottom:14}}>What happens next?</h3>
                <div style={{display:'grid',gap:16}}>
                  {[
                    { step: '1', title: 'Upload KYC Documents', desc: 'Submit your passport/ID and proof of address for verification.', done: kycStatus && kycStatus.documents && kycStatus.documents.length > 0 },
                    { step: '2', title: 'Admin Review', desc: 'Our team reviews your registration and documents.', done: false },
                    { step: '3', title: 'Account Approved', desc: 'Your investment account is created and you can start depositing.', done: false },
                  ].map((s, i) => (
                    <div key={i} style={{display:'flex',gap:14,alignItems:'flex-start'}}>
                      <div style={{width:38,height:38,borderRadius:'50%',display:'grid',placeItems:'center',background: s.done ? 'rgba(123,216,143,.15)' : 'rgba(217,164,65,.12)',border: '1px solid ' + (s.done ? 'rgba(123,216,143,.3)' : 'var(--line)'),color: s.done ? 'var(--green)' : 'var(--gold2)',fontWeight:900,flexShrink:0}}>{s.done ? '✓' : s.step}</div>
                      <div><strong style={{fontSize:15}}>{s.title}</strong><p className="muted" style={{fontSize:13,marginTop:2}}>{s.desc}</p></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="notice">
                <strong>Need help?</strong> Contact our support team if you have questions about the approval process.
              </div>
            </>
          )}

          {/* KYC UPLOAD */}
          {tab === 'kyc' && (
            <div className="card" style={{padding:24}}>
              <div style={{marginBottom:20}}><span className="eyebrow">KYC VERIFICATION</span><h2 style={{fontSize:22,fontWeight:800,marginTop:8}}>Upload Your Documents</h2><p className="muted" style={{fontSize:13}}>Required for account approval. Accepted formats: JPG, PNG, PDF (max 5MB).</p></div>

              <div style={{display:'grid',gap:18}}>
                {[
                  { type: 'passport', label: 'Passport or National ID', desc: 'Clear photo or scan of your passport or national ID card.' },
                  { type: 'proof_of_address', label: 'Proof of Address', desc: 'Utility bill, bank statement, or government letter (less than 3 months old).' },
                  { type: 'selfie', label: 'Selfie with ID', desc: 'Photo of yourself holding your ID document.' },
                ].map(doc => {
                  const uploaded = kycStatus && kycStatus.documents && kycStatus.documents.find(d => d.type === doc.type);
                  return (
                    <div key={doc.type} style={{padding:20,border:'1px solid ' + (uploaded ? 'rgba(123,216,143,.3)' : 'var(--white)'),borderRadius:20,background: uploaded ? 'rgba(123,216,143,.05)' : 'rgba(0,0,0,.18)'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                        <div>
                          <strong style={{fontSize:15}}>{doc.label}</strong>
                          <p className="muted" style={{fontSize:13,marginTop:2}}>{doc.desc}</p>
                        </div>
                        {uploaded ? (
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <span className="tag approved">Uploaded</span>
                            <span className="muted" style={{fontSize:12}}>{uploaded.fileName}</span>
                          </div>
                        ) : (
                          <label className="btn btn-primary btn-small" style={{cursor:'pointer',opacity:kycUploading?0.5:1}}>
                            {kycUploading ? 'Uploading...' : 'Upload'}
                            <input type="file" accept=".jpg,.jpeg,.png,.pdf" style={{display:'none'}} disabled={kycUploading}
                              onChange={e => { if (e.target.files[0]) uploadKyc(doc.type, e.target.files[0]); }} />
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {kycStatus && kycStatus.documents && kycStatus.documents.length > 0 && (
                <div className="success-msg" style={{marginTop:18}}>
                  {kycStatus.documents.length} of 3 documents uploaded. {kycStatus.documents.length >= 3 ? 'All documents submitted — awaiting admin review.' : 'Please upload remaining documents.'}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    );
  }

  // DISABLED CLIENT VIEW
  if (isDisabled) {
    return (
      <div className="app-layout">
        <aside className="app-sidebar">
          <a className="brand" href="/"><span className="brand-mark">A</span><span>AurumYield</span></a>
        </aside>
        <main className="app-main">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:20,marginBottom:28}}>
            <h1 style={{fontSize:'clamp(28px,3.5vw,42px)',letterSpacing:-1.5,lineHeight:1}}>Account Disabled</h1>
            <button onClick={logout} className="btn btn-small btn-secondary">Logout</button>
          </div>
          <div className="card" style={{padding:32,textAlign:'center'}}>
            <div style={{fontSize:48,marginBottom:16}}>🚫</div>
            <h2 style={{fontSize:24,fontWeight:800,marginBottom:12,color:'#ffd5d5'}}>Your Account Has Been Disabled</h2>
            <p className="muted" style={{fontSize:15,maxWidth:500,margin:'0 auto'}}>
              Your account has been disabled by an administrator. If you believe this is an error, please contact our support team.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // APPROVED CLIENT — FULL DASHBOARD
  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <a className="brand" href="/"><span className="brand-mark">A</span><span>AurumYield</span></a>
        <nav className="sidebar-nav">
          {['overview','deposit','withdrawal','reports','kyc'].map(t => (
            <a key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)} style={{cursor:'pointer',textTransform:'capitalize'}}>{t === 'kyc' ? 'KYC Documents' : t}</a>
          ))}
        </nav>
        <div className="side-card">
          <small>Selected Program</small>
          <h3 style={{fontSize:16,fontWeight:800,marginTop:4}}>{user.program} Gold {user.program === 'Conservative' ? 'Income' : 'Growth'}</h3>
          <p className="muted" style={{fontSize:13}}>Target objective up to {user.program === 'Conservative' ? '4' : '8'}% monthly.</p>
        </div>
      </aside>

      <main className="app-main">
        {/* TOPBAR */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:20,marginBottom:28,flexWrap:'wrap'}}>
          <div>
            <span className="eyebrow">CLIENT CABINET</span>
            <h1 style={{fontSize:'clamp(28px,3.5vw,42px)',letterSpacing:-1.5,lineHeight:1,marginTop:8}}>Welcome back, <span className="gold">{user.name ? user.name.split(' ')[0] : 'Investor'}</span></h1>
            <p className="muted" style={{marginTop:8}}>Manage deposits, withdrawals, balances, and reports.</p>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{textAlign:'right'}}><strong style={{fontSize:13}}>Account</strong><br/><span className="muted" style={{fontSize:12}}>AY-{String(user.id).padStart(5,'0')}</span></div>
            <div style={{width:44,height:44,borderRadius:'50%',display:'grid',placeItems:'center',background:'rgba(217,164,65,.15)',border:'1px solid var(--line)',fontWeight:900,color:'var(--gold2)'}}>{user.name ? user.name[0] : 'A'}</div>
            <button onClick={logout} className="btn btn-small btn-secondary">Logout</button>
          </div>
        </div>

        {msg && <div className={msgType === 'error' ? 'notice' : 'success-msg'} style={{marginBottom:16}}>{msg}</div>}

        {/* STATS */}
        {(tab === 'overview' || tab === 'deposit' || tab === 'withdrawal') && (
          <div className="stats-grid">
            <div className="card stat"><div className="stat-label">Total Balance</div><div className="stat-value">{usd(user.balance)}</div><div className="delta">+{user.lastProfit} this month</div></div>
            <div className="card stat"><div className="stat-label">Available to Withdraw</div><div className="stat-value">{usd(user.withdrawable)}</div><div className="delta">Eligible profit</div></div>
            <div className="card stat"><div className="stat-label">Locked Capital</div><div className="stat-value">{usd(user.lockedCapital)}</div><div className="delta" style={{color:'var(--gold2)'}}>Invested</div></div>
            <div className="card stat"><div className="stat-label">Pending Requests</div><div className="stat-value">{pendingCount}</div><div className="delta" style={{color:'var(--gold2)'}}>Under review</div></div>
          </div>
        )}

        {/* DEPOSIT FORM */}
        {(tab === 'overview' || tab === 'deposit') && (
          <div className="card" style={{padding:24,marginTop:18}}>
            <div style={{marginBottom:18}}><span className="eyebrow">DEPOSIT</span><h2 style={{fontSize:22,fontWeight:800,marginTop:8}}>Fund Your Account</h2><p className="muted" style={{fontSize:13}}>Submit a deposit request for admin review.</p></div>
            <form onSubmit={submitDeposit} className="fields">
              <div className="field"><label>Amount (min $1,000)</label><input required type="number" min="1000" value={depForm.amount} onChange={e => setDepForm({...depForm,amount:e.target.value})} placeholder="1000" /></div>
              <div className="field"><label>Currency</label><select value={depForm.currency} onChange={e => setDepForm({...depForm,currency:e.target.value})}><option>USD</option><option>AED</option><option>EUR</option><option>GBP</option></select></div>
              <div className="field"><label>Method</label><select value={depForm.method} onChange={e => setDepForm({...depForm,method:e.target.value})}><option>Bank Transfer</option><option>Card Payment</option><option>USDT / Stablecoin</option></select></div>
              <div className="field"><label>Program</label><select value={depForm.program} onChange={e => setDepForm({...depForm,program:e.target.value})}><option>Conservative</option><option>Growth</option></select></div>
              <div className="field full">
                <label>Payment Proof *</label>
                <p className="muted" style={{fontSize:12,marginBottom:8}}>Upload screenshot or receipt of your payment (JPG, PNG, PDF — max 5MB)</p>
                {depProofName ? (
                  <div style={{display:'flex',alignItems:'center',gap:10,padding:12,border:'1px solid rgba(123,216,143,.3)',borderRadius:14,background:'rgba(123,216,143,.05)'}}>
                    <span style={{color:'var(--green)',fontWeight:700}}>✓</span>
                    <span style={{fontSize:13,flex:1}}>{depProofName}</span>
                    <button type="button" onClick={() => { setDepProof(null); setDepProofName(''); }} style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:16}}>✕</button>
                  </div>
                ) : (
                  <label style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'20px 16px',border:'2px dashed var(--line)',borderRadius:16,cursor:'pointer',background:'rgba(217,164,65,.04)'}}>
                    <span style={{color:'var(--gold2)',fontWeight:700,fontSize:14}}>Click to upload payment proof</span>
                    <input type="file" accept=".jpg,.jpeg,.png,.pdf" style={{display:'none'}} onChange={e => { if (e.target.files[0]) handleProofUpload(e.target.files[0]); }} />
                  </label>
                )}
              </div>
              <div className="full"><button type="submit" className="btn btn-primary" disabled={!depProof}>Create Deposit Request</button></div>
            </form>
          </div>
        )}

        {/* MY DEPOSITS LIST */}
        {(tab === 'overview' || tab === 'deposit') && deposits.length > 0 && (
          <div className="card" style={{padding:24,marginTop:18}}>
            <div style={{marginBottom:18}}><span className="eyebrow">MY DEPOSITS</span><h2 style={{fontSize:22,fontWeight:800,marginTop:8}}>Deposit History</h2></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Ref</th><th>Proof</th><th>Status</th></tr></thead>
                <tbody>
                  {deposits.map(d => (
                    <tr key={d.id}><td>{d.date}</td><td style={{fontWeight:700}}>{usd(d.amount)}</td><td>{d.method}</td><td>{d.ref}</td><td>{d.hasProof ? <span className="tag approved" style={{fontSize:11}}>Attached</span> : <span className="muted" style={{fontSize:11}}>None</span>}</td><td><span className={'tag ' + d.status}>{d.status}</span></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* WITHDRAWAL FORM */}
        {(tab === 'overview' || tab === 'withdrawal') && (
          <div className="card" style={{padding:24,marginTop:18}}>
            <div style={{marginBottom:18}}><span className="eyebrow">WITHDRAWAL</span><h2 style={{fontSize:22,fontWeight:800,marginTop:8}}>Request Withdrawal</h2><p className="muted" style={{fontSize:13}}>Available balance: {usd(user.balance)}</p></div>
            <form onSubmit={submitWithdrawal} className="fields">
              <div className="field"><label>Amount</label><input required type="number" min="100" max={user.balance} value={wdForm.amount} onChange={e => setWdForm({...wdForm,amount:e.target.value})} placeholder="Amount" /></div>
              <div className="field"><label>Withdraw From</label><select value={wdForm.source} onChange={e => setWdForm({...wdForm,source:e.target.value})}><option>Available Profit Balance</option><option>Total Account Balance</option></select></div>
              <div className="field"><label>Method</label><select value={wdForm.method} onChange={e => setWdForm({...wdForm,method:e.target.value})}><option>Bank Transfer</option><option>Crypto Wallet</option></select></div>
              <div className="field"><label>Destination</label><input required value={wdForm.destination} onChange={e => setWdForm({...wdForm,destination:e.target.value})} placeholder="IBAN / Wallet address" /></div>
              <div className="full"><button type="submit" className="btn btn-danger">Submit Withdrawal Request</button></div>
            </form>
          </div>
        )}

        {/* MY WITHDRAWALS LIST */}
        {(tab === 'overview' || tab === 'withdrawal') && withdrawals.length > 0 && (
          <div className="card" style={{padding:24,marginTop:18}}>
            <div style={{marginBottom:18}}><span className="eyebrow">MY WITHDRAWALS</span><h2 style={{fontSize:22,fontWeight:800,marginTop:8}}>Withdrawal History</h2></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Destination</th><th>Status</th></tr></thead>
                <tbody>
                  {withdrawals.map(w => (
                    <tr key={w.id}><td>{w.date}</td><td style={{fontWeight:700}}>{usd(w.amount)}</td><td>{w.method}</td><td>{w.destination}</td><td><span className={'tag ' + w.status}>{w.status}</span></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* BALANCE CHART */}
        {tab === 'overview' && (
          <div className="card" style={{padding:24,marginTop:18}}>
            <div style={{marginBottom:18}}><span className="eyebrow">BALANCE</span><h2 style={{fontSize:22,fontWeight:800,marginTop:8}}>Portfolio Balance</h2></div>
            <div className="chart">{[45,52,49,68,74,82,77,89,94,88,96,100].map((ht,i) => <div key={i} className="bar" style={{height: ht + '%'}} />)}</div>
          </div>
        )}

        {/* REPORTS */}
        {(tab === 'overview' || tab === 'reports') && (
          <div className="card" style={{padding:24,marginTop:18}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18,flexWrap:'wrap',gap:12}}>
              <div><span className="eyebrow">HISTORICAL REPORT</span><h2 style={{fontSize:22,fontWeight:800,marginTop:8}}>Transaction History</h2></div>
              {tab === 'reports' && filteredTx.length > 0 && (
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  <button className="btn btn-small btn-secondary" onClick={() => exportPDF(filteredTx, user)}>Export PDF</button>
                  <button className="btn btn-small btn-secondary" onClick={() => exportExcel(filteredTx, user)}>Export Excel</button>
                </div>
              )}
            </div>
            <div className="fields" style={{marginBottom:18}}>
              <div className="field"><label>From Date</label><input type="date" value={reportFrom} onChange={e => setReportFrom(e.target.value)} /></div>
              <div className="field"><label>To Date</label><input type="date" value={reportTo} onChange={e => setReportTo(e.target.value)} /></div>
              <div className="field"><label>Type</label><select value={reportType} onChange={e => setReportType(e.target.value)}><option value="all">All Activity</option><option value="performance">Performance</option><option value="deposit">Deposits</option><option value="withdrawal">Withdrawals</option><option value="adjustment">Admin Adjustments</option></select></div>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Amount</th><th>Balance Before</th><th>Balance After</th><th>Status</th></tr></thead>
                <tbody>
                  {filteredTx.length === 0 ? (
                    <tr><td colSpan={7} style={{textAlign:'center',color:'var(--muted)'}}>No transactions found</td></tr>
                  ) : filteredTx.map(t => (
                    <tr key={t.id}>
                      <td>{t.date}</td>
                      <td style={{textTransform:'capitalize'}}>{t.type}</td>
                      <td>{t.desc}</td>
                      <td style={{color: t.amount >= 0 ? 'var(--green)' : 'var(--red)', fontWeight:700}}>{t.amount >= 0 ? '+' : ''}{usd(Math.abs(t.amount))}</td>
                      <td className="muted">{t.balanceBefore != null ? usd(t.balanceBefore) : '-'}</td>
                      <td style={{fontWeight:600}}>{t.balanceAfter != null ? usd(t.balanceAfter) : '-'}</td>
                      <td><span className={'tag ' + (t.status || '').toLowerCase()}>{t.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredTx.length > 0 && (
              <p className="muted" style={{fontSize:12,marginTop:14}}>Showing {filteredTx.length} transaction(s). {reportFrom || reportTo ? 'Filtered by date range.' : ''}</p>
            )}
          </div>
        )}

        {/* KYC DOCUMENTS TAB */}
        {tab === 'kyc' && (
          <div className="card" style={{padding:24,marginTop:18}}>
            <div style={{marginBottom:20}}><span className="eyebrow">KYC VERIFICATION</span><h2 style={{fontSize:22,fontWeight:800,marginTop:8}}>Your Documents</h2><p className="muted" style={{fontSize:13}}>Upload or update your verification documents.</p></div>
            <div style={{display:'grid',gap:18}}>
              {[
                { type: 'passport', label: 'Passport or National ID', desc: 'Clear photo or scan of your passport or national ID card.' },
                { type: 'proof_of_address', label: 'Proof of Address', desc: 'Utility bill, bank statement, or government letter (less than 3 months old).' },
                { type: 'selfie', label: 'Selfie with ID', desc: 'Photo of yourself holding your ID document.' },
              ].map(doc => {
                const uploaded = kycStatus && kycStatus.documents && kycStatus.documents.find(d => d.type === doc.type);
                return (
                  <div key={doc.type} style={{padding:20,border:'1px solid ' + (uploaded ? 'rgba(123,216,143,.3)' : 'var(--white)'),borderRadius:20,background: uploaded ? 'rgba(123,216,143,.05)' : 'rgba(0,0,0,.18)'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                      <div><strong style={{fontSize:15}}>{doc.label}</strong><p className="muted" style={{fontSize:13,marginTop:2}}>{doc.desc}</p></div>
                      {uploaded ? (
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <span className="tag approved">Uploaded</span>
                          <span className="muted" style={{fontSize:12}}>{uploaded.fileName}</span>
                        </div>
                      ) : (
                        <label className="btn btn-primary btn-small" style={{cursor:'pointer',opacity:kycUploading?0.5:1}}>
                          {kycUploading ? 'Uploading...' : 'Upload'}
                          <input type="file" accept=".jpg,.jpeg,.png,.pdf" style={{display:'none'}} disabled={kycUploading}
                            onChange={e => { if (e.target.files[0]) uploadKyc(doc.type, e.target.files[0]); }} />
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
