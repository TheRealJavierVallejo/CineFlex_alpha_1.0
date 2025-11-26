/*
 * 💾 SERVICE: STORAGE (The Memory Bank)
 * 
 * This file is responsible for saving your work.
 * Since this is a web app, it uses something called "IndexedDB" inside your browser.
 * Think of it as a tiny hard drive built into Chrome/Safari/Edge.
 * 
 * It handles:
 * 1. Saving your Projects
 * 2. Loading them back when you open the app
 * 3. Exporting them to files you can download
 */

import { Character, Project, Outfit, Shot, WorldSettings, ProjectMetadata, ProjectExport, Scene, ImageLibraryItem, ScriptDocument } from '../types';
import { DEFAULT_WORLD_SETTINGS } from '../constants';
import { debounce } from '../utils/debounce';

const KEYS = {
  ACTIVE_PROJECT_ID: 'cinesketch_active_project_id',
  PROJECTS_LIST: 'cinesketch_projects_list',
  PROJECT_PREFIX: 'project_'
};

const DB_NAME = 'CineSketchDB';
const DB_VERSION = 1;
const STORE_NAME = 'project_data';

// --- DATABASE HELPERS ---
// These are technical functions that open the browser's database.

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
    };
  });
};

const dbGet = async <T>(key: string): Promise<T | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onerror = () => {
        console.error(`❌ DB Read Failed for ${key}:`, request.error);
        reject(request.error);
      };
      request.onsuccess = () => {
        // console.log(`📖 DB Read: ${key} ${request.result ? '(Found)' : '(Null)'}`);
        resolve(request.result as T);
      };
    });
  } catch (e) {
    console.error("DB Read Error", e);
    return null;
  }
};

const dbSet = async (key: string, value: any): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);
      request.onerror = () => {
        console.error(`❌ DB Write Failed for ${key}:`, request.error);
        reject(request.error);
      };
      request.onsuccess = () => {
        console.log(`💾 DB Write: ${key} (Success)`);
        resolve();
      };
    });
  } catch (e) {
    console.error("DB Write Error", e);
  }
};

const dbDelete = async (key: string): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log(`🗑️ DB Delete: ${key}`);
        resolve();
      };
    });
  } catch (e) {
    console.error("DB Delete Error", e);
  }
};

// --- Key Generators ---

const getStorageKey = (projectId: string, suffix: string) => {
  return `${KEYS.PROJECT_PREFIX}${projectId}_${suffix}`;
};

// --- Project List Management (LocalStorage) ---

export const getProjectsList = (): ProjectMetadata[] => {
  try {
    const raw = localStorage.getItem(KEYS.PROJECTS_LIST);
    console.log("📋 LocalStorage Reading Projects List:", raw);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to parse project list", e);
    return [];
  }
};

const saveProjectsList = (list: ProjectMetadata[]) => {
  localStorage.setItem(KEYS.PROJECTS_LIST, JSON.stringify(list));
  console.log(`📋 Project list updated. Total projects: ${list.length}`);
};

// --- Active Session Management ---

export const getActiveProjectId = (): string | null => {
  const id = localStorage.getItem(KEYS.ACTIVE_PROJECT_ID);
  console.log(`🔵 Startup Check: Active Project ID is ${id ? id : 'NULL'}`);
  return id;
};

export const setActiveProjectId = (id: string | null) => {
  if (id) {
    localStorage.setItem(KEYS.ACTIVE_PROJECT_ID, id);
    console.log(`🟢 Session Set: ${id}`);
  } else {
    localStorage.removeItem(KEYS.ACTIVE_PROJECT_ID);
    console.log(`⚪ Session Cleared`);
  }
};

// --- Project CRUD (Create, Read, Update, Delete) ---

