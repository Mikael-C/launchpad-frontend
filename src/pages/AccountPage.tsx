import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Topbar } from '../components/Topbar';
import { Toast } from '../components/Toast';
import type { ToastMessage } from '../components/Toast';
import { Wallet, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, Activity, Clock } from 'lucide-react';
import { API_URL } from '../config';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  stablecoinType: string;
  txHash: string;
  status: string;
  createdAt: string;
}

export const AccountPage: React.FC = () => {
  const { 
    user,
    usdcBalance, setUsdcBalance,
    usdtBalance, setUsdtBalance,
    daiBalance, setDaiBalance
  } = useApp();

  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'transfer'>('deposit');
  const [stablecoinType, setStablecoinType] = useState<'USDC' | 'USDT' | 'DAI'>('USDC');
  const [amount, setAmount] = useState<string>('');
  const [destAddress, setDestAddress] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: ToastMessage['type'], title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Compute unified balance
  const unifiedBalance = usdcBalance + usdtBalance + daiBalance;

  useEffect(() => {
    fetchTransactions();
  }, [user.isConnected, user.walletAddress]);

  const fetchTransactions = async () => {
    if (!user.walletAddress) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${API_URL}/account/transactions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch {
      console.warn('Failed to fetch transactions');
    }
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.isConnected || !user.walletAddress) {
      addToast('warning', 'Connect Wallet', 'Please connect your simulated wallet profile first.');
      return;
    }

    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      addToast('warning', 'Invalid Input', 'Enter a positive numeric amount.');
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      let endpoint = '';
      let body: any = { walletAddress: user.walletAddress, amount: val, stablecoinType };

      // Sign the action message with MetaMask
      try {
        const ethersInstance = await import('ethers');
        const browserProvider = new ethersInstance.BrowserProvider((window as any).ethereum);
        const signer = await browserProvider.getSigner();
        const signMessage = `Authorize ${activeTab} of ${val} ${stablecoinType} on Launchpad Platform. Nonce: ${Date.now()}`;
        const sig = await signer.signMessage(signMessage);
        body.signature = sig;
        body.message = signMessage;
      } catch (signErr) {
        // If MetaMask not available, proceed without signature (backend will simulate)
        console.warn('Wallet signature skipped:', signErr);
      }

      if (activeTab === 'deposit') {
        endpoint = `${API_URL}/account/deposit`;
      } else if (activeTab === 'withdraw') {
        endpoint = `${API_URL}/account/withdraw`;
        body.toAddress = destAddress || user.walletAddress;
      } else {
        endpoint = `${API_URL}/account/transfer`;
        body.projectId = destAddress;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const resData = await res.json();
        // Adjust local states
        if (activeTab === 'deposit') {
          if (stablecoinType === 'USDC') setUsdcBalance(prev => prev + val);
          else if (stablecoinType === 'USDT') setUsdtBalance(prev => prev + val);
          else setDaiBalance(prev => prev + val);
          addToast('success', 'Deposit Completed', `Added $${val} ${stablecoinType} to your account balance.`);

          // Show referral reward notification
          if (resData.referralReward) {
            setUsdcBalance(prev => prev + resData.referralReward.reward);
            addToast('success', '🎉 Referral Reward!', `You and your referrer each earned $${resData.referralReward.reward} USDC!`);
          }
        } else {
          // Check balances
          const currentBal = stablecoinType === 'USDC' ? usdcBalance : stablecoinType === 'USDT' ? usdtBalance : daiBalance;
          if (val > currentBal) {
            addToast('error', 'Insufficient Funds', `You do not have enough $${stablecoinType} for this operation.`);
            setIsLoading(false);
            return;
          }
          if (stablecoinType === 'USDC') setUsdcBalance(prev => prev - val);
          else if (stablecoinType === 'USDT') setUsdtBalance(prev => prev - val);
          else setDaiBalance(prev => prev - val);
          addToast('success', 'Withdrawal/Transfer Completed', `Deducted $${val} ${stablecoinType}.`);
        }

        setAmount('');
        setDestAddress('');
        fetchTransactions();
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Request rejected');
      }
    } catch (err: any) {
      // If this is an API error (thrown from the else branch), show the real error
      if (err.message && !err.message.includes('fetch') && !err.message.includes('Failed') && !err.message.includes('NetworkError')) {
        addToast('error', 'Transaction Failed', err.message);
        setIsLoading(false);
        return;
      }

      // Network error fallback — simulate locally only when backend is truly unreachable
      console.warn('Backend unreachable, simulating locally:', err);
      const currentBal = stablecoinType === 'USDC' ? usdcBalance : stablecoinType === 'USDT' ? usdtBalance : daiBalance;
      if (activeTab !== 'deposit' && val > currentBal) {
        addToast('error', 'Insufficient Funds', 'Balance too low.');
        setIsLoading(false);
        return;
      }

      if (activeTab === 'deposit') {
        if (stablecoinType === 'USDC') setUsdcBalance(p => p + val);
        else if (stablecoinType === 'USDT') setUsdtBalance(p => p + val);
        else setDaiBalance(p => p + val);
        addToast('success', 'Deposit Completed (Simulated)', `Added $${val} ${stablecoinType}. Connect to backend for referral rewards.`);
      } else {
        if (stablecoinType === 'USDC') setUsdcBalance(p => p - val);
        else if (stablecoinType === 'USDT') setUsdtBalance(p => p - val);
        else setDaiBalance(p => p - val);
        addToast('success', 'Execution Succeeded (Simulated)', `Debited $${val} ${stablecoinType}.`);
      }

      const txObj: Transaction = {
        id: Math.random().toString(),
        type: activeTab,
        amount: val,
        stablecoinType,
        txHash: '0x' + Math.random().toString(16).slice(2, 8) + '...' + Math.random().toString(16).slice(2, 6),
        status: 'confirmed',
        createdAt: new Date().toISOString()
      };
      setTransactions(prev => [txObj, ...prev]);
      setAmount('');
      setDestAddress('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <div className="main-content">
        <Topbar title="Stablecoin Unified Account" />

        <div className="page-header" style={{ marginTop: '24px' }}>
          <p className="page-subtitle">Manage stablecoin deposits and withdraw funds securely through cryptographic multi-sig validators.</p>
        </div>

        {/* Balance Cards */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="stat-card">
            <div className="stat-label">Unified Balance</div>
            <div className="stat-value purple">${unifiedBalance.toLocaleString()}</div>
            <div className="stat-change">Normalized Valuation</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">USDC Balance</div>
            <div className="stat-value blue">${usdcBalance.toLocaleString()}</div>
            <div className="stat-change">ERC-20 Native</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">USDT Balance</div>
            <div className="stat-value green">${usdtBalance.toLocaleString()}</div>
            <div className="stat-change">Tether USD</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">DAI Balance</div>
            <div className="stat-value orange">${daiBalance.toLocaleString()}</div>
            <div className="stat-change">MakerDAO DAI</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '24px', alignItems: 'flex-start' }}>
          {/* Action Panel */}
          <div className="card" style={{ padding: '24px' }}>
            <div className="filter-bar" style={{ padding: '4px', margin: '0 0 24px 0', borderRadius: 'var(--radius-md)', gap: '4px' }}>
              <button 
                className={`btn btn-sm btn-full ${activeTab === 'deposit' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { setActiveTab('deposit'); setAmount(''); }}
              >
                <ArrowDownCircle size={14} /> <span style={{ marginLeft: '4px' }}>Deposit</span>
              </button>
              <button 
                className={`btn btn-sm btn-full ${activeTab === 'withdraw' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { setActiveTab('withdraw'); setAmount(''); }}
              >
                <ArrowUpCircle size={14} /> <span style={{ marginLeft: '4px' }}>Withdraw</span>
              </button>
              <button 
                className={`btn btn-sm btn-full ${activeTab === 'transfer' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { setActiveTab('transfer'); setAmount(''); }}
              >
                <ArrowLeftRight size={14} /> <span style={{ marginLeft: '4px' }}>Transfer</span>
              </button>
            </div>

            <form onSubmit={handleAction}>
              <div className="form-group">
                <label className="form-label">Select Stablecoin</label>
                <select 
                  className="form-select"
                  value={stablecoinType}
                  onChange={e => setStablecoinType(e.target.value as any)}
                >
                  <option value="USDC">USDC (USD Coin)</option>
                  <option value="USDT">USDT (Tether USD)</option>
                  <option value="DAI">DAI Stablecoin</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Amount (USD)</label>
                <input 
                  type="number"
                  className="form-input"
                  placeholder="Enter amount..."
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                />
              </div>

              {activeTab !== 'deposit' && (
                <div className="form-group">
                  <label className="form-label">
                    {activeTab === 'withdraw' ? 'Destination Wallet (Must be Whitelisted)' : 'Recipient Address'}
                  </label>
                  <input 
                    type="text"
                    className="form-input"
                    placeholder="0x..."
                    value={destAddress}
                    onChange={e => setDestAddress(e.target.value)}
                    required={activeTab === 'transfer'}
                  />
                </div>
              )}

              <button 
                type="submit" 
                className="btn btn-primary btn-full"
                disabled={isLoading || !user.isConnected}
                style={{ marginTop: '8px' }}
              >
                {isLoading ? 'Processing...' : activeTab.toUpperCase()}
              </button>

              {!user.isConnected && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '12px', textAlign: 'center' }}>
                  * Please connect your wallet profile to initiate accounts interaction.
                </p>
              )}
            </form>
          </div>

          {/* Transaction History */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', marginBottom: '20px' }}>
              <Clock size={18} /> Transaction History
            </h3>

            {!user.isConnected ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Connect wallet to inspect past stablecoin transaction records.
              </div>
            ) : transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No transaction records found. Make your first deposit to seed this account.
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Stablecoin</th>
                      <th>Amount</th>
                      <th>Tx Hash</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td>
                          <span style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>{tx.type}</span>
                        </td>
                        <td>
                          <span className="badge badge-silver" style={{ textTransform: 'none' }}>{tx.stablecoinType}</span>
                        </td>
                        <td style={{ fontWeight: 'bold' }}>
                          {tx.type === 'deposit' ? '+' : '-'}${tx.amount.toLocaleString()}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {tx.txHash}
                        </td>
                        <td>
                          <span className="badge badge-approved">{tx.status}</span>
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
