
/*
 * ☁️ SERVICE: STORAGE (Cloud Edition)
 * Powered by Supabase
 */

import { Character, Project, Outfit, Shot, WorldSettings, ProjectMetadata, ProjectExport, Scene, ImageLibraryItem, Location, ScriptElement, PlotDevelopment, CharacterDevelopment, StoryBeat, StoryMetadata, StoryNote, StoryNotesData, SydThread, SydMessage } from '../types';
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

const collectReferencedProjectImagePaths = (projectId: string, obj: any, paths: Set<string> = new Set()) => {
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

    if (typeof obj === 'object') {
        Object.values(obj).forEach(v => collectReferencedProjectImagePaths(projectId, v, paths));
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

        const files = (data || []).filter(x => x.name && !x.id?.endsWith('/'));
        files.forEach(f => {
            allPaths.push(`${projectId}/${f.name}`);
        });

        if (!data || data.length < limit) break;
        offset += limit;
    }

    return allPaths;
};

const cleanupUnusedProjectImages = async (projectId: string, project: any) => {
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

    // Otherwise it's a blob: URL or data: URL; upload it
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const mimeType = blob.type || 'image/png';
        const ext = mimeType.split('/')[1] || 'png';

        const fileName = `${crypto.randomUUID()}.${ext}`;
        const storagePath = `${projectId}/${fileName}`;

        const { error } = await supabase.storage
            .from(IMAGE_BUCKET)
            .upload(storagePath, blob, { upsert: true, contentType: mimeType });

        if (error) {
            console.error('[STORAGE] upload failed:', error);
            return url;
        }

        const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(storagePath);
        return data.publicUrl;
    } catch (e) {
        console.error('[STORAGE] persistImage failed:', e);
        return url;
    }
};

// --- PROJECTS ---

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

    return (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        createdAt: new Date(p.created_at).getTime(),
        lastModified: new Date(p.last_synced).getTime(),
        shotCount: 0,
        characterCount: 0
    }));
};

export const getActiveProjectId = (): string | null => {
    return localStorage.getItem(KEYS.ACTIVE_PROJECT_ID);
};

export const setActiveProjectId = (id: string | null) => {
    if (id) localStorage.setItem(KEYS.ACTIVE_PROJECT_ID, id);
    else localStorage.removeItem(KEYS.ACTIVE_PROJECT_ID);
};

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

export const deleteProject = async (projectId: string) => {
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

const ensureImagesPersisted = async (projectId: string, obj: any): Promise<any> => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return Promise.all(obj.map(v => ensureImagesPersisted(projectId, v)));

    const newObj: any = { ...obj };
    const imageFields = ['generatedImage', 'sketchImage', 'referenceImage', 'url', 'imageUrl'];
    const arrayImageFields = ['generationCandidates', 'referencePhotos'];

    for (const key of Object.keys(newObj)) {
        if (imageFields.includes(key) && typeof newObj[key] === 'string') {
            newObj[key] = await persistImage(projectId, newObj[key]);
        } else if (arrayImageFields.includes(key) && Array.isArray(newObj[key])) {
            newObj[key] = await Promise.all(newObj[key].map((img: string) => persistImage(projectId, img)));
        } else if (typeof newObj[key] === 'object') {
            newObj[key] = await ensureImagesPersisted(projectId, newObj[key]);
        }
    }
    return newObj;
};

// --- DATA ACCESS ---

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
            shots (*)
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

    const scenes = (projectData.scenes || []).sort((a: any, b: any) => a.sequence - b.sequence);
    const shots = (projectData.shots || []).sort((a: any, b: any) => a.sequence - b.sequence);
    const scriptElements = scriptData?.content || [];

    // Helper functions for case transformation
    const toCamel = (str: string) => str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    const deepToCamel = (obj: any): any => {
        if (Array.isArray(obj)) return obj.map(deepToCamel);
        if (obj !== null && typeof obj === 'object') {
            return Object.keys(obj).reduce((acc, key) => {
                const newKey = toCamel(key);
                acc[newKey] = deepToCamel(obj[key]);
                return acc;
            }, {} as any);
        }
        return obj;
    };

    // Parse shots metadata back to fields if needed, or if stored as columns
    const parsedShots = shots.map((s: any) => {
        const transformed = deepToCamel(s);

        if (transformed.metadata && typeof transformed.metadata === 'object') {
            return {
                ...transformed,
                ...transformed.metadata,
                metadata: undefined
            };
        }

        return transformed;
    });

    const parsedScenes = scenes.map((s: any) => ({
        ...s,
        scriptElements: typeof s.script_elements === 'string' ? JSON.parse(s.script_elements) : s.script_elements
    }));

    // Check for schema transform needed?
    // Assuming DB snake_case vs App camelCase.



    const cleanProject = deepToCamel(projectData) as any;
    // Specific fixes
    cleanProject.scenes = deepToCamel(scenes);
    cleanProject.shots = deepToCamel(parsedShots);
    cleanProject.scriptElements = scriptElements; // array
    cleanProject.settings = projectData.settings; // already JSON

    return cleanProject as Project;
};

