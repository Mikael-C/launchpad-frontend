import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_URL } from '../config';

export interface UserState {
  walletAddress: string | null;
  isConnected: boolean;
  role: 'user' | 'admin' | 'super_admin';
  totpSecret: string | null;
  totpEnabled: boolean;
}

export interface DeviceState {
  deviceId: string;
  serialNumber: string;
  publicKey: string;
  trustScore: number;
  isRegistered: boolean;
  isQuarantined: boolean;
  platform: string;
  osVersion: string;
  integrityLogs: Array<{
    timestamp: string;
    trustScore: number;
    issues: string[];
  }>;
}

interface AppContextType {
  user: UserState;
  device: DeviceState;
  killSwitchActive: boolean;
  usdcBalance: number;
  usdtBalance: number;
  daiBalance: number;
  setUsdcBalance: React.Dispatch<React.SetStateAction<number>>;
  setUsdtBalance: React.Dispatch<React.SetStateAction<number>>;
  setDaiBalance: React.Dispatch<React.SetStateAction<number>>;
  connectWallet: (address: string, role?: 'user' | 'admin' | 'super_admin') => void;
  loginWithMetaMask: () => Promise<void>;
  disconnectWallet: () => void;
  registerDevice: (serial: string, platform: string) => void;
  updateDeviceTrust: (score: number, issues: string[]) => void;
  setKillSwitchActive: (active: boolean) => void;
  setTotpEnabled: (enabled: boolean) => void;
  setTotpSecret: (secret: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Mock Stablecoin balances
  const [usdcBalance, setUsdcBalance] = useState<number>(5000);
  const [usdtBalance, setUsdtBalance] = useState<number>(2500);
  const [daiBalance, setDaiBalance] = useState<number>(1000);

  // User state
  const [user, setUser] = useState<UserState>({
    walletAddress: null,
    isConnected: false,
    role: 'user',
    totpSecret: null,
    totpEnabled: false
  });

  // Device status (DMS)
  const [device, setDevice] = useState<DeviceState>({
    deviceId: 'dev-0000000000',
    serialNumber: 'DEVICE-DEMO-2026',
    publicKey: '0xPUBKEYDEMO1234567890',
    trustScore: 100,
    isRegistered: false,
    isQuarantined: false,
    platform: 'Web Console',
    osVersion: 'Windows 11',
    integrityLogs: [
      { timestamp: new Date().toLocaleTimeString(), trustScore: 100, issues: ['Device clean'] }
    ]
  });

  // Kill Switch state
  const [killSwitchActive, setKillSwitchActive] = useState<boolean>(false);

  // Load from local storage on mount
  useEffect(() => {
    const savedWallet = localStorage.getItem('wallet_address');
    const savedRole = localStorage.getItem('wallet_role');
    if (savedWallet) {
      setUser(prev => ({
        ...prev,
        walletAddress: savedWallet,
        isConnected: true,
        role: (savedRole as any) || 'user'
      }));
    }
  }, []);

  const connectWallet = (address: string, role: 'user' | 'admin' | 'super_admin' = 'user') => {
    localStorage.setItem('wallet_address', address);
    localStorage.setItem('wallet_role', role);
    setUser(prev => ({
      ...prev,
      walletAddress: address,
      isConnected: true,
      role
    }));
  };

  const loginWithMetaMask = async () => {
    try {
      if (typeof (window as any).ethereum === 'undefined') {
        alert('MetaMask is not installed!');
        return;
      }
      
      const ethersInstance = await import('ethers');
      const browserProvider = new ethersInstance.BrowserProvider((window as any).ethereum);
      const accounts = await browserProvider.send('eth_requestAccounts', []);
      const address = accounts[0];

      // Request nonce from backend
      const nonceRes = await fetch(`${API_URL}/auth/nonce?walletAddress=${address}`);
      if (!nonceRes.ok) throw new Error('Failed to fetch nonce');
      const { message } = await nonceRes.json();

      // Sign message
      const signer = await browserProvider.getSigner();
      const signature = await signer.signMessage(message);

      // Login
      const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, signature })
      });

      if (!loginRes.ok) {
        const errorData = await loginRes.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const { token, user: backendUser } = await loginRes.json();
      localStorage.setItem('token', token);
      localStorage.setItem('wallet_address', address);
      localStorage.setItem('wallet_role', backendUser.role);

      setUser(prev => ({
        ...prev,
        walletAddress: address,
        isConnected: true,
        role: backendUser.role
      }));
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'MetaMask connection failed');
    }
  };

  const disconnectWallet = () => {
    localStorage.removeItem('wallet_address');
    localStorage.removeItem('wallet_role');
    localStorage.removeItem('token');
    setUser({
      walletAddress: null,
      isConnected: false,
      role: 'user',
      totpSecret: null,
      totpEnabled: false
    });
  };

  const registerDevice = (serial: string, platform: string) => {
    setDevice(prev => ({
      ...prev,
      serialNumber: serial,
      platform,
      isRegistered: true,
      trustScore: 100,
      isQuarantined: false,
      integrityLogs: [
        { timestamp: new Date().toLocaleTimeString(), trustScore: 100, issues: ['Device registered successfully'] }
      ]
    }));
  };

  const updateDeviceTrust = (score: number, issues: string[]) => {
    setDevice(prev => {
      const isQuar = score < 50;
      const newLogs = [
        { timestamp: new Date().toLocaleTimeString(), trustScore: score, issues },
        ...prev.integrityLogs
      ].slice(0, 15); // limit to 15 logs
      
      return {
        ...prev,
        trustScore: score,
        isQuarantined: isQuar,
        integrityLogs: newLogs
      };
    });
  };

  const setTotpEnabled = (enabled: boolean) => {
    setUser(prev => ({ ...prev, totpEnabled: enabled }));
  };

  const setTotpSecret = (secret: string | null) => {
    setUser(prev => ({ ...prev, totpSecret: secret }));
  };

  return (
    <AppContext.Provider value={{
      user,
      device,
      killSwitchActive,
      usdcBalance,
      usdtBalance,
      daiBalance,
      setUsdcBalance,
      setUsdtBalance,
      setDaiBalance,
      connectWallet,
      loginWithMetaMask,
      disconnectWallet,
      registerDevice,
      updateDeviceTrust,
      setKillSwitchActive,
      setTotpEnabled,
      setTotpSecret
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
