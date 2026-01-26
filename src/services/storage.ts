
/*
 * ☁️ SERVICE: STORAGE (Cloud Edition)
 * Powered by Supabase
 */

import { Character, Project, Outfit, Shot, WorldSettings, ProjectMetadata, ProjectExport, Scene, ImageLibraryItem, Location, ScriptElement, PlotDevelopment, CharacterDevelopment, StoryBeat, StoryMetadata, StoryNote, StoryNotesData, SydThread, SydMessage, TitlePageData } from '../types';
import { DEFAULT_WORLD_SETTINGS } from '../constants';
import { debounce } from '../utils/debounce';
import { supabase } from './supabaseClient';
import { ImageLibraryItemSchema, CharacterSchema, OutfitSchema, LocationSchema } from './schemas';
import { z } from 'zod';

const KEYS = {
    ACTIVE_PROJECT_ID: 'cinesketch_active_project_id',
};

// --- STORAGE HELPERS ---

const IMAGE_BUCKET = 'images';
const PUBLIC_IMAGES_SEGMENT = '/storage/v1/object/public/images/';

const getSupabaseImagePathFromUrl = (url: string): string | null => {
    if (!url || typeof url !== 'string') return null;
    const idx = url.indexOf(PUBLIC_IMAGES_SEGMENT);
    if (idx === -1) return null;
    return url.substring(idx + PUBLIC_IMAGES_SEGMENT.length); // everything after ".../images/"
};

const chunk = <T,>(arr: T[], size: number) => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
};

/**
 * Scans an object recursively for strings that look like Supabase public URLs 
 * belonging to the specified project.
 * 
 * @param projectId - Current project ID to filter paths.
 * @param obj - The object to scan (Scene, Shot, Project, etc).
 * @param paths - Set to collect detected paths in.
 * @returns The populated paths Set.
 */
const collectReferencedProjectImagePaths = (
    projectId: string,
    obj: unknown,
    paths: Set<string> = new Set()
): Set<string> => {
    if (!obj) return paths;

    if (typeof obj === 'string') {
        const storagePath = getSupabaseImagePathFromUrl(obj);
        if (storagePath && storagePath.startsWith(`${projectId}/`)) {
            paths.add(storagePath);
        }
        return paths;
    }

    if (Array.isArray(obj)) {
        obj.forEach(v => collectReferencedProjectImagePaths(projectId, v, paths));
        return paths;
    }

    if (obj !== null && typeof obj === 'object') {
        Object.values(obj as Record<string, unknown>).forEach(v => collectReferencedProjectImagePaths(projectId, v, paths));
        return paths;
    }

    return paths;
};

const listAllFilesInProjectFolder = async (projectId: string): Promise<string[]> => {
    const allPaths: string[] = [];
    let offset = 0;
    const limit = 100;

    while (true) {
        const { data, error } = await supabase.storage
            .from(IMAGE_BUCKET)
            .list(projectId, { limit, offset });

        if (error) {
            console.error('[STORAGE] list() failed:', error);
            return allPaths;
        }

        const files = (data || []).filter((x: { name: string; id: string }) => x.name && !x.id?.endsWith('/'));
        files.forEach((f: { name: string }) => {
            allPaths.push(`${projectId}/${f.name}`);
        });

        if (!data || data.length < limit) break;
        offset += limit;
    }

    return allPaths;
};

/**
 * Compares referenced images in a project state against actual storage contents 
 * and deletes orphaned files to save space.
 * 
 * @param projectId - Project ID to cleanup.
 * @param project - The fully hydrated project object.
 */
const cleanupUnusedProjectImages = async (projectId: string, project: Project): Promise<void> => {
    try {
        const referenced = collectReferencedProjectImagePaths(projectId, project);
        const existing = await listAllFilesInProjectFolder(projectId);

        const toDelete = existing.filter(p => !referenced.has(p));

        if (toDelete.length === 0) return;

        // Supabase remove() supports up to 1000 at a time; chunk to be safe
        for (const batch of chunk(toDelete, 1000)) {
            const { error } = await supabase.storage.from(IMAGE_BUCKET).remove(batch);
            if (error) {
                console.error('[STORAGE] remove() failed:', error);
            }
        }

        console.log(`[STORAGE] Deleted ${toDelete.length} unused images for project ${projectId}`);
    } catch (e) {
        console.error('[STORAGE] cleanup failed:', e);
    }
};

// --- IMAGES & STORAGE ---

/**
 * Retry configuration for upload operations
 */
const RETRY_CONFIG = {
    maxRetries: 3,
    initialDelayMs: 1000, // Start with 1 second
    maxDelayMs: 8000      // Cap at 8 seconds
};

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay: 1s, 2s, 4s, 8s (capped)
 */