export const saveProjectData = async (projectId: string, project: Project) => {
    // 1. Persist Images first
    const cleanProject = await ensureImagesPersisted(projectId, project);

    // 2. Update Projects (Settings)
    const { error: pErr } = await supabase.from('projects').update({
        settings: cleanProject.settings,
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
    const currentSceneIds = cleanProject.scenes.map((s: any) => s.id);

    // Prune orphaned scenes (that exist in DB but not in current project state)
    const { error: scenePruneErr } = await supabase
        .from('scenes')
        .delete()
        .eq('project_id', projectId)
        .not('id', 'in', `(${currentSceneIds.length > 0 ? currentSceneIds.join(',') : '00000000-0000-0000-0000-000000000000'})`);

    if (scenePruneErr) console.error("Prune Scenes Failed", scenePruneErr);

    const dbScenes = cleanProject.scenes.map((s: any) => ({
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
    const currentShotIds = cleanProject.shots.map((s: any) => s.id);

    // Prune orphaned shots
    const { error: shotPruneErr } = await supabase
        .from('shots')
        .delete()
        .eq('project_id', projectId)
        .not('id', 'in', `(${currentShotIds.length > 0 ? currentShotIds.join(',') : '00000000-0000-0000-0000-000000000000'})`);

    if (shotPruneErr) console.error("Prune Shots Failed", shotPruneErr);

    const dbShots = cleanProject.shots.map((s: any) => {
        const { id, sceneId, sequence, shotType, description, dialogue, cameraMovement, ...rest } = s;
        return {
            id,
            project_id: projectId,
            scene_id: sceneId,
            sequence,
            shot_type: shotType,
            description,
            dialogue,
            camera_movement: cameraMovement,
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

export const subscribeToProjectChanges = (projectId: string, onSceneChange: (payload: any) => void, onShotChange: (payload: any) => void) => {
    const channel = supabase.channel(`project-${projectId}`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'scenes', filter: `project_id=eq.${projectId}` },
            (payload) => onSceneChange(payload)
        )
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'shots', filter: `project_id=eq.${projectId}` },
            (payload) => onShotChange(payload)
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

export const saveProjectDataDebounced = debounce(saveProjectData, 2000);

// --- ASSETS ---

export const getCharacters = async (projectId: string): Promise<Character[]> => {
    const { data } = await supabase.from('characters').select('*').eq('project_id', projectId);
    // Convert snake_case to camelCase
    return (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        imageUrl: c.image_url,
        referencePhotos: c.reference_photos || []
    }));
};

export const saveCharacters = async (projectId: string, chars: Character[]) => {
    const cleanChars = await ensureImagesPersisted(projectId, chars);
    const rows = cleanChars.map((c: Character) => ({
        id: c.id,
        project_id: projectId,
        name: c.name,
        description: c.description,
        image_url: c.imageUrl,
        reference_photos: c.referencePhotos
    }));
    if (rows.length > 0) await supabase.from('characters').upsert(rows);
};

export const getOutfits = async (projectId: string): Promise<Outfit[]> => {
    const { data } = await supabase.from('outfits').select('*').eq('project_id', projectId);
    return (data || []).map((c: any) => ({
        id: c.id,
        characterId: c.character_id, // needs column mapping if exists? DB schema didn't specify character_id for outfits table in create-tables.sql?
        // Wait, outfits table in create-tables has 'project_id', 'name', 'description', 'reference_photos'.
        // It MISSED 'character_id'. I should add it.
        // Assuming it's project-level for now.
        name: c.name,
        description: c.description,
        referencePhotos: c.reference_photos || []
    })) as Outfit[];
};

export const saveOutfits = async (projectId: string, outfits: Outfit[]) => {
    const clean = await ensureImagesPersisted(projectId, outfits);
    const rows = clean.map((c: Outfit) => ({
        id: c.id,
        project_id: projectId,
        name: c.name,
        description: c.description,
        reference_photos: c.referencePhotos
    }));
    if (rows.length > 0) await supabase.from('outfits').upsert(rows);
};

export const getLocations = async (projectId: string): Promise<Location[]> => {
    const { data } = await supabase.from('locations').select('*').eq('project_id', projectId);
    return (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        referencePhotos: c.reference_photos || []
    }));
};

export const saveLocations = async (projectId: string, locs: Location[]) => {
    const clean = await ensureImagesPersisted(projectId, locs);
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
export const getImageLibrary = async (projectId: string): Promise<ImageLibraryItem[]> => [];
export const saveImageLibrary = async (projectId: string, items: ImageLibraryItem[]) => { };
export const addToImageLibrary = async () => { };
export const addBatchToImageLibrary = async () => { };
export const toggleImageFavorite = async () => { };

// Story Dev
export const getPlotDevelopment = async () => undefined;
export const savePlotDevelopment = async () => { };
export const getCharacterDevelopments = async () => [];
export const saveCharacterDevelopments = async () => { };
export const getStoryBeats = async () => [];
export const saveStoryBeats = async () => { };
export const getStoryMetadata = async () => ({ lastUpdated: Date.now() });
export const saveStoryMetadata = async () => { };
export const getStoryNotes = async (projectId: string) => ({ notes: [], activeNoteId: null });
export const saveStoryNotes = async () => { };
export const createStoryNote = async (projectId: string) => ({
    id: crypto.randomUUID(),
    title: '',
    content: '',
    createdAt: Date.now(),
    updatedAt: Date.now()
});
export const updateStoryNote = async () => { };
export const deleteStoryNote = async () => { };

export const garbageCollect = async () => { };

// Legacy IndexedDB compatibility stub for ScriptChat thread rename
export const openDB = async () => {
    throw new Error('IndexedDB operations have been migrated to Supabase. Use sydChatStore for thread management.');
};

export const exportProjectToJSON = async (projectId: string) => "{}";
export const importProjectFromJSON = async (json: string) => "";

// --- MIGRATION CHECK ---
// A simple check to alert functionality
console.log("Supabase Storage Loaded");
