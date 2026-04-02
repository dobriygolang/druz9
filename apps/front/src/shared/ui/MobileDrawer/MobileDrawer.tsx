import React, { useEffect, ReactNode } from 'react';
import { X } from 'lucide-react';
import './MobileDrawer.css';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="mobile-drawer-overlay" onClick={onClose}>
      <div 
        className="mobile-drawer-content" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mobile-drawer-handle" />
        
        <div className="mobile-drawer-header">
          {title && <h2 className="mobile-drawer-title">{title}</h2>}
          <button className="mobile-drawer-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="mobile-drawer-body hide-scrollbar">
          {children}
        </div>

        {footer && (
          <div className="mobile-drawer-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
