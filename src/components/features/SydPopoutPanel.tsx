import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sparkles, X, Send, Loader2, Cpu, Zap, AlertCircle, Download } from 'lucide-react';
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
    onSendMessage: (message: string) => Promise<string>;
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
    
    // Track current position to avoid redundant state updates
    const currentPos = useRef({ top: 0, left: 0, visible: false });
    const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({
        top: 0, left: 0, opacity: 0, pointerEvents: 'none', position: 'fixed', width: '340px', maxHeight: '500px', zIndex: 100
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // 1. Initialize / Reset Chat based on Context ID
    // We use context.agentType as a key to reset, rather than the object reference
    useEffect(() => {
        if (initialMessages && initialMessages.length > 0) {
            setMessages(initialMessages);
        } else if (context) {
            setMessages([{
                id: `system-init-${Date.now()}`,
                role: 'system',
                content: `🟢 Connected to ${context.agentType}. I have context on your story. Ask me anything!`
            }]);
        }
    }, [context?.agentType, initialMessages]); // Only trigger when agent TYPE changes

    // 2. Auto-scroll on new messages or status changes
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length, isReady, downloadText]);

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
            const response = await onSendMessage(inputValue);
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
    
    if (tier === 'free') {
        if (error) {
             statusElement = (
                <div className="flex items-center gap-2 text-red-400 text-[10px] font-bold px-2 py-1 bg-red-900/20 rounded border border-red-900/50">
                    <AlertCircle className="w-3 h-3" />
                    <span>Error: {error.slice(0, 15)}...</span>
                </div>
             );
        } else if (isDownloading) {
             statusElement = (
                <div className="flex items-center gap-2 text-yellow-500 text-[10px] font-bold px-2 py-1 bg-yellow-900/20 rounded border border-yellow-900/50">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>{downloadText || "Loading..."} ({downloadProgress}%)</span>
                </div>
             );
        } else if (!isReady) {
             statusElement = (
                <button onClick={initModel} className="flex items-center gap-2 text-text-secondary hover:text-primary text-[10px] font-bold px-2 py-1 bg-surface rounded border border-border hover:border-primary transition-colors">
                    <Download className="w-3 h-3" />
                    <span>Load Engine</span>
                </button>
             );
        } else {
            statusElement = (
                <div className="flex items-center gap-2 text-green-500 text-[10px] font-bold px-2 py-1 bg-green-900/20 rounded border border-green-900/50">
                    <Cpu className="w-3 h-3" />
                    <span>Syd Jr. Active</span>
                </div>
            );
        }
    } else {
        statusElement = (
            <div className="flex items-center gap-2 text-primary text-[10px] font-bold px-2 py-1 bg-primary/10 rounded border border-primary/20">
                <Sparkles className="w-3 h-3" />
                <span>Syd Pro</span>
            </div>
        );
    }

    return (
        <div
            ref={panelRef}
            className="flex flex-col bg-surface border border-primary/30 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-xl ring-1 ring-white/10 transition-opacity duration-200"
            style={panelStyle}
        >
            {/* Header */}
            <div className="h-10 bg-surface-secondary/80 border-b border-border flex items-center justify-between px-3 shrink-0">
                <div className="flex items-center gap-2">
                    {statusElement}
                    {context && (
                        <span className="text-[9px] text-text-muted uppercase tracking-wider font-mono border-l border-white/10 pl-2">
                            {context.agentType.replace(/_/g, ' ')}
                        </span>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="text-text-secondary hover:text-text-primary transition-colors p-1 hover:bg-white/5 rounded"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
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
                    <div className="flex items-center gap-2 text-text-secondary text-xs pl-2 animate-pulse">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-75" />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-150" />
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