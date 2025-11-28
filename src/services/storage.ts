/*
 * 💾 SERVICE: STORAGE (The Memory Bank)
 * Refactored for Detached Blob Storage (High Performance) & Zod Validation
 * NOW INCLUDES: Garbage Collection, Schema Migration, and Sanitization
 */

import { Character, Project, Outfit, Shot, WorldSettings, ProjectMetadata, ProjectExport, Scene, ImageLibraryItem, Location, ScriptElement } from '../types';
import { DEFAULT_WORLD_SETTINGS } from '../constants';
import { debounce } from '../utils/debounce';
import { ProjectSchema, ProjectExportSchema, CharacterSchema, OutfitSchema, ImageLibraryItemSchema, LocationSchema } from './schemas';
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

const dbGetAllKeys = async (storeName: string): Promise<IDBValidKey[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAllKeys();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
};

// --- HYDRATION ENGINE ---

const REF_PREFIX = '{{IMG::';
const REF_SUFFIX = '}}';

const isImageRef = (str: string) => str.startsWith(REF_PREFIX) && str.endsWith(REF_SUFFIX);
const extractIdFromRef = (ref: string) => ref.substring(REF_PREFIX.length, ref.length - REF_SUFFIX.length);
const createRef = (id: string) => `${REF_PREFIX}${id}${REF_SUFFIX}`;

const persistImage = async (dataUrlOrBlobUrl: string, existingId?: string): Promise<string> => {
  if (isImageRef(dataUrlOrBlobUrl)) return dataUrlOrBlobUrl;
  if (!dataUrlOrBlobUrl) return dataUrlOrBlobUrl;

  const id = existingId || crypto.randomUUID();
  let blob: Blob;

  try {
    const response = await fetch(dataUrlOrBlobUrl);
    blob = await response.blob();
    await dbSet(IMAGE_STORE_NAME, id, blob);
    return createRef(id);
  } catch (e) {
    console.error("Failed to persist image", e);
    return dataUrlOrBlobUrl;
  }
};

const hydrateImage = async (ref: string): Promise<string> => {
  if (!isImageRef(ref)) return ref;
  const id = extractIdFromRef(ref);
  try {
    const blob = await dbGet<Blob>(IMAGE_STORE_NAME, id);
    if (blob) {
      return URL.createObjectURL(blob);
    }
    return '';
  } catch (e) {
    console.error("Failed to hydrate image", id, e);
    return '';
  }
};

const dehydrateObject = async (obj: any): Promise<any> => {
  if (!obj) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return Promise.all(obj.map(item => dehydrateObject(item)));
  }

  const newObj: any = { ...obj };
  const imageFields = ['generatedImage', 'sketchImage', 'referenceImage', 'url', 'imageUrl'];
  const arrayImageFields = ['generationCandidates', 'referencePhotos'];

  for (const key of Object.keys(newObj)) {
    if (imageFields.includes(key) && typeof newObj[key] === 'string') {
      newObj[key] = await persistImage(newObj[key]);
    }
    else if (arrayImageFields.includes(key) && Array.isArray(newObj[key])) {
      newObj[key] = await Promise.all(newObj[key].map((img: string) => persistImage(img)));
    }
    else if (typeof newObj[key] === 'object') {
      newObj[key] = await dehydrateObject(newObj[key]);
    }
  }

  return newObj;
};

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

const getStorageKey = (projectId: string, suffix: string) => `${KEYS.PROJECT_PREFIX}${projectId}_${suffix}`;

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

// --- MIGRATION & SANITIZATION ---

const sanitizeForExport = (project: Project): Project => {
    // 1. Remove volatile state
    const cleanProject = { ...project };
    
    // Clear generation flags
    cleanProject.shots = cleanProject.shots.map(s => ({
        ...s,
        generationInProgress: false
    }));
    
    // Future sanitization steps can go here
    return cleanProject;
};

const migrateProject = (rawProject: any): Project => {
    // V1 -> V2 Migration
    if (!rawProject.shots) rawProject.shots = [];
    if (!rawProject.scenes) rawProject.scenes = [];
    
    // Ensure Script File structure exists
    if (rawProject.scriptFile === undefined) rawProject.scriptFile = undefined;
    
    // Ensure all shots have basic defaults if missing
    rawProject.shots = rawProject.shots.map((s: any) => ({
        ...s,
        shotType: s.shotType || 'Wide Shot',
        styleStrength: s.styleStrength ?? 100,
        controlType: s.controlType || 'depth',
        characterIds: s.characterIds || [],
        generationCandidates: s.generationCandidates || []
    }));

    return rawProject as Project;
};


