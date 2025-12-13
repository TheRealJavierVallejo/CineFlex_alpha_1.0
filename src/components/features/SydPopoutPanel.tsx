import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Send, Loader2, Cpu, Zap, AlertCircle, Download, BrainCircuit, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SydContext } from '../../services/sydContext';
import { classifyGeminiError, estimateConversationTokens } from '../../services/gemini';
import { chatWithClaudeStreaming, classifyClaudeError, estimateClaudeConversationTokens } from '../../services/claude';
import { detectFrustrationPatterns, buildEnhancedSystemPrompt } from '../../services/sydCommunicationProtocol';
import { useSubscription } from '../../context/SubscriptionContext';
import { useLocalLlm } from '../../context/LocalLlmContext';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
}

// Session management for conversation memory
interface ChatSession {
    id: string;
    agentType: string;
    messages: ChatMessage[];
    contextSnapshot: SydContext | null;
    startedAt: Date;
}

// Sliding window helper - keep last N turns (user + assistant pairs)
const getRecentHistory = (messages: ChatMessage[], maxTurns: number = 15, isProMode: boolean = false): ChatMessage[] => {
    // Pro mode: Return ALL conversation history (Claude 200K context)
    if (isProMode) {
        return messages.filter(msg => msg.role !== 'system');
    }

    // Free mode: Keep existing 15-turn sliding window for local models
    const conversationMessages = messages.filter(msg => msg.role !== 'system');

    // Keep only last maxTurns * 2 messages (user + assistant pairs)
    const maxMessages = maxTurns * 2;
    if (conversationMessages.length <= maxMessages) {
        return conversationMessages;
    }

    return conversationMessages.slice(-maxMessages);
};

interface SydPopoutPanelProps {
    isOpen: boolean;
    context: SydContext | null;
    anchorElement: HTMLElement | null;
    scrollContainer: HTMLElement | null;
    onClose: () => void;
    onSendMessage: (message: string, messageHistory?: Array<{ role: string, content: string }>) => Promise<string>;
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

    // Session management for conversation memory
    const [currentSession, setCurrentSession] = useState<ChatSession>({
        id: crypto.randomUUID(),
        agentType: '',
        messages: [],
        contextSnapshot: null,
        startedAt: new Date()
    });

    // Token usage tracking for Pro tier display
    const [estimatedTokens, setEstimatedTokens] = useState(0);

    // Streaming response tracking
    const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

    // Track current position to avoid redundant state updates
    const currentPos = useRef({ top: 0, left: 0, visible: false });
    const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({
        top: 0, left: 0, opacity: 0, pointerEvents: 'none', position: 'fixed', width: '340px', maxHeight: '500px', zIndex: 100
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // 1. Initialize / Reset Chat based on Context ID & Readiness
    // Reset session when switching agents, preserve conversation within same agent
    useEffect(() => {
        if (!context) return;

        const agentType = context.agentType;

        // If this is a different agent than before, reset the entire session
        if (agentType !== activeAgentType) {
            setActiveAgentType(agentType);

            // Create fresh session for new agent
            const newSession: ChatSession = {
                id: crypto.randomUUID(),
                agentType: agentType,
                messages: [],
                contextSnapshot: context,
                startedAt: new Date()
            };
            setCurrentSession(newSession);
            setMessages([]);
        }

        // If parent provided initial messages, restore them
        if (initialMessages && initialMessages.length > 0) {
            setMessages(initialMessages);
            setCurrentSession(prev => ({ ...prev, messages: initialMessages }));
            return;
        }

        // While the local model is still warming up, show empty chat
        if (tier === 'free' && !isReady) {
            return;
        }

        // When ready, inject a friendly assistant greeting if empty
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

            const greetingMsg: ChatMessage = {
                id: `assistant-init-${Date.now()}`,
                role: 'assistant',
                content: greeting,
            };

            // Update session with greeting
            setCurrentSession(prev => ({
                ...prev,
                messages: [greetingMsg],
                contextSnapshot: context
            }));

            return [greetingMsg];
        });
    }, [context, activeAgentType, initialMessages, isReady, tier]);

