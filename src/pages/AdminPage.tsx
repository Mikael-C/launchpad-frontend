import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Topbar } from '../components/Topbar';
import { Toast } from '../components/Toast';
import type { ToastMessage } from '../components/Toast';
import { Shield, ShieldAlert, CheckCircle, XCircle, Play, PlusCircle, UserCheck, ListChecks, Search } from 'lucide-react';
import { API_URL } from '../config';

interface PendingOperation {
  id: string;
  operationType: string;
  description: string;
  payload?: string;
  nonce: string;
  status: string;
  approvalCount: number;
  requiredApprovals: number;
  signatures: Array<{ adminWallet: string; timestamp: string }>;
  proposedBy: string;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  symbol: string;
  description: string;
  category: string;
  chain: string;
  softCap: number;
  hardCap: number;
  status: string;
}

export const AdminPage: React.FC = () => {
  const { user, killSwitchActive, setKillSwitchActive } = useApp();
  const [operations, setOperations] = useState<PendingOperation[]>([]);
  const [pendingProjects, setPendingProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Propose operation state
  const [opType, setOpType] = useState<string>('CREATE_SALE');
  const [opDescription, setOpDescription] = useState<string>('');

  // Whitelist management state
  const [wlProjectId, setWlProjectId] = useState<string>('');
  const [wlWalletAddress, setWlWalletAddress] = useState<string>('');
  const [wlTier, setWlTier] = useState<string>('SILVER');
  const [wlIsLoading, setWlIsLoading] = useState<boolean>(false);
  const [wlCheckResult, setWlCheckResult] = useState<any>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: ToastMessage['type'], title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const [deployedContracts, setDeployedContracts] = useState<any>(null);

  useEffect(() => {
    fetchOperations();
    fetchPendingProjects();
    fetchDeployedContracts();
    fetchAllProjects();
  }, [user.isConnected, user.walletAddress]);

  const fetchDeployedContracts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/admin/contracts`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        setDeployedContracts(data);
      } else {
        throw new Error('Response status not OK');
      }
    } catch (err) {
      console.error('Failed to fetch deployed contracts:', err);
      // Fallback placeholder addresses if backend is offline or contracts are not configured
      setDeployedContracts({
        baseSepolia: {
          saleFactory: '0x3488615B20F2a39640Be694a66D2b86182faaF51'
        },
        hoodi: {
          saleFactory: '0x9998d8694E7636F93A52A8330e300a84d67C99D8',
          stablecoinAccount: '0x6bBA7BD264b20C30Ae93948bDC92cf295f2049f0',
          securityController: '0x3488615B20F2a39640Be694a66D2b86182faaF51'
        }
      });
    }
  };

  // Normalize an operation object from the API so signatures is always an array
  const normalizeOperation = (op: any): PendingOperation => ({
    ...op,
    signatures: Array.isArray(op.signatures) ? op.signatures : [],
    approvalCount: op.approvalCount ?? 0,
    requiredApprovals: op.requiredApprovals ?? 3,
  });

  const fetchOperations = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/admin/operations`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        const ops = (data.operations || []).map(normalizeOperation);
        setOperations(ops);
      } else {
        throw new Error();
      }
    } catch {
      // Mock operations fallback
      setOperations([
        {
          id: 'op-101',
          operationType: 'CREATE_SALE',
          description: 'Deploy token sale contract for NexaChain project.',
          nonce: '1001',
          status: 'pending',
          approvalCount: 1,
          requiredApprovals: 3,
          signatures: [{ adminWallet: '0x1111111111111111111111111111111111111111', timestamp: new Date().toISOString() }],
          proposedBy: '0x1111111111111111111111111111111111111111',
          createdAt: new Date(Date.now() - 3600000).toISOString()
        }
      ]);
    }
  };

  const fetchPendingProjects = async () => {
    try {
      const res = await fetch(`${API_URL}/projects?status=pending`);
      if (res.ok) {
        const data = await res.json();
        setPendingProjects(data.projects || []);
      } else {
        throw new Error();
      }
    } catch {
      setPendingProjects([
        {
          id: 'seed-grt',
          name: 'GreenToken',
          symbol: 'GRT',
          description: 'Carbon credit tokenization platform for ESG compliance.',
          category: 'RWA',
          chain: 'Hoodi',
          softCap: 10000,
          hardCap: 50000,
          status: 'pending'
        }
      ]);
    }
  };

  // Toggle kill switch
  const toggleKillSwitch = async (activate: boolean) => {
    if (user.role !== 'super_admin') {
      addToast('error', 'Unauthorized', 'Only super administrators are authorized to toggle the kill switch.');
      return;
    }
    
    setIsLoading(true);
    try {
      const endpoint = activate 
        ? `${API_URL}/admin/kill-switch/activate`
        : `${API_URL}/admin/kill-switch/deactivate`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      if (res.ok) {
        setKillSwitchActive(activate);
        addToast(activate ? 'error' : 'success', activate ? 'Platform Paused' : 'Platform Resumed', activate ? 'Kill switch triggered. All transactions halted.' : 'Platform operating normally.');
      } else {
        throw new Error();
      }
    } catch {
      setKillSwitchActive(activate);
      addToast(activate ? 'error' : 'success', activate ? 'Platform Paused (Simulated)' : 'Platform Resumed (Simulated)', activate ? 'All actions paused.' : 'Normal operations resumed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Approve Project
  const handleProjectApproval = async (projectId: string, approve: boolean) => {
    if (user.role !== 'super_admin') {
      addToast('error', 'Unauthorized', 'Super admin credentials required.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/projects/${projectId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` },
        body: JSON.stringify({
          action: approve ? 'approved' : 'rejected',
          adminNotes: 'Reviewed and certified by multi-sig super admins.'
        })
      });
      if (res.ok) {
        addToast('success', 'Project Approved', `Project ${approve ? 'approved' : 'rejected'} successfully.`);
        fetchPendingProjects();
      } else {
        throw new Error();
      }
    } catch {
      addToast('success', 'Approval Recorded (Simulated)', `Project ${approve ? 'approved' : 'rejected'}.`);
      setPendingProjects(prev => prev.filter(p => p.id !== projectId));
    }
  };

  // Propose Operation
  const handleProposeOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user.role !== 'super_admin') {
      addToast('error', 'Unauthorized', 'Super admin credentials required.');
      return;
    }
    if (!user.walletAddress) {
      addToast('error', 'Wallet Not Connected', 'Please connect your wallet before proposing an operation.');
      return;
    }
    if (!opDescription.trim()) {
      addToast('error', 'Missing Description', 'Please provide a description for the operation.');
      return;
    }

    const walletAddress = user.walletAddress; // guaranteed non-null from here on

    try {
      const res = await fetch(`${API_URL}/admin/operations/propose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` },
        body: JSON.stringify({
          operationType: opType,
          description: opDescription,
          nonce: Math.floor(Math.random() * 10000).toString(),
          proposedBy: walletAddress
        })
      });
      if (res.ok) {
        addToast('success', 'Operation Proposed', 'New multi-sig operation proposed.');
        setOpDescription('');
        fetchOperations();
      } else {
        throw new Error();
      }
    } catch {
      const opObj: PendingOperation = {
        id: 'op-' + Math.floor(Math.random() * 1000),
        operationType: opType,
        description: opDescription.trim(),
        nonce: Math.floor(Math.random() * 10000).toString(),
        status: 'pending',
        approvalCount: 1,
        requiredApprovals: 3,
        signatures: [{ adminWallet: walletAddress, timestamp: new Date().toISOString() }],
        proposedBy: walletAddress,
        createdAt: new Date().toISOString()
      };
      setOperations(prev => [opObj, ...prev]);
      setOpDescription('');
      addToast('success', 'Operation Proposed (Simulated)', 'New multi-sig operation proposed.');
    }
  };

  // Approve multi-sig operation
  const handleApproveOperation = async (opId: string) => {
    if (user.role !== 'super_admin') {
      addToast('error', 'Unauthorized', 'Super admin credentials required.');
      return;
    }
    if (!user.walletAddress) {
      addToast('error', 'Wallet Not Connected', 'Please connect your wallet to sign operations.');
      return;
    }

    const walletAddress = user.walletAddress; // guaranteed non-null from here on

    // Check if user already approved (with null-safe comparison)
    const op = operations.find(o => o.id === opId);
    if (op?.signatures.some(s => s.adminWallet && s.adminWallet.toLowerCase() === walletAddress.toLowerCase())) {
      addToast('warning', 'Already Signed', 'You have already signed this operation.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/admin/operations/${opId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      if (res.ok) {
        addToast('success', 'Signature Added', 'Your approval signature has been recorded.');
        fetchOperations();
      } else {
        throw new Error();
      }
    } catch {
      setOperations(prev => prev.map(o => {
        if (o.id === opId) {
          const newApprovals = o.approvalCount + 1;
          const status = newApprovals >= 3 ? 'ready' : 'pending';
          return {
            ...o,
            approvalCount: newApprovals,
            status,
            signatures: [...o.signatures, { adminWallet: walletAddress, timestamp: new Date().toISOString() }]
          };
        }
        return o;
      }));
      addToast('success', 'Signature Added (Simulated)', 'Approval signature recorded.');
    }
  };

  // Execute multi-sig operation
  const handleExecuteOperation = async (opId: string) => {
    if (user.role !== 'super_admin') {
      addToast('error', 'Unauthorized', 'Super admin credentials required.');
      return;
    }

    const op = operations.find(o => o.id === opId);
    if (op && op.approvalCount < 3) {
      addToast('error', 'Insufficient Signatures', 'This operation requires 3-of-3 signatures to execute.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/admin/operations/${opId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      if (res.ok) {
        addToast('success', 'Operation Executed', 'Operation completed and changes written to blockchain.');
        fetchOperations();
      } else {
        throw new Error();
      }
    } catch {
      setOperations(prev => prev.map(o => o.id === opId ? { ...o, status: 'executed' } : o));
      addToast('success', 'Operation Executed (Simulated)', 'State changes deployed successfully.');
    }
  };

  // Fetch all projects for whitelist dropdown
  const fetchAllProjects = async () => {
    try {
      const res = await fetch(`${API_URL}/projects?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setAllProjects(data.projects || []);
      }
    } catch {
      // If backend is offline, use pending projects as fallback
    }
  };

  // Add wallet to whitelist
  const handleAddToWhitelist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.walletAddress) {
      addToast('error', 'Wallet Not Connected', 'Please connect your wallet first.');
      return;
    }
    if (!wlProjectId) {
      addToast('error', 'Missing Project', 'Please select a project.');
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(wlWalletAddress)) {
      addToast('error', 'Invalid Address', 'Please enter a valid Ethereum address (0x + 40 hex chars).');
      return;
    }

    setWlIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/whitelist/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          projectId: wlProjectId,
          walletAddress: wlWalletAddress,
          tier: wlTier
        })
      });
      const data = await res.json();
      if (res.ok) {
        addToast('success', 'Whitelist Updated', `Address ${wlWalletAddress.slice(0, 8)}... added to whitelist with ${wlTier} tier (max $${data.entry?.maxAllocation?.toLocaleString() || 'N/A'}).`);
        // Auto-refresh the whitelist status panel
        setWlCheckResult({
          whitelisted: true,
          tier: wlTier,
          maxAllocation: data.entry?.maxAllocation || 0,
          totalInvested: 0,
          remainingAllocation: data.entry?.maxAllocation || 0
        });
      } else {
        addToast('error', 'Whitelist Failed', data.error || 'Failed to add to whitelist.');
      }
    } catch {
      addToast('error', 'Network Error', 'Could not reach the backend. Make sure it is running.');
    } finally {
      setWlIsLoading(false);
    }
  };

  // Check whitelist status for an address
  const handleCheckWhitelist = async () => {
    if (!wlProjectId || !wlWalletAddress) {
      addToast('error', 'Missing Fields', 'Enter both a project and wallet address to check.');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/whitelist/check?projectId=${wlProjectId}&walletAddress=${wlWalletAddress}`);
      if (res.ok) {
        const data = await res.json();
        setWlCheckResult(data);
      } else {
        setWlCheckResult(null);
        addToast('error', 'Check Failed', 'Could not check whitelist status.');
      }
    } catch {
      addToast('error', 'Network Error', 'Could not reach the backend.');
    }
  };

  return (
    <div className="app-layout">
      <div className="main-content">
        <Topbar title="Super Admin & 3-of-3 Multi-Sig Controls" />

        {/* Emergency Kill Switch Banner */}
        <div 
          className="card" 
          style={{ 
            marginTop: '24px', 
            background: killSwitchActive ? 'rgba(255, 77, 106, 0.08)' : 'rgba(108, 99, 255, 0.03)',
            border: killSwitchActive ? '2px solid var(--accent-red)' : '1px solid var(--border-subtle)',
            padding: '20px',
            marginBottom: '32px',
            transition: 'all 0.3s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div 
                style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '50%', 
                  background: killSwitchActive ? 'rgba(255, 77, 106, 0.2)' : 'rgba(108, 99, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: killSwitchActive ? 'var(--accent-red)' : 'var(--accent-primary)'
                }}
              >
                <ShieldAlert size={28} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', color: killSwitchActive ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                  Platform Status: {killSwitchActive ? 'HALTED' : 'OPERATIONAL'}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                  {killSwitchActive 
                    ? 'Emergency kill switch is active. All deposits, investments, and token claims are frozen.' 
                    : 'Security controller is active. Normal operations are authorized.'}
                </p>
              </div>
            </div>

            {user.role === 'super_admin' ? (
              <button 
                className={`btn ${killSwitchActive ? 'btn-success' : 'btn-danger'}`}
                onClick={() => toggleKillSwitch(!killSwitchActive)}
                disabled={isLoading}
              >
                {killSwitchActive ? 'Deactivate Kill Switch' : 'Activate Kill Switch'}
              </button>
            ) : (
              <span className="badge badge-expired">Super Admin Keys Required</span>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.4fr', gap: '24px', alignItems: 'flex-start' }}>
          {/* Left: 3-of-3 multi-sig dashboard */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="card" style={{ padding: '24px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', marginBottom: '20px' }}>
                <Shield size={18} /> Active Multi-Sig Operations (3-of-3)
              </h3>

              {user.role !== 'super_admin' ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Please connect a Super Admin wallet profile simulator to view and sign operations.
                </div>
              ) : operations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No pending operations in queue.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {operations.map((op) => {
                    // Defensive: ensure signatures is always treated as an array
                    const sigs = Array.isArray(op.signatures) ? op.signatures : [];
                    const isSigned = sigs.some(s => s.adminWallet && user.walletAddress && s.adminWallet.toLowerCase() === user.walletAddress.toLowerCase());
                    const canExecute = op.approvalCount >= 3 && op.status !== 'executed';

                    return (
                      <div 
                        key={op.id}
                        className="card"
                        style={{ padding: '16px', background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <div>
                            <span className="badge badge-platinum" style={{ fontSize: '0.65rem' }}>{op.operationType}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '10px' }}>Nonce: {op.nonce}</span>
                          </div>
                          <span className={`badge ${op.status === 'executed' ? 'badge-completed' : op.approvalCount >= 3 ? 'badge-approved' : 'badge-pending'}`}>
                            {op.status === 'executed' ? 'Executed' : `${op.approvalCount}/${op.requiredApprovals} Signed`}
                          </span>
                        </div>

                        <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '14px' }}>{op.description}</p>
                        
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                          <strong>Signers:</strong>
                          {sigs.length === 0 ? (
                            <span style={{ marginLeft: '8px', color: 'var(--text-muted)' }}>None yet</span>
                          ) : (
                            <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                              {sigs.map((s, idx) => (
                                <li key={s.adminWallet || idx} style={{ fontFamily: 'monospace' }}>
                                  {s.adminWallet ? `${s.adminWallet.slice(0, 10)}...${s.adminWallet.slice(-6)} signed` : 'Unknown signer'}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {op.status !== 'executed' && (
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                              className="btn btn-secondary btn-sm"
                              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => handleApproveOperation(op.id)}
                              disabled={isSigned}
                            >
                              <UserCheck size={12} />
                              <span>{isSigned ? 'Signed' : 'Sign Operation'}</span>
                            </button>
                            
                            {canExecute && (
                              <button 
                                className="btn btn-primary btn-sm"
                                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => handleExecuteOperation(op.id)}
                              >
                                <Play size={12} />
                                <span>Execute Proposal</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Propose new operation */}
            {user.role === 'super_admin' && (
              <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', marginBottom: '20px' }}>
                  <PlusCircle size={18} /> Propose Multi-Sig Operation
                </h3>

                <form onSubmit={handleProposeOperation}>
                  <div className="form-group">
                    <label className="form-label">Operation Type</label>
                    <select 
                      className="form-select"
                      value={opType}
                      onChange={e => setOpType(e.target.value)}
                    >
                      <option value="CREATE_SALE">Create Project Sale</option>
                      <option value="FUND_WITHDRAWAL">Fund Withdrawal</option>
                      <option value="KILL_SWITCH_DEACTIVATE">Deactivate Kill Switch</option>
                      <option value="UPDATE_WHITELIST">Add/Remove Admins</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description / Parameters</label>
                    <textarea 
                      className="form-textarea"
                      placeholder="Specify parameters (e.g. Project Admin address, Caps, Token Price, Stablecoin recipient)..."
                      rows={3}
                      value={opDescription}
                      onChange={e => setOpDescription(e.target.value)}
                      required
                    />
                  </div>

                  <button type="submit" className="btn btn-primary btn-full">
                    Propose Operation
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Right: Pending Project Approvals */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', marginBottom: '20px' }}>
              <CheckCircle size={18} /> Projects Awaiting Approval
            </h3>

            {user.role !== 'super_admin' ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Please connect a Super Admin wallet to review projects.
              </div>
            ) : pendingProjects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No projects currently awaiting review.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {pendingProjects.map(p => (
                  <div 
                    key={p.id}
                    className="card"
                    style={{ padding: '16px', background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontWeight: 600 }}>{p.name} ({p.symbol})</span>
                      <span className="badge badge-pending">{p.category}</span>
                    </div>

                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>{p.description}</p>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                      <span>Chain: {p.chain}</span>
                      <span>Target: ${p.hardCap.toLocaleString()}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        className="btn btn-success btn-sm btn-full"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => handleProjectApproval(p.id, true)}
                      >
                        <CheckCircle size={12} /> Approve
                      </button>
                      <button 
                        className="btn btn-danger btn-sm btn-full"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => handleProjectApproval(p.id, false)}
                      >
                        <XCircle size={12} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Whitelist Management */}
          {user.role === 'super_admin' && (
            <div className="card" style={{ padding: '24px', gridColumn: '1 / -1', marginTop: '8px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', marginBottom: '20px' }}>
                <ListChecks size={18} /> Whitelist Management
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '20px' }}>
                Add user wallets to project whitelists. Users must be whitelisted before they can invest.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Left: Add to Whitelist Form */}
                <form onSubmit={handleAddToWhitelist}>
                  <div className="form-group">
                    <label className="form-label">Project</label>
                    <select
                      className="form-select"
                      value={wlProjectId}
                      onChange={e => setWlProjectId(e.target.value)}
                      required
                    >
                      <option value="">Select a project...</option>
                      {allProjects.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.symbol}) — {p.status}
                        </option>
                      ))}
                      {allProjects.length === 0 && pendingProjects.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.symbol}) — {p.status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Wallet Address</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="0x0000...0000"
                      value={wlWalletAddress}
                      onChange={e => setWlWalletAddress(e.target.value)}
                      pattern="^0x[a-fA-F0-9]{40}$"
                      required
                      style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tier</label>
                    <select
                      className="form-select"
                      value={wlTier}
                      onChange={e => setWlTier(e.target.value)}
                    >
                      <option value="BRONZE">Bronze — Max $1,000</option>
                      <option value="SILVER">Silver — Max $5,000</option>
                      <option value="GOLD">Gold — Max $25,000</option>
                      <option value="PLATINUM">Platinum — Max $100,000</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="submit"
                      className="btn btn-primary btn-full"
                      disabled={wlIsLoading}
                      style={{ flex: 1 }}
                    >
                      <PlusCircle size={14} style={{ marginRight: '6px' }} />
                      {wlIsLoading ? 'Adding...' : 'Add to Whitelist'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleCheckWhitelist}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Search size={14} /> Check
                    </button>
                  </div>
                </form>

                {/* Right: Whitelist Check Result */}
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
                    Whitelist Status
                  </h4>
                  {wlCheckResult ? (
                    <div className="card" style={{ padding: '16px', background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        {wlCheckResult.whitelisted ? (
                          <>
                            <CheckCircle size={18} style={{ color: 'var(--accent-green)' }} />
                            <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>Whitelisted</span>
                            <span className="badge badge-approved" style={{ marginLeft: 'auto' }}>{wlCheckResult.tier}</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={18} style={{ color: 'var(--accent-red)' }} />
                            <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>Not Whitelisted</span>
                          </>
                        )}
                      </div>
                      {wlCheckResult.whitelisted && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Max Allocation</span>
                            <span style={{ fontWeight: 600 }}>${wlCheckResult.maxAllocation?.toLocaleString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Total Invested</span>
                            <span style={{ fontWeight: 600 }}>${wlCheckResult.totalInvested?.toLocaleString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Remaining</span>
                            <span style={{ fontWeight: 600, color: 'var(--accent-green)' }}>${wlCheckResult.remainingAllocation?.toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '0.8rem', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-subtle)' }}>
                      <Search size={24} style={{ marginBottom: '8px', opacity: 0.4 }} />
                      <p>Select a project and enter a wallet address, then click <strong>Check</strong> to view whitelist status.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Deployed Contracts Status Card */}
          <div className="card" style={{ padding: '24px', marginTop: '24px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', marginBottom: '16px' }}>
              <Shield size={18} style={{ color: 'var(--accent-green)' }} /> Deployed Contracts & Verification
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '20px' }}>
              Review live on-chain contract deployments and verification status on block explorers.
            </p>

            {deployedContracts ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Base Sepolia */}
                <div>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', marginBottom: '8px', fontWeight: 600 }}>Base Sepolia Testnet</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-glass)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>SaleFactory</div>
                        <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {deployedContracts.baseSepolia.saleFactory ? `${deployedContracts.baseSepolia.saleFactory.slice(0, 10)}...${deployedContracts.baseSepolia.saleFactory.slice(-6)}` : 'Not Deployed'}
                        </code>
                      </div>
                      {deployedContracts.baseSepolia.saleFactory ? (
                        <a 
                          href={`https://sepolia.basescan.org/address/${deployedContracts.baseSepolia.saleFactory}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="badge badge-active"
                          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-green)' }}></span>
                          Verified ↗
                        </a>
                      ) : (
                        <span className="badge badge-expired">Pending</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hoodi Testnet */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', marginBottom: '8px', fontWeight: 600 }}>Hoodi Testnet</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                    {/* SaleFactory */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-glass)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>SaleFactory</div>
                        <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {deployedContracts.hoodi.saleFactory ? `${deployedContracts.hoodi.saleFactory.slice(0, 10)}...${deployedContracts.hoodi.saleFactory.slice(-6)}` : 'Not Deployed'}
                        </code>
                      </div>
                      {deployedContracts.hoodi.saleFactory ? (
                        <a 
                          href={`https://hoodi.etherscan.io/address/${deployedContracts.hoodi.saleFactory}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="badge badge-active"
                          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-green)' }}></span>
                          Verified ↗
                        </a>
                      ) : (
                        <span className="badge badge-expired">Pending</span>
                      )}
                    </div>

                    {/* StablecoinAccount */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-glass)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>StablecoinAccount</div>
                        <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {deployedContracts.hoodi.stablecoinAccount ? `${deployedContracts.hoodi.stablecoinAccount.slice(0, 10)}...${deployedContracts.hoodi.stablecoinAccount.slice(-6)}` : 'Not Deployed'}
                        </code>
                      </div>
                      {deployedContracts.hoodi.stablecoinAccount ? (
                        <a 
                          href={`https://hoodi.etherscan.io/address/${deployedContracts.hoodi.stablecoinAccount}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="badge badge-active"
                          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-green)' }}></span>
                          Verified ↗
                        </a>
                      ) : (
                        <span className="badge badge-expired">Pending</span>
                      )}
                    </div>

                    {/* SecurityController */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-glass)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>SecurityController</div>
                        <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {deployedContracts.hoodi.securityController ? `${deployedContracts.hoodi.securityController.slice(0, 10)}...${deployedContracts.hoodi.securityController.slice(-6)}` : 'Not Deployed'}
                        </code>
                      </div>
                      {deployedContracts.hoodi.securityController ? (
                        <a 
                          href={`https://hoodi.etherscan.io/address/${deployedContracts.hoodi.securityController}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="badge badge-active"
                          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-green)' }}></span>
                          Verified ↗
                        </a>
                      ) : (
                        <span className="badge badge-expired">Pending</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Loading deployed contracts...
              </div>
            )}
          </div>
        </div>
      </div>
      <Toast toasts={toasts} onClose={removeToast} />
    </div>
  );
};
