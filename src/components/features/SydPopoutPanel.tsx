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
                content: `🟢 Connected to ${context.agentType}. I can see relevant context. Ask me anything!`
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

            // Check if anchor is in viewport of the scroll container
            const isInView = (
                anchorRect.top < containerRect.bottom &&
                anchorRect.bottom > containerRect.top
            );

            if (!isInView) {
                if (anchorRect.top < containerRect.top - 200 || anchorRect.top > containerRect.bottom + 200) {
                    onClose();
                    return;
                }
            }

            const top = anchorRect.top;
            const left = containerRect.right + 16; // 16px gap to the right

            setPanelStyle({
                position: 'fixed',
                top: `${top}px`,
                left: `${left}px`,
                width: '320px',
                maxHeight: '500px',
                opacity: isInView ? 1 : 0,
                pointerEvents: isInView ? 'auto' : 'none',
                transform: 'translateY(0)',
                transition: 'opacity 0.2s ease-out, top 0.1s linear',
                zIndex: 60 // Ensure higher than any other panel or rail
            });

            animationFrameId = requestAnimationFrame(updatePosition);
        };

        // Start loop
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
            className="flex flex-col bg-surface border border-primary/50 rounded-lg shadow-2xl overflow-hidden backdrop-blur-sm"
            style={panelStyle}
        >
            {/* Header */}
            <div className="h-10 bg-surface-secondary border-b border-border flex items-center justify-between px-3 shrink-0">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Syd {tier === 'pro' ? '' : 'Jr.'}</span>
                    {context && (
                        <span className="bg-primary/10 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider opacity-80">
                            {context.agentType}
                        </span>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="text-text-secondary hover:text-text-primary transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px] max-h-[350px] bg-surface/95">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        {msg.role === 'system' ? (
                            <div className="text-[10px] text-text-secondary bg-surface-secondary px-2 py-1 rounded border border-border/50 max-w-[90%] text-center self-center">
                                {msg.content}
                            </div>
                        ) : (
                            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${msg.role === 'user'
                                ? 'bg-primary text-white'
                                : 'bg-surface-secondary border border-border text-text-primary'
                                }`}>
                                {msg.content}
                            </div>
                        )}
                    </div>
                ))}
                {isGenerating && (
                    <div className="flex items-center gap-2 text-text-secondary text-xs pl-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Thinking...</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-2 border-t border-border bg-surface-secondary">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask a question..."
                        disabled={isGenerating}
                        className="flex-1 px-3 py-1.5 bg-surface border border-border rounded text-text-primary text-xs focus:border-primary focus:outline-none disabled:opacity-50"
                        autoFocus
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isGenerating}
                        className="p-1.5 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
};