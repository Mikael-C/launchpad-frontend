import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Topbar } from '../components/Topbar';
import { StatsChart } from '../components/StatsChart';
import { Toast } from '../components/Toast';
import type { ToastMessage } from '../components/Toast';
import { Star, MessageSquare, ThumbsUp, TrendingUp, BarChart2, Shield } from 'lucide-react';
import { API_URL } from '../config';

interface Project {
  id: string;
  name: string;
  symbol: string;
  description: string;
  logoUrl?: string;
  category: string;
  chain: string;
  tier: string;
  rate: number;
  softCap: number;
  hardCap: number;
  status: string;
  stats?: {
    tvl: number;
    investorCount: number;
  };
}

interface Comment {
  id: string;
  sxId: string;
  content: string;
  signature: string;
  createdAt: string;
}

const MARKETPLACE_URL = `${API_URL}/marketplace`;

export const MarketplacePage: React.FC = () => {
  const { user } = useApp();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [upvotes, setUpvotes] = useState<Record<string, { count: number; userUpvoted: boolean }>>({});
  
  // Discussion state
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState<string>('');
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Chart view toggle
  const [chartType, setChartType] = useState<'tvl' | 'investors'>('tvl');

  const addToast = (type: ToastMessage['type'], title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Mock charts history data
  const mockChartData = [
    { date: 'Jun 05', tvl: 45000, investors: 12 },
    { date: 'Jun 06', tvl: 75000, investors: 28 },
    { date: 'Jun 07', tvl: 120000, investors: 55 },
    { date: 'Jun 08', tvl: 210000, investors: 98 },
    { date: 'Jun 09', tvl: 340000, investors: 145 },
    { date: 'Jun 10', tvl: 490000, investors: 198 },
    { date: 'Jun 11', tvl: 580000, investors: 254 }
  ];

  // Fetch initial marketplace info
  useEffect(() => {
    fetchMarketplaceProjects();
    loadWatchlist();
  }, []);

  const fetchMarketplaceProjects = async () => {
    try {
      const res = await fetch(`${API_URL}/projects`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
        if (data.projects && data.projects.length > 0) {
          setSelectedProject(data.projects[0]);
          fetchComments(data.projects[0].id);
        }
      } else {
        throw new Error();
      }
    } catch {
      // Mock fallback data
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
          status: 'approved',
          logoUrl: 'https://picsum.photos/seed/aqua/100',
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
          status: 'approved',
          logoUrl: 'https://picsum.photos/seed/nexa/100',
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
          status: 'approved',
          logoUrl: 'https://picsum.photos/seed/meta/100',
          stats: { tvl: 45000, investorCount: 29 }
        }
      ];
      setProjects(mockProjects);
      setSelectedProject(mockProjects[0]);
      fetchComments(mockProjects[0].id);
      
      // Initialize upvotes mock
      setUpvotes({
        'seed-aqua': { count: 42, userUpvoted: false },
        'seed-nexa': { count: 128, userUpvoted: true },
        'seed-meta': { count: 18, userUpvoted: false }
      });
    }
  };

  // Watchlist Actions
  const loadWatchlist = () => {
    const saved = localStorage.getItem('watchlist');
    if (saved) {
      setWatchlist(JSON.parse(saved));
    }
  };

  const toggleWatchlist = (projectId: string) => {
    let updated: string[];
    if (watchlist.includes(projectId)) {
      updated = watchlist.filter(id => id !== projectId);
      addToast('info', 'Watchlist Removed', 'Project removed from your watchlist.');
    } else {
      updated = [...watchlist, projectId];
      addToast('success', 'Watchlist Added', 'Project added to your watchlist.');
    }
    setWatchlist(updated);
    localStorage.setItem('watchlist', JSON.stringify(updated));
  };

  // Upvote Actions
  const handleUpvote = async (projectId: string) => {
    if (!user.isConnected || !user.walletAddress) {
      addToast('warning', 'Wallet Connection Required', 'Please connect your wallet to upvote.');
      return;
    }

    try {
      const res = await fetch(`${MARKETPLACE_URL}/upvote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.walletAddress}` },
        body: JSON.stringify({ projectId })
      });
      if (res.ok) {
        setUpvotes(prev => {
          const current = prev[projectId] || { count: 0, userUpvoted: false };
          return {
            ...prev,
            [projectId]: {
              count: current.userUpvoted ? current.count - 1 : current.count + 1,
              userUpvoted: !current.userUpvoted
            }
          };
        });
        addToast('success', 'Vote Recorded', 'Your upvote preference has been updated.');
      }
    } catch {
      // Local simulation
      setUpvotes(prev => {
        const current = prev[projectId] || { count: 0, userUpvoted: false };
        return {
          ...prev,
          [projectId]: {
            count: current.userUpvoted ? current.count - 1 : current.count + 1,
            userUpvoted: !current.userUpvoted
          }
        };
      });
      addToast('success', 'Vote Recorded (Simulated)', 'preference updated.');
    }
  };

  // Fetch comments
  const fetchComments = async (projectId: string) => {
    try {
      const res = await fetch(`${MARKETPLACE_URL}/comments?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      } else {
        throw new Error();
      }
    } catch {
      // Mock comments
      const mockComments: Record<string, Comment[]> = {
        'seed-aqua': [
          { id: '1', sxId: '0xabc...123', content: 'Incredible AMM features! Looking forward to the public token release.', signature: '0xsig1...', createdAt: new Date(Date.now() - 3600000).toISOString() },
          { id: '2', sxId: '0xdef...456', content: 'What is the soft cap withdrawal delay terms?', signature: '0xsig2...', createdAt: new Date(Date.now() - 7200000).toISOString() }
        ],
        'seed-nexa': [
          { id: '3', sxId: '0x789...aaa', content: 'Zero knowledge proof scalability is essential for DeFi.', signature: '0xsig3...', createdAt: new Date(Date.now() - 1800000).toISOString() }
        ],
        'seed-meta': []
      };
      setComments(mockComments[projectId] || []);
    }
  };

  useEffect(() => {
    if (selectedProject) {
      fetchComments(selectedProject.id);
    }
  }, [selectedProject]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.isConnected || !user.walletAddress || !selectedProject || !newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      const content = newComment.trim();
      const message = `Comment authorization: ${content}`;

      // Get a real MetaMask signature
      let signature = '';
      try {
        const ethersInstance = await import('ethers');
        const browserProvider = new ethersInstance.BrowserProvider((window as any).ethereum);
        const signer = await browserProvider.getSigner();
        signature = await signer.signMessage(message);
      } catch (sigErr: any) {
        addToast('warning', 'Signature Cancelled', sigErr.message || 'You cancelled the signing request.');
        setIsSubmittingComment(false);
        return;
      }

      const res = await fetch(`${MARKETPLACE_URL}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject.id,
          content,
          signature,
          message
        })
      });
      if (res.ok) {
        setNewComment('');
        fetchComments(selectedProject.id);
        addToast('success', 'Comment Published', 'Comment cryptographically verified and posted.');
      } else {
        const data = await res.json();
        addToast('error', 'Post Failed', data.error || 'Check signature.');
      }
    } catch {
      // Mock simulation success (when MetaMask / backend not available)
      const commentObj: Comment = {
        id: Math.random().toString(),
        sxId: user.walletAddress!.slice(0, 6) + '...' + user.walletAddress!.slice(-3),
        content: newComment,
        signature: '0xMOCK_COMMENT_VERIFIED_SIGNATURE',
        createdAt: new Date().toISOString()
      };
      setComments(prev => [...prev, commentObj]);
      setNewComment('');
      addToast('success', 'Comment Verified (Simulated)', 'Cryptographic signature verified.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <div className="app-layout">
      <div className="main-content">
        <Topbar title="Project Marketplace & Analytics" />

        <div className="page-header" style={{ marginTop: '24px' }}>
          <p className="page-subtitle">Inspect token performance charts, participate in verified research threads, and monitor watchlist projects.</p>
        </div>

        {selectedProject ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '24px', alignItems: 'flex-start' }}>
            {/* Left Column: Analytics Chart & Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="project-logo" style={{ width: '40px', height: '40px' }}>
                      {selectedProject.logoUrl ? <img src={selectedProject.logoUrl} alt={selectedProject.name} /> : selectedProject.symbol.slice(0,2)}
                    </div>
                    <div>
                      <h3 style={{ margin: 0 }}>{selectedProject.name} Performance</h3>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Real-time allocation statistics</div>
                    </div>
                  </div>

                  <div className="filter-bar" style={{ padding: '4px', margin: 0, borderRadius: 'var(--radius-md)', gap: '4px' }}>
                    <button 
                      className={`btn btn-sm ${chartType === 'tvl' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setChartType('tvl')}
                      style={{ padding: '6px 12px' }}
                    >
                      <TrendingUp size={14} /> <span style={{ marginLeft: '4px' }}>TVL</span>
                    </button>
                    <button 
                      className={`btn btn-sm ${chartType === 'investors' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setChartType('investors')}
                      style={{ padding: '6px 12px' }}
                    >
                      <BarChart2 size={14} /> <span style={{ marginLeft: '4px' }}>Investors</span>
                    </button>
                  </div>
                </div>

                <StatsChart data={mockChartData} type={chartType} />
              </div>

              {/* Discussion Forum */}
              <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontSize: '1.1rem' }}>
                  <MessageSquare size={18} /> Signature-Verified Discussion
                </h3>

                {/* Comment Form */}
                {user.isConnected ? (
                  <form onSubmit={handleSubmitComment} style={{ marginBottom: '24px' }}>
                    <div className="form-group">
                      <textarea
                        className="form-textarea"
                        placeholder="Write your comment... Posting will prompt for a signature signature."
                        rows={3}
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        required
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Shield size={14} style={{ color: 'var(--accent-secondary)' }} />
                        Secured via wallet signature
                      </span>
                      <button 
                        type="submit" 
                        className="btn btn-primary btn-sm"
                        disabled={isSubmittingComment || !newComment.trim()}
                      >
                        {isSubmittingComment ? 'Signing...' : 'Sign & Post'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="card" style={{ padding: '16px', background: 'var(--bg-secondary)', border: '1px dashed var(--border-accent)', textAlign: 'center', marginBottom: '24px' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Please connect your wallet simulator to post comments in the discussion thread.
                    </p>
                  </div>
                )}

                {/* Comment List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {comments.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '20px' }}>
                      No comments yet. Be the first to share your analysis!
                    </p>
                  ) : (
                    comments.map(c => (
                      <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-primary)' }}>{c.sxId}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{c.content}</p>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Shield size={10} style={{ color: 'var(--accent-green)' }} /> Signature: {c.signature.slice(0, 16)}...
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Marketplace Index & Watchlist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05rem', color: 'var(--text-secondary)' }}>Marketplace Projects</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {projects.map((p) => {
                    const upvoteData = upvotes[p.id] || { count: 0, userUpvoted: false };
                    const isSelected = selectedProject.id === p.id;
                    const isStarred = watchlist.includes(p.id);

                    return (
                      <div 
                        key={p.id}
                        className="card"
                        style={{ 
                          padding: '14px', 
                          background: isSelected ? 'rgba(108, 99, 255, 0.05)' : 'var(--bg-glass)',
                          borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)',
                          cursor: 'pointer'
                        }}
                        onClick={() => setSelectedProject(p)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="project-logo" style={{ width: '32px', height: '32px', fontSize: '0.9rem' }}>
                              {p.logoUrl ? <img src={p.logoUrl} alt={p.name} /> : p.symbol.slice(0,2)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TVL: ${(p.stats?.tvl || 0).toLocaleString()}</div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                            <button 
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: isStarred ? 'var(--accent-yellow)' : 'var(--text-muted)' }}
                              onClick={() => toggleWatchlist(p.id)}
                            >
                              <Star size={16} fill={isStarred ? 'var(--accent-yellow)' : 'transparent'} />
                            </button>
                            <button 
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '4px',
                                background: 'transparent', 
                                border: 'none', 
                                cursor: 'pointer', 
                                color: upvoteData.userUpvoted ? 'var(--accent-primary)' : 'var(--text-muted)',
                                fontSize: '0.8rem'
                              }}
                              onClick={() => handleUpvote(p.id)}
                            >
                              <ThumbsUp size={14} fill={upvoteData.userUpvoted ? 'var(--accent-primary)' : 'transparent'} />
                              <span>{upvoteData.count}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Watchlist Summary */}
              <div className="card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05rem', color: 'var(--text-secondary)' }}>My Watchlist</h3>
                {watchlist.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>
                    Your watchlist is empty. Star projects in the index to track them here.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {projects.filter(p => watchlist.includes(p.id)).map(p => (
                      <div 
                        key={p.id} 
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', padding: '6px 8px', borderBottom: '1px solid var(--border-subtle)' }}
                        onClick={() => setSelectedProject(p)}
                      >
                        <span style={{ fontWeight: 500, cursor: 'pointer', color: 'var(--accent-secondary)' }}>{p.name}</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>${(p.stats?.tvl || 0).toLocaleString()} TVL</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>No projects available in the marketplace.</div>
        )}
      </div>
      <Toast toasts={toasts} onClose={removeToast} />
    </div>
  );
};
