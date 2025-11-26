/*
 * 📘 PLAIN ENGLISH GUIDE: TYPES (The Blueprints)
 * 
 * This file is like the "Blueprint" or "Dictionary" for the app. 
 * It tells the computer exactly what a "Project", "Character", or "Shot" looks like.
 */

export enum ViewState {
  DASHBOARD = 'DASHBOARD', // The Grid View of images
  TIMELINE = 'TIMELINE',   // The Linear View
  ASSETS = 'ASSETS',       // The Cast & Wardrobe View
  SETTINGS = 'SETTINGS'    // The Project Configuration View
}

// 🔔 TOAST
export interface ToastNotification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  action?: {
    label: string;
    onClick: () => void;
  };
}

export type ShowToastFn = (
  message: string,
  type?: 'success' | 'error' | 'warning' | 'info',
  action?: { label: string; onClick: () => void }
) => void;

// ------------------------------------------------------------------
// 🎨 TWIN-ENGINE CORE: VISUAL ENGINE (Right Brain)
// ------------------------------------------------------------------

// 👤 CHARACTER
export interface Character {
  id: string;
  name: string;
  description: string;
  referencePhotos?: string[];
}

// 👕 OUTFIT
export interface Outfit {
  id: string;
  characterId: string;
  name: string;
  description: string;
  referencePhotos?: string[];
}

// 🖼️ IMAGE LIBRARY
export interface ImageLibraryItem {
  id: string;
  projectId: string;
  url: string;
  createdAt: number;
  shotId?: string;
  prompt?: string;
  model?: string;
  aspectRatio?: string;
  isFavorite?: boolean;
}

// 🌍 WORLD SETTINGS
export interface WorldSettings {
  era: string;
  location: string;
  timeOfDay: string;
  lighting: string;
  cinematicStyle: string;
  aspectRatio: string;
  variationCount?: number;
  imageResolution?: string;

  customEras?: string[];
  customStyles?: string[];
  customTimes?: string[];
  customLighting?: string[];
  customLocations?: string[];
}

// 🎬 SCENE (The Visual Container)
export interface Scene {
  id: string;
  sequence: number;
  heading: string;
  actionNotes: string;
}

// 📸 SHOT (The Visual Unit)
export interface Shot {
  id: string;
  sceneId?: string;
  sequence: number;
  
  // Visuals
  sketchImage?: string;
  generatedImage?: string;
  generationCandidates?: string[];
  generationInProgress?: boolean;
  
  // Content
  description: string;
  dialogue?: string;
  notes: string;
  
  // Metadata
  characterIds: string[];
  shotType: string;
  aspectRatio?: string;
  model?: string;
  imageSize?: string;

  // Creative Overrides
  timeOfDay?: string;
  negativePrompt?: string;
  styleStrength?: number;

  // Control Net stuff
  referenceImage?: string;
  controlType?: 'depth' | 'canny';
  referenceStrength?: number;
}

// 📂 PROJECT METADATA
export interface ProjectMetadata {
  id: string;
  name: string;
  createdAt: number;
  lastModified: number;
  shotCount: number;
  characterCount: number;
}

// 📦 PROJECT (The Master Container)
export interface Project {
  id: string;
  name: string;
  
  // Visuals
  settings: WorldSettings;
  scenes: Scene[];
  shots: Shot[];
  
  createdAt: number;
  lastModified: number;
}

// 📤 EXPORT
export interface ProjectExport {
  version: number;
  metadata: ProjectMetadata;
  project: Project;
  characters: Character[];
  outfits: Outfit[];
}