export const createNewProject = async (name: string): Promise<string> => {
  const projectId = crypto.randomUUID();
  const now = Date.now();

  const newProject: Project = {
    id: projectId,
    name: name,
    settings: { ...DEFAULT_WORLD_SETTINGS, customEras: [], customStyles: [], customTimes: [], customLighting: [], customLocations: [] },
    scenes: [],
    shots: [],
    scriptElements: [],
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
  await dbDelete(STORE_NAME, getStorageKey(projectId, 'scriptElements'));
  await dbDelete(STORE_NAME, getStorageKey(projectId, 'scriptFile'));
  await dbDelete(STORE_NAME, getStorageKey(projectId, 'characters'));
  await dbDelete(STORE_NAME, getStorageKey(projectId, 'outfits'));
  await dbDelete(STORE_NAME, getStorageKey(projectId, 'locations'));
  await dbDelete(STORE_NAME, getStorageKey(projectId, 'metadata'));
  await dbDelete(STORE_NAME, getStorageKey(projectId, 'library'));

  const list = getProjectsList();
  const updatedList = list.filter(p => p.id !== projectId);
  saveProjectsList(updatedList);

  if (getActiveProjectId() === projectId) setActiveProjectId(null);
  
  // Trigger GC after delete to clean up images
  garbageCollect();
};

// --- DATA ACCESS ---

export const getProjectData = async (projectId: string): Promise<Project | null> => {
  const settingsKey = getStorageKey(projectId, 'settings');
  const shotsKey = getStorageKey(projectId, 'shots');
  const scenesKey = getStorageKey(projectId, 'scenes');
  const scriptKey = getStorageKey(projectId, 'scriptElements');
  const scriptFileKey = getStorageKey(projectId, 'scriptFile');
  const metadataKey = getStorageKey(projectId, 'metadata');

  const [settings, shots, scenes, scriptElements, scriptFile, metadata] = await Promise.all([
    dbGet<WorldSettings>(STORE_NAME, settingsKey),
    dbGet<Shot[]>(STORE_NAME, shotsKey),
    dbGet<Scene[]>(STORE_NAME, scenesKey),
    dbGet<ScriptElement[]>(STORE_NAME, scriptKey),
    dbGet<any>(STORE_NAME, scriptFileKey),
    dbGet<any>(STORE_NAME, metadataKey)
  ]);

  if (!metadata && !settings) return null;

  const rawProject = {
    id: projectId,
    name: metadata?.name || 'Untitled',
    settings: settings || { ...DEFAULT_WORLD_SETTINGS },
    shots: shots || [],
    scenes: scenes || [],
    scriptElements: scriptElements || [],
    scriptFile: scriptFile || undefined,
    createdAt: metadata?.createdAt || Date.now(),
    lastModified: metadata?.lastModified || Date.now()
  };

  // VALIDATE & HEAL (Migration)
  const healedProject = migrateProject(rawProject);
  
  // HYDRATE
  console.log(`💧 Hydrating Project: ${healedProject.name}`);
  const hydratedProject = await hydrateObject(healedProject);

  return hydratedProject;
};

export const saveProjectData = async (projectId: string, project: Project) => {
  const settingsKey = getStorageKey(projectId, 'settings');
  const shotsKey = getStorageKey(projectId, 'shots');
  const scenesKey = getStorageKey(projectId, 'scenes');
  const scriptKey = getStorageKey(projectId, 'scriptElements');
  const scriptFileKey = getStorageKey(projectId, 'scriptFile');
  const metadataKey = getStorageKey(projectId, 'metadata');

  const metadata = {
    id: projectId,
    name: project.name,
    createdAt: project.createdAt,
    lastModified: Date.now(),
    shotCount: project.shots.length
  };

  const dehydratedProject = await dehydrateObject(project);

  await Promise.all([
    dbSet(STORE_NAME, settingsKey, dehydratedProject.settings),
    dbSet(STORE_NAME, shotsKey, dehydratedProject.shots),
    dbSet(STORE_NAME, scenesKey, dehydratedProject.scenes),
    dbSet(STORE_NAME, scriptKey, dehydratedProject.scriptElements),
    dbSet(STORE_NAME, scriptFileKey, dehydratedProject.scriptFile),
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

// --- ASSETS ---

export const getCharacters = async (projectId: string): Promise<Character[]> => {
  const data = await dbGet<Character[]>(STORE_NAME, getStorageKey(projectId, 'characters'));
  const raw = data || [];
  const parsed = z.array(CharacterSchema).safeParse(raw);
  const healed = parsed.success ? parsed.data : raw;
  return await hydrateObject(healed);
};

export const saveCharacters = async (projectId: string, chars: Character[]) => {
  const dehydrated = await dehydrateObject(chars);
  await dbSet(STORE_NAME, getStorageKey(projectId, 'characters'), dehydrated);
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

export const getLocations = async (projectId: string): Promise<Location[]> => {
  const data = await dbGet<Location[]>(STORE_NAME, getStorageKey(projectId, 'locations'));
  const raw = data || [];
  const parsed = z.array(LocationSchema).safeParse(raw);
  const healed = parsed.success ? parsed.data : raw;
  return await hydrateObject(healed);
};

export const saveLocations = async (projectId: string, locations: Location[]) => {
  const dehydrated = await dehydrateObject(locations);
  await dbSet(STORE_NAME, getStorageKey(projectId, 'locations'), dehydrated);
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

// --- GARBAGE COLLECTION ---

export const garbageCollect = async () => {
  console.log("🧹 Starting Garbage Collection...");
  const projects = getProjectsList();
  const validRefs = new Set<string>();

  // 1. SCAN ALL PROJECTS
  for (const meta of projects) {
    const keys = [
      getStorageKey(meta.id, 'shots'),
      getStorageKey(meta.id, 'characters'),
      getStorageKey(meta.id, 'outfits'),
      getStorageKey(meta.id, 'locations'),
      getStorageKey(meta.id, 'library')
    ];

    for (const key of keys) {
      const data = await dbGet<any>(STORE_NAME, key);
      const str = JSON.stringify(data);
      // Regex find all {{IMG::uuid}}
      const regex = /{{IMG::([a-zA-Z0-9-]+)}}/g;
      let match;
      while ((match = regex.exec(str)) !== null) {
        validRefs.add(match[1]); // The UUID
      }
    }
  }

  // 2. SCAN IMAGE STORE
  const allImageIds = await dbGetAllKeys(IMAGE_STORE_NAME);
  let deletedCount = 0;

  for (const id of allImageIds) {
    if (!validRefs.has(id.toString())) {
      await dbDelete(IMAGE_STORE_NAME, id.toString());
      deletedCount++;
    }
  }

  console.log(`✨ Garbage Collection Complete. Removed ${deletedCount} orphaned images.`);
};


// --- EXPORT / IMPORT ---

export const exportProjectToJSON = async (projectId: string): Promise<string> => {
  const project = await getProjectData(projectId);
  const characters = await getCharacters(projectId);
  const outfits = await getOutfits(projectId);
  const locations = await getLocations(projectId);
  const library = await getImageLibrary(projectId);

  if (!project) throw new Error("Project not found");

  const cleanProject = sanitizeForExport(project);

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

  const portableProject = await deepConvertToBase64(cleanProject);
  const portableCharacters = await deepConvertToBase64(characters);
  const portableOutfits = await deepConvertToBase64(outfits);
  const portableLocations = await deepConvertToBase64(locations);
  const portableLibrary = await deepConvertToBase64(library);

  const exportData: ProjectExport = {
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
    outfits: portableOutfits,
    locations: portableLocations,
    library: portableLibrary
  };

  return JSON.stringify(exportData, null, 2);
};

export const importProjectFromJSON = async (jsonString: string): Promise<string> => {
  try {
    const rawData = JSON.parse(jsonString);
    const parseResult = ProjectExportSchema.safeParse(rawData);

    if (!parseResult.success) {
      console.error("Import Validation Failed:", parseResult.error);
      throw new Error("Invalid Project File. Data is corrupted or outdated.");
    }

    const data = parseResult.data;
    const projectId = data.project.id;

    if (!data.project.scenes || data.project.scenes.length === 0) {
      const defId = crypto.randomUUID();
      data.project.scenes = [{ id: defId, sequence: 1, heading: 'INT. SCENE - DAY', actionNotes: '' }];
      data.project.shots = data.project.shots.map(s => ({ ...s, sceneId: defId }));
    }

    // SANITIZE IMPORT
    const cleanProject = migrateProject(data.project);

    await saveProjectData(projectId, cleanProject);
    await saveCharacters(projectId, data.characters as Character[] || []);
    await saveOutfits(projectId, data.outfits as Outfit[] || []);
    await saveLocations(projectId, data.locations as Location[] || []);
    await saveImageLibrary(projectId, data.library as ImageLibraryItem[] || []);

    const list = getProjectsList();
    const filtered = list.filter(p => p.id !== projectId);
    saveProjectsList([data.metadata, ...filtered]);

    return projectId;
  } catch (e) {
    console.error("Import failed", e);
    throw e;
  }
};