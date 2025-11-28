/*
 * 🤖 COMPONENT: SCRIPT CHAT (Writer's Room)
 * A sidebar for conversing with the AI about the script.
 * Supports both Cloud (Gemini) and Local (Llama 3) models.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Cpu, Cloud, GraduationCap } from 'lucide-react';
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
  const { isReady, initModel, generateResponse } = useLocalLlm();

  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'model', content: "Hello! I'm your co-writer. I can help brainstorm dialogue, plot points, or format checks. How can I help?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  
  // Model selection state
  // If free, force local. If pro, default to cloud but allow switch.
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
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // LOCAL MODEL CHECK
    if (useLocal && !isReady) {
        setShowDownloadModal(true);
        return;
    }

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      let responseText = "";

      if (useLocal) {
          // --- LOCAL ENGINE ---
          // Format history for Llama
          const history = messages.map(m => ({ 
              role: m.role === 'model' ? 'assistant' : 'user', 
              content: m.content 
          }));
          
          // Construct a context-aware prompt
          // Local models have smaller context windows, so we be concise
          const scriptSnippet = (project.scriptElements || []).slice(-20).map(el => el.content).join('\n');
          const prompt = `
Context (Script snippet):
${scriptSnippet}

User Request: ${userMsg.content}
          `.trim();

          responseText = await generateResponse(prompt, history);

      } else {
          // --- CLOUD ENGINE (Gemini) ---
          const history = messages.map(m => ({ role: m.role, content: m.content }));
          const elements = project.scriptElements || [];
          responseText = await chatWithScript(userMsg.content, history, elements, characters);
      }
      
      const aiMsg: Message = { id: crypto.randomUUID(), role: 'model', content: responseText };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error: any) {
      console.error(error);
      showToast(error.message || "Failed to get response", 'error');
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
             // Keep modal open to show progress
         }} 
      />

      {/* HEADER / TOGGLE */}
      <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-surface-secondary shrink-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">AI Model</div>
          
          {tier === 'free' ? (
              <div className="flex items-center gap-2 px-2 py-1 bg-background border border-border rounded-full text-[10px] text-text-muted cursor-help" title="Free users use local AI">
                  <Cpu className="w-3 h-3" />
                  <span>Local (Llama 3)</span>
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
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
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
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
             <div className="w-8 h-8 rounded-full bg-surface-secondary flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-primary" />
             </div>
             <div className="bg-surface-secondary rounded-lg p-3 flex items-center gap-2 text-text-tertiary text-sm">
                <Loader2 className="w-3 h-3 animate-spin" /> 
                {useLocal ? "Running locally..." : "Thinking..."}
             </div>
          </div>
        )}
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
            placeholder={useLocal && !isReady ? "Model needs to initialize first..." : "Ask for ideas, dialogue..."}
            className="w-full bg-surface-secondary border border-border rounded-lg pl-3 pr-10 py-3 text-sm text-text-primary resize-none outline-none focus:border-primary h-[80px]"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-3 bottom-3 text-primary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {useLocal && !isReady ? <Cpu className="w-4 h-4 animate-pulse" /> : <Send className="w-4 h-4" />}
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