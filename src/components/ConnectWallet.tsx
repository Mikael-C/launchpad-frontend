import React from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { LogOut, ShieldAlert, User, Wallet, X } from 'lucide-react';
import { ethers } from 'ethers';

interface ConnectWalletProps {
  onClose: () => void;
}

export const ConnectWallet: React.FC<ConnectWalletProps> = ({ onClose }) => {
  const { user, connectWallet, disconnectWallet } = useApp();

  const handleConnect = (address: string, role: 'user' | 'super_admin') => {
    connectWallet(address, role);
    onClose();
  };

  const handleMetaMaskConnect = async () => {
    try {
      if (typeof (window as any).ethereum !== 'undefined') {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const accounts = await provider.send('eth_requestAccounts', []);
        if (accounts.length > 0) {
          handleConnect(accounts[0], 'user');
        }
      } else {
        alert('MetaMask is not installed. Please install it to use this feature.');
      }
    } catch (error: any) {
      console.error('MetaMask connection failed:', error);
      alert(error.message || 'MetaMask connection failed');
    }
  };

  const wallets = [
    {
      label: 'Standard Investor Account',
      address: '0x1234567890123456789012345678901234567890',
      role: 'user' as const,
      desc: 'Simulate whitelisting, discussion upvotes, referral shares, and token investments.',
      icon: <User size={20} />
    },
    {
      label: 'Super Admin 1 (Key A)',
      address: '0x1111111111111111111111111111111111111111',
      role: 'super_admin' as const,
      desc: 'Super admin key 1. Propose and approve administrative multi-sig operations.',
      icon: <ShieldAlert size={20} style={{ color: 'var(--accent-primary)' }} />
    },
    {
      label: 'Super Admin 2 (Key B)',
      address: '0x2222222222222222222222222222222222222222',
      role: 'super_admin' as const,
      desc: 'Super admin key 2. Propose and approve administrative multi-sig operations.',
      icon: <ShieldAlert size={20} style={{ color: 'var(--accent-secondary)' }} />
    },
    {
      label: 'Super Admin 3 (Key C)',
      address: '0x3333333333333333333333333333333333333333',
      role: 'super_admin' as const,
      desc: 'Super admin key 3. Required to complete the 3-of-3 execution sequence.',
      icon: <ShieldAlert size={20} style={{ color: 'var(--accent-green)' }} />
    }
  ];

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Wallet Simulator</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Choose a wallet profile to connect. This simulates MetaMask signatures and role permissions locally.
          </p>
        </div>

        {user.isConnected && (
          <div className="card" style={{ padding: '16px', marginBottom: '20px', border: '1px solid var(--border-accent)', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>CONNECTED PROFILE</div>
                <div style={{ fontWeight: 'bold', fontSize: '0.95rem', wordBreak: 'break-all' }}>{user.walletAddress}</div>
                <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                  Role: <span className="badge badge-active" style={{ textTransform: 'capitalize' }}>{user.role}</span>
                </div>
              </div>
              <button 
                className="btn btn-danger btn-icon" 
                onClick={() => { disconnectWallet(); onClose(); }}
                title="Disconnect Wallet"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div 
            className="card"
            style={{ 
              padding: '16px', 
              cursor: 'pointer', 
              border: '1px solid var(--accent-primary)',
              background: 'rgba(108, 99, 255, 0.1)'
            }}
            onClick={handleMetaMaskConnect}
          >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ marginTop: '2px' }}><Wallet size={20} style={{ color: 'var(--accent-primary)' }} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Connect MetaMask (Browser Wallet)</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.3' }}>
                  Connect your real Web3 wallet securely via injected provider.
                </div>
              </div>
            </div>
          </div>
          {wallets.map((w) => (
            <div 
              key={w.address}
              className="card"
              style={{ 
                padding: '16px', 
                cursor: 'pointer', 
                border: user.walletAddress === w.address ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                background: 'var(--bg-glass)'
              }}
              onClick={() => handleConnect(w.address, w.role)}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ marginTop: '2px' }}>{w.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{w.label}</span>
                    {user.walletAddress === w.address && (
                      <span className="badge badge-approved" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>Active</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.3' }}>
                    {w.desc}
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    {w.address}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
};