// 1. CREATE: Makes a brand new project
export const createNewProject = async (name: string): Promise<string> => {
  const projectId = crypto.randomUUID();
  const sceneId = crypto.randomUUID(); // Default Scene
  const now = Date.now();

  const newProject: Project = {
    id: projectId,
    name: name,
    settings: {
      ...DEFAULT_WORLD_SETTINGS,
      customEras: [],
      customStyles: [],
      customTimes: [],
      customLighting: [],
      customLocations: []
    },
    // Initialize Script Engine (Empty)
    script: {
      metadata: {
        title: name,
        author: 'Unknown',
        sourceApp: 'cinesketch',
        lastSync: now,
        version: 1
      },
      atoms: [] // Empty script initially
    },
    // Initialize with one default scene
    scenes: [{
      id: sceneId,
      sequence: 1,
      heading: 'INT. UNTITLED SCENE - DAY',
      actionNotes: '',
      syncStatus: 'visual_only' // It has no script source yet
    }],
    shots: [],
    createdAt: now,
    lastModified: now
  };

  // 1. Save initial data to IndexedDB
  await saveProjectData(projectId, newProject);

  // 2. Add to project list in LocalStorage
  const metadata: ProjectMetadata = {
    id: projectId,
    name: name,
    createdAt: now,
    lastModified: now,
    shotCount: 0,
    characterCount: 0
  };

  const list = getProjectsList();
  saveProjectsList([metadata, ...list]); // Prepend

  return projectId;
};

// 2. DELETE: Removes a project and all its data
export const deleteProject = async (projectId: string) => {
  console.log(`⚠️ Deleting project ${projectId}`);

  // 1. Remove from IndexedDB
  await dbDelete(getStorageKey(projectId, 'settings'));
  await dbDelete(getStorageKey(projectId, 'shots'));
  await dbDelete(getStorageKey(projectId, 'scenes')); 
  await dbDelete(getStorageKey(projectId, 'script')); // Delete Script Key
  await dbDelete(getStorageKey(projectId, 'characters'));
  await dbDelete(getStorageKey(projectId, 'outfits'));
  await dbDelete(getStorageKey(projectId, 'metadata'));

  // 2. Remove from LocalStorage list
  const list = getProjectsList();
  const updatedList = list.filter(p => p.id !== projectId);
  saveProjectsList(updatedList);

  // 3. Clear active session if it matches
  if (getActiveProjectId() === projectId) {
    setActiveProjectId(null);
  }
};

// --- Import / Export ---
// Allows you to save your project as a .json file to your computer

export const exportProjectToJSON = async (projectId: string): Promise<string> => {
  console.log(`📦 Exporting project ${projectId}...`);
  const project = await getProjectData(projectId);
  const characters = await getCharacters(projectId);
  const outfits = await getOutfits(projectId);

  if (!project) throw new Error("Project data not found");

  const exportData: ProjectExport = {
    version: 1,
    metadata: {
      id: project.id,
      name: project.name,
      createdAt: project.createdAt,
      lastModified: project.lastModified,
      shotCount: project.shots.length,
      characterCount: characters.length
    },
    project,
    characters,
    outfits
  };

  return JSON.stringify(exportData, null, 2);
};

export const importProjectFromJSON = async (jsonString: string): Promise<string> => {
  console.log("📦 Importing project...");
  try {
    const data: ProjectExport = JSON.parse(jsonString);

    // Validate basic structure
    if (!data.project || !data.metadata) {
      throw new Error("Invalid project file format");
    }

    const projectId = data.project.id;

    // Ensure imported project has initialized custom arrays
    if (!data.project.settings.customEras) data.project.settings.customEras = [];
    if (!data.project.settings.customStyles) data.project.settings.customStyles = [];
    if (!data.project.settings.customTimes) data.project.settings.customTimes = [];
    if (!data.project.settings.customLighting) data.project.settings.customLighting = [];
    if (!data.project.settings.customLocations) data.project.settings.customLocations = [];

    // Ensure scenes exist for backward compatibility
    if (!data.project.scenes || data.project.scenes.length === 0) {
      const defId = crypto.randomUUID();
      data.project.scenes = [{ id: defId, sequence: 1, heading: 'INT. IMPORTED SCENE - DAY', actionNotes: '', syncStatus: 'visual_only' }];
      data.project.shots = data.project.shots.map(s => ({ ...s, sceneId: defId }));
    }

    // Ensure script container exists (Migration)
    if (!data.project.script) {
        data.project.script = {
            metadata: {
                title: data.project.name,
                author: 'Imported',
                sourceApp: 'unknown',
                lastSync: Date.now(),
                version: 1
            },
            atoms: []
        };
    }

    // Save all components
    await saveProjectData(projectId, data.project);
    await saveCharacters(projectId, data.characters || []);
    await saveOutfits(projectId, data.outfits || []);

    // Update Project List
    const list = getProjectsList();
    const filteredList = list.filter(p => p.id !== projectId);
    saveProjectsList([data.metadata, ...filteredList]);

    console.log(`✅ Import successful: ${data.metadata.name}`);
    return projectId;
  } catch (e) {
    console.error("Import failed", e);
    throw e;
  }
};