function getRetryDelay(attempt: number): number {
    const delay = RETRY_CONFIG.initialDelayMs * Math.pow(2, attempt);
    return Math.min(delay, RETRY_CONFIG.maxDelayMs);
}

export const persistImage = async (projectId: string, url: string): Promise<string> => {
    if (!url) return url;

    // If this is already a Supabase public URL in our bucket, try to ensure it lives under `${projectId}/`
    const existingPath = getSupabaseImagePathFromUrl(url);
    if (existingPath) {
        if (existingPath.startsWith(`${projectId}/`)) {
            return url; // already in correct folder
        }

        // Try to move it into the project folder (gradual migration of old images)
        const fileName = existingPath.split('/').pop();
        if (!fileName) return url;

        const newPath = `${projectId}/${fileName}`;

        try {
            const { error: moveError } = await supabase.storage
                .from(IMAGE_BUCKET)
                .move(existingPath, newPath);

            if (!moveError) {
                const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(newPath);
                return data.publicUrl;
            }

            // If move fails (policy), keep original URL
            console.warn('[STORAGE] move() failed, keeping original URL:', moveError);
            return url;
        } catch (e) {
            console.warn('[STORAGE] move() threw, keeping original URL:', e);
            return url;
        }
    }

    // If it's a non-supabase http URL (like Unsplash), do nothing
    if (url.startsWith('http')) return url;

    // Otherwise it's a blob: URL or data: URL; upload it with retry logic
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch blob: ${response.statusText}`);
            }

            const blob = await response.blob();
            const mimeType = blob.type || 'image/png';
            const ext = mimeType.split('/')[1] || 'png';

            const fileName = `${crypto.randomUUID()}.${ext}`;
            const storagePath = `${projectId}/${fileName}`;

            console.log(`[STORAGE] Upload attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1}: ${fileName}`);

            const { error } = await supabase.storage
                .from(IMAGE_BUCKET)
                .upload(storagePath, blob, { upsert: true, contentType: mimeType });

            if (error) {
                throw error;
            }

            // Success! Get public URL
            const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(storagePath);
            console.log(`[STORAGE] ✅ Upload successful: ${data.publicUrl}`);
            return data.publicUrl;

        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));

            // If this was the last attempt, don't sleep
            if (attempt === RETRY_CONFIG.maxRetries) {
                console.error(`[STORAGE] ❌ Upload failed after ${RETRY_CONFIG.maxRetries + 1} attempts:`, lastError);
                break;
            }

            // Calculate delay and retry
            const delayMs = getRetryDelay(attempt);
            console.warn(`[STORAGE] ⚠️ Upload attempt ${attempt + 1} failed, retrying in ${delayMs}ms...`, lastError.message);
            await sleep(delayMs);
        }
    }

    // All retries failed - return original blob: URL as last resort
    console.error('[STORAGE] ⚠️ WARNING: Returning blob: URL (will be lost on refresh)');
    return url;
};

// --- PROJECTS ---

/**
 * Retrieves the list of all projects owned by the currently authenticated user.
 * 
 * @returns Array of project metadata summaries.
 */
export const getProjectsList = async (): Promise<ProjectMetadata[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return [];
    }

    const { data, error } = await supabase
        .from('projects')
        .select('id, name, created_at, last_synced')
        .eq('user_id', user.id);

    if (error) {
        console.error('Error fetching projects list:', error.message);
        return [];
    }

    return (data || []).map((p: { id: string; name: string; created_at: string; last_synced: string }) => ({
        id: p.id,
        name: p.name,
        createdAt: new Date(p.created_at).getTime(),
        lastModified: new Date(p.last_synced).getTime(),
        shotCount: 0,
        characterCount: 0
    }));
};

/**
 * Returns the currently active project ID from browser local storage.
 */
export const getActiveProjectId = (): string | null => {
    return localStorage.getItem(KEYS.ACTIVE_PROJECT_ID);
};

/**
 * Persists the specified project ID as the active one in local storage.
 * 
 * @param id - Project ID to activate, or null to clear.
 */
export const setActiveProjectId = (id: string | null): void => {
    if (id) localStorage.setItem(KEYS.ACTIVE_PROJECT_ID, id);
    else localStorage.removeItem(KEYS.ACTIVE_PROJECT_ID);
};

/**
 * Creates a fresh project record and an associated script entry in the database.
 * 
 * @param name - The human-readable name of the project.
 * @returns The unique ID of the newly created project.
 */
export const createNewProject = async (name: string): Promise<string> => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error("Please sign in to create a project.");

    const { data, error } = await supabase.from('projects').insert({
        name,
        user_id: user.id,
        settings: DEFAULT_WORLD_SETTINGS
    }).select().single();

    if (error) throw error;

    // Create empty scripts entry
    await supabase.from('scripts').insert({
        project_id: data.id,
        content: []
    });

    return data.id;
};

/**
 * Deletes a project, its database rows, and all its associated images in storage.
 * 
 * @param projectId - ID of the project to erase.
 */
export const deleteProject = async (projectId: string): Promise<void> => {
    // 1. Delete all images in storage for this project
    try {
        const allFiles = await listAllFilesInProjectFolder(projectId);
        if (allFiles.length > 0) {
            for (const batch of chunk(allFiles, 1000)) {
                await supabase.storage.from(IMAGE_BUCKET).remove(batch);
            }
            console.log(`[STORAGE] Deleted ${allFiles.length} images for deleted project ${projectId}`);
        }
    } catch (e) {
        console.error('[STORAGE] Failed to cleanup images for deleted project:', e);
    }

    // 2. Delete DB Record
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) console.error("Delete failed", error);
    if (getActiveProjectId() === projectId) setActiveProjectId(null);
};

// --- DEHYDRATE/HYDRATE HELPERS ---
// For Supabase, "dehydrate" means ensuring images are uploaded to Storage buckets
// "hydrate" means just using the URL (which is public), so simple passthrough.

/**
 * Recurses through an object or array to ensure any temporary image URLs 
 * (blobs, data-uris) are uploaded to Supabase storage.
 * 
 * @param projectId - Destination project ID.
 * @param obj - Data structure potentially containing image URLs.
 */
const ensureImagesPersisted = async <T>(projectId: string, obj: T): Promise<T> => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
        return Promise.all(obj.map(v => ensureImagesPersisted(projectId, v))) as unknown as T;
    }

    const newObj = { ...(obj as Record<string, unknown>) };
    const imageFields = ['generatedImage', 'sketchImage', 'referenceImage', 'url', 'imageUrl'];
    const arrayImageFields = ['generationCandidates', 'referencePhotos'];

    for (const key of Object.keys(newObj)) {
        const val = newObj[key];
        if (imageFields.includes(key) && typeof val === 'string') {
            newObj[key] = await persistImage(projectId, val);
        } else if (arrayImageFields.includes(key) && Array.isArray(val)) {
            newObj[key] = await Promise.all(
                val.map((img: unknown) =>
                    typeof img === 'string' ? persistImage(projectId, img) : img
                )
            );
        } else if (val !== null && typeof val === 'object') {
            newObj[key] = await ensureImagesPersisted(projectId, val);
        }
    }
    return newObj as unknown as T;
};

// --- DATA ACCESS ---

/**
 * Loads the complete project state including scenes, shots, and script content.
 * Handles case transformation from DB snake_case to UI camelCase.
 * 
 * @param projectId - Unique ID of the project.
 * @returns Hydrated Project object or null if not found/unauthorized.
 */
export const getProjectData = async (projectId: string): Promise<Project | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error("Cannot load project: User not authenticated");
        return null;
    }

    // Join scenes and shots
    const { data: projectData, error: projError } = await supabase
        .from('projects')
        .select(`
            *,
            scenes (*),
            shots (*),
            drafts,
            active_draft_id
        `)
        .eq('id', projectId)
        .single();

    if (projError || !projectData) {
        console.error("Fetch Project Error", projError);
        return null;
    }

    // Fetch Script Content
    const { data: scriptData } = await supabase
        .from('scripts')
        .select('content')
        .eq('project_id', projectId)
        .single();

    const scenes = (projectData.scenes || []).sort((a: { sequence: number }, b: { sequence: number }) => a.sequence - b.sequence);
    const shots = (projectData.shots || []).sort((a: { sequence: number }, b: { sequence: number }) => a.sequence - b.sequence);
    const scriptElements = (scriptData?.content as ScriptElement[]) || [];

    // Helper functions for case transformation
    // Helper functions for case transformation
    const toCamel = (str: string) => str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());

    /**
     * Deeply transforms a snake_case object (from DB) into camelCase (for UI).
     */
    const deepToCamel = <T>(obj: T): T => {
        if (Array.isArray(obj)) return obj.map(deepToCamel) as unknown as T;
        if (obj !== null && typeof obj === 'object') {
            return Object.keys(obj as Record<string, unknown>).reduce((acc, key) => {
                const newKey = toCamel(key);
                (acc as Record<string, unknown>)[newKey] = deepToCamel((obj as Record<string, unknown>)[key]);
                return acc;
            }, {} as T);
        }
        return obj;
    };

    // Parse shots metadata back to fields if needed, or if stored as columns
    const parsedShots = shots.map((s: Record<string, unknown>) => {
        const transformed = deepToCamel(s) as unknown as Shot & { metadata?: Record<string, unknown> };

        if (transformed.metadata && typeof transformed.metadata === 'object') {
            return {
                ...transformed,
                ...transformed.metadata,
                metadata: undefined
            };
        }

        return transformed;
    });

    const cleanProject = deepToCamel(projectData) as Project & {
        plot_development?: PlotDevelopment;
        character_developments?: CharacterDevelopment[];
        story_beats?: StoryBeat[];
        story_metadata?: StoryMetadata;
        story_notes_data?: StoryNotesData;
        script_file?: Project['scriptFile'];
        title_page?: TitlePageData;
    };

    // Specific fixes
    cleanProject.scenes = deepToCamel(scenes) as Scene[];
    cleanProject.shots = parsedShots as unknown as Shot[];
    cleanProject.scriptElements = scriptElements; // array
    cleanProject.settings = projectData.settings; // already JSON

    // Ensure story development fields are mapped (deepToCamel handles most, but we map explicitly for safety)
    cleanProject.plotDevelopment = projectData.plot_development || cleanProject.plotDevelopment;
    cleanProject.characterDevelopments = projectData.character_developments || cleanProject.characterDevelopments || [];
    cleanProject.storyBeats = projectData.story_beats || cleanProject.storyBeats || [];
    cleanProject.storyMetadata = projectData.story_metadata || cleanProject.storyMetadata;
    cleanProject.storyNotes = projectData.story_notes_data || cleanProject.storyNotes;
    cleanProject.scriptFile = projectData.script_file || cleanProject.scriptFile;
    cleanProject.titlePage = projectData.title_page || cleanProject.titlePage;
    cleanProject.drafts = projectData.drafts || [];
    cleanProject.activeDraftId = projectData.active_draft_id || cleanProject.activeDraftId;

    // Map timestamps to match the Project interface exactly
    cleanProject.createdAt = new Date(projectData.created_at).getTime();
    cleanProject.lastModified = new Date(projectData.last_synced).getTime();

    return cleanProject as unknown as Project;
};

/**
 * Saves the entire project state to the database.
 * Ensures all temporary images are persisted before updating DB records.
 * 
 * @param projectId - Unique ID of the project.
 * @param project - The complete project data.
 */
export const saveProjectData = async (projectId: string, project: Project): Promise<void> => {
    // 1. Persist Images first
    const cleanProject = await ensureImagesPersisted(projectId, project);

    // 2. Update Projects (Settings, Story Dev, Script File)
    const { error: pErr } = await supabase.from('projects').update({
        name: cleanProject.name,
        settings: cleanProject.settings,
        title_page: cleanProject.titlePage,
        plot_development: cleanProject.plotDevelopment,
        character_developments: cleanProject.characterDevelopments,
        story_beats: cleanProject.storyBeats,
        story_metadata: cleanProject.storyMetadata,
        story_notes_data: cleanProject.storyNotes,
        script_file: cleanProject.scriptFile,
        drafts: cleanProject.drafts,
        active_draft_id: cleanProject.activeDraftId,
        last_synced: new Date().toISOString()
    }).eq('id', projectId);

    if (pErr) console.error("Save Project Metadata Failed", pErr);

    // 3. Update Scripts
    // Using onConflict='project_id' relies on the unique constraint on that column.
    const { error: scErr } = await supabase.from('scripts').upsert({
        project_id: projectId,
        content: cleanProject.scriptElements,
        last_saved: new Date().toISOString()
    }, { onConflict: 'project_id', ignoreDuplicates: false });

    if (scErr) console.error("Save Script Failed:", scErr.message, scErr.details, scErr.hint);

    // 4. Update Scenes
    const currentSceneIds = cleanProject.scenes.map((s: Scene) => s.id);

    // Prune orphaned scenes (that exist in DB but not in current project state)
    const { error: scenePruneErr } = await supabase
        .from('scenes')
        .delete()
        .eq('project_id', projectId)
        .not('id', 'in', `(${currentSceneIds.length > 0 ? currentSceneIds.join(',') : '00000000-0000-0000-0000-000000000000'})`);

    if (scenePruneErr) console.error("Prune Scenes Failed", scenePruneErr);

    const dbScenes = cleanProject.scenes.map((s: Scene) => ({
        id: s.id,
        project_id: projectId,
        sequence: s.sequence,
        heading: s.heading,
        action_notes: s.actionNotes,
        location_id: s.locationId,
        script_elements: s.scriptElements // Store as JSONB
    }));

    if (dbScenes.length > 0) {
        const { error: sErr } = await supabase.from('scenes').upsert(dbScenes);
        if (sErr) console.error("Save Scenes Failed", sErr);
    }

    // 5. Update Shots
    const currentShotIds = cleanProject.shots.map((s: Shot) => s.id);

    // Prune orphaned shots
    const { error: shotPruneErr } = await supabase
        .from('shots')
        .delete()
        .eq('project_id', projectId)
        .not('id', 'in', `(${currentShotIds.length > 0 ? currentShotIds.join(',') : '00000000-0000-0000-0000-000000000000'})`);

    if (shotPruneErr) console.error("Prune Shots Failed", shotPruneErr);

    const dbShots = cleanProject.shots.map((s: Shot) => {
        const { id, sceneId, sequence, shotType, description, dialogue, ...rest } = s;
        return {
            id,
            project_id: projectId,
            scene_id: sceneId,
            sequence,
            shot_type: shotType,
            description,
            dialogue,
            camera_movement: (s as unknown as Record<string, unknown>).cameraMovement, // Correcting likely field mismatch
            metadata: rest // Store remaining AI props in metadata
        };
    });

    if (dbShots.length > 0) {
        const { error: shErr } = await supabase.from('shots').upsert(dbShots);
        if (shErr) console.error("Save Shots Failed", shErr);
    }

    // 6. Cleanup Unused Images (Fire & Forget)
    cleanupUnusedProjectImages(projectId, cleanProject);
};

/**
 * Subscribes to realtime changes in scenes and shots for a project. 
 * Allows multi-user coordination or remote state updates.
 * 
 * @param projectId - Project ID to watch.
 * @param onSceneChange - Callback for scene changes.
 * @param onShotChange - Callback for shot changes.
 * @returns Unsubscribe function.
 */
export const subscribeToProjectChanges = (
    projectId: string,
    onSceneChange: (payload: { new: Scene; old: Scene }) => void,
    onShotChange: (payload: { new: Shot; old: Shot }) => void
): () => void => {
    const channel = supabase.channel(`project-${projectId}`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'scenes', filter: `project_id=eq.${projectId}` },
            (payload: any) => onSceneChange(payload as unknown as { new: Scene; old: Scene })
        )
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'shots', filter: `project_id=eq.${projectId}` },
            (payload: any) => onShotChange(payload as unknown as { new: Shot; old: Shot })
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};
// ============================================================
// SAVE QUEUE: Prevents race conditions from concurrent saves
// ============================================================

/**
 * Queue that ensures saves execute sequentially, not concurrently.
 * Pattern used by Notion, Google Docs, Linear.
 */
class SaveQueue {
    private queue: Array<() => Promise<void>> = [];
    private isProcessing = false;

    /**
     * Add a save operation to the queue and wait for it to complete.
     */
    enqueue(operation: () => Promise<void>): Promise<void> {
        return new Promise((resolve, reject) => {
            // Wrap operation to resolve/reject the promise when done
            const wrappedOperation = async () => {
                try {
                    await operation();
                    resolve();
                } catch (err) {
                    reject(err);
                }
            };

            this.queue.push(wrappedOperation);
            this.processQueue();
        });
    }

    /**
     * Process queue sequentially (one at a time)
     */
    private async processQueue() {
        // If already processing, exit (next save will be picked up)
        if (this.isProcessing) return;

        // If queue is empty, exit
        if (this.queue.length === 0) return;

        this.isProcessing = true;

        try {
            // Process all saves in order
            while (this.queue.length > 0) {
                const operation = this.queue.shift()!;
                try {
                    await operation();
                } catch (err) {
                    console.error('[SAVE QUEUE] Operation failed:', err);
                    // Continue processing next save even if one fails
                }
            }
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Check if queue has pending operations
     */
    hasPending(): boolean {
        return this.queue.length > 0 || this.isProcessing;
    }

    /**
     * Get number of pending saves
     */
    getPendingCount(): number {
        return this.queue.length;
    }
}

// Singleton save queue
const saveQueue = new SaveQueue();

/**
 * Sequential wrapper for saveProjectData.
 * Forces the save to join the queue and wait its turn.
 */
export const saveProjectDataSequential = (projectId: string, project: Project): Promise<void> => {
    return saveQueue.enqueue(async () => {
        await saveProjectData(projectId, project);
    });
};

/**
 * Debounced save that uses the queue to prevent race conditions
 */
const createQueuedDebouncedSave = () => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let pendingProjectId: string | null = null;
    let pendingProject: Project | null = null;

    const save = (projectId: string, project: Project) => {
        // Clear existing timeout
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        // Store latest state
        pendingProjectId = projectId;
        pendingProject = project;

        // Debounce: wait 2 seconds of inactivity
        timeoutId = setTimeout(() => {
            if (!pendingProjectId || !pendingProject) return;

            const finalProjectId = pendingProjectId;
            const finalProject = pendingProject;

            // Clear pending state
            pendingProjectId = null;
            pendingProject = null;
            timeoutId = null;

            // Add to queue (will execute sequentially)
            // We don't await this here because it's fire-and-forget for auto-save
            saveQueue.enqueue(async () => {
                console.log(`[SAVE QUEUE] Saving project ${finalProjectId}...`);
                await saveProjectData(finalProjectId, finalProject);
                console.log(`[SAVE QUEUE] ✅ Save complete for ${finalProjectId}`);
            });
        }, 2000);
    };

    save.cancel = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
            pendingProjectId = null;
            pendingProject = null;
            console.log('[SAVE QUEUE] 🛑 Pending save cancelled due to transactional operation');
        }
    };

    return save;
};

export const saveProjectDataDebounced = createQueuedDebouncedSave();

// --- ASSETS ---

/**
 * Fetches all characters associated with a specific project.
 * 
 * @param projectId - Unique project ID.
 * @returns Array of Character assets.
 */
export const getCharacters = async (projectId: string): Promise<Character[]> => {
    const { data } = await supabase.from('characters').select('*').eq('project_id', projectId);
    // Convert snake_case to camelCase
    return (data || []).map((c: { id: string; name: string; description: string; image_url?: string; reference_photos?: string[] }) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        imageUrl: c.image_url,
        referencePhotos: c.reference_photos || []
    }));
};

/**
 * Saves or updates a list of characters for a project. 
 * Handles deletion of characters not present in the provided list.
 * 
 * @param projectId - Unique project ID.
 * @param chars - The complete current list of characters.
 */
export const saveCharacters = async (projectId: string, chars: Character[]): Promise<void> => {
    const cleanChars = await ensureImagesPersisted(projectId, chars);
    const currentIds = cleanChars.map((c: Character) => c.id);

    // Prune deleted characters
    await supabase
        .from('characters')
        .delete()
        .eq('project_id', projectId)
        .not('id', 'in', `(${currentIds.length > 0 ? currentIds.join(',') : '00000000-0000-0000-0000-000000000000'})`);

    // Upsert current characters
    const rows = cleanChars.map((c: Character) => ({
        id: c.id,
        project_id: projectId,
        name: c.name,
        description: c.description,
        image_url: c.imageUrl,
        reference_photos: c.referencePhotos // Now properly persisted above
    }));
    if (rows.length > 0) await supabase.from('characters').upsert(rows);
};

/**
 * Fetches all outfits associated with a specific project.
 * 
 * @param projectId - Unique project ID.
 * @returns Array of Outfit assets.
 */
export const getOutfits = async (projectId: string): Promise<Outfit[]> => {
    const { data } = await supabase.from('outfits').select('*').eq('project_id', projectId);
    return (data || []).map((c: { id: string; character_id: string; name: string; description: string; reference_photos?: string[] }) => ({
        id: c.id,
        characterId: c.character_id,
        name: c.name,
        description: c.description,
        referencePhotos: c.reference_photos || []
    }));
};

/**
 * Saves or updates a list of outfits for a project. 
 * Handles deletion of outfits not present in the provided list.
 * 
 * @param projectId - Unique project ID.
 * @param outfits - The complete current list of outfits.
 */
export const saveOutfits = async (projectId: string, outfits: Outfit[]): Promise<void> => {
    const clean = await ensureImagesPersisted(projectId, outfits);
    const currentIds = clean.map((c: Outfit) => c.id);

    // Prune deleted outfits
    await supabase
        .from('outfits')
        .delete()
        .eq('project_id', projectId)
        .not('id', 'in', `(${currentIds.length > 0 ? currentIds.join(',') : '00000000-0000-0000-0000-000000000000'})`);

    // Upsert current outfits
    const rows = clean.map((c: Outfit) => ({
        id: c.id,
        project_id: projectId,
        character_id: c.characterId, // Now supported (after migration)
        name: c.name,
        description: c.description,
        reference_photos: c.referencePhotos
    }));
    if (rows.length > 0) await supabase.from('outfits').upsert(rows);
};

/**
 * Fetches all locations associated with a specific project.
 * 
 * @param projectId - Unique project ID.
 * @returns Array of Location assets.
 */
export const getLocations = async (projectId: string): Promise<Location[]> => {
    const { data } = await supabase.from('locations').select('*').eq('project_id', projectId);
    return (data || []).map((c: { id: string; name: string; description: string; reference_photos?: string[] }) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        referencePhotos: c.reference_photos || []
    }));
};

/**
 * Saves or updates a list of locations for a project. 
 * Handles deletion of locations not present in the provided list.
 * 
 * @param projectId - Unique project ID.
 * @param locs - The complete current list of locations.
 */
export const saveLocations = async (projectId: string, locs: Location[]): Promise<void> => {
    const clean = await ensureImagesPersisted(projectId, locs);
    const currentIds = clean.map((c: Location) => c.id);

    // Prune deleted locations
    await supabase
        .from('locations')
        .delete()
        .eq('project_id', projectId)
        .not('id', 'in', `(${currentIds.length > 0 ? currentIds.join(',') : '00000000-0000-0000-0000-000000000000'})`);

    // Upsert current locations
    const rows = clean.map((c: Location) => ({
        id: c.id,
        project_id: projectId,
        name: c.name,
        description: c.description,
        reference_photos: c.referencePhotos
    }));
    if (rows.length > 0) await supabase.from('locations').upsert(rows);
};

// --- STUBS for other/legacy ---
// Image Library - could add table later.
/**
 * Fetches the image library for a project, sorted by most recent first.
 * 
 * @param projectId - Unique project ID.
 * @returns Array of ImageLibraryItems.
 */
export const getImageLibrary = async (projectId: string): Promise<ImageLibraryItem[]> => {
    const { data, error } = await supabase
        .from('image_library')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(500);

    if (error) {
        console.error('Error loading image library:', error);
        return [];
    }

    return (data || []).map((item: { id: string; project_id: string; url: string; prompt?: string; metadata?: Record<string, unknown>; is_favorite?: boolean; created_at: string }) => ({
        id: item.id,
        projectId: item.project_id,
        url: item.url,
        prompt: item.prompt || '',
        metadata: item.metadata || {},
        isFavorite: item.is_favorite || false,
        createdAt: new Date(item.created_at).getTime()
    }));
};

/**
 * Deprecated: Individual images should be added via addToImageLibrary.
 */
export const saveImageLibrary = async (projectId: string, items: ImageLibraryItem[]): Promise<void> => {
    console.warn('saveImageLibrary is deprecated, use addToImageLibrary', projectId, items.length);
};

/**
 * Adds a single generated image to the project's permanent image library.
 * 
 * @param projectId - Project to add to.
 * @param url - Public URL or base64 data of the image.
 * @param prompt - The visual prompt used to generate the image.
 * @param metadata - Additional generation parameters (model, ratio, etc).
 * @returns The created image library record.
 */
export const addToImageLibrary = async (
    projectId: string,
    url: string,
    prompt?: string,
    metadata?: Record<string, unknown>
): Promise<ImageLibraryItem> => {
    const newItem = {
        id: crypto.randomUUID(),
        project_id: projectId,
        url,
        prompt: prompt || '',
        metadata: metadata || {},
        is_favorite: false,
        created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('image_library')
        .insert(newItem)
        .select()
        .single();

    if (error) {
        console.error('Error adding to image library:', error);
        throw error;
    }

    return {
        id: data.id,
        projectId: data.project_id,
        url: data.url,
        prompt: data.prompt,
        metadata: data.metadata,
        isFavorite: data.is_favorite,
        createdAt: new Date(data.created_at).getTime()
    };
};

/**
 * Adds multiple images to the image library in a single transaction.
 * 
 * @param projectId - Project to add to.
 * @param images - Array of image objects to persist.
 */
export const addBatchToImageLibrary = async (
    projectId: string,
    images: Array<{ url: string, prompt?: string, metadata?: Record<string, unknown> }>
): Promise<void> => {
    const items = images.map(img => ({
        id: crypto.randomUUID(),
        project_id: projectId,
        url: img.url,
        prompt: img.prompt || '',
        metadata: img.metadata || {},
        is_favorite: false,
        created_at: new Date().toISOString()
    }));

    const { error } = await supabase
        .from('image_library')
        .insert(items);

    if (error) {
        console.error('Error batch adding to image library:', error);
        throw error;
    }
};

/**
 * Toggles the favorite status of an image in the library.
 * 
 * @param projectId - Owner project ID.
 * @param imageId - ID of the image to toggle.
 * @param isFavorite - New favorite status.
 */
export const toggleImageFavorite = async (projectId: string, imageId: string, isFavorite: boolean): Promise<void> => {
    const { error } = await supabase
        .from('image_library')
        .update({ is_favorite: isFavorite })
        .eq('id', imageId)
        .eq('project_id', projectId);

    if (error) {
        console.error('Error toggling favorite:', error);
        throw error;
    }
};

// Story Dev
export const getPlotDevelopment = async () => undefined;
export const savePlotDevelopment = async () => { };
export const getCharacterDevelopments = async (projectId: string): Promise<CharacterDevelopment[]> => [];
export const saveCharacterDevelopments = async (projectId: string, chars: CharacterDevelopment[]) => { };
export const getStoryBeats = async () => [];
export const saveStoryBeats = async () => { };
export const getStoryMetadata = async () => ({ lastUpdated: Date.now() });
export const saveStoryMetadata = async () => { };
/**
 * Retrieves all story notes for a project, ordered by their manually defined index.
 * 
 * @param projectId - Unique project ID.
 * @returns The story notes collection.
 */
export const getStoryNotes = async (projectId: string): Promise<StoryNotesData> => {
    const { data, error } = await supabase
        .from('story_notes')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index', { ascending: true }); // 🔥 Using order_index for sorting

    if (error) {
        console.error('Error loading story notes:', error);
        return { notes: [], activeNoteId: null };
    }

    const notes: StoryNote[] = (data || []).map((n: { id: string; title: string; content: string; order_index?: number; created_at: string; updated_at: string }) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        order: n.order_index || 0,
        createdAt: new Date(n.created_at).getTime(),
        updatedAt: new Date(n.updated_at).getTime()
    }));

    return {
        notes,
        activeNoteId: notes.length > 0 ? notes[0].id : null
    };
};

/**
 * Spawns a new empty story note at the end of the project's notes list.
 * 
 * @param projectId - Project to add to.
 * @returns The new StoryNote record.
 */
export const createStoryNote = async (projectId: string): Promise<StoryNote> => {
    // Get highest order to append
    const { data: latest } = await supabase
        .from('story_notes')
        .select('order_index')
        .eq('project_id', projectId)
        .order('order_index', { ascending: false })
        .limit(1)
        .single();

    const nextOrder = latest ? (latest.order_index + 1) : 0;

    const newNote = {
        id: crypto.randomUUID(),
        project_id: projectId,
        title: '',
        content: '',
        order_index: nextOrder,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('story_notes')
        .insert(newNote)
        .select()
        .single();

    if (error) {
        console.error('Error creating story note:', error);
        throw error;
    }

    return {
        id: data.id,
        title: data.title,
        content: data.content,
        order: data.order_index,
        createdAt: new Date(data.created_at).getTime(),
        updatedAt: new Date(data.updated_at).getTime()
    };
};

/**
 * Updates an existing story note with the specified partial fields.
 * 
 * @param projectId - Owner project ID.
 * @param noteId - ID of the note to update.
 * @param updates - Partial object containing title, content, or order.
 */
export const updateStoryNote = async (projectId: string, noteId: string, updates: Partial<StoryNote>): Promise<void> => {
    const dbUpdates: Record<string, unknown> = {
        updated_at: new Date().toISOString()
    };

    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.content !== undefined) dbUpdates.content = updates.content;
    if (updates.order !== undefined) dbUpdates.order_index = updates.order;

    const { error } = await supabase
        .from('story_notes')
        .update(dbUpdates)
        .eq('id', noteId)
        .eq('project_id', projectId);

    if (error) {
        console.error('Error updating story note:', error);
        throw error;
    }
};

/**
 * Permanent deletion of a story note.
 * 
 * @param projectId - Owner project ID.
 * @param noteId - ID of the note to erase.
 */
export const deleteStoryNote = async (projectId: string, noteId: string): Promise<void> => {
    const { error } = await supabase
        .from('story_notes')
        .delete()
        .eq('id', noteId)
        .eq('project_id', projectId);

    if (error) {
        console.error('Error deleting story note:', error);
        throw error;
    }
};

/** Scheduled cleanup stub */
export const garbageCollect = async (): Promise<void> => { };

/** Legacy compatibility stub for IndexedDB */
export const openDB = async (): Promise<never> => {
    throw new Error('IndexedDB operations have been migrated to Supabase. Use sydChatStore for thread management.');
};

/** Stub for JSON exports */
export const exportProjectToJSON = async (projectId: string): Promise<string> => {
    console.log(projectId);
    return "{}";
};

/** Stub for JSON imports */
export const importProjectFromJSON = async (json: string): Promise<string> => {
    console.log(json);
    return "";
};

// --- MIGRATION CHECK ---
// A simple check to alert functionality
console.log("Supabase Storage Loaded");
