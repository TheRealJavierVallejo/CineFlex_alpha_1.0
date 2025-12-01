/*
 * 📘 PLAIN ENGLISH GUIDE: TYPES (The Blueprints)
 * 
 * This file is like the "Blueprint" or "Dictionary" for the app. 
 * It tells the computer exactly what a "Project", "Character", or "Shot" looks like.
 */

export enum ViewState {
  DASHBOARD = 'DASHBOARD', // The Grid View of images
  TIMELINE = 'TIMELINE',   // The Script View
  STORY = 'STORY',         // The Story Development View (Syd Micro-Agents)
  ASSETS = 'ASSETS',       // The Cast & Wardrobe View
  EDITOR = 'EDITOR',       // The Image Generator Popup
  SETTINGS = 'SETTINGS'    // The Project Configuration View
}

// 🔔 TOAST: Updated for Stacking and Undo Actions
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

// 👤 CHARACTER: Defines a person in your movie
export interface Character {
  id: string;              // A unique ID (like a barcode) so the computer doesn't get confused
  name: string;            // The character's name
  description: string;     // Who they are
  imageUrl?: string;       // (Old field, mostly unused now)
  referencePhotos?: string[]; // A list of photos you uploaded for this person
}

// 👕 OUTFIT: Defines clothes for a character
export interface Outfit {
  id: string;
  characterId: string;     // Links this outfit to a specific Character ID
  name: string;            // e.g., "Space Suit"
  description: string;     // e.g., "Orange jumpsuit with NASA patches"
  referencePhotos?: string[]; // Photos of what the clothes look like
}

// 📍 LOCATION: Defines a set or environment
export interface Location {
  id: string;
  name: string;            // e.g., "Main Street"
  description: string;     // e.g., "Busy intersection, neon lights"
  referencePhotos?: string[]; // Location scout photos
}

// 🖼️ IMAGE LIBRARY: A collection of all generated images for the project
export interface ImageLibraryItem {
  id: string;
  projectId: string;
  url: string; // Base64 or URL
  createdAt: number;
  shotId?: string;
  prompt?: string;
  model?: string;
  aspectRatio?: string;
  isFavorite?: boolean; // Whether this image has been marked as a favorite
}

// 🌍 WORLD SETTINGS: The general "Vibe" of the movie
export interface WorldSettings {
  era: string;             // e.g., "1980s"
  location: string;        // (Deprecated)
  timeOfDay: string;       // (Deprecated)
  lighting: string;        // e.g., "Neon"
  cinematicStyle: string;  // e.g., "Noir"
  aspectRatio: string;     // Screen shape (16:9, 4:3)
  variationCount?: number; // How many images to generate at once (1, 2, or 4)
  imageResolution?: string; // Quality (2K, 4K)

  // These lists store the "Custom" options you typed in
  customEras?: string[];
  customStyles?: string[];
  customTimes?: string[];
  customLighting?: string[];
  customLocations?: string[];
}

// 📝 SCRIPT ELEMENT: A single line from a screenplay
export interface ScriptElement {
  id: string;
  type: 'scene_heading' | 'action' | 'dialogue' | 'character' | 'parenthetical' | 'transition';
  content: string;
  sceneId?: string;        // The scene this line belongs to
  sequence: number;        // Order in the script
  character?: string;      // Name of the character speaking (if dialogue)
  associatedShotIds?: string[]; // Shots generated from this specific line
  dual?: boolean;          // Is this simultaneous dialogue?
  sceneNumber?: string;    // "1", "2A", etc. (Only for scene_heading)
  isContinued?: boolean;   // This dialogue continues from previous page
  continuesNext?: boolean; // This dialogue continues to next page
  keptTogether?: boolean;  // This element was kept with adjacent elements for pagination
}

// 🎬 SCENE: A group of shots in one location
export interface Scene {
  id: string;
  sequence: number;        // Order in the movie (1, 2, 3...)
  heading: string;         // e.g., "INT. COFFEE SHOP - DAY"
  actionNotes: string;     // General description of what happens
  scriptElements?: ScriptElement[]; // The raw script lines for this scene
  locationId?: string;     // Link to a specific Location Asset
}

