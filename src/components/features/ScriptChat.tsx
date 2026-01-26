import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Trash2, X, Copy, Check, Clock, ChevronLeft, ChevronRight, Eraser, Plus, Pencil } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { streamSydResponse } from '../../services/syd/chatEngine';
import { getCharacters, getStoryNotes } from '../../services/storage';
import { createNewThreadForProject, listThreadsForProject, listMessagesForThread, appendMessage, deleteThread, updateThreadTitle } from '../../services/sydChatStore';
import { Character, StoryNote, SydThread } from '../../types';
import { useSubscription } from '../../context/SubscriptionContext';
import { classifyClaudeError } from '../../services/claude';
import { supabase } from '../../services/supabaseClient';

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

  const initialWelcomeMsg = "Hello, I'm SYD. I've read your entire script. What are we working on?";

  // State
  const [threads, setThreads] = useState<SydThread[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [storyNotes, setStoryNotes] = useState<StoryNote[]>([]);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const [hasClaudeKey, setHasClaudeKey] = useState<boolean | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkApiKey = async () => {
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
  }, []);

  // Load Context & Threads on Mount
  useEffect(() => {
    if (project?.id) {
      getCharacters(project.id).then(setCharacters);
      getStoryNotes(project.id).then(data => setStoryNotes(data.notes));
      loadThreads(project.id);
    }
  }, [project?.id]);

  const loadThreads = async (pid: string) => {
    try {
      const list = await listThreadsForProject(pid);

      if (list.length === 0) {
        const newThread = await createNewThreadForProject(pid);
        setThreads([newThread]);
        setThreadId(newThread.id);
        setMessages([{
          id: 'welcome',
          role: 'model',
          content: initialWelcomeMsg,
          createdAt: new Date().toISOString()
        }]);
      } else {
        setThreads(list);
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
      setMessages([]);
      const dbMessages = await listMessagesForThread(tid);
      if (dbMessages.length > 0) {
        const uiMessages: Message[] = dbMessages.map(m => ({
          id: m.id,
          role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
          content: m.content.text,
          createdAt: m.createdAt
        })).filter(m => m.role === 'user' || m.role === 'model');
        setMessages(uiMessages);
      } else {
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
    if (editingThreadId) return;
    setThreadId(tid);
    loadMessages(tid);
  };

  const handleDeleteThread = async (e: React.MouseEvent, tid: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this conversation?")) return;

    try {
      await deleteThread(tid);
      setThreads(prev => {
        const remaining = prev.filter(t => t.id !== tid);
        if (threadId === tid) {
          setThreadId(null);
          setMessages([]);
          if (remaining.length > 0) {
            setTimeout(() => {
              setThreadId(remaining[0].id);
              loadMessages(remaining[0].id);
            }, 0);
          } else if (project?.id) {
            handleNewChat();
          }
        }
        return remaining;
      });
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
      await updateThreadTitle(threadId, editingTitle.trim());
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
      const newThread = await createNewThreadForProject(project.id);
      setThreads(prev => prev.map(t => t.id === threadId ? newThread : t));
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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    if (!project?.id || !threadId) return;

    const tempId = crypto.randomUUID();
    const userMsg: Message = { id: tempId, role: 'user', content: input, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const aiMsgId = crypto.randomUUID();
    const aiMsg: Message = { id: aiMsgId, role: 'model', content: '', createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, aiMsg]);

    try {
      const elements = project.scriptElements || [];

      await appendMessage({
        threadId,
        role: 'user',
        content: { text: userMsg.content }
      });

      let fullResponse = "";
      try {
        await streamSydResponse(
          'claude',
          {
            projectId: project.id,
            userMessage: userMsg.content,
            scriptElements: elements,
            characters,
            storyNotes,
            threadId
          },
          (chunk) => {
            fullResponse += chunk;
            setMessages(prev => prev.map(m =>
              m.id === aiMsgId ? { ...m, content: m.content + chunk } : m
            ));
          }
        );

        if (fullResponse) {
          await appendMessage({
            threadId,
            role: 'assistant',
            content: { text: fullResponse }
          });
        }

        loadMessages(threadId);

      } catch (error: unknown) {
        const classified = classifyClaudeError(error);
        let errorMessage = classified.userMessage;

        if (error instanceof Error && (error.message?.includes('401') || error.message?.includes('403'))) {
          errorMessage = "Authentication failed. Please check your API key in Settings → API Keys.";
        }

        console.error("Claude Chat Error:", error);

        setMessages(prev => prev.map(m =>
          m.id === aiMsgId ? { ...m, content: errorMessage } : m
        ));
      }
    } catch (error: unknown) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "Failed to get response", 'error');
      setMessages(prev => prev.filter(m => m.id !== aiMsgId));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-row w-full h-full bg-surface overflow-hidden">
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
                SYD
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
          </div>
        </div>

        {/* WARNING BANNER */}
        {hasClaudeKey === false && (
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
              placeholder="Ask SYD..."
              className="w-full bg-surface-secondary border border-border rounded-lg pl-3 pr-10 py-3 text-sm text-text-primary resize-none outline-none focus:border-primary h-[80px] font-sans"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-3 bottom-3 text-primary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};