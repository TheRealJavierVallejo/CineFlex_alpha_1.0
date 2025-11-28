/*
 * ⚙️ COMPONENT: APP SETTINGS (Global)
 * Handles Application-wide preferences like Theme and API Keys.
 */

import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, Palette, Check, X, Moon, Sun } from 'lucide-react';
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
    const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
    const [activeTab, setActiveTab] = useState<'theme' | 'api'>('theme');

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

        // Calculate contrast
        const hex = color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        const foreground = brightness > 128 ? '#000000' : '#FFFFFF';
        root.style.setProperty('--color-primary-foreground', foreground);

        try {
            root.style.setProperty('--color-primary-glow', `rgba(${r}, ${g}, ${b}, 0.5)`);
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
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
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
                </div>

                {/* Content */}
                <div className="p-8 bg-background min-h-[320px]">
                    {activeTab === 'theme' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-200">
                            
                            {/* Mode Selection */}
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

                            {/* Color Selection */}
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
                                                    {/* Smart Check Icon Color based on swatch brightness */}
                                                    <Check 
                                                        className={`w-5 h-5`} 
                                                        strokeWidth={3} 
                                                        style={{ 
                                                            color: ((parseInt(color.slice(1,3),16)*299 + parseInt(color.slice(3,5),16)*587 + parseInt(color.slice(5,7),16)*114)/1000) > 128 ? 'black' : 'white' 
                                                        }}
                                                    />
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
                                <Button variant="primary" className="w-full h-10" onClick={saveApiKey}>
                                    Save Connection
                                </Button>
                                <div className="p-4 bg-surface-secondary border border-border rounded-md">
                                    <p className="text-[11px] text-text-secondary leading-relaxed">
                                        Your API key is stored locally in your browser's secure storage. It is never transmitted to our servers, communicating directly with Google's API for generation.
                                    </p>
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