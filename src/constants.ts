export const ERAS = [
  "Modern Day",
  "Cyberpunk Future",
  "1980s Retro",
  "Victorian Era",
  "Medieval Fantasy",
  "Post-Apocalyptic",
  "1920s Noir",
  "Space Opera"
];

export const TIMES_OF_DAY = [
  "Golden Hour",
  "High Noon",
  "Blue Hour (Dusk)",
  "Midnight",
  "Overcast Morning",
  "Studio Lighting"
];

export const LIGHTING_STYLES = [
  "Naturalistic",
  "High Contrast (Chiaroscuro)",
  "Neon Soaked",
  "Soft/Diffused",
  "Hard/Direct",
  "Rembrandt",
  "Silhouette"
];

export const CINEMATIC_STYLES = [
  "Hollywood Blockbuster",
  "Indie Drama",
  "Anime Style",
  "Vintage Film Grain",
  "Clean Digital",
  "Gritty Realism",
  "Wes Anderson Aesthetic"
];

export const SHOT_TYPES = [
  "Extreme Wide Shot",
  "Wide Shot",
  "Medium Shot",
  "Close-Up",
  "Extreme Close-Up",
  "Dutch Angle",
  "Over the Shoulder",
  "Birds Eye View"
];

export const STORY_STRUCTURE_TYPES = [
  "Coming of Age",
  "Fish Out of Water",
  "Revenge Story",
  "Love Story",
  "Underdog Story",
  "Redemption Arc",
  "Hero's Journey",
  "Rags to Riches",
  "Quest/Mission",
  "Mystery/Whodunit",
  "Survival Story",
  "Transformation",
  "Rise and Fall"
];

export const TARGET_AUDIENCE_RATINGS = [
  "General Audiences (G)",
  "Parental Guidance (PG)",
  "Teen & Up (PG-13)",
  "Mature (R)",
  "Adult Only (NC-17)"
];

export const MODEL_OPTIONS = [
  { label: "Gemini (Fast)", value: "gemini-2.5-flash-image" },
  { label: "Gemini (Pro)", value: "gemini-3-pro-image-preview" }
];

export const ASPECT_RATIOS = [
  "16:9",
  "9:16",
  "1:1",
  "4:3",
  "3:4",
  "21:9",
  "Match Reference"
];

export const IMAGE_SIZES = [
  "1K",
  "2K",
  "4K"
];

export const IMAGE_RESOLUTIONS = [
  { label: '1K', value: '1024x1024' },
  { label: '2K', value: '2048x2048' },
  { label: '4K', value: '4096x4096' }
];

export const VARIATION_COUNTS = [1, 2, 4];

export const DEFAULT_WORLD_SETTINGS = {
  era: "Modern Day",
  location: "Urban City Street",
  timeOfDay: "Golden Hour",
  lighting: "Naturalistic",
  cinematicStyle: "Hollywood Blockbuster",
  aspectRatio: "16:9" as const,
  variationCount: 1,
  imageResolution: "2048x2048"
};

// --- PRO DESIGN SYSTEM CONSTANTS ---
export const THEME = {
  colors: {
    app: '#030303',
    panel: '#0A0A0A',
    border: '#222222',
    text: '#EEEEEE',
    accent: '#E11D48',
  }
};

// "Director's Choice" Palette - High Voltage Colors
export const UI_COLOR_PALETTE = [
  // Row 1: The Monochromes (Clean)
  "#FFFFFF", // Pure White
  "#A1A1AA", // Zinc
  "#52525B", // Gunmetal
  "#27272A", // Graphite

  // Row 2: The Voltage (High Energy)
  "#E11D48", // Cinema Red
  "#EF4444", // Alert Red
  "#F97316", // Safety Orange
  "#F59E0B", // Amber Signal

  // Row 3: The Studio (Cool & Tech)
  "#3B82F6", // Reference Blue
  "#6366F1", // Indigo
  "#8B5CF6", // Electric Violet
  "#D946EF", // Neon Fuchsia

  // Row 4: The Elements (Natural/SciFi)
  "#14B8A6", // Teal
  "#10B981", // Emerald
  "#84CC16", // Lime
  "#06B6D4", // Cyan
];