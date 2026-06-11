import React, { useEffect } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onClose }) => {
  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 1100,
        maxWidth: '360px',
        width: '100%'
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onClose: (id: string) => void }> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return <CheckCircle style={{ color: 'var(--accent-green)' }} />;
      case 'error': return <XCircle style={{ color: 'var(--accent-red)' }} />;
      case 'warning': return <AlertTriangle style={{ color: 'var(--accent-orange)' }} />;
      default: return <Info style={{ color: 'var(--accent-secondary)' }} />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success': return 'rgba(0, 229, 160, 0.4)';
      case 'error': return 'rgba(255, 77, 106, 0.4)';
      case 'warning': return 'rgba(255, 123, 58, 0.4)';
      default: return 'rgba(0, 212, 255, 0.4)';
    }
  };

  return (
    <div 
      className="card"
      style={{
        padding: '16px',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
        border: `1px solid ${getBorderColor()}`,
        background: 'rgba(14, 18, 32, 0.95)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        transform: 'translateY(0)',
        animation: 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        backdropFilter: 'blur(20px)'
      }}
    >
      <div style={{ marginTop: '2px', flexShrink: 0 }}>{getIcon()}</div>
      <div style={{ flex: 1 }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0 0 4px 0' }}>{toast.title}</h4>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.3 }}>{toast.message}</p>
      </div>
      <button 
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
        onClick={() => onClose(toast.id)}
      >
        <X size={14} />
      </button>
    </div>
  );
};
