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
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            root.style.setProperty('--color-primary-glow', `rgba(${r}, ${g}, ${b}, 0.5)`);
        } catch (e) {
            console.warn("Could not parse color for glow:", color);
        }
        
        // Force repaint
        root.style.display = 'none';
        root.offsetHeight; 
        root.style.display = '';

        showToast("Theme updated", 'success');
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-[#09090b] border border-border rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                
                {/* Header */}
                <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-[#09090b] shrink-0">
                    <span className="font-bold text-white text-sm tracking-wide uppercase">App Settings</span>
                    <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border">
                    <button
                        onClick={() => setActiveTab('theme')}
                        className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'theme' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`}
                    >
                        Appearance
                    </button>
                    <button
                        onClick={() => setActiveTab('api')}
                        className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'api' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`}
                    >
                        API Connections
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 bg-black min-h-[300px]">
                    {activeTab === 'theme' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
                            <div>
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 mb-3">
                                    <Palette className="w-3 h-3" /> Accent Color
                                </label>
                                <div className="grid grid-cols-5 gap-3">
                                    {UI_COLOR_PALETTE.map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => handleColorChange(color)}
                                            className="w-full aspect-square rounded-sm relative group hover:scale-105 transition-transform border border-transparent hover:border-white/50"
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        >
                                            {accentColor === color && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Check className={`w-4 h-4 ${['#ffffff', '#a1a1aa'].includes(color) ? 'text-black' : 'text-white'}`} strokeWidth={3} />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-zinc-600 mt-4 leading-relaxed">
                                    This color theme applies globally across all your projects.
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'api' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                    <Key className="w-3 h-3" /> Gemini API Key
                                </label>
                                <div className="relative">
                                    <input
                                        type={showKey ? "text" : "password"}
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        className="w-full bg-[#09090b] border border-border rounded-sm px-3 py-2 text-sm text-white focus:border-primary outline-none pr-10"
                                        placeholder="sk-..."
                                    />
                                    <button
                                        onClick={() => setShowKey(!showKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                                    >
                                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <Button variant="primary" className="w-full" onClick={saveApiKey}>
                                    Save Key
                                </Button>
                                <div className="p-3 bg-zinc-900/50 border border-border rounded-sm">
                                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                                        Your API key is stored locally in your browser. It is never sent to our servers, only directly to Google's API for image generation.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border bg-[#09090b] flex justify-end">
                    <Button variant="secondary" onClick={onClose}>Done</Button>
                </div>
            </div>
        </div>
    );
};