// --- Asset Management ---
// Functions to get/save Characters and Outfits

export const getCharacters = async (projectId: string): Promise<Character[]> => {
  const key = getStorageKey(projectId, 'characters');
  const data = await dbGet<Character[]>(key);
  return data || [];
};

export const saveCharacters = async (projectId: string, chars: Character[]) => {
  const key = getStorageKey(projectId, 'characters');
  await dbSet(key, chars);
  await updateProjectMetadataCounts(projectId, { characterCount: chars.length });
};

export const getOutfits = async (projectId: string): Promise<Outfit[]> => {
  const key = getStorageKey(projectId, 'outfits');
  const data = await dbGet<Outfit[]>(key);
  return data || [];
};

export const saveOutfits = async (projectId: string, outfits: Outfit[]) => {
  const key = getStorageKey(projectId, 'outfits');
  await dbSet(key, outfits);
};

// --- Image Library Management ---

export const getImageLibrary = async (projectId: string): Promise<ImageLibraryItem[]> => {
  const key = getStorageKey(projectId, 'library');
  const data = await dbGet<ImageLibraryItem[]>(key);
  return data || [];
};

export const saveImageLibrary = async (projectId: string, items: ImageLibraryItem[]) => {
  const key = getStorageKey(projectId, 'library');
  await dbSet(key, items);
};

export const addToImageLibrary = async (projectId: string, item: ImageLibraryItem) => {
  const current = await getImageLibrary(projectId);
  // Prepend new item
  const updated = [item, ...current];
  await saveImageLibrary(projectId, updated);
};

export const toggleImageFavorite = async (projectId: string, imageId: string) => {
  const current = await getImageLibrary(projectId);
  const updated = current.map(img =>
    img.id === imageId ? { ...img, isFavorite: !img.isFavorite } : img
  );
  await saveImageLibrary(projectId, updated);
};

