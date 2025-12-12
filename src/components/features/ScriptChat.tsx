
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Cpu, Cloud, GraduationCap, AlertTriangle, Eraser, Plus, History, Trash2, MessageSquare, X } from 'lucide-react';
import { useWorkspace } from '../../layouts/WorkspaceLayout';
import { chatWithScriptDurable } from '../../services/gemini';
import { getCharacters, getStoryNotes } from '../../services/storage';
import { createNewThreadForProject, listThreadsForProject, listMessagesForThread, appendMessage, deleteThread } from '../../services/sydChatStore';
import { Character, StoryNote, SydMessage, SydThread } from '../../types';
import { useSubscription } from '../../context/SubscriptionContext';
import { useLocalLlm } from '../../context/LocalLlmContext';
import { ModelDownloadModal } from '../ui/ModelDownloadModal';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
}

interface ScriptChatProps {
  onClose: () => void;
}

export const ScriptChat: React.FC<ScriptChatProps> = ({ onClose }) => {
  const { project, showToast } = useWorkspace();
  const { tier } = useSubscription();
  const { isReady, initModel, streamResponse, isSupported, isModelCached, isCheckingCache } = useLocalLlm();

  const initialWelcomeMsg = tier === 'pro'
    ? "Hello, I'm SYD. I've read your entire script. What are we working on?"
    : "Hi! I'm SYD Jr. I'm running offline on your computer. Let's write!";

  // State
  const [threads, setThreads] = useState<SydThread[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  // showThreadLibrary state removed as it is now permanent

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [storyNotes, setStoryNotes] = useState<StoryNote[]>([]);

  const [useLocal, setUseLocal] = useState(tier === 'free');
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Enforce local for free tier
  useEffect(() => {
    if (tier === 'free') {
      setUseLocal(true);
    }
  }, [tier]);

  // Load Context & Threads on Mount
  useEffect(() => {
    if (project?.id) {
      getCharacters(project.id).then(setCharacters);
      getStoryNotes(project.id).then(data => setStoryNotes(data.notes));

      loadThreads(project.id);
    }
  }, [project?.id]); // Removed isOpen dependency

  const loadThreads = async (pid: string) => {
    try {
      const list = await listThreadsForProject(pid);
      if (list.length === 0) {
        // Auto-create first thread
        const newThread = await createNewThreadForProject(pid);
        setThreads([newThread]);
        setThreadId(newThread.id);
        setMessages([{ id: 'welcome', role: 'model', content: initialWelcomeMsg }]);
      } else {
        setThreads(list);
        // Default to most recent if not set, or keep current
        if (!threadId) {
          setThreadId(list[0].id);
          loadMessages(list[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load threads", e);
      showToast("Could not load chat threads", "error");
    }
  };

  const loadMessages = async (tid: string) => {
    try {
      setMessages([]); // clear current view
      const dbMessages = await listMessagesForThread(tid);
      if (dbMessages.length > 0) {
        const uiMessages: Message[] = dbMessages.map(m => ({
          id: m.id,
          role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
          content: m.content.text
        })).filter(m => m.role === 'user' || m.role === 'model');
        setMessages(uiMessages);
      } else {
        setMessages([{ id: 'welcome', role: 'model', content: initialWelcomeMsg }]);
      }
    } catch (e) {
      console.error("Failed to load messages", e);
      showToast("Could not load chat messages", "error");
    }
  };

  const handleNewChat = async () => {
    if (!project?.id) return;
    try {
      const newThread = await createNewThreadForProject(project.id);
      setThreads(prev => [newThread, ...prev]);
      setThreadId(newThread.id);
      setMessages([{ id: 'welcome', role: 'model', content: initialWelcomeMsg }]);
    } catch (e) {
      showToast("Failed to create new chat", 'error');
    }
  };

  const handleSelectThread = (tid: string) => {
    setThreadId(tid);
    loadMessages(tid);
  };

  const handleDeleteThread = async (e: React.MouseEvent, tid: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this conversation?")) return;

    try {
      await deleteThread(tid);
      setThreads(prev => prev.filter(t => t.id !== tid));
      if (threadId === tid) {
        setThreadId(null);
        setMessages([]);
        const remaining = threads.filter(t => t.id !== tid);
        if (remaining.length > 0) {
          setThreadId(remaining[0].id);
          loadMessages(remaining[0].id);
        } else if (project?.id) {
          handleNewChat();
        }
      }
      showToast("Conversation deleted", 'success');
    } catch (e) {
      showToast("Failed to delete thread", 'error');
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isReady && showDownloadModal) {
      setShowDownloadModal(false);
    }
  }, [isReady, showDownloadModal]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    if (!project?.id || !threadId) return;

    if (useLocal) {
      if (!isSupported) {
        showToast("WebGPU not supported.", 'error');
        return;
      }
      if (!isReady) {
        if (isModelCached) {
          const warmupId = crypto.randomUUID();
          setMessages(prev => [...prev, { id: warmupId, role: 'model', content: 'Warmup: Loading AI engine...' }]);
          try {
            await initModel();
          } catch (e: any) {
            showToast(e.message || "Failed to initialize AI", 'error');
            setMessages(prev => prev.filter(m => m.id !== warmupId));
            return;
          }
          setMessages(prev => prev.filter(m => m.id !== warmupId));
        } else {
          setShowDownloadModal(true);
          return;
        }
      }
    }

    const tempId = crypto.randomUUID();
    const userMsg: Message = { id: tempId, role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const aiMsgId = crypto.randomUUID();
    const aiMsg: Message = { id: aiMsgId, role: 'model', content: '' };
    setMessages(prev => [...prev, aiMsg]);

    try {
      if (useLocal) {
        // LOCAL PERSISTENCE
        await appendMessage({
          threadId,
          role: 'user',
          content: { text: userMsg.content }
        });

        const prompt = [
          "You are SYD Jr., an eager writing assistant running locally on the user's device. You are helpful and quick.",
          "",
          `INSTRUCTION: ${userMsg.content}`
        ].join('\n');

        let fullResponse = "";
        await streamResponse(prompt, messages.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.content })), (chunk) => {
          fullResponse += chunk;
          setMessages(prev => prev.map(m =>
            m.id === aiMsgId ? { ...m, content: m.content + chunk } : m
          ));
          // setIsLoading(false); // Can flicker? Better to set false at end.
        });

        if (fullResponse) {
          await appendMessage({
            threadId,
            role: 'assistant',
            content: { text: fullResponse }
          });
        }
      } else {
        // CLOUD PERSISTENCE (via gemini.ts)
        const elements = project.scriptElements || [];
        const result = await chatWithScriptDurable(
          project.id,
          userMsg.content,
          elements,
          characters,
          storyNotes,
          threadId // Pass threadId
        );

        const uiMessages: Message[] = result.messages.map(m => ({
          id: m.id,
          role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
          content: m.content.text
        })).filter(m => m.role === 'user' || m.role === 'model');

        setMessages(uiMessages);
      }
    } catch (error: any) {
      console.error(error);
      showToast(error.message || "Failed to get response", 'error');
      setMessages(prev => prev.filter(m => m.id !== aiMsgId));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-row w-full h-full bg-surface overflow-hidden">
      <ModelDownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        onConfirm={() => initModel()}
      />

      {/* THREAD SIDEBAR (Always Visible) */}
      <div className="w-60 shrink-0 border-r border-border bg-surface-secondary flex flex-col">
        <div className="p-3 border-b border-border font-bold text-xs text-text-secondary uppercase tracking-wider">
          Conversations
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {threads.map(t => (
            <div
              key={t.id}
              onClick={() => handleSelectThread(t.id)}
              className={`group flex items-center justify-between p-2 rounded cursor-pointer text-sm mb-1 ${threadId === t.id ? 'bg-primary/10 text-primary border border-primary/20' : 'hover:bg-background text-text-secondary'} `}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{t.title || 'New Chat'}</div>
                <div className="text-[10px] text-text-muted truncate">
                  {new Date(t.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={(e) => handleDeleteThread(e, t.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                title="Delete Chat"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* HEADER */}
        <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-surface-secondary shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 rounded text-text-tertiary hover:text-text-primary transition-colors"
              title="Close Syd"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
              {tier === 'pro' ? 'SYD (Pro)' : 'SYD Jr. (Local)'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1 px-2 py-1 bg-primary text-white text-[10px] font-bold rounded shadow-sm hover:bg-primary-hover transition-colors"
              title="New Chat"
            >
              <Plus className="w-3 h-3" />
              <span>New</span>
            </button>

            <div className="h-4 w-px bg-border mx-1" />

            {tier === 'free' ? (
              /* Free Tier Indicator */
              <div className={`flex items-center gap-2 px-2 py-1 bg-background border rounded-full text-[10px] cursor-help transition-colors ${!isSupported ? 'border-red-900/50 text-red-400' : 'border-border text-text-muted'} `} title="Free users use local AI">
                {isCheckingCache ? <Loader2 className="w-3 h-3 animate-spin" /> : <Cpu className="w-3 h-3" />}
                <span>{isCheckingCache ? 'Checking...' : isSupported ? 'Offline' : 'Unsupported'}</span>
              </div>
            ) : (
              /* Pro Tier Toggle */
              <div className="flex bg-background rounded-sm p-0.5 border border-border">
                <button onClick={() => setUseLocal(false)} className={`px-2 py-1 rounded-sm text-[10px] font-bold flex items-center gap-1 transition-colors ${!useLocal ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'} `}>
                  <Cloud className="w-3 h-3" /> Gemini
                </button>
                <button onClick={() => setUseLocal(true)} className={`px-2 py-1 rounded-sm text-[10px] font-bold flex items-center gap-1 transition-colors ${useLocal ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'} `}>
                  <Cpu className="w-3 h-3" /> Local
                </button>
              </div>
            )}
          </div>
        </div>

        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''} `}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-surface-secondary text-primary'} `}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`max-w-[85%] rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-primary/20 text-text-primary border border-primary/30' : 'bg-surface-secondary text-text-primary border border-border'} `}>
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
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={useLocal ? "Ask SYD Jr..." : "Ask SYD..."}
              disabled={useLocal && (!isSupported || isCheckingCache)}
              className="w-full bg-surface-secondary border border-border rounded-lg pl-3 pr-10 py-3 text-sm text-text-primary resize-none outline-none focus:border-primary h-[80px] disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || (useLocal && (!isSupported || isCheckingCache))}
              className="absolute right-3 bottom-3 text-primary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          {useLocal && (
            <div className="text-[9px] text-text-muted mt-2 text-center flex items-center justify-center gap-1">
              <Cpu className="w-3 h-3" />
              SYD Jr. runs entirely on your device. Private & Offline.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};