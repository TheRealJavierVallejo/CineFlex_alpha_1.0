import { openDB, dbGet, dbSet, dbGetAllKeys } from './storage';
import { SydThread, SydMessage } from '../types';

/**
 * 💾 SERVICE: SYD CHAT STORE (Local Persistence)
 * Handles durable storage for Syd's conversations per project.
 * Uses the existing CineSketchDB via storage.ts helpers.
 */

export const createNewThreadForProject = async (projectId: string): Promise<SydThread> => {
    const newThreadId = crypto.randomUUID();
    const now = new Date().toISOString();

    const existingThreads = await listThreadsForProject(projectId);
    const threadNumber = existingThreads.length + 1;
    const title = `Chat ${threadNumber}`; // User preferred simpler title

    const newThread: SydThread = {
        id: newThreadId,
        projectId: projectId,
        title: title,
        createdAt: now,
        updatedAt: now
    };

    // Use correct store name 'syd_threads'
    await dbSet('syd_threads', newThreadId, newThread);
    return newThread;
};

export const listThreadsForProject = async (projectId: string): Promise<SydThread[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        // Use correct store name 'syd_threads'
        const tx = db.transaction('syd_threads', 'readonly');
        const store = tx.objectStore('syd_threads');
        const index = store.index('projectId');
        const request = index.getAll(projectId);

        request.onsuccess = () => {
            const threads = request.result as SydThread[];
            // Sort: Newest updated first
            const sorted = threads.sort((a, b) =>
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
            resolve(sorted);
        };
        request.onerror = () => reject(request.error);
    });
};

export const deleteThread = async (threadId: string): Promise<void> => {
    const db = await openDB();
    // Use correct store name 'syd_threads' and 'syd_messages'
    const messages = await listMessagesForThread(threadId);

    // User's simple delete loop (adapted for correct store name)
    const tx = db.transaction(['syd_messages', 'syd_threads'], 'readwrite');
    const msgStore = tx.objectStore('syd_messages');
    const threadStore = tx.objectStore('syd_threads');

    // Delete all messages
    messages.forEach(msg => {
        msgStore.delete(msg.id);
    });

    // Delete thread
    threadStore.delete(threadId);

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const listMessagesForThread = async (threadId: string): Promise<SydMessage[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('syd_messages', 'readonly');
        const store = tx.objectStore('syd_messages');
        const index = store.index('threadId');
        const request = index.getAll(threadId);

        request.onsuccess = () => {
            const messages = request.result as SydMessage[];
            // Sort by idx ascending
            const sorted = messages.sort((a, b) => a.idx - b.idx);
            resolve(sorted);
        };
        request.onerror = () => reject(request.error);
    });
};

export const appendMessage = async (params: {
    threadId: string;
    role: 'user' | 'assistant' | 'system';
    content: { text: string;[key: string]: any };
    tokenCount?: number
}): Promise<SydMessage> => {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(['syd_messages', 'syd_threads'], 'readwrite');
        const msgsStore = tx.objectStore('syd_messages');
        const threadsStore = tx.objectStore('syd_threads');

        // 1. Get all messages to determine maxIdx
        const index = msgsStore.index('threadId');
        const request = index.getAll(params.threadId);

        request.onsuccess = () => {
            const messages = request.result as SydMessage[];
            const maxIdx = messages.length > 0 ? Math.max(...messages.map(m => m.idx)) : 0;
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

            // 2. Insert new message
            msgsStore.put(newMessage);

            // 3. Update thread timestamp
            const threadReq = threadsStore.get(params.threadId);
            threadReq.onsuccess = () => {
                const thread = threadReq.result as SydThread;
                if (thread) {
                    const updatedThread = { ...thread, updatedAt: now };
                    threadsStore.put(updatedThread);
                }
            };

            resolve(newMessage);
        };

        request.onerror = () => reject(request.error);
        tx.onerror = () => reject(tx.error);
    });
};
