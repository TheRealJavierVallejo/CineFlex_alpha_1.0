import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Send, Loader2 } from 'lucide-react';
import { SydContext } from '../../services/sydContext';
import { useSubscription } from '../../context/SubscriptionContext';

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
    }, [messages]);

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
            const left = anchorRect.left - 340; // Position to the LEFT of the anchor (since rail is on right usually, but wait, rail is on LEFT)
            
            // Correction: Rail is on the left. StoryPanel is at left: 50px.
            // Width of StoryPanel is ~400px (or 600px).
            // So we want Syd to pop out to the RIGHT of the Story Panel.
            // Story Panel right edge is roughly 50 + 600 = 650px.
            
            // Let's assume anchor is inside the panel.
            // We want the popout to float to the RIGHT of the panel to avoid covering text.
            const panelRightEdge = containerRect.right;
            const targetLeft = panelRightEdge + 20;

            setPanelStyle({
                position: 'fixed',
                top: `${top}px`,
                left: `${targetLeft}px`, 
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

    return (
        <div
            ref={panelRef}
            className="flex flex-col bg-surface border border-primary/50 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl"
            style={panelStyle}
        >
            {/* Header */}
            <div className="h-12 bg-surface-secondary border-b border-border flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-2 text-xs font-bold text-primary">
                    <Sparkles className="w-4 h-4" />
                    <span>Syd {tier === 'pro' ? '' : 'Jr.'}</span>
                    {context && (
                        <span className="bg-primary/10 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider opacity-80 border border-primary/20">
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
                        placeholder="Type instructions..."
                        disabled={isGenerating}
                        className="flex-1 px-4 py-2 bg-surface border border-border rounded-lg text-text-primary text-xs focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none disabled:opacity-50 transition-all placeholder:text-text-muted"
                        autoFocus
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isGenerating}
                        className="p-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};