    // 2. Auto-scroll on new messages or status changes
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length, isReady, downloadText, isGenerating]);

    // 3. Calculate token usage for Pro tier display (Claude 200K context)
    useEffect(() => {
        if (tier !== 'pro' || messages.length === 0) {
            setEstimatedTokens(0);
            return;
        }

        const recentHistory = getRecentHistory(messages);
        const historyFormatted = recentHistory.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
        }));

        const systemPrompt = context?.systemPrompt || '';
        const fullProjectContext = context?.contextFields?.fullProjectContext || '';
        const total = estimateClaudeConversationTokens(historyFormatted, systemPrompt, fullProjectContext);

        setEstimatedTokens(total);
    }, [messages, context, tier]);

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

        const userMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: inputValue
        };

        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        setInputValue('');
        setIsGenerating(true);

        try {
            // Get recent history with sliding window (last 15 turns)
            const recentHistory = getRecentHistory(updatedMessages, 15, tier === 'pro');

            // Convert to format expected by API
            // Claude uses 'assistant' role (same as ChatMessage)
            const conversationHistory = recentHistory.map(msg => ({
                role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
                content: msg.content
            }));

            // Debug logging to verify model selection
            console.log('[SYD AGENT] Tier:', tier, '| Will use:', tier === 'pro' ? 'Claude 3.5 Sonnet' : 'Local Phi Model');

            // For Pro tier, ALWAYS use Claude streaming (regardless of context state)
            if (tier === 'pro') {
                console.log('[SYD AGENT - PRO PATH] Using Claude streaming for Pro tier');
                console.log('[SYD AGENT - PRO PATH] Context system prompt exists:', !!context?.systemPrompt);
                console.log('[SYD AGENT - PRO PATH] Context system prompt exists:', !!context?.systemPrompt);
                console.log('[SYD AGENT - PRO PATH] Full context object:', context);

                // Verify API configuration
                const apiKey = localStorage.getItem('cineflex_claude_api_key') || import.meta.env.VITE_CLAUDE_API_KEY || 'NOT_SET';
                console.log('[SYD API CHECK] Key starts with:', apiKey.substring(0, 10));
                console.log('[SYD API CHECK] Is Claude key (sk-ant-):', apiKey.startsWith('sk-ant-'));

                // Fallbacks for missing context values
                const baseSystemPrompt = context?.systemPrompt || 'You are Syd, a professional screenwriting assistant helping with screenplay development.';
                const fullProjectContext = context?.contextFields?.fullProjectContext || '';
                const temperature = context?.temperature || 0.7;
                const maxTokens = context?.maxOutputTokens || 800;

                // Analyze conversation for frustration patterns
                // This detects if user has been correcting the agent or seems frustrated
                const frustrationAnalysis = detectFrustrationPatterns(
                    updatedMessages.map(m => ({ role: m.role, content: m.content }))
                );

                // Log frustration detection for debugging
                if (frustrationAnalysis.shouldInjectAlert) {
                    console.log('[SYD AGENT - PRO PATH] Frustration detected:', {
                        apologies: frustrationAnalysis.recentApologyCount,
                        keywords: frustrationAnalysis.frustrationKeywords
                    });
                }

                // Build enhanced system prompt (adds frustration alert if needed)
                const systemPrompt = buildEnhancedSystemPrompt(baseSystemPrompt, frustrationAnalysis);

                console.log('[SYD AGENT - PRO PATH] Using systemPrompt:', systemPrompt.substring(0, 100) + '...');

                const assistantMsgId = crypto.randomUUID();
                const assistantMsg: ChatMessage = {
                    id: assistantMsgId,
                    role: 'assistant',
                    content: ''
                };

                // Add placeholder message for streaming
                setMessages([...updatedMessages, assistantMsg]);
                setStreamingMessageId(assistantMsgId);

                try {
                    const fullResponse = await chatWithClaudeStreaming(
                        inputValue,
                        conversationHistory,
                        systemPrompt,
                        fullProjectContext,
                        (chunk: string) => {
                            // Update the streaming message with each chunk
                            setMessages(prev => prev.map(msg =>
                                msg.id === assistantMsgId
                                    ? { ...msg, content: msg.content + chunk }
                                    : msg
                            ));
                        },
                        {
                            temperature: temperature,
                            maxTokens: maxTokens,
                            useCache: true // Enable prompt caching for cost savings
                        }
                    );

                    // Finalize the message
                    setStreamingMessageId(null);
                    setMessages(prev => prev.map(msg =>
                        msg.id === assistantMsgId
                            ? { ...msg, content: fullResponse }
                            : msg
                    ));

                    // Update session
                    const finalMessages = [...updatedMessages, { ...assistantMsg, content: fullResponse }];
                    setCurrentSession(prev => ({
                        ...prev,
                        messages: finalMessages
                    }));

                } catch (streamError: any) {
                    // Streaming failed, update placeholder with error
                    setStreamingMessageId(null);
                    const classified = classifyClaudeError(streamError);
                    setMessages(prev => prev.map(msg =>
                        msg.id === assistantMsgId
                            ? { ...msg, role: 'system', content: classified.userMessage }
                            : msg
                    ));
                }
            } else {
                // Free tier ONLY: use non-streaming via callback
                console.log('[SYD AGENT - FREE PATH] Using local model callback for Free tier');
                console.log('[SYD AGENT - FREE PATH] Tier value was:', tier, '(expected: free)');
                const response = await onSendMessage(inputValue, conversationHistory);

                const assistantMsg: ChatMessage = {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content: response
                };

                const finalMessages = [...updatedMessages, assistantMsg];
                setMessages(finalMessages);

                // Update session with new messages
                setCurrentSession(prev => ({
                    ...prev,
                    messages: finalMessages
                }));
            }

        } catch (error: any) {
            // Use error classification for user-friendly messages
            // Pro tier uses Claude - classify Claude errors
            const classified = tier === 'pro' ? classifyClaudeError(error) : classifyGeminiError(error);
            const errorMsg: ChatMessage = {
                id: crypto.randomUUID(),
                role: 'system',
                content: classified.userMessage
            };
            setMessages(prev => [...prev, errorMsg]);
            setStreamingMessageId(null);
        } finally {
            setIsGenerating(false);
            setStreamingMessageId(null);
        }
    };

    // Clear conversation and start fresh
    const handleClearConversation = () => {
        const newSession: ChatSession = {
            id: crypto.randomUUID(),
            agentType: currentSession.agentType,
            messages: [],
            contextSnapshot: currentSession.contextSnapshot,
            startedAt: new Date()
        };

        setCurrentSession(newSession);
        setMessages([]);

        // Re-inject greeting based on agent type
        let greeting = 'How can I help with this?';
        const agentType = currentSession.agentType;
        if (agentType.startsWith('beat_')) {
            greeting = 'How can I help with this beat?';
        } else if (agentType.startsWith('character_')) {
            greeting = 'How can I help with this character?';
        } else if (agentType === 'title') {
            greeting = 'Need help brainstorming titles?';
        } else if (agentType === 'logline') {
            greeting = 'Shall we work on the logline?';
        }

        const greetingMsg: ChatMessage = {
            id: `assistant-init-${Date.now()}`,
            role: 'assistant',
            content: greeting,
        };

        setMessages([greetingMsg]);
        setCurrentSession(prev => ({ ...prev, messages: [greetingMsg] }));
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
                    <div className="flex items-center gap-1">
                        {/* Clear Conversation Button */}
                        <button
                            onClick={handleClearConversation}
                            className="text-text-secondary hover:text-text-primary transition-colors p-1 hover:bg-white/5 rounded"
                            title="Clear conversation"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="text-text-secondary hover:text-text-primary transition-colors p-1 hover:bg-white/5 rounded"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Status Bar */}
                {statusElement}

                {/* Token Usage Bar - Pro tier only, after 2+ messages */}
                {tier === 'pro' && messages.length > 2 && (
                    <div className="px-2.5 py-1.5 mt-2">
                        <div className="flex items-center justify-between text-[9px] text-text-muted">
                            <span>Context</span>
                            <span className={`font-mono ${estimatedTokens > 150000 ? 'text-yellow-400' : ''} ${estimatedTokens > 180000 ? 'text-red-400' : ''}`}>
                                ~{estimatedTokens.toLocaleString()} / 200K tokens
                            </span>
                        </div>
                        <div className="w-full bg-surface-secondary rounded-full h-1 mt-1 overflow-hidden">
                            <div
                                className={`h-full transition-all duration-300 ${estimatedTokens > 180000 ? 'bg-red-500' :
                                    estimatedTokens > 150000 ? 'bg-yellow-500' :
                                        'bg-primary'
                                    }`}
                                style={{ width: `${Math.min((estimatedTokens / 200000) * 100, 100)}%` }}
                            />
                        </div>
                    </div>
                )}
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
                        ) : msg.role === 'user' ? (
                            /* User messages stay as plain text */
                            <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-sm leading-relaxed whitespace-pre-wrap bg-primary text-white rounded-br-sm">
                                {msg.content}
                            </div>
                        ) : (
                            /* Assistant messages get markdown rendering */
                            <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-sm leading-relaxed bg-surface border border-border text-text-primary rounded-bl-sm">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                        strong: ({ children }) => <strong className="font-bold text-primary">{children}</strong>,
                                        em: ({ children }) => <em className="italic">{children}</em>,
                                        code: ({ children }) => <code className="bg-black/20 px-1.5 py-0.5 rounded text-[11px] font-mono">{children}</code>,
                                        ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>,
                                        ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>,
                                        li: ({ children }) => <li className="ml-1">{children}</li>,
                                        a: ({ href, children }) => <a href={href} className="text-primary underline hover:opacity-80" target="_blank" rel="noopener noreferrer">{children}</a>,
                                    }}
                                >
                                    {msg.content}
                                </ReactMarkdown>
                                {/* Streaming cursor indicator */}
                                {streamingMessageId === msg.id && (
                                    <span className="inline-block w-1.5 h-3 bg-primary ml-1 animate-pulse" />
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {/* Generating indicator - only show for non-streaming (free tier) */}
                {isGenerating && !streamingMessageId && (
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