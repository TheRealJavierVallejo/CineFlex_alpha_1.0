/*
 * 💾 SERVICE: STORAGE (The Memory Bank)
 * Refactored for Detached Blob Storage (High Performance) & Zod Validation
 */

import { Character, Project, Outfit, Shot, WorldSettings, ProjectMetadata, ProjectExport, Scene, ImageLibraryItem } from '../types';
import { DEFAULT_WORLD_SETTINGS } from '../constants';
import { debounce } from '../utils/debounce';
import { ProjectSchema, ProjectExportSchema, CharacterSchema, OutfitSchema, ImageLibraryItemSchema } from './schemas';
import { z } from 'zod';

const KEYS = {
  ACTIVE_PROJECT_ID: 'cinesketch_active_project_id',
  PROJECTS_LIST: 'cinesketch_projects_list',
  PROJECT_PREFIX: 'project_'
};

const DB_NAME = 'CineSketchDB';
const DB_VERSION = 2; // Upgraded Schema
const STORE_NAME = 'project_data';
const IMAGE_STORE_NAME = 'image_data';

// --- DATABASE HELPERS ---

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
        db.createObjectStore(IMAGE_STORE_NAME);
      }
    };
  });
};

// Generic DB Get
const dbGet = async <T>(storeName: string, key: string): Promise<T | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as T);
    });
  } catch (e) {
    console.error(`DB Read Error (${storeName}):`, e);
    return null;
  }
};

// Generic DB Set
const dbSet = async (storeName: string, key: string, value: any): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(value, key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

// Generic DB Delete
const dbDelete = async (storeName: string, key: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

// --- HYDRATION ENGINE (The Magic Part) ---
// These functions convert Base64/URLs <-> DB References

const REF_PREFIX = '{{IMG::';
const REF_SUFFIX = '}}';

const isImageRef = (str: string) => str.startsWith(REF_PREFIX) && str.endsWith(REF_SUFFIX);
const extractIdFromRef = (ref: string) => ref.substring(REF_PREFIX.length, ref.length - REF_SUFFIX.length);
const createRef = (id: string) => `${REF_PREFIX}${id}${REF_SUFFIX}`;

/**
 * Saves an image string (Base64 or Blob URL) to the Image Store and returns a Reference ID.
 */
const persistImage = async (dataUrlOrBlobUrl: string, existingId?: string): Promise<string> => {
  // If it's already a reference, ignore
  if (isImageRef(dataUrlOrBlobUrl)) return dataUrlOrBlobUrl;
  
  // If it's empty, return empty
  if (!dataUrlOrBlobUrl) return dataUrlOrBlobUrl;

  const id = existingId || crypto.randomUUID();
  let blob: Blob;

  try {
      // Convert Base64 or Blob URL to Blob
      const response = await fetch(dataUrlOrBlobUrl);
      blob = await response.blob();
      
      // Save Blob to IDB
      await dbSet(IMAGE_STORE_NAME, id, blob);
      
      // Return the reference tag
      return createRef(id);
  } catch (e) {
      console.error("Failed to persist image", e);
      return dataUrlOrBlobUrl; // Fallback: keep original string if save fails
  }
};

/**
 * Loads a Reference ID from the Image Store and returns a usable Blob URL.
 */
const hydrateImage = async (ref: string): Promise<string> => {
    if (!isImageRef(ref)) return ref; // Already a normal string
    
    const id = extractIdFromRef(ref);
    try {
        const blob = await dbGet<Blob>(IMAGE_STORE_NAME, id);
        if (blob) {
            return URL.createObjectURL(blob);
        }
        return ''; // Image missing
    } catch (e) {
        console.error("Failed to hydrate image", id, e);
        return '';
    }
};

/**
 * Deep traverses an object, finds images, and persists them.
 */
const dehydrateObject = async (obj: any): Promise<any> => {
    if (!obj) return obj;
    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
        return Promise.all(obj.map(item => dehydrateObject(item)));
    }

    const newObj: any = { ...obj };

    // Common fields that contain images
    const imageFields = ['generatedImage', 'sketchImage', 'referenceImage', 'url', 'imageUrl'];
    const arrayImageFields = ['generationCandidates', 'referencePhotos'];

    for (const key of Object.keys(newObj)) {
        if (imageFields.includes(key) && typeof newObj[key] === 'string') {
            // Persist single image
            newObj[key] = await persistImage(newObj[key]);
        } 
        else if (arrayImageFields.includes(key) && Array.isArray(newObj[key])) {
            // Persist array of images
            newObj[key] = await Promise.all(newObj[key].map((img: string) => persistImage(img)));
        }
        else if (typeof newObj[key] === 'object') {
            // Recurse
            newObj[key] = await dehydrateObject(newObj[key]);
        }
    }

    return newObj;
};

/**
 * Deep traverses an object, finds references, and loads them.
 */
const hydrateObject = async (obj: any): Promise<any> => {
    if (!obj) return obj;
    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
        return Promise.all(obj.map(item => hydrateObject(item)));
    }

    const newObj: any = { ...obj };

    for (const key of Object.keys(newObj)) {
        const val = newObj[key];
        
        if (typeof val === 'string' && isImageRef(val)) {
            newObj[key] = await hydrateImage(val);
        }
        else if (Array.isArray(val)) {
            // Check if array contains strings that are refs
            if (val.length > 0 && typeof val[0] === 'string' && isImageRef(val[0])) {
                 newObj[key] = await Promise.all(val.map((v: string) => hydrateImage(v)));
            } else {
                 newObj[key] = await Promise.all(val.map(item => hydrateObject(item)));
            }
        }
        else if (typeof val === 'object') {
            newObj[key] = await hydrateObject(val);
        }
    }
    return newObj;
};


