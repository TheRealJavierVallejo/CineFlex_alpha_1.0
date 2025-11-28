/*
 * ⚙️ COMPONENT: APP SETTINGS (Global)
 * Handles Application-wide preferences like Theme and API Keys.
 */

import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, Palette, Check, X } from 'lucide-react';
import { UI_COLOR_PALETTE } from '../../constants';
import Button from '../ui/Button';
import { ShowToastFn } from '../../types';

interface AppSettingsProps {
    onClose: () => void;
    showToast: ShowToastFn;
}

export const AppSettings: React.FC<AppSettingsProps> = ({ onClose, showToast }) => {
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [accentColor, setAccentColor] = useState('#3b82f6');
    const [activeTab, setActiveTab] = useState<'theme' | 'api'>('theme');

    useEffect(() => {
        const storedKey = localStorage.getItem('cinesketch_api_key');
        if (storedKey) setApiKey(storedKey);

        const savedColor = localStorage.getItem('cinesketch_theme_color');
        if (savedColor) setAccentColor(savedColor);
    }, []);

    const saveApiKey = () => {
        if (apiKey.trim()) {
            localStorage.setItem('cinesketch_api_key', apiKey.trim());
            showToast("API Key saved securely", 'success');
        } else {
            localStorage.removeItem(KEYS.ACTIVE_PROJECT_ID); // Fix usage if needed or just use key string
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

        try {
            // Simple hex to rgb for glow
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            root.style.setProperty('--color-primary-glow', `rgba(${r}, ${g}, ${b}, 0.5)`);
        } catch (e) {
            console.warn("Could not parse color for glow:", color);
        }
        
        showToast("Interface updated", 'success');
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-[#0A0A0A] border border-border rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                
                {/* Header */}
                <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-[#0A0A0A] shrink-0">
                    <span className="font-bold text-text-primary text-sm tracking-widest uppercase">Studio Settings</span>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-text-secondary hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border bg-[#050505]">
                    <button
                        onClick={() => setActiveTab('theme')}
                        className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'theme' ? 'text-primary border-b-2 border-primary bg-white/5' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}
                    >
                        Interface
                    </button>
                    <button
                        onClick={() => setActiveTab('api')}
                        className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'api' ? 'text-primary border-b-2 border-primary bg-white/5' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}
                    >
                        Connections
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 bg-[#030303] min-h-[320px]">
                    {activeTab === 'theme' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-200">
                            <div>
                                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2 mb-4">
                                    <Palette className="w-3.5 h-3.5" /> Command Color
                                </label>
                                
                                <div className="grid grid-cols-4 gap-4">
                                    {UI_COLOR_PALETTE.map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => handleColorChange(color)}
                                            className={`
                                                w-full aspect-square rounded-full relative group transition-all duration-300
                                                ${accentColor === color ? 'scale-110 ring-2 ring-offset-2 ring-offset-black ring-white' : 'hover:scale-105 hover:opacity-100 opacity-80'}
                                            `}
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        >
                                            {accentColor === color && (
                                                <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in duration-200">
                                                    <Check className={`w-5 h-5 ${['#FFFFFF', '#A1A1AA'].includes(color) ? 'text-black' : 'text-white'}`} strokeWidth={3} />
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
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors"
                                    >
                                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <Button variant="primary" className="w-full h-10" onClick={saveApiKey}>
                                    Save Connection
                                </Button>
                                <div className="p-4 bg-white/5 border border-border rounded-md">
                                    <p className="text-[11px] text-text-secondary leading-relaxed">
                                        Your API key is stored locally in your browser's secure storage. It is never transmitted to our servers, communicating directly with Google's API for generation.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border bg-[#0A0A0A] flex justify-end">
                    <Button variant="secondary" onClick={onClose}>Done</Button>
                </div>
            </div>
        </div>
    );
};