import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Topbar } from '../components/Topbar';
import { Toast } from '../components/Toast';
import type { ToastMessage } from '../components/Toast';
import { Share2, Users, Trophy, ExternalLink, RefreshCw, Check } from 'lucide-react';
import { API_URL } from '../config';

interface ReferralLink {
  id: string;
  code: string;
  platform: string;
  url: string;
  clickCount: number;
  status: string;
  reward: number;
  createdAt: string;
}

interface ReferralStats {
  total: number;
  successful: number;
  pending: number;
  rewards: number;
  byPlatform: {
    telegram: number;
    twitter: number;
    facebook: number;
  };
}

export const ReferralPage: React.FC = () => {
  const { user } = useApp();
  const [links, setLinks] = useState<ReferralLink[]>([]);
  const [stats, setStats] = useState<ReferralStats>({
    total: 0,
    successful: 0,
    pending: 0,
    rewards: 0,
    byPlatform: { telegram: 0, twitter: 0, facebook: 0 }
  });
  
  const [platform, setPlatform] = useState<string>('telegram');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: ToastMessage['type'], title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // SSE setup for real-time referral stats
  useEffect(() => {
    if (!user.isConnected || !user.walletAddress) {
      return;
    }

    fetchReferralLinks();

    // Establish Server-Sent Events stream
    const eventSource = new EventSource(`${API_URL}/referral/stream?wallet=${user.walletAddress}`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          console.error('SSE Error:', data.error);
        } else {
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to parse SSE event data', err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('SSE connection closed or failed, fallback to polling', err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [user.isConnected, user.walletAddress]);

  const fetchReferralLinks = async () => {
    if (!user.walletAddress) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No auth token');

      const [linksRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/referral/links`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/referral/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!linksRes.ok) throw new Error(`Links fetch failed: ${linksRes.status}`);

      const linksData = await linksRes.json();
      setLinks(linksData.links || []);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats({
          total: statsData.total || 0,
          successful: statsData.successful || 0,
          pending: statsData.pending || 0,
          rewards: statsData.totalRewards || 0,
          byPlatform: {
            telegram: statsData.byPlatform?.telegram?.total || 0,
            twitter: statsData.byPlatform?.twitter?.total || 0,
            facebook: statsData.byPlatform?.facebook?.total || 0
          }
        });
      }
    } catch (err) {
      console.warn('Failed to fetch referral links:', err);
      // Keep whatever links are already in state rather than clearing them
    }
  };

  const handleGenerateLink = async () => {
    if (!user.isConnected || !user.walletAddress) {
      addToast('warning', 'Wallet Required', 'Please connect your wallet to generate referral links.');
      return;
    }

    setIsGenerating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/referral/links/generate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          walletAddress: user.walletAddress,
          platform
        })
      });
      if (res.ok) {
        const data = await res.json();
        const newLink: ReferralLink = data.link;
        setLinks(prev => [newLink, ...prev]);
        setStats(prev => ({
          ...prev,
          total: prev.total + 1,
          pending: prev.pending + 1,
          byPlatform: {
            ...prev.byPlatform,
            [platform]: (prev.byPlatform[platform as keyof typeof prev.byPlatform] || 0) + 1
          }
        }));
        addToast('success', 'Link Created', `Your ${platform} invite link is ready — copy it from the table below.`);
      } else {
        const data = await res.json();
        addToast('error', 'Generation Failed', data.error || 'Server error.');
      }
    } catch {
      // Mock local success when backend is unreachable
      const newMockCode = `REF-${platform.toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const newLink: ReferralLink = {
        id: Math.random().toString(),
        code: newMockCode,
        url: `${window.location.origin}/register?ref=${newMockCode}`,
        platform,
        clickCount: 0,
        status: 'pending',
        reward: 0,
        createdAt: new Date().toISOString()
      };
      setLinks(prev => [newLink, ...prev]);
      setStats(prev => ({
        ...prev,
        total: prev.total + 1,
        pending: prev.pending + 1,
        byPlatform: {
          ...prev.byPlatform,
          [platform]: (prev.byPlatform[platform as keyof typeof prev.byPlatform] || 0) + 1
        }
      }));
      addToast('success', 'Link Generated (Simulated)', `Code: ${newMockCode}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = (code: string, url?: string) => {
    const fullLink = url || `${window.location.origin}/register?ref=${code}`;
    navigator.clipboard.writeText(fullLink);
    setCopiedCode(code);
    addToast('info', 'Link Copied', 'Referral link copied to clipboard.');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Simulate 15 referrals
  const handleSimulate15 = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/referral/simulate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ count: 15 })
      });
      if (res.ok) {
        const data = await res.json();
        addToast('success', 'Simulation Complete', `${data.message}`);
        fetchReferralLinks();
      } else {
        const err = await res.json();
        addToast('error', 'Simulation Failed', err.error || 'Server error');
      }
    } catch {
      addToast('error', 'Simulation Error', 'Network error');
    }
  };

  // Simulate Click Tracker Action
  const handleSimulateClick = async (code: string) => {
    try {
      const res = await fetch(`${API_URL}/referral/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          ip: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SimulatorChrome/124.0.0.0'
        })
      });
      if (res.ok) {
        addToast('success', 'Click Simulated', `Registered a click action for code: ${code}`);
        fetchReferralLinks();
      } else {
        const data = await res.json();
        addToast('warning', 'Deduplicated', data.message || 'IP already tracked.');
      }
    } catch {
      // Mock local click addition
      setLinks(prev => prev.map(l => l.code === code ? { ...l, clickCount: l.clickCount + 1 } : l));
      addToast('success', 'Click Registered (Local)', `Incremented click metric for ${code}`);
    }
  };

  return (
    <div className="app-layout">
      <div className="main-content">
        <Topbar title="Referral Program & Live Dashboard" />

        <div className="page-header" style={{ marginTop: '24px' }}>
          <p className="page-subtitle">Earn rewards by inviting developers and investors. Monitored in real-time via Server-Sent Events (SSE).</p>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Referrals</div>
            <div className="stat-value purple">{stats.total}</div>
            <div className="stat-change">Generated Links</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Successful Matches</div>
            <div className="stat-value green">{stats.successful}</div>
            <div className="stat-change">Deposits Completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pending Activations</div>
            <div className="stat-value orange">{stats.pending}</div>
            <div className="stat-change">Registered but not deposited</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Rewards Earned</div>
            <div className="stat-value blue">${stats.rewards}</div>
            <div className="stat-change">Claimable Stablecoins</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '24px', alignItems: 'flex-start' }}>
          {/* Left: Link Generator */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontSize: '1.1rem' }}>
              <Share2 size={18} /> Generate Campaign Code
            </h3>

            <div className="form-group">
              <label className="form-label">Destination Platform</label>
              <select 
                className="form-select"
                value={platform}
                onChange={e => setPlatform(e.target.value)}
              >
                <option value="telegram">Telegram Channel</option>
                <option value="twitter">X (formerly Twitter)</option>
                <option value="facebook">Facebook Network</option>
              </select>
            </div>

            <button 
              className="btn btn-primary btn-full"
              onClick={handleGenerateLink}
              disabled={isGenerating || !user.isConnected}
            >
              {isGenerating ? 'Generating...' : 'Create Invite Link'}
            </button>
            
            {!user.isConnected && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '12px', textAlign: 'center' }}>
                * Connect wallet simulation to authorize link registration.
              </p>
            )}
          </div>

          {/* Right: Active Links Tracker */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', margin: 0 }}>
                <Trophy size={18} /> Active Invite Campaigns
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--accent-primary)', color: 'white' }}
                  onClick={handleSimulate15}
                  disabled={!user.isConnected}
                >
                  Simulate 15 Referrals
                </button>
                <button 
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={fetchReferralLinks}
                  disabled={!user.isConnected}
                >
                  <RefreshCw size={12} /> Sync
                </button>
              </div>
            </div>

            {!user.isConnected ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Connect wallet to view generated invite codes and track metrics.
              </div>
            ) : links.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No active links found. Generate your first campaign code in the panel on the left.
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Platform</th>
                      <th>Referral Link</th>
                      <th>Clicks</th>
                      <th>Status</th>
                      <th>Simulate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {links.map((link) => (
                      <tr key={link.id}>
                        <td>
                          <span style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>{link.platform}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <code style={{ fontSize: '0.8rem', color: 'var(--accent-secondary)' }}>{link.code}</code>
                            <button 
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                              onClick={() => handleCopyLink(link.code, link.url)}
                            >
                              {copiedCode === link.code ? <Check size={12} style={{ color: 'var(--accent-green)' }} /> : <ExternalLink size={12} />}
                            </button>
                          </div>
                        </td>
                        <td style={{ fontWeight: 'bold' }}>{link.clickCount} Clicks</td>
                        <td>
                          <span className={`badge ${link.status === 'completed' ? 'badge-approved' : 'badge-pending'}`}>
                            {link.status}
                          </span>
                        </td>
                        <td>
                          <button 
                            className="btn btn-ghost btn-sm" 
                            style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                            onClick={() => handleSimulateClick(link.code)}
                          >
                            Trigger Click
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      <Toast toasts={toasts} onClose={removeToast} />
    </div>
  );
};
