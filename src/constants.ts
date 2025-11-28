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
    app: '#18181B',
    panel: '#1E1E1E',
    border: '#333333',
    text: '#CCCCCC',
    accent: '#007ACC',
    selection: '#264F78',
    error: '#F48771',
    warning: '#CCA700',
    success: '#89D185'
  }
};

// 30-Color Palette (6 rows x 5 cols)
export const UI_COLOR_PALETTE = [
  // Zinc / Slate / Stone
  "#71717a", "#64748b", "#78716c", "#a1a1aa", "#ffffff",
  // Blue / Indigo / Cyan
  "#3b82f6", "#2563eb", "#6366f1", "#06b6d4", "#0ea5e9",
  // Purple / Pink / Rose
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e",
  // Red / Orange / Amber
  "#ef4444", "#dc2626", "#f97316", "#ea580c", "#f59e0b",
  // Emerald / Teal / Green
  "#10b981", "#059669", "#14b8a6", "#0d9488", "#84cc16",
  // Special / Neon
  "#eab308", "#8b5cf6", "#f472b6", "#2dd4bf", "#fbbf24"
];