// 📸 SHOT: A single camera angle or image
export interface Shot {
  id: string;
  sceneId?: string;        // Which scene this belongs to
  sequence: number;        // Order number
  sketchImage?: string;    // The rough sketch you uploaded
  generatedImage?: string; // The final AI image
  generationCandidates?: string[]; // History of images (if you made 4, they live here)
  generationInProgress?: boolean; // Is the AI thinking right now?
  description: string;     // What the AI should draw
  dialogue?: string;       // What characters say
  notes: string;           // Technical notes for the camera crew
  characterIds: string[];  // List of people in this shot
  shotType: string;        // e.g., "Close-Up"
  aspectRatio?: string;
  model?: string;          // Which AI brain used (Gemini vs Imagen)
  imageSize?: string;
  linkedElementIds?: string[]; // IDs of the script elements this shot visualizes

  // Creative Overrides
  locationId?: string;     // Specific location for this shot (overrides scene default)
  timeOfDay?: string;      // Override global time setting
  negativePrompt?: string; // What NOT to include
  styleStrength?: number;  // 0-100, how much global style applies

  // Control Net stuff (Advanced features for matching shapes)
  referenceImage?: string;
  controlType?: 'depth' | 'canny';
  referenceStrength?: number;
}

// 📖 STORY DEVELOPMENT: Fields for plot, character arcs, and story structure
export interface PlotDevelopment {
  // Foundation (unlock first)
  genre?: string;
  theme?: string;
  tone?: string;
  storyTypes?: string[];
  setting?: string; // NEW
  budget?: string;  // NEW
  
  // NEW: Target Audience
  targetAudienceRating?: string;      // Dropdown (PG, R, etc.)
  targetAudienceDescription?: string; // Textarea (Who is this for?)

  // Generated with Syd after foundation
  title?: string;
  logline?: string;

  // Advanced (unlock after logline)
  audienceTarget?: string;
  // setting field is now at root, keeping here for backward compat if needed or just use root
  bStory?: string;
  notes?: string;

  // Summaries
  foundationSummary?: string;
  coreSummary?: string;
}

export interface StoryProgress {
  foundationComplete: boolean;
  coreComplete: boolean;
  charactersComplete: boolean;
  actOneComplete: boolean;
  actTwoComplete: boolean;
  actThreeComplete: boolean;
}

export interface CharacterDevelopment {
  id: string;

  // Basic (links to existing Character asset)
  characterId?: string; // Reference to Character in assets
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting';

  // Arc fields (progressive unlock)
  physicalDescription?: string;
  personality?: string;
  archetypes?: string[];
  want?: string;        // External goal
  need?: string;        // Internal growth
  lie?: string;         // False belief
  ghost?: string;       // Past trauma
  characterArc?: string; // Overall arc summary
  notes?: string;
}

export interface StoryBeat {
  id: string;
  beatName: string;     // e.g., "Opening Image", "Catalyst"
  sequence: number;     // 1-15 for Save the Cat structure
  content?: string;     // User or Syd-generated content
  summary?: string;     // Auto-compressed version (max 100 words)
  isComplete: boolean;
}

// Auto-summary metadata for token compression
export interface StoryMetadata {
  // Auto-generated summaries for context management
  actOneSummary?: string;    // Auto after beats 1-5
  actTwoASummary?: string;   // Auto after beats 6-10
  actTwoBSummary?: string;   // Auto after beats 11-12
  actThreeSummary?: string;  // Auto after beats 13-15

  // Character profile summaries (compressed)
  characterProfiles?: Record<string, string>; // characterId -> compressed profile (75 words max)

  lastUpdated: number;
}

// 📂 PROJECT METADATA: Basic info shown on the "Welcome Screen" cards
export interface ProjectMetadata {
  id: string;
  name: string;
  createdAt: number;       // Date created
  lastModified: number;    // Date last edited
  shotCount: number;
  characterCount: number;
}

// 📦 PROJECT: The big container for EVERYTHING
export interface Project {
  id: string;
  name: string;
  settings: WorldSettings; // The era, style, etc.
  scenes: Scene[];         // List of all scenes
  shots: Shot[];           // List of all shots
  createdAt: number;
  lastModified: number;

  // Screenplay Data
  scriptFile?: {
    name: string;
    uploadedAt: number;
    format: 'fountain' | 'fdx' | 'pdf' | 'txt'
  };
  scriptElements?: ScriptElement[]; // The full list of script lines

  // Story Development (Syd Micro-Agent System)
  plotDevelopment?: PlotDevelopment;
  characterDevelopments?: CharacterDevelopment[];
  storyBeats?: StoryBeat[];
  storyMetadata?: StoryMetadata;
}

// 📤 EXPORT: The format used when you save a file to your computer
export interface ProjectExport {
  version: number;
  metadata: ProjectMetadata;
  project: Project;
  characters: Character[];
  outfits: Outfit[];
  locations: Location[]; // New export field
  library: ImageLibraryItem[];
}