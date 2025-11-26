
/*
 * 🍞 COMPONENT: TOAST (Status Notification)
 * Premium Desktop Style - Bottom Right Minimal
 */

import React, { useEffect } from 'react';
import { Check, AlertCircle, Info, X } from 'lucide-react';
import { ToastNotification } from '../../types';

interface ToastContainerProps {
  toasts: ToastNotification[];
  onClose: (id: number) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  return (
    <div 
      className="fixed bottom-8 right-6 z-[200] flex flex-col gap-2 pointer-events-none"
      role="region" 
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => onClose(toast.id)} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: ToastNotification;
  onClose: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getStyles = () => {
    switch (toast.type) {
      case 'success': return 'bg-[#1E1E1E] border-[#007ACC] text-[#E8E8E8]';
      case 'error': return 'bg-[#3E1A1A] border-[#F48771] text-[#E8E8E8]';
      default: return 'bg-[#1E1E1E] border-[#333] text-[#E8E8E8]';
    }
  };

  return (
    <div 
      className={`
        pointer-events-auto min-w-[240px] max-w-[320px] p-3 rounded-[3px] shadow-2xl border-l-4 flex items-center gap-3 
        animate-in slide-in-from-bottom-2 fade-in duration-200
        ${getStyles()}
      `}
    >
      {toast.type === 'success' ? <Check className="w-4 h-4 text-[#007ACC]" /> : 
       toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-[#F48771]" /> : 
       <Info className="w-4 h-4 text-[#969696]" />}
      
      <div className="flex-1 text-[12px] font-medium">{toast.message}</div>
      
      {toast.action && (
        <button 
          onClick={toast.action.onClick}
          className="text-[11px] bg-[#333] px-2 py-0.5 rounded hover:bg-[#444] transition-colors"
        >
          {toast.action.label}
        </button>
      )}
    </div>
  );
};