// --- PUBLIC API ---

const getStorageKey = (projectId: string, suffix: string) => {
  return `${KEYS.PROJECT_PREFIX}${projectId}_${suffix}`;
};

export const getProjectsList = (): ProjectMetadata[] => {
  try {
    const raw = localStorage.getItem(KEYS.PROJECTS_LIST);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
};

const saveProjectsList = (list: ProjectMetadata[]) => {
  localStorage.setItem(KEYS.PROJECTS_LIST, JSON.stringify(list));
};

export const getActiveProjectId = (): string | null => {
  return localStorage.getItem(KEYS.ACTIVE_PROJECT_ID);
};

export const setActiveProjectId = (id: string | null) => {
  if (id) localStorage.setItem(KEYS.ACTIVE_PROJECT_ID, id);
  else localStorage.removeItem(KEYS.ACTIVE_PROJECT_ID);
};

export const createNewProject = async (name: string): Promise<string> => {
  const projectId = crypto.randomUUID();
  const sceneId = crypto.randomUUID();
  const now = Date.now();

  const newProject: Project = {
    id: projectId,
    name: name,
    settings: { ...DEFAULT_WORLD_SETTINGS, customEras: [], customStyles: [], customTimes: [], customLighting: [], customLocations: [] },
    scenes: [{ id: sceneId, sequence: 1, heading: 'INT. UNTITLED SCENE - DAY', actionNotes: '' }],
    shots: [],
    createdAt: now,
    lastModified: now
  };

  await saveProjectData(projectId, newProject);

  const metadata: ProjectMetadata = {
    id: projectId, name: name, createdAt: now, lastModified: now, shotCount: 0, characterCount: 0
  };
  const list = getProjectsList();
  saveProjectsList([metadata, ...list]);

  return projectId;
};

export const deleteProject = async (projectId: string) => {
  await dbDelete(STORE_NAME, getStorageKey(projectId, 'settings'));
  await dbDelete(STORE_NAME, getStorageKey(projectId, 'shots'));
  await dbDelete(STORE_NAME, getStorageKey(projectId, 'scenes'));
  await dbDelete(STORE_NAME, getStorageKey(projectId, 'characters'));
  await dbDelete(STORE_NAME, getStorageKey(projectId, 'outfits'));
  await dbDelete(STORE_NAME, getStorageKey(projectId, 'metadata'));
  await dbDelete(STORE_NAME, getStorageKey(projectId, 'library'));

  const list = getProjectsList();
  const updatedList = list.filter(p => p.id !== projectId);
  saveProjectsList(updatedList);

  if (getActiveProjectId() === projectId) setActiveProjectId(null);
};

// --- DATA ACCESS ---

export const getProjectData = async (projectId: string): Promise<Project | null> => {
  const settingsKey = getStorageKey(projectId, 'settings');
  const shotsKey = getStorageKey(projectId, 'shots');
  const scenesKey = getStorageKey(projectId, 'scenes');
  const metadataKey = getStorageKey(projectId, 'metadata');

  const [settings, shots, scenes, metadata] = await Promise.all([
    dbGet<WorldSettings>(STORE_NAME, settingsKey),
    dbGet<Shot[]>(STORE_NAME, shotsKey),
    dbGet<Scene[]>(STORE_NAME, scenesKey),
    dbGet<any>(STORE_NAME, metadataKey)
  ]);

  if (!metadata && !settings) return null;

  // 1. Construct Raw Object
  const rawProject = {
    id: projectId,
    name: metadata?.name || 'Untitled',
    settings: settings || { ...DEFAULT_WORLD_SETTINGS },
    shots: shots || [],
    scenes: scenes || [],
    createdAt: metadata?.createdAt || Date.now(),
    lastModified: metadata?.lastModified || Date.now(),
    scriptElements: [] // Default for now, usually empty on simple load unless hydrated elsewhere
  };

  // 2. VALIDATE & HEAL (Zod)
  // This step fills in default values for any missing fields from old schema versions
  const parseResult = ProjectSchema.safeParse(rawProject);
  
  if (!parseResult.success) {
      console.warn(`Project ${projectId} schema validation failed. Auto-healing enabled.`, parseResult.error);
      // We continue with the raw project if Zod completely fails, but safeParse + defaults usually fixes it.
      // However, creating a new "Healed" object from the parsed output is better if successful.
  }
  
  const healedProject = parseResult.success ? parseResult.data : rawProject;

  // 3. LEGACY MIGRATION (Manual)
  if (!healedProject.scenes || healedProject.scenes.length === 0) {
     const defId = crypto.randomUUID();
     healedProject.scenes = [{ id: defId, sequence: 1, heading: 'INT. IMPORTED SCENE - DAY', actionNotes: '' }];
     healedProject.shots = healedProject.shots.map(s => ({ ...s, sceneId: s.sceneId || defId }));
  }

  // 4. HYDRATE (Blobs)
  console.log(`💧 Hydrating Project: ${healedProject.name}`);
  const hydratedProject = await hydrateObject(healedProject);
  
  return hydratedProject as Project;
};

export const saveProjectData = async (projectId: string, project: Project) => {
  const settingsKey = getStorageKey(projectId, 'settings');
  const shotsKey = getStorageKey(projectId, 'shots');
  const scenesKey = getStorageKey(projectId, 'scenes');
  const metadataKey = getStorageKey(projectId, 'metadata');

  const metadata = {
    id: projectId,
    name: project.name,
    createdAt: project.createdAt,
    lastModified: Date.now(),
    shotCount: project.shots.length
  };

  // DEHYDRATE: Turn Blobs into References
  const dehydratedProject = await dehydrateObject(project);

  await Promise.all([
    dbSet(STORE_NAME, settingsKey, dehydratedProject.settings),
    dbSet(STORE_NAME, shotsKey, dehydratedProject.shots),
    dbSet(STORE_NAME, scenesKey, dehydratedProject.scenes),
    dbSet(STORE_NAME, metadataKey, metadata)
  ]);

  const list = getProjectsList();
  const index = list.findIndex(p => p.id === projectId);
  if (index !== -1) {
    list[index] = { ...list[index], shotCount: project.shots.length, lastModified: Date.now() };
    saveProjectsList(list);
  }
};

export const saveProjectDataDebounced = debounce(saveProjectData, 1000);

// --- ASSETS (Characters/Outfits) ---

export const getCharacters = async (projectId: string): Promise<Character[]> => {
  const data = await dbGet<Character[]>(STORE_NAME, getStorageKey(projectId, 'characters'));
  const raw = data || [];
  
  // Validate and Heal
  const parsed = z.array(CharacterSchema).safeParse(raw);
  const healed = parsed.success ? parsed.data : raw;

  return await hydrateObject(healed);
};

export const saveCharacters = async (projectId: string, chars: Character[]) => {
  const dehydrated = await dehydrateObject(chars);
  await dbSet(STORE_NAME, getStorageKey(projectId, 'characters'), dehydrated);
  
  // Update count
  const list = getProjectsList();
  const index = list.findIndex(p => p.id === projectId);
  if (index !== -1) {
      list[index].characterCount = chars.length;
      saveProjectsList(list);
  }
};

export const getOutfits = async (projectId: string): Promise<Outfit[]> => {
  const data = await dbGet<Outfit[]>(STORE_NAME, getStorageKey(projectId, 'outfits'));
  const raw = data || [];
  const parsed = z.array(OutfitSchema).safeParse(raw);
  const healed = parsed.success ? parsed.data : raw;
  return await hydrateObject(healed);
};

export const saveOutfits = async (projectId: string, outfits: Outfit[]) => {
  const dehydrated = await dehydrateObject(outfits);
  await dbSet(STORE_NAME, getStorageKey(projectId, 'outfits'), dehydrated);
};

// --- IMAGE LIBRARY ---

export const getImageLibrary = async (projectId: string): Promise<ImageLibraryItem[]> => {
  const data = await dbGet<ImageLibraryItem[]>(STORE_NAME, getStorageKey(projectId, 'library'));
  const raw = data || [];
  const parsed = z.array(ImageLibraryItemSchema).safeParse(raw);
  const healed = parsed.success ? parsed.data : raw;
  return await hydrateObject(healed);
};

export const saveImageLibrary = async (projectId: string, items: ImageLibraryItem[]) => {
  const dehydrated = await dehydrateObject(items);
  await dbSet(STORE_NAME, getStorageKey(projectId, 'library'), dehydrated);
};

export const addToImageLibrary = async (projectId: string, item: ImageLibraryItem) => {
  const current = await getImageLibrary(projectId);
  const updated = [item, ...current];
  await saveImageLibrary(projectId, updated);
};

export const addBatchToImageLibrary = async (projectId: string, items: ImageLibraryItem[]) => {
  const current = await getImageLibrary(projectId);
  const updated = [...items, ...current];
  await saveImageLibrary(projectId, updated);
};

export const toggleImageFavorite = async (projectId: string, imageId: string) => {
  const current = await getImageLibrary(projectId);
  const updated = current.map(img => img.id === imageId ? { ...img, isFavorite: !img.isFavorite } : img);
  await saveImageLibrary(projectId, updated);
};

// --- EXPORT / IMPORT ---

export const exportProjectToJSON = async (projectId: string): Promise<string> => {
  // For export, we actually want to RE-HYDRATE everything back to Base64
  // So the JSON file is self-contained (portable)
  const project = await getProjectData(projectId);
  const characters = await getCharacters(projectId);
  const outfits = await getOutfits(projectId);

  if (!project) throw new Error("Project not found");

  // We need to convert Blob URLs back to Base64 for the export file
  const convertBlobUrlToBase64 = async (blobUrl: string): Promise<string> => {
      if (!blobUrl || !blobUrl.startsWith('blob:')) return blobUrl;
      const response = await fetch(blobUrl);
      const blob = await response.blob();
      return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
      });
  };

  const deepConvertToBase64 = async (obj: any): Promise<any> => {
      if (!obj || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return Promise.all(obj.map(deepConvertToBase64));
      
      const newObj: any = { ...obj };
      const imageFields = ['generatedImage', 'sketchImage', 'referenceImage', 'url'];
      const arrayImageFields = ['generationCandidates', 'referencePhotos'];

      for (const key of Object.keys(newObj)) {
          if (imageFields.includes(key) && typeof newObj[key] === 'string') {
              newObj[key] = await convertBlobUrlToBase64(newObj[key]);
          } else if (arrayImageFields.includes(key) && Array.isArray(newObj[key])) {
              newObj[key] = await Promise.all(newObj[key].map((url: string) => convertBlobUrlToBase64(url)));
          } else if (typeof newObj[key] === 'object') {
              newObj[key] = await deepConvertToBase64(newObj[key]);
          }
      }
      return newObj;
  };

  const portableProject = await deepConvertToBase64(project);
  const portableCharacters = await deepConvertToBase64(characters);
  const portableOutfits = await deepConvertToBase64(outfits);

  // Validate on Export to ensure we aren't creating broken files
  const exportData = {
    version: 2,
    metadata: {
      id: project.id,
      name: project.name,
      createdAt: project.createdAt,
      lastModified: project.lastModified,
      shotCount: project.shots.length,
      characterCount: characters.length
    },
    project: portableProject,
    characters: portableCharacters,
    outfits: portableOutfits
  };

  // We could strictly validate export here, but sometimes we want to allow 
  // users to export broken projects to fix them elsewhere.
  return JSON.stringify(exportData, null, 2);
};

