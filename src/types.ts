/*
 * 📘 PLAIN ENGLISH GUIDE: TYPES (The Blueprints)
 * 
 * This file is like the "Blueprint" or "Dictionary" for the app. 
 * It tells the computer exactly what a "Project", "Character", or "Shot" looks like.
 */

/**
 * Navigation state within the application.
 * Controls which high-level view is currently displayed.
 */
export enum ViewState {
  DASHBOARD = 'DASHBOARD', // The Grid View of images
  TIMELINE = 'TIMELINE',   // The Script View
  STORY = 'STORY',         // The Story Development View (Syd Micro-Agents)
  ASSETS = 'ASSETS',       // The Cast & Wardrobe View
  EDITOR = 'EDITOR',       // The Image Generator Popup
  SETTINGS = 'SETTINGS'    // The Project Configuration View
}

/**
 * A notification message system for the UI.
 * Supports stacking, different levels of severity, and optional action buttons.
 */
export interface ToastNotification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Functional interface for displaying a toast notification.
 */
export type ShowToastFn = (
  message: string,
  type?: 'success' | 'error' | 'warning' | 'info',
  action?: { label: string; onClick: () => void }
) => void;

/**
 * 👤 CHARACTER: Defines a person in your movie.
 * Stores core identity and reference visual data for AI generation.
 */
export interface Character {
  id: string;              // A unique ID (like a barcode) so the computer doesn't get confused
  name: string;            // The character's name
  description: string;     // Who they are
  imageUrl?: string;       // (Old field, mostly unused now)
  referencePhotos?: string[]; // A list of photos you uploaded for this person
}

/**
 * 👕 OUTFIT: Defines clothes for a character.
 * Tied to a specific character to ensure consistency across shots.
 */
export interface Outfit {
  id: string;
  characterId: string;     // Links this outfit to a specific Character ID
  name: string;            // e.g., "Space Suit"
  description: string;     // e.g., "Orange jumpsuit with NASA patches"
  referencePhotos?: string[]; // Photos of what the clothes look like
}

/**
 * 📍 LOCATION: Defines a set or environment.
 * Provides the visual foundation for scene-based image generation.
 */
export interface Location {
  id: string;
  name: string;            // e.g., "Main Street"
  description: string;     // e.g., "Busy intersection, neon lights"
  referencePhotos?: string[]; // Location scout photos
}

/**
 * 🖼️ IMAGE LIBRARY ITEM: A single entry in the project's generated image gallery.
 * Includes generation metadata (prompt, model) for reproduction.
 */
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
  metadata?: Record<string, unknown>;
}

/**
 * 🌍 WORLD SETTINGS: The general "Vibe" of the movie.
 * Controls the overall cinematic style, era, and technical generation settings.
 */
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

/**
 * 📝 SCRIPT ELEMENT: A single logical unit of a screenplay.
 * Follows industry-standard formatting segments (headings, dialogue, action, etc.).
 */
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

/**
 * 📝 SCRIPT DRAFT: A point-in-time version of a screenplay.
 * Allows for non-destructive script updates and version history.
 */
export interface ScriptDraft {
  id: string;
  name: string;
  content: ScriptElement[];
  updatedAt: number;
}

/**
 * 🎬 SCENE: A grouping mechanism for script elements and shots in a shared location.
 */
export interface Scene {
  id: string;
  sequence: number;        // Order in the movie (1, 2, 3...)
  heading: string;         // e.g., "INT. COFFEE SHOP - DAY"
  actionNotes: string;     // General description of what happens
  scriptElements?: ScriptElement[]; // The raw script lines for this scene
  locationId?: string;     // Link to a specific Location Asset
  metadata?: Record<string, unknown>;
}

/**
 * 📸 SHOT: A specific camera realization of a script segment.
 * Contains all parameters for generating a specific storyboard frame.
 */
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

/**
 * 📖 PLOT DEVELOPMENT: High-level story narrative fields.
 * Used for building foundations, titles, and loglines via Syd.
 */
export interface PlotDevelopment {
  // Foundation (unlock first)
  genre?: string;
  theme?: string;
  tone?: string;
  storyTypes?: string[];
  setting?: string;
  budget?: string;

  // Target Audience
  targetAudienceRating?: string;      // Dropdown (PG, R, etc.)
  targetAudienceDescription?: string; // Textarea (Who is this for?)

  // Generated with Syd after foundation
  title?: string;
  logline?: string;

  // Advanced (unlock after logline)
  audienceTarget?: string;
  bStory?: string;
  notes?: string;

  // Summaries
  foundationSummary?: string;
  coreSummary?: string;
}

