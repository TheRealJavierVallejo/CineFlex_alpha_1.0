import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, X, Command, ArrowRight, LayoutGrid, Clapperboard, 
  FileText, Settings, Plus, Save, LogOut, Moon, Sun, Monitor 
} from 'lucide-react';
import Modal from './ui/Modal';
import { Project } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onAddShot?: () => void;
  onSave?: () => void;
  toggleTheme?: () => void;
}

type CommandGroup = {
  category: string;
  commands: CommandItem[];
};

type CommandItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
};

export const CommandPalette: React.FC<CommandPaletteProps> = ({ 
  isOpen, 
  onClose, 
  project, 
  onAddShot, 
  onSave,
  toggleTheme 
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Define Commands
  const groups: CommandGroup[] = useMemo(() => {
    const list: CommandGroup[] = [];

    // 1. Navigation
    if (project) {
      list.push({
        category: "Navigation",
        commands: [
          { 
            id: 'nav-dashboard', 
            label: 'Go to Dashboard', 
            icon: <LayoutGrid className="w-4 h-4" />, 
            shortcut: '⌘1', 
            action: () => navigate(`/project/${project.id}`) 
          },
          { 
            id: 'nav-timeline', 
            label: 'Go to Timeline', 
            icon: <Clapperboard className="w-4 h-4" />, 
            shortcut: '⌘2', 
            action: () => navigate(`/project/${project.id}/timeline`) 
          },
          { 
            id: 'nav-script', 
            label: 'Go to Script Editor', 
            icon: <FileText className="w-4 h-4" />, 
            shortcut: '⌘3', 
            action: () => navigate(`/project/${project.id}/script`) 
          },
          { 
            id: 'nav-settings', 
            label: 'Project Settings', 
            icon: <Settings className="w-4 h-4" />, 
            shortcut: '⌘4', 
            action: () => navigate(`/project/${project.id}/settings`) 
          },
        ]
      });

      // 2. Actions
      const actions: CommandItem[] = [];
      if (onAddShot) actions.push({ id: 'act-new-shot', label: 'Create New Shot', icon: <Plus className="w-4 h-4" />, shortcut: '⌘N', action: onAddShot });
      if (onSave) actions.push({ id: 'act-save', label: 'Save Project', icon: <Save className="w-4 h-4" />, shortcut: '⌘S', action: onSave });
      
      if (actions.length > 0) {
        list.push({ category: "Actions", commands: actions });
      }
    }

    // 3. Global
    list.push({
      category: "System",
      commands: [
        { 
          id: 'sys-theme', 
          label: 'Toggle Dark/Light Mode', 
          icon: <Moon className="w-4 h-4" />, 
          action: () => toggleTheme?.() 
        },
        { 
          id: 'sys-library', 
          label: 'Back to Project Library', 
          icon: <LogOut className="w-4 h-4" />, 
          action: () => navigate('/') 
        }
      ]
    });

    return list;
  }, [project, navigate, onAddShot, onSave, toggleTheme]);

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!query) return groups;
    const lowerQuery = query.toLowerCase();
    
    return groups.map(group => ({
      ...group,
      commands: group.commands.filter(cmd => cmd.label.toLowerCase().includes(lowerQuery))
    })).filter(group => group.commands.length > 0);
  }, [groups, query]);

  // Flatten for keyboard navigation
  const flatCommands = useMemo(() => {
    return filteredCommands.flatMap(g => g.commands);
  }, [filteredCommands]);

  // Reset selection on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % flatCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + flatCommands.length) % flatCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = flatCommands[selectedIndex];
        if (cmd) {
          cmd.action();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, flatCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] overlay-dark backdrop-blur-sm flex items-start justify-center pt-[20vh] animate-in fade-in duration-100" onClick={onClose}>
      <div 
        className="w-full max-w-xl bg-surface border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center px-4 h-14 border-b border-border bg-surface-secondary/50">
          <Search className="w-5 h-5 text-text-muted mr-3" />
          <input
            autoFocus
            className="flex-1 bg-transparent border-none outline-none text-lg text-text-primary placeholder:text-text-muted"
            placeholder="Type a command or search..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <div className="text-xs text-text-muted font-mono border border-border px-1.5 rounded">ESC</div>
        </div>

        {/* Results List */}
        <div className="max-h-[300px] overflow-y-auto py-2">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-text-muted text-sm">No commands found.</div>
          ) : (
            filteredCommands.map(group => (
              <div key={group.category}>
                <div className="px-4 py-2 text-[10px] font-bold uppercase text-text-tertiary tracking-widest">
                  {group.category}
                </div>
                {group.commands.map(cmd => {
                  const isSelected = flatCommands[selectedIndex]?.id === cmd.id;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => { cmd.action(); onClose(); }}
                      onMouseEnter={() => {
                         const idx = flatCommands.findIndex(c => c.id === cmd.id);
                         if(idx !== -1) setSelectedIndex(idx);
                      }}
                      className={`
                        w-full flex items-center justify-between px-4 py-3 text-sm transition-colors
                        ${isSelected ? 'bg-primary text-white' : 'text-text-secondary hover:bg-surface-secondary'}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        {cmd.icon}
                        <span className={isSelected ? 'font-medium' : ''}>{cmd.label}</span>
                      </div>
                      {cmd.shortcut && (
                        <div className={`text-xs font-mono px-1.5 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-surface-secondary text-text-muted border border-border'}`}>
                          {cmd.shortcut}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-surface-secondary border-t border-border px-4 py-2 flex items-center justify-between text-[10px] text-text-tertiary">
          <div className="flex gap-4">
             <span><strong className="text-text-secondary">↑↓</strong> to navigate</span>
             <span><strong className="text-text-secondary">↵</strong> to select</span>
          </div>
          <span>Pro Tip: Use Cmd+K to open this anytime</span>
        </div>
      </div>
    </div>
  );
};