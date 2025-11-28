/*
 * 🤖 COMPONENT: SCRIPT CHAT (Writer's Room)
 * A sidebar for conversing with the AI about the script.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2, X } from 'lucide-react';
import { useWorkspace } from '../../layouts/WorkspaceLayout';
import { chatWithScript } from '../../services/gemini';
import { getCharacters } from '../../services/storage';
import { Character } from '../../types';

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
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'model', content: "Hello! I'm your co-writer. I've read your script context. How can I help you today? Need dialogue ideas or a plot twist?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const elements = project.scriptElements || [];
      const responseText = await chatWithScript(userMsg.content, history, elements, characters);
      const aiMsg: Message = { id: crypto.randomUUID(), role: 'model', content: responseText };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      showToast("Failed to get response", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full bg-surface w-full">
      
      {/* Messages Area */}
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
                <Loader2 className="w-3 h-3 animate-spin" /> Thinking...
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
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
            placeholder="Ask for ideas, dialogue..."
            className="w-full bg-surface-secondary border border-border rounded-lg pl-3 pr-10 py-3 text-sm text-text-primary resize-none outline-none focus:border-primary h-[80px]"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-3 bottom-3 text-primary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};