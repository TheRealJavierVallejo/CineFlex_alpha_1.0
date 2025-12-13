/*
 * ⚙️ COMPONENT: APP SETTINGS (Global)
 * Handles Application-wide preferences like Theme and API Keys.
 */

import React, { useState, useEffect } from 'react';
import { Palette, Check, X, Moon, Sun, Shield, Sparkles, Scale, ExternalLink } from 'lucide-react';
import { UI_COLOR_PALETTE } from '../../constants';
import Button from '../ui/Button';
import { ShowToastFn } from '../../types';
import { useSubscription } from '../../context/SubscriptionContext';
import { useNavigate } from 'react-router-dom';

import { getContrastColor, getGlowColor } from '../../utils/themeUtils';

interface AppSettingsProps {
    onClose: () => void;
    showToast: ShowToastFn;
}

export const AppSettings: React.FC<AppSettingsProps> = ({ onClose, showToast }) => {
    const { tier, setTier } = useSubscription();
    const navigate = useNavigate();

    const [accentColor, setAccentColor] = useState('#3b82f6');
    const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
    const [activeTab, setActiveTab] = useState<'theme' | 'billing'>('theme');

    useEffect(() => {
        const savedColor = localStorage.getItem('cinesketch_theme_color');
        if (savedColor) setAccentColor(savedColor);

        const savedMode = localStorage.getItem('cinesketch_theme_mode');
        if (savedMode === 'light') setThemeMode('light');
    }, []);

    const handleColorChange = (color: string) => {
        setAccentColor(color);
        localStorage.setItem('cinesketch_theme_color', color);

        const root = document.documentElement;
        root.style.setProperty('--color-primary', color);
        root.style.setProperty('--color-primary-hover', color);

        const foreground = getContrastColor(color);
        root.style.setProperty('--color-primary-foreground', foreground);

        try {
            const glow = getGlowColor(color, 0.5);
            root.style.setProperty('--color-primary-glow', glow);
        } catch {
            console.warn("Could not parse color for glow:", color);
        }
    };

    const handleThemeModeChange = (mode: 'dark' | 'light') => {
        setThemeMode(mode);
        localStorage.setItem('cinesketch_theme_mode', mode);
        if (mode === 'light') {
            document.documentElement.classList.add('light');
        } else {
            document.documentElement.classList.remove('light');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] modal-bg-dark backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-surface border border-border rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-surface shrink-0">
                    <span className="font-bold text-text-primary text-sm tracking-widest uppercase">Studio Settings</span>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-text-secondary hover:text-text-primary transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border bg-surface shrink-0">
                    <button
                        onClick={() => setActiveTab('theme')}
                        className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'theme' ? 'text-primary border-b-2 border-primary bg-surface-secondary' : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'}`}
                    >
                        Interface
                    </button>
                    <button
                        onClick={() => setActiveTab('billing')}
                        className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'billing' ? 'text-primary border-b-2 border-primary bg-surface-secondary' : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'}`}
                    >
                        Account
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 bg-background min-h-[320px] overflow-y-auto">
                    {activeTab === 'theme' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-200">
                            <div>
                                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2 mb-4">
                                    <Sun className="w-3.5 h-3.5" /> Color Mode
                                </label>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => handleThemeModeChange('dark')}
                                        className={`flex-1 p-4 rounded border flex flex-col items-center gap-3 transition-all ${themeMode === 'dark' ? 'bg-surface border-primary text-primary' : 'bg-surface-secondary border-transparent hover:border-border text-text-secondary'}`}
                                    >
                                        <Moon className="w-6 h-6" />
                                        <span className="text-xs font-bold uppercase">Dark Mode</span>
                                    </button>
                                    <button
                                        onClick={() => handleThemeModeChange('light')}
                                        className={`flex-1 p-4 rounded border flex flex-col items-center gap-3 transition-all ${themeMode === 'light' ? 'bg-surface border-primary text-primary' : 'bg-surface-secondary border-transparent hover:border-border text-text-secondary'}`}
                                    >
                                        <Sun className="w-6 h-6" />
                                        <span className="text-xs font-bold uppercase">Light Mode</span>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2 mb-4">
                                    <Palette className="w-3.5 h-3.5" /> Accent Color
                                </label>
                                <div className="grid grid-cols-4 gap-4">
                                    {UI_COLOR_PALETTE.map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => handleColorChange(color)}
                                            className={`
                                                w-full aspect-square rounded-full relative group transition-all duration-300
                                                ${accentColor === color ? 'scale-110 ring-2 ring-offset-2 ring-offset-background ring-text-primary' : 'hover:scale-105 hover:opacity-100 opacity-80'}
                                            `}
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        >
                                            {accentColor === color && (
                                                <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in duration-200">
                                                    <Check className={`w-5 h-5`} strokeWidth={3} style={{ color: getContrastColor(color) }} />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'billing' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
                            {/* STATUS CARD */}
                            <div className="p-4 bg-surface-secondary border border-border rounded-md space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-xs font-bold text-text-primary uppercase tracking-wide">Current Plan</div>
                                        <div className={`text-lg font-bold flex items-center gap-2 ${tier === 'pro' ? 'text-primary' : 'text-text-secondary'}`}>
                                            {tier === 'pro' ? <><Sparkles className="w-4 h-4" /> CINEFLEX PRO</> : 'STUDENT FREE'}
                                        </div>
                                    </div>
                                    {tier === 'pro' && <div className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded border border-primary/20">ACTIVE</div>}
                                </div>

                                <div className="text-[11px] text-text-secondary leading-relaxed">
                                    {tier === 'pro'
                                        ? "You have full access to high-fidelity generation, character consistency, and advanced exports."
                                        : "You are using the free student tier. Image generation uses basic models and character consistency features are locked."
                                    }
                                </div>
                            </div>

                            {/* API KEYS LINK */}
                            <div className="border-t border-border pt-6">
                                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-2 mb-3">
                                    Connections
                                </label>
                                <button
                                    onClick={() => { onClose(); navigate('/settings/api-keys'); }}
                                    className="w-full flex items-center justify-between p-3 rounded border border-border bg-surface hover:bg-surface-secondary hover:text-primary transition-all text-sm font-medium"
                                >
                                    <span>Manage API Keys (Claude & Gemini)</span>
                                    <ExternalLink className="w-4 h-4" />
                                </button>
                            </div>

                            {/* DEV TOOLS */}
                            <div className="border-t border-border pt-6">
                                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-2 mb-3">
                                    <Shield className="w-3.5 h-3.5" /> Developer Simulation
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => { setTier('free'); showToast("Switched to Free Tier Simulation", 'info'); }}
                                        className={`p-3 rounded border text-xs font-bold uppercase tracking-wide transition-all ${tier === 'free' ? 'bg-surface border-text-muted text-text-primary' : 'bg-surface-secondary border-transparent text-text-muted hover:text-text-secondary'}`}
                                    >
                                        Simulate Free
                                    </button>
                                    <button
                                        onClick={() => { setTier('pro'); showToast("Switched to Pro Tier Simulation", 'success'); }}
                                        className={`p-3 rounded border text-xs font-bold uppercase tracking-wide transition-all ${tier === 'pro' ? 'bg-surface border-primary text-primary' : 'bg-surface-secondary border-transparent text-text-muted hover:text-text-secondary'}`}
                                    >
                                        Simulate Pro
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer (Legal) */}
                <div className="p-4 border-t border-border bg-surface flex items-center justify-between shrink-0">
                    <div className="text-[10px] text-text-tertiary flex gap-4">
                        <a href="#" className="hover:text-text-primary flex items-center gap-1"><Scale className="w-3 h-3" /> Terms of Service</a>
                        <a href="#" className="hover:text-text-primary">Privacy Policy</a>
                    </div>
                    <Button variant="secondary" onClick={onClose} size="sm">Done</Button>
                </div>
            </div>
        </div>
    );
};