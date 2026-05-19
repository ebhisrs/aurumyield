'use client';
import { useState, useEffect, useCallback } from 'react';

const ALL_PERMISSIONS = [
  { key: 'approve_clients', label: 'Approve Clients' },
  { key: 'approve_deposits', label: 'Approve Deposits' },
  { key: 'approve_withdrawals', label: 'Approve Withdrawals' },
  { key: 'post_profit', label: 'Post Profit' },
];

export default function SuperAdminPage() {
  const [token, setToken] = useState(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('overview');
  const [admins, setAdmins] = useState([]);
  const [settings, setSettings] = useState({});
  const [audit, setAudit] = useState([]);
  const [stats, setStats] = useState({});
  const [msg, setMsg] = useState('');
  const [newAdmin, setNewAdmin] = useState({ username: '', name: '', password: '', permissions: ['approve_clients','approve_deposits','approve_withdrawals','post_profit'] });
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [editPerms, setEditPerms] = useState(null);
  const [resetPwAdmin, setResetPwAdmin] = useState(null);
  const [resetPwValue, setResetPwValue] = useState('');
  const [auditFilter, setAuditFilter] = useState('');
  const [settingsLocal, setSettingsLocal] = useState({});

  useEffect(() => {
    const t = localStorage.getItem('ay_token');
    const r = localStorage.getItem('ay_role');
    if (!t || r !== 'superadmin') { window.location.href = '/login'; return; }
    setToken(t);
    setReady(true);
  }, []);

  const h = useCallback(() => ({ Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }), [token]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const hd = { Authorization: 'Bearer ' + token };
      const [aRes, sRes, auRes, stRes] = await Promise.all([
        fetch('/api/admin?type=admins', { headers: hd }),
        fetch('/api/admin?type=settings', { headers: hd }),
        fetch('/api/admin?type=audit', { headers: hd }),
        fetch('/api/admin?type=stats', { headers: hd }),
      ]);
      if (!aRes.ok) { localStorage.clear(); window.location.href = '/login'; return; }
      const a = await aRes.json();
      const s = await sRes.json();
      const au = await auRes.json();
      const st = await stRes.json();
      setAdmins(Array.isArray(a) ? a : []);
      setSettings(s); setSettingsLocal(s);
      setAudit(Array.isArray(au) ? au : []);
      setStats(st);
    } catch (err) { console.error(err); }
  }, [token]);

  useEffect(() => { if (token) load(); }, [token, load]);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };
  const usd = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const logout = () => { localStorage.clear(); window.location.href = '/login'; };

  const createAdmin = async () => {
    if (!newAdmin.username || !newAdmin.name || !newAdmin.password) { flash('All fields required'); return; }
    const res = await fetch('/api/admin', { method: 'POST', headers: h(), body: JSON.stringify({ action: 'create_admin', ...newAdmin }) });
    const data = await res.json();
    if (!res.ok) { flash(data.error); return; }
    flash('Admin created'); setShowCreateAdmin(false); setNewAdmin({ username:'', name:'', password:'', permissions: ['approve_clients','approve_deposits','approve_withdrawals','post_profit'] }); load();
  };

  const toggleAdminStatus = async (adminId, newStatus) => {
    await fetch('/api/admin', { method: 'POST', headers: h(), body: JSON.stringify({ action: 'update_admin', adminId, status: newStatus }) });
    flash('Admin ' + (newStatus === 'active' ? 'enabled' : 'disabled')); load();
  };

  const deleteAdmin = async (adminId) => {
    if (!confirm('Delete this admin permanently?')) return;
    await fetch('/api/admin', { method: 'POST', headers: h(), body: JSON.stringify({ action: 'delete_admin', adminId }) });
    flash('Admin deleted'); load();
  };

  const savePerms = async () => {
    if (!editPerms) return;
    await fetch('/api/admin', { method: 'POST', headers: h(), body: JSON.stringify({ action: 'update_admin', adminId: editPerms.id, permissions: editPerms.permissions }) });
    flash('Permissions updated'); setEditPerms(null); load();
  };

  const resetPassword = async () => {
    if (!resetPwAdmin || !resetPwValue || resetPwValue.length < 6) { flash('Password must be 6+ characters'); return; }
    await fetch('/api/admin', { method: 'POST', headers: h(), body: JSON.stringify({ action: 'update_admin', adminId: resetPwAdmin.id, newPassword: resetPwValue }) });
    flash('Password reset'); setResetPwAdmin(null); setResetPwValue(''); load();
  };

  const saveSettings = async () => {
    const res = await fetch('/api/admin', { method: 'POST', headers: h(), body: JSON.stringify({ action: 'update_settings', settings: settingsLocal }) });
    if (res.ok) { flash('Settings saved'); load(); }
    else flash('Error saving');
  };

  const toggleNewPerm = (key) => {
    setNewAdmin(a => ({ ...a, permissions: a.permissions.includes(key) ? a.permissions.filter(p => p !== key) : [...a.permissions, key] }));
  };

  const filteredAudit = audit.filter(a => {
    if (!auditFilter) return true;
    return a.action.toLowerCase().includes(auditFilter.toLowerCase()) || a.admin.toLowerCase().includes(auditFilter.toLowerCase());
  });

  if (!ready) return null;

  const navItems = ['overview','admins','permissions','settings','audit'];

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <div className="brand" style={{marginBottom:34}}>
          <div className="brand-mark" style={{background:'linear-gradient(135deg,#f07f7f,#d9a441)'}}>S</div>
          <div><span style={{fontWeight:900,fontSize:18}}>AurumYield</span><small style={{display:'block',color:'#f07f7f',fontWeight:700,fontSize:12}}>Super Admin</small></div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(t => (
            <a key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)} style={{cursor:'pointer',textTransform:'capitalize'}}>{t}</a>
          ))}
        </nav>
        <div className="side-card" style={{borderColor:'rgba(240,127,127,.3)',background:'linear-gradient(150deg,rgba(240,127,127,.1),rgba(255,255,255,.03))'}}>
          <strong style={{display:'block',marginBottom:8,color:'#ffd5d5'}}>Super Admin Access</strong>
          <p className="muted" style={{fontSize:13}}>Full control over admins, permissions, platform settings, and audit trail.</p>
        </div>
      </aside>

      <main className="app-main">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,marginBottom:24,flexWrap:'wrap'}}>
          <div>
            <h1 style={{fontSize:'clamp(26px,3.5vw,40px)',letterSpacing:-1.5,lineHeight:1}}>Super Admin Console</h1>
            <p className="muted" style={{marginTop:8}}>Manage administrators, permissions, and platform configuration.</p>
          </div>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <div style={{display:'flex',gap:8,alignItems:'center',padding:'10px 16px',border:'1px solid rgba(240,127,127,.3)',borderRadius:999,background:'rgba(240,127,127,.08)'}}>
              <span style={{width:10,height:10,borderRadius:'50%',background:'#f07f7f',boxShadow:'0 0 18px rgba(240,127,127,.6)'}} />
              <span style={{fontSize:13,fontWeight:700,color:'#ffd5d5'}}>Super Admin</span>
            </div>
            <button onClick={logout} className="btn btn-small btn-secondary">Logout</button>
          </div>
        </div>

        {msg && <div className="success-msg" style={{marginBottom:16}}>{msg}</div>}

        {/* OVERVIEW STATS */}
        {tab === 'overview' && (
          <>
            <div className="stats-grid">
              <div className="card stat"><div className="stat-label">Total AUM</div><div className="stat-value">{usd(stats.totalAum)}</div></div>
              <div className="card stat"><div className="stat-label">Active Clients</div><div className="stat-value">{stats.activeClients || 0} <span className="muted" style={{fontSize:14}}>/ {stats.totalClients || 0}</span></div></div>
              <div className="card stat"><div className="stat-label">Active Admins</div><div className="stat-value">{stats.activeAdmins || 0}</div></div>
              <div className="card stat"><div className="stat-label">Profit Batches</div><div className="stat-value">{stats.profitBatches || 0}</div></div>
            </div>
            <div className="stats-grid" style={{marginTop:0}}>
              <div className="card stat"><div className="stat-label">Total Deposited</div><div className="stat-value" style={{color:'var(--green)'}}>{usd(stats.totalDeposited)}</div></div>
              <div className="card stat"><div className="stat-label">Total Withdrawn</div><div className="stat-value" style={{color:'var(--red)'}}>{usd(stats.totalWithdrawn)}</div></div>
              <div className="card stat"><div className="stat-label">Pending Deposits</div><div className="stat-value">{stats.pendingDeposits || 0}</div></div>
              <div className="card stat"><div className="stat-label">Pending Clients</div><div className="stat-value">{stats.pendingClients || 0}</div></div>
            </div>

            {/* Quick links */}
            <div className="actions-grid" style={{marginTop:18}}>
              <div className="card" style={{padding:24,cursor:'pointer'}} onClick={() => setTab('admins')}>
                <h3 style={{fontSize:18,fontWeight:800,marginBottom:8}}>Manage Admins</h3>
                <p className="muted" style={{fontSize:13}}>Create, enable, disable, or delete admin accounts. {admins.filter(a => a.role === 'admin').length} admin(s) configured.</p>
              </div>
              <div className="card" style={{padding:24,cursor:'pointer'}} onClick={() => setTab('settings')}>
                <h3 style={{fontSize:18,fontWeight:800,marginBottom:8}}>Platform Settings</h3>
                <p className="muted" style={{fontSize:13}}>Configure deposit limits, program targets, KYC requirements, and maintenance mode.</p>
              </div>
            </div>

            {/* Recent audit */}
            <div className="card" style={{padding:24,marginTop:18}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
                <div><span className="eyebrow">RECENT ACTIVITY</span><h2 style={{fontSize:22,fontWeight:800,marginTop:8}}>Latest Audit Entries</h2></div>
                <button className="btn btn-small btn-secondary" onClick={() => setTab('audit')}>View All</button>
              </div>
              {audit.slice(0, 8).map((a, i) => (
                <div key={i} className="audit-item">
                  <strong style={{fontSize:13}}>{a.action}</strong>
                  <span className="muted" style={{fontSize:12,display:'block',marginTop:4}}>{a.admin} — {new Date(a.date).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ADMINS TAB */}
        {tab === 'admins' && (
          <div className="card" style={{padding:24,marginTop:18}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18,flexWrap:'wrap',gap:12}}>
              <div><span className="eyebrow">ADMIN MANAGEMENT</span><h2 style={{fontSize:22,fontWeight:800,marginTop:8}}>Administrator Accounts</h2></div>
              <button className="btn btn-primary" onClick={() => setShowCreateAdmin(true)}>+ Create Admin</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Username</th><th>Name</th><th>Role</th><th>Status</th><th>Permissions</th><th>Created</th><th>Actions</th></tr></thead>
                <tbody>
                  {admins.map(a => (
                    <tr key={a.id}>
                      <td><strong>{a.username}</strong></td>
                      <td>{a.name}</td>
                      <td><span className="tag" style={{color: a.role === 'superadmin' ? '#ffd5d5' : 'var(--gold2)', background: a.role === 'superadmin' ? 'rgba(240,127,127,.1)' : 'rgba(217,164,65,.09)'}}>{a.role}</span></td>
                      <td><span className={'tag ' + a.status}>{a.status}</span></td>
                      <td style={{fontSize:12}}>{a.permissions.includes('all') ? 'Full Access' : a.permissions.length + ' permissions'}</td>
                      <td>{a.createdAt}</td>
                      <td>
                        {a.role !== 'superadmin' && (
                          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                            <button className="btn btn-small btn-secondary" onClick={() => setEditPerms({...a})}>Perms</button>
                            <button className="btn btn-small btn-secondary" onClick={() => { setResetPwAdmin(a); setResetPwValue(''); }}>Reset PW</button>
                            {a.status === 'active' ? (
                              <button className="btn btn-small btn-danger" onClick={() => toggleAdminStatus(a.id, 'disabled')}>Disable</button>
                            ) : (
                              <button className="btn btn-small btn-ok" onClick={() => toggleAdminStatus(a.id, 'active')}>Enable</button>
                            )}
                            <button className="btn btn-small btn-danger" onClick={() => deleteAdmin(a.id)}>Delete</button>
                          </div>
                        )}
                        {a.role === 'superadmin' && <span className="muted" style={{fontSize:12}}>Protected</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PERMISSIONS TAB */}
        {tab === 'permissions' && (
          <div className="card" style={{padding:24,marginTop:18}}>
            <div style={{marginBottom:18}}><span className="eyebrow">PERMISSIONS</span><h2 style={{fontSize:22,fontWeight:800,marginTop:8}}>Admin Permissions Overview</h2><p className="muted" style={{fontSize:13}}>Click an admin to edit their permissions.</p></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Admin</th>{ALL_PERMISSIONS.map(p => <th key={p.key}>{p.label}</th>)}<th>Actions</th></tr></thead>
                <tbody>
                  {admins.map(a => (
                    <tr key={a.id}>
                      <td><strong>{a.username}</strong><br/><span className="muted" style={{fontSize:11}}>{a.role}</span></td>
                      {ALL_PERMISSIONS.map(p => (
                        <td key={p.key} style={{textAlign:'center'}}>
                          {a.permissions.includes('all') || a.permissions.includes(p.key) ? (
                            <span style={{color:'var(--green)',fontSize:18}}>✓</span>
                          ) : (
                            <span style={{color:'var(--red)',fontSize:18}}>✗</span>
                          )}
                        </td>
                      ))}
                      <td>
                        {a.role !== 'superadmin' && (
                          <button className="btn btn-small btn-secondary" onClick={() => setEditPerms({...a})}>Edit</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === 'settings' && (
          <div className="card" style={{padding:24,marginTop:18}}>
            <div style={{marginBottom:18}}><span className="eyebrow">PLATFORM SETTINGS</span><h2 style={{fontSize:22,fontWeight:800,marginTop:8}}>System Configuration</h2><p className="muted" style={{fontSize:13}}>Changes apply immediately and are logged in the audit trail.</p></div>
            <div className="fields">
              <div className="field"><label>Platform Name</label><input value={settingsLocal.platformName || ''} onChange={e => setSettingsLocal({...settingsLocal, platformName: e.target.value})} /></div>
              <div className="field"><label>Minimum Deposit ($)</label><input type="number" value={settingsLocal.minDeposit || ''} onChange={e => setSettingsLocal({...settingsLocal, minDeposit: Number(e.target.value)})} /></div>
              <div className="field"><label>Conservative Target (%/month)</label><input value={settingsLocal.conservativeTarget || ''} onChange={e => setSettingsLocal({...settingsLocal, conservativeTarget: e.target.value})} /></div>
              <div className="field"><label>Growth Target (%/month)</label><input value={settingsLocal.growthTarget || ''} onChange={e => setSettingsLocal({...settingsLocal, growthTarget: e.target.value})} /></div>
              <div className="field"><label>Max Withdrawal (%)</label><input type="number" value={settingsLocal.maxWithdrawalPercent || ''} onChange={e => setSettingsLocal({...settingsLocal, maxWithdrawalPercent: Number(e.target.value)})} /></div>
              <div className="field full"><label>Disclaimer Text</label><textarea value={settingsLocal.disclaimer || ''} onChange={e => setSettingsLocal({...settingsLocal, disclaimer: e.target.value})} /></div>
            </div>

            <h3 style={{fontSize:16,fontWeight:800,margin:'24px 0 14px',color:'var(--gold2)'}}>Feature Toggles</h3>
            <div style={{display:'grid',gap:12}}>
              {[
                { key: 'kycRequired', label: 'KYC/AML Required for onboarding' },
                { key: 'autoApproveDeposits', label: 'Auto-approve deposits (skip admin review)' },
                { key: 'autoApproveWithdrawals', label: 'Auto-approve withdrawals (skip admin review)' },
                { key: 'maintenanceMode', label: 'Maintenance Mode (disable client access)' },
              ].map(toggle => (
                <label key={toggle.key} style={{display:'flex',gap:12,alignItems:'center',padding:14,border:'1px solid var(--white)',borderRadius:16,background:'rgba(0,0,0,.18)',cursor:'pointer'}}>
                  <input type="checkbox" checked={!!settingsLocal[toggle.key]} onChange={() => setSettingsLocal({...settingsLocal, [toggle.key]: !settingsLocal[toggle.key]})} style={{width:20,height:20,accentColor:'#d9a441'}} />
                  <span style={{fontSize:14,fontWeight:600}}>{toggle.label}</span>
                </label>
              ))}
            </div>

            <div style={{marginTop:24,display:'flex',gap:12}}>
              <button className="btn btn-primary" onClick={saveSettings}>Save All Settings</button>
              <button className="btn btn-secondary" onClick={() => setSettingsLocal(settings)}>Reset to Current</button>
            </div>
          </div>
        )}

        {/* AUDIT TAB */}
        {tab === 'audit' && (
          <div className="card" style={{padding:24,marginTop:18}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18,flexWrap:'wrap',gap:12}}>
              <div><span className="eyebrow">FULL AUDIT LOG</span><h2 style={{fontSize:22,fontWeight:800,marginTop:8}}>Activity Trail</h2><p className="muted" style={{fontSize:13}}>All admin and system actions. Up to 100 most recent.</p></div>
              <div className="field" style={{minWidth:260}}>
                <input placeholder="Filter by action or admin..." value={auditFilter} onChange={e => setAuditFilter(e.target.value)} />
              </div>
            </div>
            {filteredAudit.length === 0 ? (
              <p className="muted" style={{textAlign:'center',padding:24}}>No matching audit entries.</p>
            ) : filteredAudit.map((a, i) => (
              <div key={i} className="audit-item">
                <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
                  <strong style={{fontSize:13,flex:1}}>{a.action}</strong>
                  <span className="tag" style={{fontSize:11}}>{a.admin}</span>
                </div>
                <span className="muted" style={{fontSize:12,display:'block',marginTop:4}}>{new Date(a.date).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* CREATE ADMIN MODAL */}
        {showCreateAdmin && (
          <div className="modal-overlay" onClick={() => setShowCreateAdmin(false)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <h3 style={{fontSize:22,fontWeight:800,marginBottom:18}}>Create New Admin</h3>
              <div className="fields" style={{marginBottom:18}}>
                <div className="field"><label>Username</label><input value={newAdmin.username} onChange={e => setNewAdmin({...newAdmin, username: e.target.value})} placeholder="e.g. admin2" /></div>
                <div className="field"><label>Full Name</label><input value={newAdmin.name} onChange={e => setNewAdmin({...newAdmin, name: e.target.value})} placeholder="John Doe" /></div>
                <div className="field full"><label>Password</label><input type="password" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} placeholder="Min 6 characters" /></div>
              </div>
              <h4 style={{fontSize:14,fontWeight:800,marginBottom:10,color:'var(--gold2)'}}>Permissions</h4>
              <div style={{display:'grid',gap:8,marginBottom:18}}>
                {ALL_PERMISSIONS.map(p => (
                  <label key={p.key} style={{display:'flex',gap:10,alignItems:'center',cursor:'pointer',fontSize:14}}>
                    <input type="checkbox" checked={newAdmin.permissions.includes(p.key)} onChange={() => toggleNewPerm(p.key)} style={{width:18,height:18,accentColor:'#d9a441'}} />
                    {p.label}
                  </label>
                ))}
              </div>
              <div style={{display:'flex',gap:10}}>
                <button className="btn btn-primary" onClick={createAdmin}>Create Admin</button>
                <button className="btn btn-secondary" onClick={() => setShowCreateAdmin(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* EDIT PERMISSIONS MODAL */}
        {editPerms && (
          <div className="modal-overlay" onClick={() => setEditPerms(null)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <h3 style={{fontSize:22,fontWeight:800,marginBottom:6}}>Edit Permissions</h3>
              <p className="muted" style={{marginBottom:18}}>Admin: <strong>{editPerms.username}</strong> ({editPerms.name})</p>
              <div style={{display:'grid',gap:10,marginBottom:18}}>
                {ALL_PERMISSIONS.map(p => (
                  <label key={p.key} style={{display:'flex',gap:10,alignItems:'center',cursor:'pointer',fontSize:14,padding:12,border:'1px solid var(--white)',borderRadius:14,background:'rgba(0,0,0,.18)'}}>
                    <input type="checkbox" checked={editPerms.permissions.includes(p.key)} onChange={() => {
                      const perms = editPerms.permissions.includes(p.key) ? editPerms.permissions.filter(x => x !== p.key) : [...editPerms.permissions, p.key];
                      setEditPerms({...editPerms, permissions: perms});
                    }} style={{width:20,height:20,accentColor:'#d9a441'}} />
                    <span style={{fontWeight:600}}>{p.label}</span>
                  </label>
                ))}
              </div>
              <div style={{display:'flex',gap:10}}>
                <button className="btn btn-primary" onClick={savePerms}>Save Permissions</button>
                <button className="btn btn-secondary" onClick={() => setEditPerms(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* RESET PASSWORD MODAL */}
        {resetPwAdmin && (
          <div className="modal-overlay" onClick={() => setResetPwAdmin(null)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <h3 style={{fontSize:22,fontWeight:800,marginBottom:6}}>Reset Password</h3>
              <p className="muted" style={{marginBottom:18}}>Admin: <strong>{resetPwAdmin.username}</strong> ({resetPwAdmin.name})</p>
              <div className="field" style={{marginBottom:18}}>
                <label>New Password</label>
                <input type="password" value={resetPwValue} onChange={e => setResetPwValue(e.target.value)} placeholder="Min 6 characters" />
              </div>
              <div style={{display:'flex',gap:10}}>
                <button className="btn btn-primary" onClick={resetPassword}>Reset Password</button>
                <button className="btn btn-secondary" onClick={() => setResetPwAdmin(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
