import React from 'react';
import Modal from './Modal';
import { useSubscription } from '../../context/SubscriptionContext';
import { Check, Sparkles, Zap, Image as ImageIcon, Users, Lock } from 'lucide-react';
import Button from './Button';

export const UpgradeModal: React.FC = () => {
    const { isUpgradeModalOpen, closeUpgradeModal, setTier } = useSubscription();

    const features = [
        { icon: <ImageIcon className="w-4 h-4 text-primary" />, title: "4K Studio Resolution", desc: "Generate production-ready storyboards in high fidelity." },
        { icon: <Users className="w-4 h-4 text-primary" />, title: "Character Consistency", desc: "Lock actor faces across multiple shots for perfect continuity." },
        { icon: <Zap className="w-4 h-4 text-primary" />, title: "Cloud AI Engine", desc: "Access Google Gemini Pro for smarter script analysis." },
        { icon: <Lock className="w-4 h-4 text-primary" />, title: "Private & Secure", desc: "Enterprise-grade data handling for your scripts." },
    ];

    // Simulate the purchase action for now
    const handleUpgrade = () => {
        // In a real app, this would open Stripe
        setTier('pro');
        closeUpgradeModal();
    };

    return (
        <Modal 
            isOpen={isUpgradeModalOpen} 
            onClose={closeUpgradeModal} 
            title="Unlock Studio Pro" 
            size="md"
        >
            <div className="p-6 space-y-8">
                {/* Hero */}
                <div className="text-center space-y-3">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-primary/10 border border-primary/20">
                        <Sparkles className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-text-primary">Go Professional</h2>
                        <p className="text-sm text-text-secondary mt-2 max-w-xs mx-auto">
                            Take your pre-production to the next level with advanced AI tools and unlimited creative control.
                        </p>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 gap-4">
                    {features.map((f, i) => (
                        <div key={i} className="flex items-start gap-4 p-3 rounded-lg bg-surface-secondary border border-border/50">
                            <div className="mt-1 shrink-0">{f.icon}</div>
                            <div>
                                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wide">{f.title}</h4>
                                <p className="text-xs text-text-muted mt-1 leading-relaxed">{f.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pricing / Action */}
                <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between mb-6 px-2">
                        <div>
                            <span className="text-2xl font-bold text-text-primary">$19</span>
                            <span className="text-sm text-text-muted">/mo</span>
                        </div>
                        <div className="text-xs text-green-500 font-bold bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
                            7-Day Free Trial
                        </div>
                    </div>
                    
                    <Button 
                        variant="primary" 
                        className="w-full h-12 text-sm uppercase tracking-widest shadow-xl shadow-primary/20" 
                        onClick={handleUpgrade}
                        icon={<Sparkles className="w-4 h-4" />}
                    >
                        Upgrade Now
                    </Button>
                    <p className="text-center text-[10px] text-text-muted mt-4">
                        Secure payment via Stripe. Cancel anytime.
                    </p>
                </div>
            </div>
        </Modal>
    );
};