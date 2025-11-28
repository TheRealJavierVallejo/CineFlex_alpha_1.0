import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PenTool, Clapperboard, Briefcase, Settings, Film } from 'lucide-react';

export const SideNav: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Determine active phase based on URL
    const getActivePhase = () => {
        if (location.pathname.includes('/script')) return 'writer';
        if (location.pathname.includes('/director')) return 'director'; 
        if (location.pathname.includes('/producer')) return 'producer';
        if (location.pathname.includes('/settings')) return 'settings';
        return 'writer'; // Default
    };

    const activePhase = getActivePhase();

    // Nav Item Component
    const NavItem = ({ id, icon: Icon, path, label }: { id: string, icon: any, path: string, label: string }) => {
        const isActive = activePhase === id;
        
        return (
            <div className="relative group w-full px-2">
                <button
                    onClick={() => navigate(path)}
                    className={`
                        w-full aspect-square flex items-center justify-center rounded-sm transition-all duration-200
                        ${isActive 
                            ? 'bg-primary text-white shadow-sm' 
                            : 'text-text-tertiary hover:text-text-primary hover:bg-white/5'}
                    `}
                    aria-label={label}
                >
                    <Icon className="w-5 h-5" />
                </button>
                
                {/* Tooltip (Right Side) */}
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-black border border-border rounded-sm text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50">
                    {label}
                </div>
            </div>
        );
    };

    return (
        <div className="w-14 h-full bg-surface-secondary border-r border-border flex flex-col items-center py-4 gap-6 shrink-0 z-50">
            {/* Logo / Home */}
            <button 
                onClick={() => navigate('/')}
                className="w-8 h-8 flex items-center justify-center rounded-sm bg-black border border-border hover:border-primary transition-colors group"
                title="Back to Project Library"
            >
                <Film className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
            </button>

            {/* Main Navigation */}
            <div className="flex flex-col gap-2 w-full flex-1">
                <NavItem id="writer" icon={PenTool} path="script" label="Writer (Script)" />
                <NavItem id="director" icon={Clapperboard} path="director" label="Director (Timeline)" />
                <NavItem id="producer" icon={Briefcase} path="producer" label="Producer (Breakdown)" />
                <div className="h-px w-8 bg-border mx-auto my-1" />
                <NavItem id="settings" icon={Settings} path="settings" label="Project Settings" />
            </div>

            {/* Bottom Status / Profile (Placeholder) */}
            <div className="mt-auto">
                {/* Add user profile or global settings here later */}
            </div>
        </div>
    );
};