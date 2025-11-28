/*
 * ⚙️ COMPONENT: APP SETTINGS (Global)
 * Handles Application-wide preferences like Theme and API Keys.
 */

import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, Palette, Check, X, Moon, Sun, Shield, Sparkles } from 'lucide-react';
import { UI_COLOR_PALETTE } from '../../constants';
import Button from '../ui/Button';
import { ShowToastFn } from '../../types';
import { useSubscription } from '../../context/SubscriptionContext'; // IMPORTED

import { getContrastColor, getGlowColor } from '../../utils/themeUtils';

interface AppSettingsProps {
    onClose: () => void;
    showToast: ShowToastFn;
}

export const AppSettings: React.FC<AppSettingsProps> = ({ onClose, showToast }) => {
    const { tier, setTier } = useSubscription(); // Use Context

    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [accentColor, setAccentColor] = useState('#3b82f6');
    const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
    const [activeTab, setActiveTab] = useState<'theme' | 'api' | 'billing'>('theme');

    useEffect(() => {
        const storedKey = localStorage.getItem('cinesketch_api_key');
        if (storedKey) setApiKey(storedKey);

        const savedColor = localStorage.getItem('cinesketch_theme_color');
        if (savedColor) setAccentColor(savedColor);

        const savedMode = localStorage.getItem('cinesketch_theme_mode');
        if (savedMode === 'light') setThemeMode('light');
    }, []);

    const saveApiKey = () => {
        if (apiKey.trim()) {
            localStorage.setItem('cinesketch_api_key', apiKey.trim());
            showToast("API Key saved securely", 'success');
        } else {
            localStorage.removeItem('cinesketch_active_project_id');
            localStorage.removeItem('cinesketch_api_key');
            showToast("API Key removed", 'info');
        }
    };

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
        } catch (e) {
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
            <div className="bg-surface border border-border rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col">

                {/* Header */}
                <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-surface shrink-0">
                    <span className="font-bold text-text-primary text-sm tracking-widest uppercase">Studio Settings</span>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-text-secondary hover:text-text-primary transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border bg-background">
                    <button
                        onClick={() => setActiveTab('theme')}
                        className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'theme' ? 'text-primary border-b-2 border-primary bg-surface-secondary' : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'}`}
                    >
                        Interface
                    </button>
                    <button
                        onClick={() => setActiveTab('api')}
                        className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'api' ? 'text-primary border-b-2 border-primary bg-surface-secondary' : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'}`}
                    >
                        Connections
                    </button>
                    <button
                        onClick={() => setActiveTab('billing')}
                        className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'billing' ? 'text-primary border-b-2 border-primary bg-surface-secondary' : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'}`}
                    >
                        Account
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 bg-background min-h-[320px]">
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

                    {activeTab === 'api' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
                            <div className="space-y-4">
                                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2">
                                    <Key className="w-3.5 h-3.5" /> Google Gemini API Key
                                </label>
                                <div className="relative">
                                    <input
                                        type={showKey ? "text" : "password"}
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        className="studio-input pr-10 font-mono"
                                        placeholder="sk-..."
                                    />
                                    <button
                                        onClick={() => setShowKey(!showKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                                    >
                                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                
                                {tier === 'free' && (
                                    <div className="flex items-center gap-2 text-[10px] text-primary bg-primary/10 p-2 rounded border border-primary/20">
                                        <Sparkles className="w-3 h-3" />
                                        <strong>Pro Feature:</strong> API Key is required for Pro generation & Copilot.
                                    </div>
                                )}

                                <Button variant="primary" className="w-full h-10" onClick={saveApiKey}>
                                    Save Connection
                                </Button>
                                <div className="p-4 bg-surface-secondary border border-border rounded-md">
                                    <p className="text-[11px] text-text-secondary leading-relaxed">
                                        Your API key is stored locally in your browser. Used for Pro-tier features.
                                    </p>
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

                {/* Footer */}
                <div className="p-4 border-t border-border bg-surface flex justify-end">
                    <Button variant="secondary" onClick={onClose}>Done</Button>
                </div>
            </div>
        </div>
    );
};