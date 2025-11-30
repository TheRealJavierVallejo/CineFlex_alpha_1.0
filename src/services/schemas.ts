import { z } from 'zod';
import { DEFAULT_WORLD_SETTINGS } from '../constants';

// --- PRIMITIVES ---

// Helper for arrays that might be null/undefined in old data
const safeArray = <T extends z.ZodTypeAny>(schema: T) => z.array(schema).optional().default([]);

// --- 1. ASSETS ---

export const ImageLibraryItemSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  url: z.string(), // Base64 or Blob URL
  createdAt: z.number(),
  shotId: z.string().optional(),
  prompt: z.string().optional(),
  model: z.string().optional(),
  aspectRatio: z.string().optional(),
  isFavorite: z.boolean().optional().default(false)
});

export const CharacterSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  imageUrl: z.string().optional(),
  referencePhotos: safeArray(z.string())
});

export const OutfitSchema = z.object({
  id: z.string(),
  characterId: z.string(),
  name: z.string(),
  description: z.string(),
  referencePhotos: safeArray(z.string())
});

export const LocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  referencePhotos: safeArray(z.string())
});

// --- 2. WORLD SETTINGS ---

export const WorldSettingsSchema = z.object({
  era: z.string().default(DEFAULT_WORLD_SETTINGS.era),
  location: z.string().optional().default(DEFAULT_WORLD_SETTINGS.location),
  timeOfDay: z.string().optional().default(DEFAULT_WORLD_SETTINGS.timeOfDay),
  lighting: z.string().default(DEFAULT_WORLD_SETTINGS.lighting),
  cinematicStyle: z.string().default(DEFAULT_WORLD_SETTINGS.cinematicStyle),
  aspectRatio: z.string().default(DEFAULT_WORLD_SETTINGS.aspectRatio),
  variationCount: z.number().optional().default(1),
  imageResolution: z.string().optional().default('2048x2048'),
  
  // Custom Lists
  customEras: safeArray(z.string()),
  customStyles: safeArray(z.string()),
  customTimes: safeArray(z.string()),
  customLighting: safeArray(z.string()),
  customLocations: safeArray(z.string())
});

// --- 3. SCRIPT & SCENES ---

export const ScriptElementSchema = z.object({
  id: z.string(),
  type: z.enum(['scene_heading', 'action', 'dialogue', 'character', 'parenthetical', 'transition']).catch('action'),
  content: z.string(),
  sceneId: z.string().optional(),
  sequence: z.number(),
  character: z.string().optional(),
  associatedShotIds: safeArray(z.string()),
  dual: z.boolean().optional(),
  sceneNumber: z.string().optional() // Added field
});

export const SceneSchema = z.object({
  id: z.string(),
  sequence: z.number(),
  heading: z.string(),
  actionNotes: z.string().optional().default(''),
  scriptElements: safeArray(ScriptElementSchema),
  locationId: z.string().optional()
});

// --- 4. SHOTS (The Complex One) ---

export const ShotSchema = z.object({
  id: z.string(),
  sceneId: z.string().optional(),
  sequence: z.number(),
  
  // Images
  sketchImage: z.string().optional(),
  generatedImage: z.string().optional(),
  generationCandidates: safeArray(z.string()),
  generationInProgress: z.boolean().optional().default(false),
  
  // Content
  description: z.string().default(''),
  dialogue: z.string().optional(),
  notes: z.string().default(''),
  characterIds: safeArray(z.string()),
  shotType: z.string().default('Wide Shot'),
  aspectRatio: z.string().optional(),
  model: z.string().optional(),
  imageSize: z.string().optional(),
  linkedElementIds: safeArray(z.string()),
  
  // Advanced / AI Control
  locationId: z.string().optional(),
  timeOfDay: z.string().optional(),
  negativePrompt: z.string().optional(),
  styleStrength: z.number().optional().default(100),
  referenceImage: z.string().optional(),
  controlType: z.enum(['depth', 'canny']).optional().default('depth').catch('depth'),
  referenceStrength: z.number().optional().default(50)
});

// --- 5. PROJECT ROOT ---

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  settings: WorldSettingsSchema,
  scenes: safeArray(SceneSchema),
  shots: safeArray(ShotSchema),
  createdAt: z.number(),
  lastModified: z.number(),
  
  scriptFile: z.object({
    name: z.string(),
    uploadedAt: z.number(),
    format: z.enum(['fountain', 'fdx', 'pdf', 'txt']).catch('txt')
  }).optional(),
  
  scriptElements: safeArray(ScriptElementSchema)
});

// --- 6. EXPORT CONTAINER ---

export const ProjectMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.number(),
  lastModified: z.number(),
  shotCount: z.number().default(0),
  characterCount: z.number().default(0)
});

export const ProjectExportSchema = z.object({
  version: z.number(),
  metadata: ProjectMetadataSchema,
  project: ProjectSchema,
  characters: safeArray(CharacterSchema),
  outfits: safeArray(OutfitSchema),
  locations: safeArray(LocationSchema),
  library: safeArray(ImageLibraryItemSchema)
});