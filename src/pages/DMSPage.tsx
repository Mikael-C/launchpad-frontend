import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Topbar } from '../components/Topbar';
import { Toast } from '../components/Toast';
import type { ToastMessage } from '../components/Toast';
import { Cpu, Shield, ShieldCheck, Play, AlertOctagon, Key, Lock, Unlock } from 'lucide-react';
import { API_URL } from '../config';

// DPoP Web Crypto Helpers
const base64url = (buf: ArrayBuffer): string => {
  const binary = String.fromCharCode(...new Uint8Array(buf));
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const stringToBuf = (str: string): Uint8Array => {
  return new TextEncoder().encode(str);
};

let dpopKeyPair: CryptoKeyPair | null = null;
const getOrCreateDPoPKeys = async (): Promise<CryptoKeyPair> => {
  if (dpopKeyPair) return dpopKeyPair;
  dpopKeyPair = await window.crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );
  return dpopKeyPair;
};

const generateDPoPProof = async (method: string, url: string, keyPair: CryptoKeyPair): Promise<string> => {
  const jwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const header = {
    typ: 'dpop+jwt',
    alg: 'ES256',
    jwk: {
      kty: jwk.kty,
      crv: jwk.crv,
      x: jwk.x,
      y: jwk.y
    }
  };
  
  const payload = {
    jti: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    htm: method.toUpperCase(),
    htu: url.split('?')[0],
    iat: Math.floor(Date.now() / 1000)
  };

  const encodedHeader = base64url(stringToBuf(JSON.stringify(header)));
  const encodedPayload = base64url(stringToBuf(JSON.stringify(payload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signatureBuffer = await window.crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    keyPair.privateKey,
    stringToBuf(signingInput)
  );

  const encodedSignature = base64url(signatureBuffer);
  return `${signingInput}.${encodedSignature}`;
};

export const DMSPage: React.FC = () => {
  const { user, device, registerDevice, updateDeviceTrust } = useApp();
  
  // Registration state
  const [serial, setSerial] = useState<string>('SERIAL-' + Math.floor(Math.random() * 100000));
  const [platform, setPlatform] = useState<string>('Windows 11');
  const [isRegistering, setIsRegistering] = useState<boolean>(false);

  // Attack/tampering simulation toggles
  const [jailbroken, setJailbroken] = useState<boolean>(false);
  const [emulator, setEmulator] = useState<boolean>(false);
  const [hooks, setHooks] = useState<boolean>(false);
  const [debuggerAttached, setDebuggerAttached] = useState<boolean>(false);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // DPoP Simulator State
  const [dpopTestResult, setDpopTestResult] = useState<string | null>(null);
  const [dpopTestStatus, setDpopTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const addToast = (type: ToastMessage['type'], title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Perform device registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.isConnected || !user.walletAddress) {
      addToast('warning', 'Connect Wallet', 'Please connect your simulated wallet profile first.');
      return;
    }

    setIsRegistering(true);
    try {
      // 1. Generate or retrieve the browser's DPoP keys
      const keyPair = await getOrCreateDPoPKeys();
      const jwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);

      // 2. Fetch the user authorization token
      const loginToken = localStorage.getItem('token');
      
      const res = await fetch(`${API_URL}/dms/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': loginToken ? `Bearer ${loginToken}` : ''
        },
        body: JSON.stringify({
          userId: user.walletAddress,
          serialNumber: serial,
          publicKey: '0xPUBKEY_' + Math.random().toString(36).slice(2, 12),
          attestationHash: '0xHASH_' + Math.random().toString(16).slice(2, 42),
          dpopPublicKeyJwk: jwk, // Cryptographically bind the device session to this key pair
          platform
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        // Store the returned DPoP-bound access token
        localStorage.setItem('dms_session_token', data.session.accessToken);
        localStorage.setItem('dms_dpop_jkt', data.session.dpopJkt);

        registerDevice(serial, platform);
        addToast('success', 'Device Registered', 'FIDO2 cryptographic attestation successful. DPoP session keys bound.');
      } else {
        throw new Error();
      }
    } catch (err) {
      // Mock local fallback if backend has an issue
      registerDevice(serial, platform);
      addToast('success', 'Device Registered (Simulated)', 'Hardware keys registered.');
    } finally {
      setIsRegistering(false);
    }
  };

  // Recalculate Trust Score based on toggled simulation parameters
  const handleSimulationChange = (
    jb: boolean,
    emu: boolean,
    hk: boolean,
    db: boolean
  ) => {
    let score = 100;
    const issues: string[] = [];

    if (jb) { score -= 40; issues.push('Jailbreak/Root files detected in OS directory'); }
    if (emu) { score -= 30; issues.push('Android/iOS hardware emulation detected'); }
    if (hk) { score -= 25; issues.push('Execution hooking framework (Frida/Substrate) present'); }
    if (db) { score -= 15; issues.push('Active runtime debugger process attached'); }

    if (issues.length === 0) {
      issues.push('All system integrity assertions verified clean.');
    }

    updateDeviceTrust(score, issues);

    if (score < 50) {
      addToast('error', 'Device Quarantined', `Trust score dropped to ${score}. Device session keys revoked.`);
    } else if (issues.length > 0 && score !== 100) {
      addToast('warning', 'Integrity Alerted', `Integrity check failed. Trust score dropped to ${score}.`);
    } else {
      addToast('success', 'Integrity Cleaned', 'Device trust restored to maximum.');
    }
  };

  // Run the DPoP Security Verification Test
  const runDpopTest = async (testType: 'valid' | 'missing' | 'forged') => {
    const sessionToken = localStorage.getItem('dms_session_token');
    if (!sessionToken) {
      addToast('warning', 'Session Required', 'Please enroll a device first to establish a DPoP-bound session.');
      return;
    }

    setDpopTestStatus('loading');
    setDpopTestResult(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      };

      const url = `${API_URL}/dms/status`;

      if (testType === 'valid') {
        const keyPair = await getOrCreateDPoPKeys();
        const proof = await generateDPoPProof('GET', url, keyPair);
        headers['DPoP'] = proof;
      } else if (testType === 'forged') {
        // Sign using a completely different, fresh key pair (simulating forged keys)
        const attackerKeyPair = await window.crypto.subtle.generateKey(
          { name: 'ECDSA', namedCurve: 'P-256' },
          true,
          ['sign', 'verify']
        );
        const proof = await generateDPoPProof('GET', url, attackerKeyPair);
        headers['DPoP'] = proof;
      } // 'missing' does not add any DPoP header

      const res = await fetch(url, { method: 'GET', headers });
      const data = await res.json();

      if (res.ok) {
        setDpopTestStatus('success');
        setDpopTestResult(JSON.stringify(data, null, 2));
        addToast('success', 'Request Authorized', 'Valid DPoP proof successfully verified by server.');
      } else {
        setDpopTestStatus('error');
        setDpopTestResult(`HTTP ${res.status} ${res.statusText}\n${JSON.stringify(data, null, 2)}`);
        if (res.status === 401) {
          addToast('error', 'Stolen Token Blocked!', `Attack prevented: ${data.error}`);
        } else {
          addToast('error', 'Request Failed', data.error || 'Server error');
        }
      }
    } catch (err: any) {
      setDpopTestStatus('error');
      setDpopTestResult(`Network Error: ${err.message}`);
      addToast('error', 'Test Error', 'Failed to connect to backend.');
    }
  };

  return (
    <div className="app-layout">
      <div className="main-content">
        <Topbar title="Device Management System (DMS) & DIG" />

        <div className="page-header" style={{ marginTop: '24px' }}>
          <p className="page-subtitle">Inspect FIDO2/TPM hardware enrollment states, simulate device tampering, and verify token-binding protections (DPoP).</p>
        </div>

        {/* Quarantined alert box */}
        {device.isRegistered && device.isQuarantined && (
          <div 
            className="card" 
            style={{ 
              background: 'rgba(255, 77, 106, 0.08)',
              border: '2px solid var(--accent-red)',
              padding: '20px',
              marginBottom: '32px',
              display: 'flex',
              gap: '16px',
              alignItems: 'center'
            }}
          >
            <AlertOctagon size={32} style={{ color: 'var(--accent-red)' }} />
            <div>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-red)', margin: 0 }}>CRITICAL STATUS: DEVICE QUARANTINED</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                Your Trust Score has fallen below the safety threshold of 50. All session tokens are revoked, and administrative multi-sig signing is blocked.
              </p>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '24px', alignItems: 'flex-start' }}>
          {/* Left: Device Registration / Status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {!device.isRegistered ? (
              <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', marginBottom: '20px' }}>
                  <Cpu size={18} /> Register FIDO2 Keys
                </h3>
                
                <form onSubmit={handleRegister}>
                  <div className="form-group">
                    <label className="form-label">Device Serial Number</label>
                    <input 
                      type="text" 
                      className="form-input"
                      value={serial}
                      onChange={e => setSerial(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Platform Type</label>
                    <select 
                      className="form-select"
                      value={platform}
                      onChange={e => setPlatform(e.target.value)}
                    >
                      <option value="Windows 11">Windows 11 (TPM 2.0)</option>
                      <option value="macOS Sonoma">macOS Sonoma (Secure Enclave)</option>
                      <option value="Ubuntu 24.04">Ubuntu 24.04 (FIDO2 Hardware Key)</option>
                      <option value="Android 14">Android 14 (Keystore API)</option>
                    </select>
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary btn-full"
                    disabled={isRegistering || !user.isConnected}
                  >
                    {isRegistering ? 'Attesting...' : 'Enroll Security Keys'}
                  </button>

                  {!user.isConnected && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '12px', textAlign: 'center' }}>
                      * Please connect your admin wallet to enroll FIDO2 keys.
                    </p>
                  )}
                </form>
              </div>
            ) : (
              <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', marginBottom: '20px' }}>
                  <ShieldCheck size={18} style={{ color: 'var(--accent-green)' }} /> Registered Device
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Serial:</span>
                    <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{device.serialNumber}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Platform:</span>
                    <span style={{ fontWeight: 600 }}>{device.platform}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Attestation:</span>
                    <span className="badge badge-active" style={{ textTransform: 'none' }}>FIDO2 WebAuthn</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', marginTop: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Trust Score:</span>
                    <span 
                      style={{ 
                        fontWeight: 'bold', 
                        color: device.isQuarantined ? 'var(--accent-red)' : device.trustScore < 100 ? 'var(--accent-yellow)' : 'var(--accent-green)' 
                      }}
                    >
                      {device.trustScore}/100
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Simulation controls */}
            {device.isRegistered && (
              <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', marginBottom: '16px' }}>
                  <Play size={18} style={{ color: 'var(--accent-secondary)' }} /> Integrity Simulator (DIG)
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '20px' }}>
                  Trigger simulated attack conditions on the client OS to see the Trust Score respond dynamically.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={jailbroken}
                      onChange={e => {
                        setJailbroken(e.target.checked);
                        handleSimulationChange(e.target.checked, emulator, hooks, debuggerAttached);
                      }}
                    />
                    <span>OS Jailbroken / Rooted (-40)</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={emulator}
                      onChange={e => {
                        setEmulator(e.target.checked);
                        handleSimulationChange(jailbroken, e.target.checked, hooks, debuggerAttached);
                      }}
                    />
                    <span>Hardware Emulator Detected (-30)</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={hooks}
                      onChange={e => {
                        setHooks(e.target.checked);
                        handleSimulationChange(jailbroken, emulator, e.target.checked, debuggerAttached);
                      }}
                    />
                    <span>Execution Hooks (Frida) (-25)</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={debuggerAttached}
                      onChange={e => {
                        setDebuggerAttached(e.target.checked);
                        handleSimulationChange(jailbroken, emulator, hooks, e.target.checked);
                      }}
                    />
                    <span>Debugger Process Attached (-15)</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Reports & DPoP Simulator */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Attestation Integrity Reports */}
            <div className="card" style={{ padding: '24px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', marginBottom: '20px' }}>
                <Shield size={18} /> Attestation Integrity Reports
              </h3>

              {!device.isRegistered ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No active device. Register FIDO2 keys to generate trust logs.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {device.integrityLogs.map((log, idx) => (
                    <div 
                      key={idx}
                      style={{ 
                        padding: '12px', 
                        background: log.trustScore < 50 ? 'rgba(255, 77, 106, 0.04)' : 'var(--bg-glass)',
                        borderLeft: `3px solid ${log.trustScore < 50 ? 'var(--accent-red)' : log.trustScore < 100 ? 'var(--accent-yellow)' : 'var(--accent-green)'}`,
                        borderRadius: '0 var(--radius-md) var(--radius-md) 0'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        <span>Report #{device.integrityLogs.length - idx}</span>
                        <span>{log.timestamp}</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span>Trust Score: {log.trustScore}/100</span>
                        <span style={{ color: log.trustScore < 50 ? 'var(--accent-red)' : log.trustScore < 100 ? 'var(--accent-yellow)' : 'var(--accent-green)' }}>
                          {log.trustScore < 50 ? 'Quarantined' : 'Healthy'}
                        </span>
                      </div>
                      <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {log.issues.map((issue, i) => (
                          <li key={i}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* DPoP Cryptographic Binding Simulator Card */}
            {device.isRegistered && (
              <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', marginBottom: '16px' }}>
                  <Key size={18} style={{ color: 'var(--accent-secondary)' }} /> DPoP Stolen Token Simulator (V4.2)
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '20px' }}>
                  Prove that stolen access tokens cannot be replayed or used by attackers. The server verifies that the DPoP signature matches the enrolled key bound to the session.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                    <button 
                      className="btn btn-secondary"
                      style={{ 
                        padding: '10px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '6px',
                        border: '1px solid var(--accent-green)'
                      }}
                      onClick={() => runDpopTest('valid')}
                      disabled={dpopTestStatus === 'loading'}
                    >
                      <Unlock size={14} style={{ color: 'var(--accent-green)' }} />
                      1. Valid Request (Enrolled Key)
                    </button>

                    <button 
                      className="btn btn-secondary"
                      style={{ 
                        padding: '10px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '6px',
                        border: '1px solid var(--accent-red)'
                      }}
                      onClick={() => runDpopTest('missing')}
                      disabled={dpopTestStatus === 'loading'}
                    >
                      <Lock size={14} style={{ color: 'var(--accent-red)' }} />
                      2. Attack (Stolen Token, No DPoP)
                    </button>

                    <button 
                      className="btn btn-secondary"
                      style={{ 
                        padding: '10px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '6px',
                        border: '1px solid var(--accent-yellow)'
                      }}
                      onClick={() => runDpopTest('forged')}
                      disabled={dpopTestStatus === 'loading'}
                    >
                      <Lock size={14} style={{ color: 'var(--accent-yellow)' }} />
                      3. Attack (Stolen Token, Forged DPoP Key)
                    </button>
                  </div>

                  {dpopTestResult && (
                    <div style={{ marginTop: '16px' }}>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 'bold' }}>
                        API Console Log:
                      </div>
                      <pre 
                        style={{ 
                          padding: '12px', 
                          background: 'rgba(0,0,0,0.3)', 
                          borderRadius: 'var(--radius-md)', 
                          fontSize: '0.8rem', 
                          fontFamily: 'monospace',
                          overflowX: 'auto',
                          border: '1px solid var(--border-subtle)',
                          color: dpopTestStatus === 'success' ? 'var(--accent-green)' : 'var(--accent-red)',
                          maxHeight: '200px'
                        }}
                      >
                        {dpopTestResult}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Toast toasts={toasts} onClose={removeToast} />
    </div>
  );
};
