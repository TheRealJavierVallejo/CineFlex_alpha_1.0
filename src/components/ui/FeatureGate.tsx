import React from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import { Lock, Sparkles } from 'lucide-react';

interface FeatureGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  label?: string; // e.g. "Unlock Character Consistency"
}

export const FeatureGate: React.FC<FeatureGateProps> = ({ children, fallback, label = "Pro Feature" }) => {
  const { isPro } = useSubscription();

  if (isPro) {
    return <>{children}</>;
  }

  // If a custom fallback UI is provided (e.g. disabled input), show that
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default "Locked Box" UI
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-surface-secondary/50 p-6 flex flex-col items-center justify-center text-center gap-3 group">
      {/* Blurred Background effect representing the hidden content */}
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_50%,transparent_75%)] opacity-20" />
      
      <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center shadow-lg z-10 group-hover:scale-110 transition-transform">
        <Lock className="w-4 h-4 text-text-muted" />
      </div>
      
      <div className="z-10 max-w-[200px]">
        <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-1">{label}</h3>
        <p className="text-[10px] text-text-muted">Upgrade to CineFlex Pro to access this tool.</p>
      </div>

      <button className="z-10 mt-2 px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-full shadow-lg shadow-primary/20 flex items-center gap-2 hover:bg-primary-hover transition-colors">
        <Sparkles className="w-3 h-3" /> Upgrade
      </button>
    </div>
  );
};