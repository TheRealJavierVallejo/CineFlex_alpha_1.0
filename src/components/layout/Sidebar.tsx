import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutGrid, FileText, BookOpen, Clapperboard, Sparkles, GraduationCap, Box, Film, MessageSquare } from 'lucide-react';
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
        <div className="w-16 bg-surface border-r border-border flex flex-col items-center py-4 shrink-0 z-50">
            {/* Brand */}
            <div
                className="w-10 h-10 mb-6 bg-surface border border-border flex items-center justify-center rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-primary"
                onClick={() => navigate('/')}
                title="Back to Library"
            >
                <Film className="w-5 h-5" />
            </div>

            {/* Navigation */}
            <div className="flex-1 flex flex-col w-full gap-2">
                <SidebarItem to="." icon={LayoutGrid} label="Dash" exact />
                <SidebarItem to="script" icon={FileText} label="Script" />
                <SidebarItem to="story-notes" icon={BookOpen} label="Notes" />
                <SidebarItem to="timeline" icon={Clapperboard} label="Scenes" />
            </div>

            {/* Tools */}
            <div className="w-full flex flex-col gap-4 items-center mb-4">
                {/* SYD Toggle */}
                <button
                    onClick={onSydClick}
                    className={`
                w-10 h-10 rounded-xl flex items-center justify-center transition-all relative border
                ${sydOpen
                            ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                            : 'bg-surface text-text-secondary border-border hover:border-primary/50 hover:text-primary'}
            `}
                    title={sydOpen ? "Close Syd" : "Open Syd"}
                >
                    <MessageSquare className="w-5 h-5" />
                    {/* Online Indicator Dot */}
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-surface rounded-full" />
                </button>
            </div>

            {/* Footer / Status */}
            <div className="mt-auto flex flex-col items-center gap-4 text-text-muted">
                <div className="h-px w-8 bg-border" />
                {tier === 'pro' ? (
                    <div title="Pro Studio">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                    </div>
                ) : (
                    <div title="Student Tier">
                        <GraduationCap className="w-4 h-4" />
                    </div>
                )}
            </div>
        </div>
    );
};