// --- Main Project Data ---
// 3. READ: Loads the full project into memory
export const getProjectData = async (projectId: string): Promise<Project | null> => {
  const settingsKey = getStorageKey(projectId, 'settings');
  const shotsKey = getStorageKey(projectId, 'shots');
  const scenesKey = getStorageKey(projectId, 'scenes'); 
  const scriptKey = getStorageKey(projectId, 'script'); // New Script Key
  const metadataKey = getStorageKey(projectId, 'metadata');

  console.log(`📥 Loading Project Data for: ${projectId}`);

  const [settings, shots, scenes, script, metadata] = await Promise.all([
    dbGet<WorldSettings>(settingsKey),
    dbGet<Shot[]>(shotsKey),
    dbGet<Scene[]>(scenesKey),
    dbGet<ScriptDocument>(scriptKey),
    dbGet<any>(metadataKey)
  ]);

  if (!metadata && !settings) {
    console.warn(`⚠️ Project data for ${projectId} not found in DB.`);
    return null;
  }

  // Reconstruct project object
  const project: Project = {
    id: projectId,
    name: metadata?.name || 'Untitled Project',
    settings: settings || { ...DEFAULT_WORLD_SETTINGS },
    shots: shots || [],
    scenes: scenes || [],
    script: script || undefined, // Bind Script
    createdAt: metadata?.createdAt || Date.now(),
    lastModified: metadata?.lastModified || Date.now()
  };

  // --- MIGRATION LOGIC FOR OLD PROJECTS ---
  let needsSave = false;

  if (!project.scenes || project.scenes.length === 0) {
    console.log("🛠️ Migrating project to Scene architecture...");
    const defaultSceneId = crypto.randomUUID();
    project.scenes = [{
      id: defaultSceneId,
      sequence: 1,
      heading: 'INT. UNTITLED SCENE - DAY',
      actionNotes: 'Scene created during migration.',
      syncStatus: 'visual_only'
    }];
    // Assign orphan shots to default scene
    project.shots = project.shots.map(s => ({ ...s, sceneId: s.sceneId || defaultSceneId }));
    needsSave = true;
  }

  // Initialize empty script for legacy projects
  if (!project.script) {
    console.log("🛠️ Initializing Script Engine for legacy project...");
    project.script = {
        metadata: {
            title: project.name,
            author: 'Unknown',
            sourceApp: 'cinesketch',
            lastSync: Date.now(),
            version: 1
        },
        atoms: []
    };
    needsSave = true;
  }

  // Data migration: Ensure arrays exist for loaded projects
  if (!project.settings.customEras) project.settings.customEras = [];
  if (!project.settings.customStyles) project.settings.customStyles = [];
  if (!project.settings.customTimes) project.settings.customTimes = [];
  if (!project.settings.customLighting) project.settings.customLighting = [];
  if (!project.settings.customLocations) project.settings.customLocations = [];

  if (needsSave) {
      await saveProjectData(projectId, project);
  }

  console.log(`✅ Loaded Project: ${project.name} (${project.shots.length} shots, ${project.scenes.length} scenes)`);
  return project;
};

// 4. UPDATE: Saves changes to the project
export const saveProjectData = async (projectId: string, project: Project) => {
  const settingsKey = getStorageKey(projectId, 'settings');
  const shotsKey = getStorageKey(projectId, 'shots');
  const scenesKey = getStorageKey(projectId, 'scenes');
  const scriptKey = getStorageKey(projectId, 'script');
  const metadataKey = getStorageKey(projectId, 'metadata');

  const metadata = {
    id: projectId,
    name: project.name,
    createdAt: project.createdAt,
    lastModified: Date.now(),
    shotCount: project.shots.length
  };

  // Save to IDB (Async)
  const promises = [
    dbSet(settingsKey, project.settings),
    dbSet(shotsKey, project.shots),
    dbSet(scenesKey, project.scenes),
    dbSet(metadataKey, metadata)
  ];

  // Only save script if it exists
  if (project.script) {
      promises.push(dbSet(scriptKey, project.script));
  }

  await Promise.all(promises);

  // Update List Metadata
  await updateProjectMetadataCounts(projectId, {
    shotCount: project.shots.length,
    lastModified: metadata.lastModified
  });
};

// Helper to update the lightweight list without reloading full object
const updateProjectMetadataCounts = async (projectId: string, updates: Partial<ProjectMetadata>) => {
  const list = getProjectsList();
  const index = list.findIndex(p => p.id === projectId);
  if (index !== -1) {
    list[index] = { ...list[index], ...updates, lastModified: Date.now() };
    saveProjectsList(list);
  }
};

// --- OPTIMIZED STORAGE ---

/**
 * Debounced version of saveProjectData
 * Delays save by 1 second to prevent excessive writes during rapid edits
 * Use this for auto-save scenarios where user is actively editing
 */
export const saveProjectDataDebounced = debounce(saveProjectData, 1000);

/**
 * Check storage quota to prevent quota exceeded errors
 * Returns true if there's sufficient storage available (< 90% used)
 */
export const checkStorageQuota = async (): Promise<{ available: boolean; usage: number; quota: number }> => {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const available = quota > 0 ? (usage / quota) < 0.9 : true;

      return { available, usage, quota };
    } catch (error) {
      console.warn('Storage quota check failed:', error);
      return { available: true, usage: 0, quota: 0 };
    }
  }
  // Browser doesn't support storage estimate API
  return { available: true, usage: 0, quota: 0 };
};