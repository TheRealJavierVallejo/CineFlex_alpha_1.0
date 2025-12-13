import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Cpu, Cloud, Trash2, MessageSquare, X, Copy, Check, Clock, ChevronLeft, ChevronRight, Eraser, Plus, Pencil } from 'lucide-react';
import { useWorkspace } from '../../layouts/WorkspaceLayout';
import { chatWithScriptClaude } from '../../services/scriptClaude';
import { getCharacters, getStoryNotes } from '../../services/storage';
import { createNewThreadForProject, listThreadsForProject, listMessagesForThread, appendMessage, deleteThread } from '../../services/sydChatStore';
import { Character, StoryNote, SydMessage, SydThread } from '../../types';
import { useSubscription } from '../../context/SubscriptionContext';
import { useLocalLlm } from '../../context/LocalLlmContext';
import { ModelDownloadModal } from '../ui/ModelDownloadModal';
import { supabase } from '../../supabaseClient';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  createdAt?: string;
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
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [storyNotes, setStoryNotes] = useState<StoryNote[]>([]);

  const [useLocal, setUseLocal] = useState(tier === 'free');
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const [hasClaudeKey, setHasClaudeKey] = useState<boolean | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkApiKey = async () => {
      if (tier !== 'pro') return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data } = await supabase
          .from('profiles')
          .select('claude_api_key')
          .eq('id', user.id)
          .single();
        
        setHasClaudeKey(!!data?.claude_api_key);
      } catch (error) {
        console.error('Error checking API key:', error);
      }
    };
    
    checkApiKey();
  }, [tier]);

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
  }, [project?.id]);

  // LocalStorage Persistence for Active Thread (Cache)
  useEffect(() => {
    if (project?.id && threadId && messages.length > 0) {
      const key = `syd - chat - history - ${project.id} -${threadId} `;
      localStorage.setItem(key, JSON.stringify(messages));
    }
  }, [messages, project?.id, threadId]);

  const loadThreads = async (pid: string) => {
    try {
      const list = await listThreadsForProject(pid);
      if (list.length === 0) {
        // Auto-create first thread
        const newThread = await createNewThreadForProject(pid);
        setThreads([newThread]);
        setThreadId(newThread.id);
        setMessages([{ id: 'welcome', role: 'model', content: initialWelcomeMsg, createdAt: new Date().toISOString() }]);
      } else {
        setThreads(list);
        // Default to most recent if not set, or keep current
        if (!threadId) {
          setThreadId(list[0].id);
          loadMessages(list[0].id, pid);
        }
      }
    } catch (e) {
      console.error("Failed to load threads", e);
      showToast("Could not load chat threads", "error");
    }
  };

  const loadMessages = async (tid: string, pid?: string) => {
    try {
      setMessages([]); // clear current view

      // Try LocalStorage Cache first for instant load
      const cacheKey = `syd - chat - history - ${pid || project?.id} -${tid} `;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          setMessages(JSON.parse(cached));
        } catch (e) { /* ignore corrupt cache */ }
      }

      // Then fetch robust DB source
      const dbMessages = await listMessagesForThread(tid);
      if (dbMessages.length > 0) {
        const uiMessages: Message[] = dbMessages.map(m => ({
          id: m.id,
          role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
          content: m.content.text,
          createdAt: m.createdAt
        })).filter(m => m.role === 'user' || m.role === 'model');
        setMessages(uiMessages);
      } else if (!cached) {
        setMessages([{ id: 'welcome', role: 'model', content: initialWelcomeMsg, createdAt: new Date().toISOString() }]);
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
      setMessages([{ id: 'welcome', role: 'model', content: initialWelcomeMsg, createdAt: new Date().toISOString() }]);
    } catch (e) {
      showToast("Failed to create new chat", 'error');
    }
  };

  const handleSelectThread = (tid: string) => {
    if (editingThreadId) return; // Prevent switching while editing
    setThreadId(tid);
    loadMessages(tid);
  };

  const handleDeleteThread = async (e: React.MouseEvent, tid: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this conversation?")) return;

    try {
      await deleteThread(tid);

      // Update state correctly with functional update to avoid stale closure
      setThreads(prev => {
        const remaining = prev.filter(t => t.id !== tid);

        // If we deleted the active thread, switch to another
        if (threadId === tid) {
          setThreadId(null);
          setMessages([]);

          if (remaining.length > 0) {
            // Switch to the first available thread
            setTimeout(() => {
              setThreadId(remaining[0].id);
              loadMessages(remaining[0].id);
            }, 0);
          } else if (project?.id) {
            // No threads left, create new one
            handleNewChat();
          }
        }

        return remaining;
      });

      // Clear cache
      if (project?.id) {
        localStorage.removeItem(`syd - chat - history - ${project.id} -${tid} `);
      }

      showToast("Conversation deleted", 'success');
    } catch (e) {
      showToast("Failed to delete thread", 'error');
    }
  };

  const handleStartEdit = (e: React.MouseEvent, thread: SydThread) => {
    e.stopPropagation();
    setEditingThreadId(thread.id);
    setEditingTitle(thread.title);
  };

  const handleSaveEdit = async (threadId: string) => {
    if (!editingTitle.trim()) return;

    try {
      const { openDB } = await import('../../services/storage');
      const db = await openDB();

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('syd_threads', 'readwrite');
        const store = tx.objectStore('syd_threads');
        const getRequest = store.get(threadId);

        getRequest.onsuccess = () => {
          const thread = getRequest.result as SydThread;
          if (thread) {
            const updatedThread = { ...thread, title: editingTitle.trim() };
            store.put(updatedThread);
          }
        };

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      // Update local state
      setThreads(prev => prev.map(t =>
        t.id === threadId ? { ...t, title: editingTitle.trim() } : t
      ));
      setEditingThreadId(null);
    } catch (e) {
      showToast("Failed to rename thread", 'error');
    }
  };

  const handleCancelEdit = () => {
    setEditingThreadId(null);
    setEditingTitle('');
  };

  const handleClearHistory = async () => {
    if (!threadId || !project?.id) return;
    if (!window.confirm("Clear all messages in this chat?")) return;

    try {
      await deleteThread(threadId);
      // Clear cache
      localStorage.removeItem(`syd - chat - history - ${project.id} -${threadId} `);

      const newThread = await createNewThreadForProject(project.id);
      setThreads(prev => prev.map(t => t.id === threadId ? newThread : t)); // Replace in list
      setThreadId(newThread.id);
      setMessages([{ id: 'welcome', role: 'model', content: initialWelcomeMsg, createdAt: new Date().toISOString() }]);
      showToast("Chat history cleared", 'success');
    } catch (e) {
      showToast("Failed to clear history", 'error');
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
    const userMsg: Message = { id: tempId, role: 'user', content: input, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const aiMsgId = crypto.randomUUID();
    const aiMsg: Message = { id: aiMsgId, role: 'model', content: '', createdAt: new Date().toISOString() };
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
          `INSTRUCTION: ${userMsg.content} `
        ].join('\n');

        let fullResponse = "";
        await streamResponse(prompt, messages.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.content })), (chunk) => {
          fullResponse += chunk;
          setMessages(prev => prev.map(m =>
            m.id === aiMsgId ? { ...m, content: m.content + chunk } : m
          ));
        });

        if (fullResponse) {
          await appendMessage({
            threadId,
            role: 'assistant',
            content: { text: fullResponse }
          });
        }
      } else {
        // CLOUD PERSISTENCE (via Claude for Pro)
        const elements = project.scriptElements || [];

        // Persist user message first
        await appendMessage({
          threadId,
          role: 'user',
          content: { text: userMsg.content }
        });

        let fullResponse = "";
        try {
          await chatWithScriptClaude(
            project.id,
            userMsg.content,
            elements,
            characters,
            storyNotes,
            threadId,
            (chunk) => {
              fullResponse += chunk;
              setMessages(prev => prev.map(m =>
                m.id === aiMsgId ? { ...m, content: m.content + chunk } : m
              ));
            }
          );

          // Persist assistant response
          if (fullResponse) {
            await appendMessage({
              threadId,
              role: 'assistant',
              content: { text: fullResponse }
            });
          }

          // Reload full thread to ensure UI is synced
          loadMessages(threadId);

        } catch (error: any) {
            let errorMessage = "Sorry, I encountered an error connecting to Claude. Please try again.";
            
            // Check for API key errors
            if (error.message?.includes('CLAUDE_API_KEY_MISSING')) {
              errorMessage = "⚠️ Claude API key not found. Please add your API key in Settings → API Keys to use Script Chat.";
            } else if (error.message?.includes('CLAUDE_API_KEY_INVALID')) {
              errorMessage = "⚠️ Invalid Claude API key. Please update your API key in Settings → API Keys.";
            } else if (error.message?.includes('authentication_error')) {
              errorMessage = "⚠️ Claude authentication failed. Please verify your API key in Settings → API Keys.";
            }
            
            console.error('Claude Chat Error:', error);
            
            setMessages(prev => prev.map(m =>
              m.id === aiMsgId ? { ...m, content: errorMessage } : m
            ));
        }
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

      {/* THREAD SIDEBAR (Collapsible) */}
      <div
        className={`shrink-0 border-r border-border bg-surface-secondary flex flex-col transition-all duration-300 overflow-hidden ${sidebarOpen ? 'w-60' : 'w-0 opacity-0'}`}
      >
        <div className="p-3 border-b border-border font-bold text-xs text-text-secondary uppercase tracking-wider flex items-center justify-between">
          <span>Conversations</span>
          <div className="flex items-center gap-2">
            <span className="bg-surface px-1.5 py-0.5 rounded text-[9px] text-text-muted">{threads.length}</span>
            <button
              onClick={handleNewChat}
              className="p-1 hover:text-primary transition-colors"
              title="New Chat"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {threads.map(t => (
            <div
              key={t.id}
              onClick={() => handleSelectThread(t.id)}
              className={`group flex items-center justify-between p-2 rounded cursor-pointer text-sm mb-1 ${threadId === t.id ? 'bg-primary/10 text-primary border border-primary/20' : 'hover:bg-background text-text-secondary'} `}
            >
              <div className="flex-1 min-w-0 mr-2">
                {editingThreadId === t.id ? (
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={() => handleSaveEdit(t.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(t.id);
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    className="w-full bg-background border border-primary rounded px-2 py-0.5 text-sm font-medium text-text-primary outline-none"
                  />
                ) : (
                  <div
                    className="font-medium truncate"
                    onDoubleClick={(e) => handleStartEdit(e, t)}
                  >
                    {t.title || 'New Chat'}
                  </div>
                )}

                <div className="text-[10px] text-text-muted truncate mt-0.5">
                  {new Date(t.updatedAt).toLocaleDateString()}
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => handleStartEdit(e, t)}
                  className="p-1 hover:text-primary transition-colors"
                  title="Rename"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => handleDeleteThread(e, t.id)}
                  className="p-1 hover:text-red-400 transition-colors"
                  title="Delete Chat"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* HEADER */}
        <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-surface-secondary shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-text-secondary hover:text-text-primary transition-colors p-1 rounded hover:bg-surface"
              title={sidebarOpen ? "Hide History" : "Show History"}
            >
              {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded text-text-tertiary hover:text-text-primary transition-colors"
              title="Close Syd"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex flex-col">
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                {tier === 'pro' ? 'SYD (Pro)' : 'SYD Jr. (Local)'}
              </div>
            </div>

          </div>

          <div className="flex items-center gap-2">

            <button
              onClick={handleClearHistory}
              className="p-1.5 rounded text-text-tertiary hover:text-red-400 transition-colors"
              title="Clear History"
            >
              <Eraser className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-border mx-1" />

            {/* Free Tier Indicator - Fixed Class Names */}
            {tier === 'free' ? (
              <div className={`flex items-center gap-2 px-2 py-1 bg-background border rounded-full text-[10px] cursor-help transition-colors ${!isSupported ? 'border-red-900/50 text-red-400' : 'border-border text-text-muted'} `} title="Free users use local AI">
                {isCheckingCache ? <Loader2 className="w-3 h-3 animate-spin" /> : <Cpu className="w-3 h-3" />}
                <span>{isCheckingCache ? 'Checking...' : isSupported ? 'Offline' : 'Unsupported'}</span>
              </div>
            ) : (
              /* Pro Tier Toggle - Fixed Class Names & Label */
              <div className="flex bg-background rounded-sm p-0.5 border border-border">
                <button onClick={() => setUseLocal(false)} className={`px-2 py-1 rounded-sm text-[10px] font-bold flex items-center gap-1 transition-colors ${!useLocal ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'} `}>
                  <Cloud className="w-3 h-3" /> Claude
                </button>
                <button onClick={() => setUseLocal(true)} className={`px-2 py-1 rounded-sm text-[10px] font-bold flex items-center gap-1 transition-colors ${useLocal ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'} `}>
                  <Cpu className="w-3 h-3" /> Local
                </button>
              </div>
            )}
          </div>
        </div>

        {/* WARNING BANNER */}
        {hasClaudeKey === false && tier === 'pro' && !useLocal && (
          <div className="p-3 bg-yellow-900/20 border-b border-yellow-800 text-sm text-yellow-200">
            ⚠️ Claude API key required. <a href="/settings/api-keys" className="underline font-medium hover:text-yellow-100">Add key →</a>
          </div>
        )}

        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 group px-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''} `}>

              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-surface-secondary text-primary'} `}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Content Bubble */}
              <div className={`max-w-[85%] rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap relative shadow-sm ${msg.role === 'user' ? 'bg-primary-light/10 border border-primary/20 text-text-primary' : 'bg-surface-secondary text-text-primary border border-border'} `}>

                {/* Content */}
                <div>
                  {!msg.content && msg.role === 'model' && isLoading ? (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  ) : msg.content}
                </div>

                {/* Metadata & Actions */}
                <div className={`mt-1 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ${msg.role === 'user' ? 'justify-end' : 'justify-start'} `}>
                  {msg.createdAt && (
                    <span className="text-[9px] text-text-muted flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  <button
                    onClick={() => handleCopy(msg.content, msg.id)}
                    className="text-text-muted hover:text-text-primary p-0.5 rounded"
                    title="Copy text"
                  >
                    {copiedId === msg.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
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
              className="w-full bg-surface-secondary border border-border rounded-lg pl-3 pr-10 py-3 text-sm text-text-primary resize-none outline-none focus:border-primary h-[80px] disabled:opacity-50 disabled:cursor-not-allowed font-sans"
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