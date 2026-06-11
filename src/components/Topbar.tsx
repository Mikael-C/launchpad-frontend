import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ConnectWallet } from './ConnectWallet';
import { Shield, ShieldAlert, ShieldX, Wallet } from 'lucide-react';

interface TopbarProps {
  title: string;
}

export const Topbar: React.FC<TopbarProps> = ({ title }) => {
  const { user, device, loginWithMetaMask } = useApp();
  const [showConnectModal, setShowConnectModal] = useState<boolean>(false);

  const getIntegrityBadge = () => {
    if (!device.isRegistered) {
      return (
        <div className="badge badge-expired" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ShieldAlert size={14} />
          <span>Device Unattested</span>
        </div>
      );
    }
    if (device.isQuarantined) {
      return (
        <div className="badge badge-rejected" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,77,106,0.15)', boxShadow: '0 0 10px rgba(255,77,106,0.2)' }}>
          <ShieldX size={14} />
          <span>Quarantined (Score: {device.trustScore})</span>
        </div>
      );
    }
    return (
      <div className="badge badge-approved" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,229,160,0.15)', boxShadow: '0 0 10px rgba(0,229,160,0.2)' }}>
        <Shield size={14} />
        <span>Secure (Score: {device.trustScore})</span>
      </div>
    );
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h2 className="page-title" style={{ margin: 0, fontSize: '1.25rem' }}>{title}</h2>
      </div>

      <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {getIntegrityBadge()}
        
        {user.isConnected && user.walletAddress ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {user.role === 'super_admin' && (
              <span className="badge badge-platinum" style={{ border: '1px solid rgba(108,99,255,0.4)' }}>Super Admin</span>
            )}
            {user.role === 'admin' && (
              <span className="badge badge-gold">Admin</span>
            )}
            <button 
              className="btn btn-secondary btn-sm" 
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => setShowConnectModal(true)}
            >
              <Wallet size={14} />
              <span>{truncateAddress(user.walletAddress)}</span>
            </button>
          </div>
        ) : (
          <button 
            className="btn btn-primary btn-sm"
            onClick={loginWithMetaMask}
          >
            Connect Wallet
          </button>
        )}
      </div>

      {showConnectModal && (
        <ConnectWallet onClose={() => setShowConnectModal(false)} />
      )}
    </header>
  );
};
