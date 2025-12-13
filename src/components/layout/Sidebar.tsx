import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutGrid, FileText, BookOpen, Clapperboard, Sparkles, GraduationCap, Box, Film, MessageSquare, Key } from 'lucide-react';
import { useSubscription } from '../../context/SubscriptionContext';

interface SidebarProps {
    onSydClick: () => void;
    sydOpen: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ onSydClick, sydOpen }) => {
    const { tier } = useSubscription();
    const navigate = useNavigate();

    const SidebarItem = ({ to, icon: Icon, label, exact = false }: { to: string, icon: any, label: string, exact?: boolean }) => (
        <NavLink
            to={to}
            end={exact}
            className={({ isActive }) => `
        w-full p-3 flex flex-col items-center justify-center gap-1 transition-all relative group
        ${isActive
                    ? 'text-primary bg-primary/10 border-l-2 border-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary border-l-2 border-transparent'}
      `}
            title={label}
        >
            <Icon className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
        </NavLink>
    );

    return (
        <div className="w-16 bg-surface border-r border-border flex flex-col items-center py-4 shrink-0 z-50 justify-between">
            <div className="flex flex-col items-center w-full">
                {/* Brand */}
                <div
                    className="w-10 h-10 mb-6 bg-surface border border-border flex items-center justify-center rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-primary"
                    onClick={() => navigate('/')}
                    title="Back to Library"
                >
                    <Film className="w-5 h-5" />
                </div>

                {/* Navigation */}
                <div className="flex flex-col w-full gap-2">
                    <SidebarItem to="." icon={LayoutGrid} label="Dash" exact />
                    <SidebarItem to="script" icon={FileText} label="Script" />
                    <SidebarItem to="story-notes" icon={BookOpen} label="Notes" />
                    <SidebarItem to="timeline" icon={Clapperboard} label="Scenes" />
                </div>
            </div>

            {/* Bottom Section */}
            <div className="flex flex-col w-full gap-2 mb-2">
                <div
                    className="w-full p-3 flex flex-col items-center justify-center gap-1 transition-all relative group cursor-pointer text-text-secondary hover:text-text-primary hover:bg-surface-secondary"
                    onClick={() => navigate('/settings/api-keys')}
                    title="API Keys"
                >
                    <Key className="w-5 h-5" />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Keys</span>
                </div>
            </div>
        </div>
    );
};