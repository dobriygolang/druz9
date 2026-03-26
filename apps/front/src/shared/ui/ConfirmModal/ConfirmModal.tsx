import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDangerous?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  onConfirm,
  onCancel,
  isDangerous = false,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay" 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '20px'
      }}
      onClick={onCancel}
    >
      <div 
        className="card fade-in" 
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '32px',
          position: 'relative',
          textAlign: 'center',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '50%',
            transition: 'background 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <X size={20} />
        </button>

        <div style={{ 
          width: '56px', 
          height: '56px', 
          borderRadius: '16px', 
          backgroundColor: isDangerous ? 'rgba(239, 68, 68, 0.1)' : 'rgba(79, 70, 229, 0.1)',
          color: isDangerous ? '#ef4444' : 'var(--accent-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px'
        }}>
          <AlertTriangle size={28} />
        </div>

        <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>
          {title}
        </h3>
        
        <p style={{ 
          fontSize: '15px', 
          color: 'var(--text-secondary)', 
          lineHeight: 1.6,
          marginBottom: '32px' 
        }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn"
            onClick={onCancel}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.05)',
              color: 'var(--text-primary)',
              height: '48px',
              fontWeight: 600
            }}
          >
            {cancelText}
          </button>
          <button
            className="btn hover-scale"
            onClick={onConfirm}
            style={{
              flex: 1,
              background: isDangerous ? '#ef4444' : 'var(--accent-color)',
              color: 'white',
              height: '48px',
              fontWeight: 600,
              boxShadow: isDangerous ? '0 8px 20px rgba(239, 68, 68, 0.2)' : '0 8px 20px rgba(79, 70, 229, 0.2)'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