/**
 * Tracks the completion status of different story development stages.
 */
export interface StoryProgress {
  foundationComplete: boolean;
  coreComplete: boolean;
  charactersComplete: boolean;
  actOneComplete: boolean;
  actTwoComplete: boolean;
  actThreeComplete: boolean;
}

/**
 * Detailed backstory and growth arc for a character.
 * Separate from visual Character asset; focuses on narrative utility.
 */
export interface CharacterDevelopment {
  id: string;

  // Basic (links to existing Character asset)
  characterId?: string; // Reference to Character in assets
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting';

  // Arc fields (progressive unlock)
  age?: string;
  description?: string;
  physicalDescription?: string; // Legacy
  personality?: string; // Legacy
  archetypes?: string[];
  archetype?: string;

  want?: string;        // External goal
  need?: string;        // Internal growth
  lie?: string;         // False belief
  ghost?: string;       // Past trauma

  strengths?: string;
  weaknesses?: string;

  characterArc?: string; // Legacy arc field
  arcSummary?: string;

  notes?: string;
}

/**
 * A critical plot point in professional story structure (Save the Cat).
 */
export interface StoryBeat {
  id: string;
  beatName: string;     // e.g., "Opening Image", "Catalyst"
  sequence: number;     // 1-15 for Save the Cat structure
  content?: string;     // User or Syd-generated content
  summary?: string;     // Auto-compressed version (max 100 words)
  isComplete: boolean;
}

/**
 * Auto-summary metadata for token compression management.
 * Keeps Syd's memory efficient across long scripts.
 */
export interface StoryMetadata {
  actOneSummary?: string;
  actTwoASummary?: string;
  actTwoBSummary?: string;
  actThreeSummary?: string;

  // Character profile summaries (compressed)
  characterProfiles?: Record<string, string>; // characterId -> compressed profile (75 words max)

  lastUpdated: number;
}

/**
 * 📂 PROJECT METADATA: Basic identification and statistics for a project.
 */
export interface ProjectMetadata {
  id: string;
  name: string;
  createdAt: number;       // Date created
  lastModified: number;    // Date last edited
  shotCount: number;
  characterCount: number;
}

/**
 * 📄 TITLE PAGE: Industry-standard screenplay title page metadata.
 */
export interface TitlePageData {
  title?: string;
  authors?: string[];
  credit?: string;
  source?: string;
  draftDate?: string;
  draftVersion?: string;
  contact?: string;
  copyright?: string;
  wgaRegistration?: string;
  additionalInfo?: string;
}

/**
 * 📦 PROJECT: The root data structure containing the entire creative work.
 */
export interface Project {
  id: string;
  name: string;
  settings: WorldSettings;
  scenes: Scene[];
  shots: Shot[];
  createdAt: number;
  lastModified: number;

  // Screenplay Data
  scriptFile?: {
    name: string;
    uploadedAt: number;
    format: 'fountain' | 'fdx' | 'pdf' | 'txt'
  };
  scriptElements?: ScriptElement[];
  titlePage?: TitlePageData;

  // Script Versioning
  drafts: ScriptDraft[];
  activeDraftId: string;

  // Story Development (Syd Micro-Agent System)
  plotDevelopment?: PlotDevelopment;
  characterDevelopments?: CharacterDevelopment[];
  storyBeats?: StoryBeat[];
  storyMetadata?: StoryMetadata;
  storyNotes?: StoryNotesData;
}

/**
 * A single freeform note for story brainstorming.
 */
export interface StoryNote {
  id: string;
  title: string;
  content: string; // Plain text or basic markdown
  createdAt: number;
  updatedAt: number;
  order: number; // For sorting in list
}

/**
 * Top-level structure for the story notes system.
 */
export interface StoryNotesData {
  notes: StoryNote[];
  activeNoteId: string | null;
}

/**
 * 📤 PROJECT EXPORT: The portable JSON format for sharing or backup.
 */
export interface ProjectExport {
  version: number;
  metadata: ProjectMetadata;
  project: Project;
  characters: Character[];
  outfits: Outfit[];
  locations: Location[];
  library: ImageLibraryItem[];
}

/**
 * 💬 SYD THREAD: A conversation instance with the AI assistant.
 */
export interface SydThread {
  id: string;
  projectId: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * A single message within a Syd chat thread.
 */
export interface SydMessage {
  id: string;
  threadId: string;
  role: 'user' | 'assistant' | 'system';
  content: { text: string;[key: string]: unknown };
  tokenCount?: number;
  idx: number; // Monotonically increasing per thread
  createdAt: string;
}