export const importProjectFromJSON = async (jsonString: string): Promise<string> => {
  try {
    const rawData = JSON.parse(jsonString);
    
    // 1. VALIDATE IMPORTED DATA
    // This is the most critical step. We check if the uploaded JSON matches our Schema.
    // If fields are missing, Zod fills them with defaults.
    const parseResult = ProjectExportSchema.safeParse(rawData);
    
    if (!parseResult.success) {
       console.error("Import Validation Failed:", parseResult.error);
       // We throw specifically so the UI knows it's a format issue
       throw new Error("Invalid Project File. Data is corrupted or outdated.");
    }
    
    const data = parseResult.data;

    // The imported data contains Base64 strings.
    // saveProjectData will automatically DEHYDRATE them into the Image Store!
    const projectId = data.project.id;

    // Ensure backwards compat for Scene Architecture (extra safety check)
    if (!data.project.scenes || data.project.scenes.length === 0) {
        const defId = crypto.randomUUID();
        data.project.scenes = [{ id: defId, sequence: 1, heading: 'INT. SCENE - DAY', actionNotes: '' }];
        data.project.shots = data.project.shots.map(s => ({ ...s, sceneId: defId }));
    }

    await saveProjectData(projectId, data.project as Project);
    await saveCharacters(projectId, data.characters as Character[] || []);
    await saveOutfits(projectId, data.outfits as Outfit[] || []);

    const list = getProjectsList();
    const filtered = list.filter(p => p.id !== projectId);
    saveProjectsList([data.metadata, ...filtered]);

    return projectId;
  } catch (e) {
    console.error("Import failed", e);
    throw e;
  }
};