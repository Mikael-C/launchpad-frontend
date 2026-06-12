import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Topbar } from '../components/Topbar';
import { Toast } from '../components/Toast';
import type { ToastMessage } from '../components/Toast';
import { Search, Shield } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  symbol: string;
  description: string;
  logoUrl?: string;
  website?: string;
  category: string;
  chain: string;
  tier: string;
  rate: number;
  softCap: number;
  hardCap: number;
  startTime: string;
  endTime: string;
  tokenAddress?: string;
  saleAddress?: string;
  status: string;
  stats?: {
    tvl: number;
    investorCount: number;
  };
}

import { API_URL } from '../config';

export const LaunchpadPage: React.FC = () => {
  const { user } = useApp();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [chainFilter, setChainFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  // Whitelist & Investment state
  const [isWhitelisting, setIsWhitelisting] = useState<boolean>(false);
  const [whitelistTier, setWhitelistTier] = useState<'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'>('BRONZE');
  const [whitelistStatus, setWhitelistStatus] = useState<{ whitelisted: boolean; tier: string | null; maxAllocation: number; remainingAllocation: number; totalInvested: number } | null>(null);
  
  const [investAmount, setInvestAmount] = useState<string>('');
  const [selectedStablecoin, setSelectedStablecoin] = useState<'USDC' | 'USDT' | 'DAI'>('USDC');
  const [isInvesting, setIsInvesting] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: ToastMessage['type'], title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch projects
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/projects`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      } else {
        throw new Error('Failed to fetch from API');
      }
    } catch (err) {
      console.warn('API error, falling back to mock projects data', err);
      // Mock data matching backend seed
      const mockProjects: Project[] = [
        {
          id: 'seed-aqua',
          name: 'AquaProtocol',
          symbol: 'AQUA',
          description: 'Next-generation DeFi liquidity protocol with automated market making.',
          category: 'DeFi',
          chain: 'Hoodi',
          tier: 'Gold',
          rate: 10,
          softCap: 100000,
          hardCap: 500000,
          startTime: new Date(Date.now() + 60000).toISOString(),
          endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'approved',
          logoUrl: 'https://picsum.photos/seed/aqua/100',
          website: 'https://aquaprotocol.io',
          stats: { tvl: 125000, investorCount: 84 }
        },
        {
          id: 'seed-nexa',
          name: 'NexaChain',
          symbol: 'NEXA',
          description: 'Layer 2 scaling solution with zero-knowledge proofs for enterprise.',
          category: 'Infrastructure',
          chain: 'Base Sepolia',
          tier: 'Platinum',
          rate: 5,
          softCap: 500000,
          hardCap: 2000000,
          startTime: new Date(Date.now() + 60000).toISOString(),
          endTime: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'approved',
          logoUrl: 'https://picsum.photos/seed/nexa/100',
          website: 'https://nexachain.io',
          stats: { tvl: 450000, investorCount: 142 }
        },
        {
          id: 'seed-meta',
          name: 'MetaVault',
          symbol: 'MVT',
          description: 'Decentralized asset management platform for institutional investors.',
          category: 'Asset Management',
          chain: 'Hoodi',
          tier: 'Silver',
          rate: 20,
          softCap: 50000,
          hardCap: 200000,
          startTime: new Date(Date.now() + 60000).toISOString(),
          endTime: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'approved',
          logoUrl: 'https://picsum.photos/seed/meta/100',
          website: 'https://metavault.fi',
          stats: { tvl: 45000, investorCount: 29 }
        },
        {
          id: 'seed-grt',
          name: 'GreenToken',
          symbol: 'GRT',
          description: 'Carbon credit tokenization platform for ESG compliance.',
          category: 'RWA',
          chain: 'Hoodi',
          tier: 'Bronze',
          rate: 50,
          softCap: 10000,
          hardCap: 50000,
          startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          logoUrl: 'https://picsum.photos/seed/green/100',
          stats: { tvl: 0, investorCount: 0 }
        },
        {
          id: 'seed-omni',
          name: 'OmniDEX',
          symbol: 'OMNI',
          description: 'Cross-chain DEX aggregator supporting 30+ blockchains.',
          category: 'DeFi',
          chain: 'Base Sepolia',
          tier: 'Gold',
          rate: 8,
          softCap: 200000,
          hardCap: 1000000,
          startTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          logoUrl: 'https://picsum.photos/seed/omni/100',
          stats: { tvl: 650000, investorCount: 218 }
        }
      ];
      setProjects(mockProjects);
    } finally {
      setLoading(false);
    }
  };

  // Check whitelist status
  const checkWhitelist = async (projectId: string) => {
    if (!user.isConnected || !user.walletAddress) return;
    try {
      const res = await fetch(`${API_URL}/whitelist/check?projectId=${projectId}&walletAddress=${user.walletAddress}`);
      if (res.ok) {
        const data = await res.json();
        setWhitelistStatus(data);
      } else {
        throw new Error();
      }
    } catch {
      // Mock response if API fails
      setWhitelistStatus({
        whitelisted: false,
        tier: null,
        maxAllocation: 0,
        remainingAllocation: 0,
        totalInvested: 0
      });
    }
  };

  useEffect(() => {
    if (selectedProject) {
      checkWhitelist(selectedProject.id);
    } else {
      setWhitelistStatus(null);
    }
  }, [selectedProject, user.isConnected, user.walletAddress]);

  // Request Whitelisting
  const handleJoinWhitelist = async () => {
    if (!user.isConnected || !user.walletAddress || !selectedProject) return;
    setIsWhitelisting(true);
    try {
      const res = await fetch(`${API_URL}/whitelist/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` },
        body: JSON.stringify({
          projectId: selectedProject.id,
          walletAddress: user.walletAddress,
          tier: whitelistTier
        })
      });
      const data = await res.json();
      if (res.ok) {
        addToast('success', 'Whitelisted!', `You have been added to the whitelist at ${whitelistTier} tier.`);
        checkWhitelist(selectedProject.id);
      } else {
        addToast('error', 'Registration Failed', data.error || 'Check console details.');
      }
    } catch {
      // Simulate success in mock mode
      addToast('success', 'Whitelisted (Simulated)', `Added to whitelist at ${whitelistTier} tier.`);
      setWhitelistStatus({
        whitelisted: true,
        tier: whitelistTier,
        maxAllocation: whitelistTier === 'BRONZE' ? 1000 : whitelistTier === 'SILVER' ? 5000 : whitelistTier === 'GOLD' ? 25000 : 100000,
        remainingAllocation: whitelistTier === 'BRONZE' ? 1000 : whitelistTier === 'SILVER' ? 5000 : whitelistTier === 'GOLD' ? 25000 : 100000,
        totalInvested: 0
      });
    } finally {
      setIsWhitelisting(false);
    }
  };

  // Execute Investment
  const handleInvest = async () => {
    if (!user.isConnected || !user.walletAddress || !selectedProject || !investAmount) return;
    const amountNum = parseFloat(investAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      addToast('warning', 'Invalid Amount', 'Please specify a positive numerical value.');
      return;
    }
    
    if (whitelistStatus && amountNum > whitelistStatus.remainingAllocation) {
      addToast('error', 'Exceeds Allocation', `Your remaining whitelist allocation is $${whitelistStatus.remainingAllocation}.`);
      return;
    }

    setIsInvesting(true);
    try {
      // Build the authorization message
      const message = `Sign this message to authorize your investment of $${amountNum} ${selectedStablecoin} into project ${selectedProject.name}.`;

      // Get a real MetaMask signature
      let signature = '';
      try {
        const ethersModule = await import('ethers');
        const browserProvider = new ethersModule.BrowserProvider((window as any).ethereum);
        const signer = await browserProvider.getSigner();
        signature = await signer.signMessage(message);
      } catch (sigErr: any) {
        addToast('warning', 'Signature Cancelled', sigErr.message || 'You cancelled the signing request.');
        setIsInvesting(false);
        return;
      }

      const res = await fetch(`${API_URL}/invest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` },
        body: JSON.stringify({
          projectId: selectedProject.id,
          amount: amountNum,
          stablecoin: selectedStablecoin,
          txHash: '0x' + Math.random().toString(16).slice(2, 66),
          signature,
          message
        })
      });
      const data = await res.json();
      if (res.ok) {
        addToast('success', 'Investment Successful', `Deposited $${amountNum} ${selectedStablecoin}. Allocated ${(amountNum * selectedProject.rate).toLocaleString()} ${selectedProject.symbol} tokens.`);
        setInvestAmount('');
        checkWhitelist(selectedProject.id);
        fetchProjects(); // refresh TVL
      } else {
        addToast('error', 'Investment Failed', data.error || 'Verification error.');
      }
    } catch {
      addToast('error', 'Investment Error', 'Network error — please try again.');
    } finally {
      setIsInvesting(false);
    }
  };

  // Filter projects
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.symbol.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    const matchesChain = chainFilter === 'all' || p.chain === chainFilter;
    
    const now = new Date();
    const start = new Date(p.startTime);
    const end = new Date(p.endTime);
    const isUpcoming = now < start;
    const isActive = now >= start && now <= end && p.status !== 'completed';
    const isCompleted = now > end || p.status === 'completed';

    let matchesStatus = true;
    if (statusFilter === 'active') matchesStatus = isActive;
    else if (statusFilter === 'upcoming') matchesStatus = isUpcoming;
    else if (statusFilter === 'completed') matchesStatus = isCompleted;

    return matchesSearch && matchesCategory && matchesChain && matchesStatus;
  });

  return (
    <div className="app-layout">
      <div className="main-content">
        <Topbar title="Aggregation Dex (Launchpad)" />
        
        <div className="page-header" style={{ marginTop: '24px' }}>
          <p className="page-subtitle">Participate in early-stage token allocations backed by multi-sig super admin guards.</p>
        </div>

        {/* Filters */}
        <div className="filter-bar">
          <div className="filter-bar-search">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search by name or symbol..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <select 
              className="form-select" 
              value={categoryFilter} 
              onChange={e => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="DeFi">DeFi</option>
              <option value="Infrastructure">Infrastructure</option>
              <option value="Asset Management">Asset Management</option>
              <option value="RWA">RWA</option>
            </select>

            <select 
              className="form-select" 
              value={chainFilter} 
              onChange={e => setChainFilter(e.target.value)}
            >
              <option value="all">All Chains</option>
              <option value="Hoodi">Hoodi Testnet</option>
              <option value="Base Sepolia">Base Sepolia</option>
            </select>

            <select 
              className="form-select" 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Sales</option>
              <option value="upcoming">Upcoming Sales</option>
              <option value="completed">Completed Sales</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <div style={{ border: '3px solid var(--border-subtle)', borderTop: '3px solid var(--accent-primary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
          </div>
        ) : (
          <div className="project-grid">
            {filteredProjects.map((p) => {
              const tvl = p.stats?.tvl || 0;
              const progressPercent = Math.min(100, (tvl / p.hardCap) * 100);
              const now = new Date();
              const start = new Date(p.startTime);
              const end = new Date(p.endTime);
              const isUpcoming = now < start;
              const isCompleted = now > end || p.status === 'completed';
              
              const statusText = isUpcoming ? 'Upcoming' : isCompleted ? 'Completed' : 'Active';
              const statusClass = isUpcoming ? 'badge-pending' : isCompleted ? 'badge-completed' : 'badge-active';

              return (
                <div key={p.id} className="project-card" onClick={() => setSelectedProject(p)}>
                  <div className="project-card-header">
                    <div className="project-logo">
                      {p.logoUrl ? <img src={p.logoUrl} alt={p.name} /> : p.symbol.slice(0, 2)}
                    </div>
                    <div className="project-meta">
                      <div className="project-name">{p.name}</div>
                      <div className="project-symbol">{p.symbol}</div>
                    </div>
                    <span className={`badge ${statusClass}`}>{statusText}</span>
                  </div>

                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px', height: '40px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {p.description}
                  </p>

                  <div className="project-tags">
                    <span className="badge badge-silver" style={{ textTransform: 'none' }}>{p.chain}</span>
                    <span className="badge badge-silver" style={{ textTransform: 'none' }}>{p.category}</span>
                  </div>

                  <div className="progress-bar-container" style={{ marginTop: '20px' }}>
                    <div 
                      className={`progress-bar-fill ${progressPercent > 80 ? 'green' : progressPercent > 50 ? '' : 'orange'}`} 
                      style={{ width: `${progressPercent}%` }} 
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    <span>Progress: {progressPercent.toFixed(1)}%</span>
                    <span>Target: ${(p.hardCap).toLocaleString()}</span>
                  </div>

                  <div className="project-stats" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', marginTop: '16px' }}>
                    <div className="project-stat-item">
                      <div className="project-stat-label">Total Raised</div>
                      <div className="project-stat-value">${tvl.toLocaleString()}</div>
                    </div>
                    <div className="project-stat-item" style={{ textAlign: 'right' }}>
                      <div className="project-stat-label">Min. Tier Required</div>
                      <div className="project-stat-value" style={{ color: 'var(--accent-primary)' }}>{p.tier}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Project details modal */}
        {selectedProject && (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: '600px' }}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="project-logo" style={{ width: '40px', height: '40px' }}>
                    {selectedProject.logoUrl ? <img src={selectedProject.logoUrl} alt={selectedProject.name} /> : selectedProject.symbol.slice(0,2)}
                  </div>
                  <div>
                    <h3 className="modal-title" style={{ margin: 0 }}>{selectedProject.name} Details</h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rate: 1 USD = {selectedProject.rate} {selectedProject.symbol}</div>
                  </div>
                </div>
                <button className="modal-close" onClick={() => setSelectedProject(null)}>X</button>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
                  {selectedProject.description}
                </p>
                
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '20px' }}>
                  <div className="stat-card" style={{ padding: '12px 16px' }}>
                    <div className="stat-label">Total Raised</div>
                    <div className="stat-value" style={{ fontSize: '1.25rem' }}>${(selectedProject.stats?.tvl || 0).toLocaleString()}</div>
                  </div>
                  <div className="stat-card" style={{ padding: '12px 16px' }}>
                    <div className="stat-label">Soft Cap</div>
                    <div className="stat-value" style={{ fontSize: '1.25rem' }}>${selectedProject.softCap.toLocaleString()}</div>
                  </div>
                  <div className="stat-card" style={{ padding: '12px 16px' }}>
                    <div className="stat-label">Hard Cap</div>
                    <div className="stat-value" style={{ fontSize: '1.25rem' }}>${selectedProject.hardCap.toLocaleString()}</div>
                  </div>
                </div>

                <div className="card" style={{ padding: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Launch Date:</span>
                      <span style={{ fontWeight: 600 }}>{new Date(selectedProject.startTime).toLocaleDateString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Vesting Terms:</span>
                      <span style={{ fontWeight: 600 }}>90-Day Cliff, 1-Year Linear release</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Accepting:</span>
                      <span style={{ fontWeight: 600, color: 'var(--accent-secondary)' }}>USDC, USDT, DAI</span>
                    </div>
                  </div>
                </div>

                {/* Whitelist Panel */}
                {!user.isConnected ? (
                  <div className="card" style={{ textAlign: 'center', padding: '24px', border: '1px dashed var(--border-accent)' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
                      Please connect your wallet simulator to participate in this project allocation.
                    </p>
                  </div>
                ) : (
                  <div>
                    {whitelistStatus && whitelistStatus.whitelisted ? (
                      <div className="card" style={{ padding: '16px', border: '1px solid rgba(0, 229, 160, 0.3)', background: 'rgba(0, 229, 160, 0.02)', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-green)' }}>
                            <Shield size={16} /> Whitelisted ({whitelistStatus.tier})
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Max Allocation: ${whitelistStatus.maxAllocation}
                          </span>
                        </div>
                        
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                          <span>Already Invested: ${whitelistStatus.totalInvested}</span>
                          <span>Remaining Allocation: ${whitelistStatus.remainingAllocation}</span>
                        </div>

                        {whitelistStatus.remainingAllocation > 0 ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <select 
                              className="form-select" 
                              style={{ width: '90px' }}
                              value={selectedStablecoin}
                              onChange={e => setSelectedStablecoin(e.target.value as any)}
                            >
                              <option value="USDC">USDC</option>
                              <option value="USDT">USDT</option>
                              <option value="DAI">DAI</option>
                            </select>
                            <input 
                              type="number" 
                              className="form-input" 
                              placeholder="Amount in USD..." 
                              value={investAmount}
                              onChange={e => setInvestAmount(e.target.value)}
                            />
                            <button 
                              className="btn btn-primary"
                              onClick={handleInvest}
                              disabled={isInvesting || !investAmount}
                            >
                              {isInvesting ? 'Investing...' : 'Invest'}
                            </button>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', fontWeight: 'bold' }}>
                            🎉 Maximum Allocation Reached
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="card" style={{ padding: '16px', border: '1px dashed var(--border-accent)', textAlign: 'center' }}>
                        <h4 style={{ marginBottom: '8px', fontSize: '0.95rem' }}>Apply for Whitelist Allocation</h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '16px' }}>
                          Select your staking tier level to register for allocation matching requirements.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
                          {(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'] as const).map(t => (
                            <button 
                              key={t}
                              className={`btn btn-sm ${whitelistTier === t ? 'btn-primary' : 'btn-secondary'}`}
                              onClick={() => setWhitelistTier(t)}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                        <button 
                          className="btn btn-primary btn-sm btn-full"
                          onClick={handleJoinWhitelist}
                          disabled={isWhitelisting}
                        >
                          {isWhitelisting ? 'Registering...' : 'Register Whitelist'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <Toast toasts={toasts} onClose={removeToast} />
    </div>
  );
};
