/*
 * 🤖 COMPONENT: SCRIPT CHAT (Writer's Room)
 * Optimized for Local LLM Streaming & Context Management
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Cpu, Cloud, GraduationCap, AlertTriangle, Eraser } from 'lucide-react';
import { useWorkspace } from '../../layouts/WorkspaceLayout';
import { chatWithScript } from '../../services/gemini';
import { getCharacters } from '../../services/storage';
import { Character } from '../../types';
import { useSubscription } from '../../context/SubscriptionContext';
import { useLocalLlm } from '../../context/LocalLlmContext';
import { ModelDownloadModal } from '../ui/ModelDownloadModal';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
}

interface ScriptChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScriptChat: React.FC<ScriptChatProps> = ({ isOpen, onClose }) => {
  const { project, showToast } = useWorkspace();
  const { tier } = useSubscription();
  const { isReady, initModel, streamResponse, isSupported, isModelCached, isCheckingCache } = useLocalLlm();

  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'model', content: "Hello! I'm your co-writer. I can help brainstorm dialogue, plot points, or format checks. How can I help?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  
  // Model selection state
  const [useLocal, setUseLocal] = useState(tier === 'free');
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Enforce local for free tier
  useEffect(() => {
    if (tier === 'free') {
        setUseLocal(true);
    }
  }, [tier]);

  useEffect(() => {
    if (isOpen) {
      getCharacters(project.id).then(setCharacters);
    }
  }, [isOpen, project.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto-close modal when ready
  useEffect(() => {
      if (isReady && showDownloadModal) {
          setShowDownloadModal(false);
      }
  }, [isReady, showDownloadModal]);

  const handleClearChat = () => {
      setMessages([
        { id: 'welcome', role: 'model', content: "Chat cleared. Ready for new ideas." }
      ]);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // LOCAL MODEL CHECK
    if (useLocal) {
        if (!isSupported) {
            showToast("WebGPU not supported on this device.", 'error');
            return;
        }
        
        // --- SEAMLESS INIT LOGIC ---
        if (!isReady) {
            if (isModelCached) {
                // Scenario A: Cached -> Seamless Warmup
                const warmupId = crypto.randomUUID();
                setMessages(prev => [...prev, { id: warmupId, role: 'model', content: 'Warmup: Loading AI engine...' }]);
                
                try {
                    await initModel();
                } catch(e: any) {
                    showToast(e.message || "Failed to initialize AI", 'error');
                    setMessages(prev => prev.filter(m => m.id !== warmupId));
                    return;
                }
                setMessages(prev => prev.filter(m => m.id !== warmupId));
            } else {
                // Scenario B: Not Cached -> Permission Modal
                setShowDownloadModal(true);
                return;
            }
        }
    }

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Create placeholder for AI response immediately
    const aiMsgId = crypto.randomUUID();
    const aiMsg: Message = { id: aiMsgId, role: 'model', content: '' };
    setMessages(prev => [...prev, aiMsg]);

    try {
      if (useLocal) {
          // --- LOCAL ENGINE (STREAMING) ---
          
          // CONTEXT OPTIMIZATION:
          // Only inject the heavy script context if this is the FIRST user message in the session.
          // For follow-ups, the AI relies on the conversation history (which contains previous context).
          const isFirstUserMessage = messages.filter(m => m.role === 'user').length === 0;
          
          let prompt = "";

          if (isFirstUserMessage) {
              // 1. Build Character Context
              const charContext = characters.length > 0 
                ? "CHARACTERS:\n" + characters.map(c => `- ${c.name.toUpperCase()}: ${c.description}`).join('\n')
                : "";

              // 2. Build Scene Context (Smart Slice)
              // Instead of just "last 30 lines", try to grab the *current scene* content.
              const elements = project.scriptElements || [];
              let startIndex = Math.max(0, elements.length - 50); // Default fallback
              
              // Find the start of the current scene (searching backwards from end)
              for (let i = elements.length - 1; i >= 0; i--) {
                  if (elements[i].type === 'scene_heading') {
                      startIndex = i;
                      break; 
                  }
              }

              const scriptSnippet = elements.slice(startIndex).map(el => {
                 if (el.type === 'character') return `\n${el.content.toUpperCase()}`;
                 if (el.type === 'scene_heading') return `\n\n${el.content.toUpperCase()}`;
                 if (el.type === 'parenthetical') return `(${el.content})`;
                 return el.content;
              }).join('\n');

              prompt = `
You are a helpful screenwriting assistant.
${charContext}

CURRENT SCRIPT CONTEXT (Use for reference):
${scriptSnippet}

INSTRUCTION: ${userMsg.content}
              `.trim();
          } else {
              // Follow-up: Just send the instruction. History handles context.
              prompt = userMsg.content;
          }

          // Stream the response
          await streamResponse(prompt, messages.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.content })), (chunk) => {
              setMessages(prev => prev.map(m => 
                  m.id === aiMsgId ? { ...m, content: m.content + chunk } : m
              ));
              setIsLoading(false);
          });

      } else {
          // --- CLOUD ENGINE (Gemini - Non-Streaming) ---
          const history = messages.map(m => ({ role: m.role, content: m.content }));
          const elements = project.scriptElements || [];
          const responseText = await chatWithScript(userMsg.content, history, elements, characters);
          
          setMessages(prev => prev.map(m => 
              m.id === aiMsgId ? { ...m, content: responseText } : m
          ));
      }
    } catch (error: any) {
      console.error(error);
      showToast(error.message || "Failed to get response", 'error');
      setMessages(prev => prev.filter(m => m.id !== aiMsgId));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full bg-surface w-full relative">
      <ModelDownloadModal 
         isOpen={showDownloadModal} 
         onClose={() => setShowDownloadModal(false)} 
         onConfirm={() => {
             initModel();
         }} 
      />

      {/* HEADER / TOGGLE */}
      <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-surface-secondary shrink-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">AI Model</div>
          
          <div className="flex items-center gap-2">
              {tier === 'free' ? (
                  <div className={`flex items-center gap-2 px-2 py-1 bg-background border rounded-full text-[10px] cursor-help transition-colors ${!isSupported ? 'border-red-900/50 text-red-400' : 'border-border text-text-muted'}`} title="Free users use local AI">
                      {isCheckingCache ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                      ) : isSupported ? (
                          <Cpu className="w-3 h-3" />
                      ) : (
                          <AlertTriangle className="w-3 h-3" />
                      )}
                      <span>
                          {isCheckingCache ? 'Checking...' : isSupported ? 'Local (Llama 3)' : 'Unsupported'}
                      </span>
                      <GraduationCap className="w-3 h-3 text-text-muted ml-1" />
                  </div>
              ) : (
                  <div className="flex bg-background rounded-sm p-0.5 border border-border">
                      <button 
                        onClick={() => setUseLocal(false)}
                        className={`px-2 py-1 rounded-sm text-[10px] font-bold flex items-center gap-1 transition-colors ${!useLocal ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                      >
                          <Cloud className="w-3 h-3" /> Gemini
                      </button>
                      <button 
                        onClick={() => setUseLocal(true)}
                        className={`px-2 py-1 rounded-sm text-[10px] font-bold flex items-center gap-1 transition-colors ${useLocal ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                      >
                          <Cpu className="w-3 h-3" /> Local
                      </button>
                  </div>
              )}
              
              <button 
                onClick={handleClearChat}
                className="p-1.5 hover:bg-surface rounded text-text-tertiary hover:text-text-primary transition-colors ml-1"
                title="Clear Chat History"
              >
                  <Eraser className="w-3.5 h-3.5" />
              </button>
          </div>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
        {useLocal && !isSupported && (
            <div className="bg-red-900/20 border border-red-900/50 p-3 rounded-lg flex gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                <div className="text-xs text-red-200">
                    <strong className="block mb-1">Hardware Unsupported</strong>
                    Your browser does not support WebGPU. Please use Chrome/Edge on Desktop.
                </div>
            </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-primary text-white' : 'bg-surface-secondary text-primary'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div className={`max-w-[85%] rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user' 
                ? 'bg-primary/20 text-text-primary border border-primary/30' 
                : 'bg-surface-secondary text-text-primary border border-border'
            }`}>
              {!msg.content && msg.role === 'model' && isLoading ? (
                 <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                 </span>
              ) : msg.content}
            </div>
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT */}
      <div className="p-4 border-t border-border bg-surface shrink-0">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
                useLocal 
                  ? isCheckingCache 
                      ? "Checking AI status..." 
                      : !isReady && !isModelCached 
                          ? "Model download required..." 
                          : "Ask for ideas, dialogue..." 
                  : "Ask for ideas, dialogue..."
            }
            disabled={useLocal && (!isSupported || isCheckingCache)}
            className="w-full bg-surface-secondary border border-border rounded-lg pl-3 pr-10 py-3 text-sm text-text-primary resize-none outline-none focus:border-primary h-[80px] disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading || (useLocal && (!isSupported || isCheckingCache))}
            className="absolute right-3 bottom-3 text-primary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {useLocal && isCheckingCache ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : useLocal && !isReady && !isModelCached ? (
                <Cpu className="w-4 h-4 animate-pulse" />
            ) : (
                <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        
        {useLocal && (
            <div className="text-[9px] text-text-muted mt-2 text-center flex items-center justify-center gap-1">
                <Cpu className="w-3 h-3" />
                Processing entirely on your device. Private & Offline.
            </div>
        )}
      </div>
    </div>
  );
};