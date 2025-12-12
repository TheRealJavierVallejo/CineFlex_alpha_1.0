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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id]); // Only depend on toast.id, not onClose which changes every render

  const getStyles = () => {
    switch (toast.type) {
      case 'success': return 'bg-[#09090b] border-primary text-white shadow-[0_4px_12px_rgba(0,0,0,0.5)]';
      case 'error': return 'bg-[#1a0505] border-red-500 text-white shadow-[0_4px_12px_rgba(0,0,0,0.5)]';
      default: return 'bg-[#09090b] border-zinc-700 text-zinc-200 shadow-[0_4px_12px_rgba(0,0,0,0.5)]';
    }
  };

  return (
    <div 
      className={`
        pointer-events-auto min-w-[240px] max-w-[320px] p-3 rounded-sm border-l-2 flex items-center gap-3 
        animate-in slide-in-from-bottom-2 fade-in duration-200 border border-t-0 border-r-0 border-b-0
        ${getStyles()}
      `}
    >
      {toast.type === 'success' ? <Check className="w-4 h-4 text-primary" /> : 
       toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-red-500" /> : 
       <Info className="w-4 h-4 text-zinc-500" />}
      
      <div className="flex-1 text-[12px] font-medium">{toast.message}</div>
      
      {toast.action && (
        <button 
          onClick={toast.action.onClick}
          className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-sm transition-colors uppercase font-bold tracking-wide"
        >
          {toast.action.label}
        </button>
      )}
    </div>
  );
};