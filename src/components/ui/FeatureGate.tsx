import React from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { useSubscription } from '../../context/SubscriptionContext';
import Button from './Button';

interface FeatureGateProps {
    children: React.ReactNode;
    label?: string;
    description?: string;
    className?: string;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({ 
    children, 
    label = "Pro Feature Locked", 
    description = "Upgrade to CineFlex Pro to unlock this tool.",
    className = ""
}) => {
    const { isPro, triggerUpgrade } = useSubscription();

    if (isPro) {
        return <>{children}</>;
    }

    return (
        <div className={`relative overflow-hidden rounded-lg ${className}`}>
            {/* Blurrable Content */}
            <div className="opacity-30 blur-[2px] pointer-events-none select-none filter grayscale transition-all duration-500">
                {children}
            </div>

            {/* Lock Overlay */}
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-surface/50 backdrop-blur-[1px]">
                <div className="w-12 h-12 bg-surface border border-border rounded-full flex items-center justify-center mb-4 shadow-xl">
                    <Lock className="w-5 h-5 text-text-muted" />
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">{label}</h3>
                </div>
                
                <p className="text-xs text-text-secondary mb-6 leading-relaxed max-w-[240px]">
                    {description}
                </p>
                
                <Button 
                    variant="primary" 
                    size="sm" 
                    className="shadow-lg shadow-primary/20"
                    onClick={triggerUpgrade} // Hooked up!
                >
                    Unlock Pro
                </Button>
            </div>
        </div>
    );
};