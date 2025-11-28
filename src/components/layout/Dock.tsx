import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PenTool, Clapperboard, Briefcase, Settings } from 'lucide-react';

export const Dock: React.FC = () => {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const DockItem = ({ id, label, icon: Icon, path, disabled = false }: { id: string, label: string, icon: any, path: string, disabled?: boolean }) => {
        const isActive = activePhase === id;
        
        return (
            <button
                onClick={() => !disabled && navigate(path)}
                disabled={disabled}
                className={`
                    group relative flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-all duration-300
                    ${isActive 
                        ? 'bg-primary/20 -translate-y-2 shadow-[0_0_20px_rgba(59,130,246,0.3)]' 
                        : 'hover:bg-white/5 hover:-translate-y-1'
                    }
                    ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                `}
            >
                <div className={`
                    p-2 rounded-lg transition-colors
                    ${isActive ? 'text-primary' : 'text-text-secondary group-hover:text-text-primary'}
                `}>
                    <Icon className="w-6 h-6" />
                </div>
                
                {/* Label Tooltip */}
                <span className={`
                    absolute -top-8 bg-black/90 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 transition-opacity whitespace-nowrap border border-white/10 pointer-events-none
                    ${!disabled && 'group-hover:opacity-100'}
                `}>
                    {label}
                </span>

                {/* Active Indicator Dot */}
                {isActive && (
                    <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary shadow-glow" />
                )}
            </button>
        );
    };

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="bg-[#18181b]/90 backdrop-blur-xl border border-white/10 px-2 py-2 rounded-2xl shadow-2xl flex items-center gap-1">
                <DockItem id="writer" label="WRITER" icon={PenTool} path="script" />
                <div className="w-[1px] h-8 bg-white/5 mx-1" />
                <DockItem id="director" label="DIRECTOR" icon={Clapperboard} path="director" />
                <div className="w-[1px] h-8 bg-white/5 mx-1" />
                <DockItem id="producer" label="PRODUCER (Prep)" icon={Briefcase} path="producer" />
                <div className="w-[1px] h-8 bg-white/5 mx-1" />
                <DockItem id="settings" label="SETTINGS" icon={Settings} path="settings" />
            </div>
        </div>
    );
};