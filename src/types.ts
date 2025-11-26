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
  SCRIPT = 'SCRIPT',       // The Screenplay Editor View
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
// 🧠 TWIN-ENGINE CORE: SCRIPT ENGINE (Left Brain)
// ------------------------------------------------------------------

// The status of the link between Text and Visuals
export type SyncStatus = 'synced' | 'dirty' | 'orphaned' | 'visual_only' | 'pending';

// The types of text blocks found in a screenplay (Scrite/Final Draft)
export type ScriptAtomType = 'slugline' | 'action' | 'character' | 'dialogue' | 'parenthetical' | 'transition' | 'general';

// A single unit of the script (e.g., one paragraph of action, or one line of dialogue)
export interface ScriptAtom {
  id: string;              // Unique ID from Scrite or generated on import
  type: ScriptAtomType;
  text: string;            // The raw text content
  sceneId: string;         // The ID of the Script Scene this belongs to
  sequence: number;        // Order in the script
  originalId?: string;     // If imported, the ID from the source file
}

// The Container for the "Left Brain" script data
export interface ScriptDocument {
  metadata: {
    title: string;
    author: string;
    sourceApp: 'scrite' | 'finaldraft' | 'cinesketch' | 'unknown';
    lastSync: number;
    version: number;
  };
  atoms: ScriptAtom[];     // The flat list of all script elements
}


// ------------------------------------------------------------------
// 🎨 TWIN-ENGINE CORE: VISUAL ENGINE (Right Brain)
// ------------------------------------------------------------------

// 👤 CHARACTER
export interface Character {
  id: string;
  name: string;
  description: string;
  referencePhotos?: string[];
  scriptName?: string;     // The exact name used in the script (for auto-linking)
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
  
  // Twin-Engine Links
  scriptSceneId?: string;  // Link to the 'slugline' atom in the ScriptDocument
  syncStatus?: SyncStatus;
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

  // Twin-Engine Links
  sourceAtomIds?: string[]; // Which ScriptAtoms (action/dialogue) does this shot visualize?
  syncStatus?: SyncStatus;  // Is the text description matching the script?
  isVisualOnly?: boolean;   // True if this shot doesn't exist in the script (Director's add)
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
  
  // Engine 1: The Script
  script?: ScriptDocument; // Optional for legacy support, but new projects will have it
  
  // Engine 2: The Visuals
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