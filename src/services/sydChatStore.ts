import { openDB, dbGet, dbSet, dbGetAllKeys } from './storage';
import { SydThread, SydMessage } from '../types';

/**
 * 💾 SERVICE: SYD CHAT STORE (Local Persistence)
 * Handles durable storage for Syd's conversations per project.
 * Uses the existing CineSketchDB via storage.ts helpers.
 */

export const createNewThreadForProject = async (projectId: string): Promise<SydThread> => {
    const db = await openDB();

    const newThreadId = crypto.randomUUID();
    const now = new Date();
    // Format: "Chat - Dec 11, 10:52 PM"
    const timestampStr = now.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
    const title = `Chat - ${timestampStr}`;
    const nowIso = now.toISOString();

    const newThread: SydThread = {
        id: newThreadId,
        projectId: projectId,
        title: title,
        createdAt: nowIso,
        updatedAt: nowIso
    };

    // Use direct put() without key param for inline-key store
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('syd_threads', 'readwrite');
        const store = tx.objectStore('syd_threads');
        const request = store.put(newThread);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });

    return newThread;
};

export const listThreadsForProject = async (projectId: string): Promise<SydThread[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('syd_threads', 'readonly');
        const store = tx.objectStore('syd_threads');
        const index = store.index('projectId');
        const request = index.getAll(projectId);

        request.onsuccess = () => {
            const threads = request.result as SydThread[];
            // Sort by most recent first
            if (threads) {
                threads.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            }
            resolve(threads || []);
        };
        request.onerror = () => reject(request.error);
    });
};

export const deleteThread = async (threadId: string): Promise<void> => {
    const db = await openDB();

    // Delete all messages first (syd_messages)
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('syd_messages', 'readwrite');
        const store = tx.objectStore('syd_messages');
        const index = store.index('threadId');
        const request = index.getAllKeys(threadId);

        request.onsuccess = () => {
            const keys = request.result;
            keys.forEach(key => store.delete(key));
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });

    // Delete the thread (syd_threads)
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('syd_threads', 'readwrite');
        const store = tx.objectStore('syd_threads');
        const request = store.delete(threadId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
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

            // Resolve when transaction completes (or successfully queued)
            // But we typically wait for tx.oncomplete for strictness, 
            // or just resolve here if we trust the buffer. 
            // The user requested typical pattern: putRequest.onsuccess => resolve.
            // But I am doing multiple ops. Let's resolve with the message object.
            resolve(newMessage);
        };

        request.onerror = () => reject(request.error);

        // Handle Transaction level errors
        tx.onerror = () => reject(tx.error);
    });
};
