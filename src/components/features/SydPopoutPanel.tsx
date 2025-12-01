import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Send, Loader2, Cpu, Zap } from 'lucide-react';
import { SydContext } from '../../services/sydContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { useLocalLlm } from '../../context/LocalLlmContext'; // IMPORTED

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
    initialMessages = []
}) => {
    const { tier } = useSubscription();
    const { isReady, isDownloading, downloadProgress, downloadText } = useLocalLlm(); // USE CONTEXT
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
    const [inputValue, setInputValue] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({
        top: 0,
        left: 0,
        opacity: 0,
        pointerEvents: 'none'
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // Reset messages when context changes
    useEffect(() => {
        if (initialMessages.length > 0) {
            setMessages(initialMessages);
        } else if (context) {
            setMessages([{
                id: 'system-init',
                role: 'system',
                content: `🟢 Connected to ${context.agentType}. Ask me anything!`
            }]);
        }
    }, [context, initialMessages]);

    // Auto-scroll chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isReady, downloadText]); // Scroll on status change too

    // Scroll-locked positioning logic
    useEffect(() => {
        if (!isOpen || !anchorElement || !scrollContainer) return;

        let animationFrameId: number;

        const updatePosition = () => {
            const anchorRect = anchorElement.getBoundingClientRect();
            const containerRect = scrollContainer.getBoundingClientRect();

            // Check if anchor is in viewport
            const isInView = (
                anchorRect.top < containerRect.bottom &&
                anchorRect.bottom > containerRect.top
            );

            if (!isInView) {
                // If far out of view, close it
                if (anchorRect.top < containerRect.top - 200 || anchorRect.top > containerRect.bottom + 200) {
                    onClose();
                    return;
                }
            }

            const top = Math.min(Math.max(anchorRect.top, 80), window.innerHeight - 520); // Clamp to screen
            
            // Positioning Logic:
            // The StoryPanel is centered/wide. We want this to float to the RIGHT of the content but left of screen edge.
            const containerRight = containerRect.right;
            const screenWidth = window.innerWidth;
            
            // Default: Float to the right of the anchor
            let left = anchorRect.right + 20;
            
            // Collision detection: If it goes off screen, flip to left? 
            // Or just pin to right edge of container.
            if (left + 340 > screenWidth) {
                left = anchorRect.left - 360; // Flip to left
            }

            setPanelStyle({
                position: 'fixed',
                top: `${top}px`,
                left: `${left}px`, 
                width: '340px',
                maxHeight: '500px',
                opacity: isInView ? 1 : 0,
                pointerEvents: isInView ? 'auto' : 'none',
                transform: 'translateY(0)',
                zIndex: 100 // High z-index to float above everything
            });

            animationFrameId = requestAnimationFrame(updatePosition);
        };

        updatePosition();

        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [isOpen, anchorElement, scrollContainer, onClose]);

    const handleSend = async () => {
        if (!inputValue.trim() || isGenerating) return;

        // Block if local model not ready
        if (tier === 'free' && !isReady) return;

        const userMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: inputValue
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsGenerating(true);

        try {
            const response = await onSendMessage(inputValue);
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: response
            }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                role: 'system',
                content: 'Error generating response. Please try again.'
            }]);
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen) return null;

    // Determine Status Indicator
    let statusIcon = <Sparkles className="w-4 h-4" />;
    let statusText = "Syd";
    let statusClass = "text-primary";

    if (tier === 'free') {
        if (isReady) {
            statusIcon = <Cpu className="w-4 h-4" />;
            statusText = "Syd Jr. (Ready)";
            statusClass = "text-green-500";
        } else if (isDownloading) {
            statusIcon = <Loader2 className="w-4 h-4 animate-spin" />;
            statusText = "Warming Up...";
            statusClass = "text-yellow-500";
        } else {
            statusIcon = <Zap className="w-4 h-4 text-gray-400" />;
            statusText = "Offline";
            statusClass = "text-gray-500";
        }
    }

    return (
        <div
            ref={panelRef}
            className="flex flex-col bg-surface border border-primary/30 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl ring-1 ring-black/10"
            style={panelStyle}
        >
            {/* Header */}
            <div className="h-12 bg-surface-secondary/80 border-b border-border flex items-center justify-between px-4 shrink-0">
                <div className={`flex items-center gap-2 text-xs font-bold ${statusClass}`}>
                    {statusIcon}
                    <span>{statusText}</span>
                    {context && (
                        <span className="bg-primary/10 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider opacity-80 border border-primary/20 text-primary">
                            {context.agentType.replace(/_/g, ' ')}
                        </span>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="text-text-secondary hover:text-text-primary transition-colors p-1 hover:bg-white/5 rounded"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[250px] max-h-[400px] bg-background/80">
                
                {/* WARMUP STATUS INDICATOR (IN CHAT) */}
                {tier === 'free' && !isReady && (
                    <div className="flex flex-col items-center justify-center py-6 gap-3 animate-pulse opacity-80">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <div className="text-center">
                            <p className="text-xs font-bold text-text-primary">{downloadText || "Initializing..."}</p>
                            <p className="text-[10px] text-text-secondary mt-1">This runs locally on your GPU.</p>
                            {downloadProgress > 0 && downloadProgress < 100 && (
                                <div className="w-32 h-1 bg-surface-secondary rounded-full mt-2 overflow-hidden border border-border">
                                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${downloadProgress}%` }} />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {messages.map(msg => (
                    <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        {msg.role === 'system' ? (
                            <div className="text-[10px] text-text-secondary bg-surface-secondary px-3 py-1.5 rounded-full border border-border/50 max-w-[90%] text-center self-center shadow-sm">
                                {msg.content}
                            </div>
                        ) : (
                            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-sm leading-relaxed ${msg.role === 'user'
                                ? 'bg-primary text-white rounded-br-none'
                                : 'bg-surface border border-border text-text-primary rounded-bl-none'
                                }`}>
                                {msg.content}
                            </div>
                        )}
                    </div>
                ))}
                {isGenerating && (
                    <div className="flex items-center gap-2 text-text-secondary text-xs pl-2">
                        <Loader2 className="w-3 h-3 animate-spin text-primary" />
                        <span className="animate-pulse">Syd is writing...</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border bg-surface-secondary">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={!isReady && tier === 'free' ? "Waiting for engine..." : "Type instructions..."}
                        disabled={isGenerating || (tier === 'free' && !isReady)}
                        className="flex-1 px-4 py-2 bg-surface border border-border rounded-lg text-text-primary text-xs focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none disabled:opacity-50 transition-all placeholder:text-text-muted"
                        autoFocus
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isGenerating || (tier === 'free' && !isReady)}
                        className="p-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};