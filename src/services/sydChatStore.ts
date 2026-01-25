import { openDB } from './storageLocal';
import { SydThread, SydMessage } from '../types';
import { supabase } from './supabaseClient';

/**
 * 💾 SERVICE: SYD CHAT STORE (Cloud + Local Persistence)
 * Handles durable storage for Syd's conversations per project.
 * Primary: Supabase (Cloud)
 * Backup/Fallback: IndexedDB (Local)
 * Auto-Migration: Moves local chats to cloud on first read.
 */

// --- INTERNAL HELPERS: INDEXEDDB (BACKUP) ---

const listThreadsFromIndexedDB = async (projectId: string, db?: any): Promise<SydThread[]> => {
    const database = db || await openDB();
    return new Promise((resolve, reject) => {
        const tx = database.transaction('syd_threads', 'readonly');
        const store = tx.objectStore('syd_threads');
        const index = store.index('projectId');
        const request = index.getAll(projectId);

        request.onsuccess = () => {
            const threads = request.result as SydThread[];
            const sorted = threads.sort((a, b) =>
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
            resolve(sorted);
        };
        request.onerror = () => reject(request.error);
    });
};

const listMessagesFromIndexedDB = async (threadId: string, db?: any): Promise<SydMessage[]> => {
    const database = db || await openDB();
    return new Promise((resolve, reject) => {
        const tx = database.transaction('syd_messages', 'readonly');
        const store = tx.objectStore('syd_messages');
        const index = store.index('threadId');
        const request = index.getAll(threadId);

        request.onsuccess = () => {
            const messages = request.result as SydMessage[];
            const sorted = messages.sort((a, b) => a.idx - b.idx);
            resolve(sorted);
        };
        request.onerror = () => reject(request.error);
    });
};

const saveThreadInIndexedDB = async (thread: SydThread): Promise<void> => {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
        const tx = db.transaction('syd_threads', 'readwrite');
        const store = tx.objectStore('syd_threads');
        const request = store.put(thread);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

const saveMessageInIndexedDB = async (message: SydMessage): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction(['syd_messages', 'syd_threads'], 'readwrite');
    const msgStore = tx.objectStore('syd_messages');
    const threadsStore = tx.objectStore('syd_threads');

    msgStore.put(message);

    // Update thread timestamp
    const threadReq = threadsStore.get(message.threadId);
    threadReq.onsuccess = () => {
        const thread = threadReq.result as SydThread;
        if (thread) {
            threadsStore.put({ ...thread, updatedAt: new Date().toISOString() });
        }
    };

    return new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

const deleteThreadInIndexedDB = async (threadId: string): Promise<void> => {
    const db = await openDB();
    const messages = await listMessagesFromIndexedDB(threadId, db);
    const tx = db.transaction(['syd_messages', 'syd_threads'], 'readwrite');
    const msgStore = tx.objectStore('syd_messages');
    const threadStore = tx.objectStore('syd_threads');

    messages.forEach(msg => msgStore.delete(msg.id));
    threadStore.delete(threadId);

    return new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

// --- INTERNAL HELPERS: SUPABASE (CLOUD) ---

const listThreadsFromSupabase = async (projectId: string): Promise<SydThread[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
        .from('syd_threads')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(row => ({
        id: row.id,
        projectId: row.project_id,
        title: row.title || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }));
};

const listMessagesFromSupabase = async (threadId: string): Promise<SydMessage[]> => {
    const { data, error } = await supabase
        .from('syd_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('idx', { ascending: true });

    if (error) throw error;

    return (data || []).map(row => ({
        id: row.id,
        threadId: row.thread_id,
        role: row.role as any,
        content: row.content as any,
        tokenCount: row.token_count || undefined,
        idx: row.idx,
        createdAt: row.created_at
    }));
};

// --- MIGRATION HELPER ---

/**
 * Migrates all local IndexedDB threads to Supabase
 * Called automatically on first read of a project
 */
const migrateLocalThreadsToSupabase = async (projectId: string): Promise<void> => {
    const migrationKey = `syd_migrated_${projectId}`;
    if (localStorage.getItem(migrationKey) === 'true') return;

    try {
        const db = await openDB();
        const localThreads = await listThreadsFromIndexedDB(projectId, db);

        if (localThreads.length === 0) {
            localStorage.setItem(migrationKey, 'true');
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return; // Wait for auth

        console.log(`[MIGRATION] Migrating ${localThreads.length} threads for project ${projectId}`);

        for (const thread of localThreads) {
            const messages = await listMessagesFromIndexedDB(thread.id, db);

            // 1. Save Thread
            const { error: threadError } = await supabase
                .from('syd_threads')
                .upsert({
                    id: thread.id,
                    project_id: thread.projectId,
                    user_id: user.id,
                    title: thread.title,
                    created_at: thread.createdAt,
                    updated_at: thread.updatedAt
                });

            if (threadError) continue;

            // 2. Save Messages
            const dbMessages = messages.map(m => ({
                id: m.id,
                thread_id: m.threadId,
                role: m.role,
                content: m.content,
                token_count: m.tokenCount,
                idx: m.idx,
                created_at: m.createdAt
            }));

            if (dbMessages.length > 0) {
                await supabase.from('syd_messages').upsert(dbMessages);
            }
        }

        localStorage.setItem(migrationKey, 'true');
        console.log(`[MIGRATION] Successfully migrated threads for ${projectId}`);
    } catch (error) {
        console.error('[MIGRATION] Failed:', error);
    }
};

// --- EXPORTED FUNCTIONS (MAIN ORCHESTRATORS) ---

export const createNewThreadForProject = async (projectId: string): Promise<SydThread> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // 1. Get current thread count from Supabase (authoritative source)
    const { data: existingThreads, error: countError } = await supabase
        .from('syd_threads')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', user.id);

    if (countError) throw countError;

    const threadNumber = (existingThreads?.length || 0) + 1;
    const title = `Chat ${threadNumber}`;

    const newThread: SydThread = {
        id: crypto.randomUUID(),
        projectId: projectId,
        title: title, // ✅ Now "Chat 1", "Chat 2", etc.
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    // 2. Save to Supabase
    const { error } = await supabase.from('syd_threads').insert({
        id: newThread.id,
        project_id: newThread.projectId,
        user_id: user.id,
        title: newThread.title,
        created_at: newThread.createdAt,
        updated_at: newThread.updatedAt
    });

    if (error) throw error;

    // 3. Save to IndexedDB (Backup)
    try {
        await saveThreadInIndexedDB(newThread);
    } catch (e) {
        console.warn('[BACKUP] IndexedDB write failed:', e);
    }

    return newThread;
};

export const listThreadsForProject = async (projectId: string): Promise<SydThread[]> => {
    // 1. Sync check (Idempotent)
    await migrateLocalThreadsToSupabase(projectId);

    // 2. Read from Supabase (Primary)
    try {
        return await listThreadsFromSupabase(projectId);
    } catch (error) {
        console.error('[SUPABASE] Read failed, using IndexedDB fallback:', error);
        return await listThreadsFromIndexedDB(projectId);
    }
};

export const deleteThread = async (threadId: string): Promise<void> => {
    // 1. Delete from Supabase
    const { error } = await supabase.from('syd_threads').delete().eq('id', threadId);
    if (error) console.error('[SUPABASE] Delete failed:', error);

    // 2. Delete from IndexedDB
    try {
        await deleteThreadInIndexedDB(threadId);
    } catch (e) {
        console.warn('[BACKUP] IndexedDB delete failed:', e);
    }
};

export const listMessagesForThread = async (threadId: string): Promise<SydMessage[]> => {
    try {
        return await listMessagesFromSupabase(threadId);
    } catch (error) {
        console.error('[SUPABASE] Load failed, using IndexedDB fallback:', error);
        return await listMessagesFromIndexedDB(threadId);
    }
};

export const appendMessage = async (params: {
    threadId: string;
    role: 'user' | 'assistant' | 'system';
    content: { text: string;[key: string]: any };
    tokenCount?: number
}): Promise<SydMessage> => {
    // 1. Determine next index (idx)
    // We fetch from Supabase to ensure cloud consistency
    const { data: existing } = await supabase
        .from('syd_messages')
        .select('idx')
        .eq('thread_id', params.threadId)
        .order('idx', { ascending: false })
        .limit(1);

    const maxIdx = existing?.[0]?.idx || 0;
    const nextIdx = maxIdx + 1;
    const now = new Date().toISOString();

    const newMessage: SydMessage = {
        id: crypto.randomUUID(),
        threadId: params.threadId,
        role: params.role,
        content: params.content,
        tokenCount: params.tokenCount,
        idx: nextIdx,
        createdAt: now
    };

    // 2. Write to Supabase
    const { error } = await supabase.from('syd_messages').insert({
        id: newMessage.id,
        thread_id: newMessage.threadId,
        role: newMessage.role,
        content: newMessage.content,
        token_count: newMessage.tokenCount,
        idx: newMessage.idx,
        created_at: newMessage.createdAt
    });

    if (error) throw error;

    // 3. Update thread timestamp in Supabase
    await supabase.from('syd_threads')
        .update({ updated_at: now })
        .eq('id', params.threadId);

    // 4. Backup to IndexedDB
    try {
        await saveMessageInIndexedDB(newMessage);
    } catch (e) {
        console.warn('[BACKUP] IndexedDB write failed:', e);
    }

    return newMessage;
};

export const updateThreadTitle = async (threadId: string, newTitle: string): Promise<void> => {
    const now = new Date().toISOString();
    const title = newTitle.trim();

    // 1. Update Supabase
    const { error } = await supabase.from('syd_threads')
        .update({ title, updated_at: now })
        .eq('id', threadId);

    if (error) console.error('[SUPABASE] Title update failed:', error);

    // 2. Update IndexedDB
    try {
        const db = await openDB();
        const tx = db.transaction('syd_threads', 'readwrite');
        const store = tx.objectStore('syd_threads');
        const req = store.get(threadId);
        req.onsuccess = () => {
            const thread = req.result as SydThread;
            if (thread) {
                store.put({ ...thread, title, updatedAt: now });
            }
        };
    } catch (e) {
        console.warn('[BACKUP] IndexedDB title update failed:', e);
    }
};