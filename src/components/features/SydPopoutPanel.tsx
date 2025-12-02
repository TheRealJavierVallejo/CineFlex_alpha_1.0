import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sparkles, X, Send, Loader2, Cpu, Zap, AlertCircle, Download, BrainCircuit } from 'lucide-react';
import { SydContext } from '../../services/sydContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { useLocalLlm } from '../../context/LocalLlmContext';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface SydPopoutPanelProps {
    isOpen: boolean;
    context: SydContext | null;
    anchorElement: HTMLElement | null;
    scrollContainer: HTMLElement | null;
    onClose: () => void;
    onSendMessage: (message: string, messageHistory?: Array<{role: string, content: string}>) => Promise<string>;
    initialMessages?: ChatMessage[];
}

export const SydPopoutPanel: React.FC<SydPopoutPanelProps> = ({
    isOpen,
    context,
    anchorElement,
    scrollContainer,
    onClose,
    onSendMessage,
    initialMessages
}) => {
    const { tier } = useSubscription();
    const { isReady, isDownloading, downloadProgress, downloadText, error, initModel } = useLocalLlm();

    // Initialize with props, but don't depend on them for resets to avoid loops
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeAgentType, setActiveAgentType] = useState<string | null>(null);
    
    // Track current position to avoid redundant state updates
    const currentPos = useRef({ top: 0, left: 0, visible: false });
    const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({
        top: 0, left: 0, opacity: 0, pointerEvents: 'none', position: 'fixed', width: '340px', maxHeight: '500px', zIndex: 100
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // 1. Initialize / Reset Chat based on Context ID & Readiness
    // Replaced system pill logic with delayed assistant greeting
    useEffect(() => {
        if (!context) return;

        const agentType = context.agentType;

        // If this is a different agent than before, reset messages
        if (agentType !== activeAgentType) {
            setActiveAgentType(agentType);
            setMessages([]); // clear out old conversation when switching agents
        }

        // If parent provided initial messages, just use those.
        if (initialMessages && initialMessages.length > 0) {
            setMessages(initialMessages);
            return;
        }

        // While the local model is still warming up, show an empty chat.
        // (Only applicable for Free tier which relies on local readiness)
        if (tier === 'free' && !isReady) {
            return;
        }

        // When ready (or if Pro tier), inject a friendly assistant greeting if empty.
        setMessages(prev => {
            if (prev.length > 0) return prev;

            let greeting = 'How can I help with this?';
            if (agentType.startsWith('beat_')) {
                greeting = 'How can I help with this beat?';
            } else if (agentType.startsWith('character_')) {
                greeting = 'How can I help with this character?';
            } else if (agentType === 'title') {
                greeting = 'Need help brainstorming titles?';
            } else if (agentType === 'logline') {
                greeting = 'Shall we work on the logline?';
            }

            return [{
                id: `assistant-init-${Date.now()}`,
                role: 'assistant',
                content: greeting,
            }];
        });
    }, [context, activeAgentType, initialMessages, isReady, tier]);

    // 2. Auto-scroll on new messages or status changes
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length, isReady, downloadText, isGenerating]);

    // 3. Optimized Positioning Loop
    useEffect(() => {
        if (!isOpen || !anchorElement || !scrollContainer) return;

        let animationFrameId: number;

        const updatePosition = () => {
            const anchorRect = anchorElement.getBoundingClientRect();
            const containerRect = scrollContainer.getBoundingClientRect();

            // Visibility Check
            const isInView = (
                anchorRect.top < containerRect.bottom &&
                anchorRect.bottom > containerRect.top
            );

            // Auto-close if scrolled too far away
            if (!isInView) {
                if (anchorRect.top < containerRect.top - 200 || anchorRect.top > containerRect.bottom + 200) {
                    onClose();
                    return;
                }
            }

            // Calculate Target Position
            const top = Math.min(Math.max(anchorRect.top, 80), window.innerHeight - 520);
            let left = anchorRect.right + 20;
            
            // Flip to left if hitting screen edge
            if (left + 340 > window.innerWidth) {
                left = anchorRect.left - 360;
            }

            // Only update state if values significantly changed (Performance Optimization)
            const hasChanged = 
                Math.abs(currentPos.current.top - top) > 1 || 
                Math.abs(currentPos.current.left - left) > 1 ||
                currentPos.current.visible !== isInView;

            if (hasChanged) {
                currentPos.current = { top, left, visible: isInView };
                setPanelStyle(prev => ({
                    ...prev,
                    top: `${top}px`,
                    left: `${left}px`,
                    opacity: isInView ? 1 : 0,
                    pointerEvents: isInView ? 'auto' : 'none',
                }));
            }

            animationFrameId = requestAnimationFrame(updatePosition);
        };

        updatePosition();
        return () => cancelAnimationFrame(animationFrameId);
    }, [isOpen, anchorElement, scrollContainer, onClose]);

    const handleSend = async () => {
        if (!inputValue.trim() || isGenerating) return;
        if (tier === 'free' && !isReady) return;

        const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: inputValue };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsGenerating(true);

        try {
            // Filter out system messages and convert to simple history format
            const conversationHistory = messages
                .filter(msg => msg.role !== 'system')
                .map(msg => ({ role: msg.role as string, content: msg.content }));

            // Pass history to the handler
            const response = await onSendMessage(inputValue, conversationHistory);
            
            setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: response }]);
        } catch (error) {
            setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'system', content: 'Error generating response.' }]);
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen) return null;

    // --- STATUS HEADER LOGIC ---
    let statusElement = null;
    const baseStatusClasses = "flex items-center gap-2 text-text-primary text-xs font-bold px-2.5 py-1.5 bg-primary/10 rounded border border-primary/20 shadow-sm w-full justify-center transition-all";
    
    if (tier === 'free') {
        if (error) {
             statusElement = (
                <div className={baseStatusClasses}>
                    <AlertCircle className="w-3.5 h-3.5 text-text-primary" />
                    <span className="text-text-primary">Error: {error.slice(0, 15)}...</span>
                </div>
             );
        } else if (isDownloading) {
             statusElement = (
                <div className={baseStatusClasses}>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-text-primary" />
                    <span className="text-text-primary">Warming up: {downloadProgress}%</span>
                </div>
             );
        } else if (isGenerating) {
             statusElement = (
                <div className={baseStatusClasses}>
                    <BrainCircuit className="w-3.5 h-3.5 animate-pulse text-text-primary" />
                    <span className="text-text-primary">Generating Response...</span>
                </div>
             );
        } else if (!isReady) {
             statusElement = (
                <button 
                    onClick={initModel} 
                    className={`${baseStatusClasses} hover:bg-primary/20 cursor-pointer`}
                >
                    <Download className="w-3.5 h-3.5 text-text-primary" />
                    <span className="text-text-primary">Load Engine</span>
                </button>
             );
        } else {
            statusElement = (
                <div className={baseStatusClasses}>
                    <Cpu className="w-3.5 h-3.5 text-text-primary" />
                    <span className="text-text-primary">Syd Jr. Ready</span>
                </div>
            );
        }
    } else {
        // PRO TIER (Cloud)
        if (isGenerating) {
            statusElement = (
                <div className={baseStatusClasses}>
                    <Sparkles className="w-3.5 h-3.5 animate-spin text-text-primary" />
                    <span className="text-text-primary">Syd Pro Thinking...</span>
                </div>
            );
        } else {
            statusElement = (
                <div className={baseStatusClasses}>
                    <Sparkles className="w-3.5 h-3.5 text-text-primary" />
                    <span className="text-text-primary">Syd Pro Active</span>
                </div>
            );
        }
    }

    return (
        <div
            ref={panelRef}
            className="flex flex-col bg-surface border border-primary/30 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-xl ring-1 ring-white/10 transition-opacity duration-200"
            style={panelStyle}
        >
            {/* Header */}
            <div className="bg-surface-secondary/90 border-b border-border p-2 shrink-0">
                <div className="flex items-center justify-between mb-2 px-1">
                    {context && (
                        <span className="text-[10px] text-text-muted uppercase tracking-wider font-mono font-bold">
                            {context.agentType.replace(/_/g, ' ')}
                        </span>
                    )}
                    <button
                        onClick={onClose}
                        className="text-text-secondary hover:text-text-primary transition-colors p-1 hover:bg-white/5 rounded"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
                
                {/* Status Bar */}
                {statusElement}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[250px] max-h-[400px] bg-background/80 custom-scrollbar">
                
                {/* EMPTY STATE / ERROR STATE UI */}
                {tier === 'free' && !isReady && !isDownloading && !error && (
                    <div className="flex flex-col items-center justify-center py-8 text-center space-y-3 opacity-70">
                        <Zap className="w-8 h-8 text-text-muted" />
                        <p className="text-xs text-text-secondary">Engine Standby</p>
                        <button onClick={initModel} className="text-[10px] bg-primary text-white px-3 py-1.5 rounded font-bold hover:bg-primary-hover transition-colors">
                            Connect to Local AI
                        </button>
                    </div>
                )}

                {messages.map(msg => (
                    <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-1 duration-300`}>
                        {msg.role === 'system' ? (
                            <div className="text-[10px] text-text-secondary bg-surface-secondary px-3 py-1.5 rounded-full border border-border/50 max-w-[90%] text-center self-center shadow-sm mb-2">
                                {msg.content}
                            </div>
                        ) : (
                            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-sm leading-relaxed whitespace-pre-wrap ${
                                msg.role === 'user'
                                    ? 'bg-primary text-white rounded-br-sm'
                                    : 'bg-surface border border-border text-text-primary rounded-bl-sm'
                                }`}>
                                {msg.content}
                            </div>
                        )}
                    </div>
                ))}

                {isGenerating && (
                    <div className="flex items-center gap-2 text-text-secondary text-xs pl-2 py-2">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        <span className="text-[10px] text-text-muted ml-2 animate-pulse">Thinking...</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-border bg-surface-secondary/50 backdrop-blur-sm">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={!isReady && tier === 'free' ? "Connect to Local AI first..." : "Type instructions..."}
                        disabled={isGenerating || (tier === 'free' && !isReady)}
                        className="flex-1 px-3 py-2 bg-surface border border-border rounded-md text-text-primary text-xs focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none disabled:opacity-50 transition-all placeholder:text-text-muted"
                        autoFocus
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isGenerating || (tier === 'free' && !isReady)}
                        className="p-2 bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center"
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </div>
                {tier === 'free' && (
                    <div className="text-[8px] text-text-muted mt-2 text-center flex items-center justify-center gap-1 opacity-60">
                        <Cpu className="w-2.5 h-2.5" />
                        <span>Running locally. No data leaves your device.</span>
                    </div>
                )}
            </div>
        </div>
    );
};