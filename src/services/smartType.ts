/**
 * 🧠 SMARTTYPE SERVICE
 * Manages autocomplete suggestions for screenplay elements
 * Similar to Final Draft's SmartType feature
 */

const SMART_TYPE_KEY_PREFIX = 'smarttype_';

export interface SmartTypeEntry {
    id: string;
    type: 'character' | 'location' | 'transition' | 'time_of_day';
    value: string;
    frequency: number;      // How often it's been used
    lastUsed: number;       // Timestamp
    userDefined: boolean;   // User manually added vs auto-learned
}

export interface SmartTypeData {
    characters: SmartTypeEntry[];
    sceneHeaders: SmartTypeEntry[]; // Renamed from locations, stores FULL header
    transitions: SmartTypeEntry[];
    timesOfDay: SmartTypeEntry[];
}

// Scene Heading Prefixes
export const SCENE_PREFIXES = [
    'INT.',
    'EXT.',
    'I/E'
];

// Default screenplay transitions
const DEFAULT_TRANSITIONS = [
    'CUT TO:',
    'FADE TO:',
    'DISSOLVE TO:',
    'FADE OUT.',
    'FADE IN:',
    'SMASH CUT TO:',
    'MATCH CUT TO:',
    'JUMP CUT TO:',
    'CROSSFADE TO:',
];

// Default times of day for scene headings
const DEFAULT_TIMES = [
    'DAY',
    'NIGHT',
    'DAWN',
    'DUSK',
    'MORNING',
    'AFTERNOON',
    'EVENING',
    'CONTINUOUS',
    'LATER',
    'MOMENTS LATER',
    'SAME TIME',
];

// In-memory cache for SmartType data
const cachedData: { [projectId: string]: SmartTypeData } = {};

/**
 * Get SmartType data for a project (with caching)
 */
export const getSmartTypeData = (projectId: string): SmartTypeData => {
    // Check cache first (much faster than localStorage)
    if (cachedData[projectId]) {
        return cachedData[projectId];
    }

    const key = `${SMART_TYPE_KEY_PREFIX}${projectId}`;
    const stored = localStorage.getItem(key);

    if (stored) {
        const data = JSON.parse(stored);
        let needsSave = false;

        // Migration: If old 'locations' exists, map to 'sceneHeaders'
        if ((data as any).locations && !data.sceneHeaders) {
            data.sceneHeaders = (data as any).locations;
            delete (data as any).locations;
            needsSave = true;
        }

        // Migration: Add missing timesOfDay if not present
        if (!data.timesOfDay || data.timesOfDay.length === 0) {
            data.timesOfDay = DEFAULT_TIMES.map((t, i) => ({
                id: `default_time_${i}`,
                type: 'time_of_day' as const,
                value: t,
                frequency: 0,
                lastUsed: 0,
                userDefined: false
            }));
            needsSave = true;
        }

        // Save migrated data back to localStorage
        if (needsSave) {
            const key = `${SMART_TYPE_KEY_PREFIX}${projectId}`;
            localStorage.setItem(key, JSON.stringify(data));
        }

        cachedData[projectId] = data; // Cache fresh data
        return data;
    }

    // Return defaults
    const defaultData: SmartTypeData = {
        characters: [],
        sceneHeaders: [],
        transitions: DEFAULT_TRANSITIONS.map((t, i) => ({
            id: `default_trans_${i}`,
            type: 'transition' as const,
            value: t,
            frequency: 0,
            lastUsed: 0,
            userDefined: false
        })),
        timesOfDay: DEFAULT_TIMES.map((t, i) => ({
            id: `default_time_${i}`,
            type: 'time_of_day' as const,
            value: t,
            frequency: 0,
            lastUsed: 0,
            userDefined: false
        }))
    };

    cachedData[projectId] = defaultData; // Cache defaults too
    return defaultData;
};

/**
 * Save SmartType data for a project (updates cache)
 */
export const saveSmartTypeData = (projectId: string, data: SmartTypeData): void => {
    const key = `${SMART_TYPE_KEY_PREFIX}${projectId}`;
    localStorage.setItem(key, JSON.stringify(data));
    cachedData[projectId] = data; // Update cache
};

/**
 * Add a new entry to SmartType
 */
export const addSmartTypeEntry = (
    projectId: string,
    type: SmartTypeEntry['type'],
    value: string,
    userDefined: boolean = true
): SmartTypeEntry => {
    const data = getSmartTypeData(projectId);
    const category = getCategoryKey(type);

    // Check if already exists
    const existing = data[category].find(e =>
        e.value.toLowerCase() === value.toLowerCase()
    );

    if (existing) {
        // Update frequency and last used
        existing.frequency += 1;
        existing.lastUsed = Date.now();
        saveSmartTypeData(projectId, data);
        return existing;
    }

    // Create new entry
    const newEntry: SmartTypeEntry = {
        id: crypto.randomUUID(),
        type,
        value: value.toUpperCase(), // Screenplay elements are uppercase
        frequency: 1,
        lastUsed: Date.now(),
        userDefined
    };

    data[category].push(newEntry);
    saveSmartTypeData(projectId, data);
    return newEntry;
};

/**
 * Remove a SmartType entry
 */
export const removeSmartTypeEntry = (
    projectId: string,
    entryId: string
): void => {
    const data = getSmartTypeData(projectId);

    // Remove from all categories
    data.characters = data.characters.filter(e => e.id !== entryId);
    data.sceneHeaders = data.sceneHeaders.filter(e => e.id !== entryId);
    data.transitions = data.transitions.filter(e => e.id !== entryId);
    data.timesOfDay = data.timesOfDay.filter(e => e.id !== entryId);

    saveSmartTypeData(projectId, data);
};

/**
 * Update an existing SmartType entry
 */
export const updateSmartTypeEntry = (
    projectId: string,
    entryId: string,
    newValue: string
): void => {
    const data = getSmartTypeData(projectId);

    // Find and update in all categories
    const allEntries = [
        ...data.characters,
        ...data.sceneHeaders,
        ...data.transitions,
        ...data.timesOfDay
    ];

    const entry = allEntries.find(e => e.id === entryId);
    if (entry) {
        entry.value = newValue.toUpperCase();
        saveSmartTypeData(projectId, data);
    }
};

/**
 * Learn from script elements (auto-populate SmartType)
 */
export const learnFromScript = (projectId: string, elements: any[]): void => {
    const data = getSmartTypeData(projectId);
    let hasChanges = false;

    // Reset frequencies to 0 before recounting to ensure accuracy
    // This prevents double-counting on reloads and handles deleted elements
    ['characters', 'sceneHeaders', 'transitions', 'timesOfDay'].forEach(key => {
        data[key as keyof SmartTypeData].forEach(entry => {
            entry.frequency = 0;
        });
    });

    // Helper to add entry without saving every time (for batch performance)
    const addInternal = (type: SmartTypeEntry['type'], value: string) => {
        if (!value || value.trim().length === 0) return;
        const cleanValue = value.trim().toUpperCase();
        const category = getCategoryKey(type);

        const existing = data[category].find(e => e.value === cleanValue);
        if (existing) {
            existing.frequency += 1;
            existing.lastUsed = Date.now();
            hasChanges = true;
        } else {
            data[category].push({
                id: crypto.randomUUID(),
                type,
                value: cleanValue,
                frequency: 1,
                lastUsed: Date.now(),
                userDefined: false
            });
            hasChanges = true;
        }
    };

    elements.forEach(el => {
        // Learn character names
        if (el.type === 'character') {
            // Remove parentheticals like (V.O.), (CONT'D), (O.S.)
            const cleanName = el.content.replace(/\s*\(.*?\)\s*/g, '').trim();
            // Remove caret ^ (sometimes used for dual dialogue)
            const finalName = cleanName.replace(/\^/g, '').trim();

            if (finalName.length > 0) {
                addInternal('character', finalName);
            }
        }

        // Learn transitions
        if (el.type === 'transition') {
            addInternal('transition', el.content);
        }

        // Learn locations from scene headings
        if (el.type === 'scene_heading') {
            // Save the FULL scene header
            addInternal('location', el.content);

            // Also learn time of day separately for Stage 3
            const match = el.content.match(/^(?:INT\.|EXT\.|INT\/EXT|I\/E|I\/E\.|INT\/EXT\.)\s+(.*?)(?:\s+-\s+(.*))?$/i);
            if (match) {
                const time = match[3]?.trim(); // Capture group 3 is time (optional)
                if (time) {
                    addInternal('time_of_day', time);
                }
            }
        }
    });

    // Garbage Collection: Remove auto-learned entries with 0 frequency
    // This keeps the list clean if elements are deleted from the script
    ['characters', 'sceneHeaders', 'transitions', 'timesOfDay'].forEach(key => {
        const category = key as keyof SmartTypeData;
        const initialLength = data[category].length;

        data[category] = data[category].filter(entry =>
            entry.frequency > 0 || entry.userDefined
        );

        if (data[category].length !== initialLength) {
            hasChanges = true;
        }
    });

    if (hasChanges) {
        saveSmartTypeData(projectId, data);
    }
};

/**
 * Get suggestions based on partial input
 */
export const getSuggestions = (
    projectId: string,
    type: SmartTypeEntry['type'],
    partial: string,
    limit: number = 10
): string[] => {
    const data = getSmartTypeData(projectId);

    // Extract locations from saved full scene headers
    if (type === 'location') {
        const locations = new Set<string>();
        data.sceneHeaders.forEach(header => {
            // Parse: "INT. BEDROOM - DAY" → extract "BEDROOM"
            const match = header.value.match(/^(?:INT\.|EXT\.|I\/E)\s+(.*?)(?:\s+-\s+|$)/i);
            if (match && match[1]) {
                locations.add(match[1].trim());
            }
        });

        const locationList = Array.from(locations);
        const partialUpper = partial.toUpperCase();
        
        // Simple filter by partial match
        return locationList
            .filter(l => l.toUpperCase().startsWith(partialUpper))
            .sort()
            .slice(0, limit);
    }

    const category = getCategoryKey(type);
    let entries = data[category];

    // DEFENSIVE: If timesOfDay is missing, use defaults directly
    if (type === 'time_of_day' && (!entries || entries.length === 0)) {
        entries = DEFAULT_TIMES.map((t, i) => ({
            id: `default_time_${i}`,
            type: 'time_of_day' as const,
            value: t,
            frequency: 0,
            lastUsed: 0,
            userDefined: false
        }));
    }

    if (!partial || partial.length === 0) {
        // Return most frequently used
        return entries
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, limit)
            .map(e => e.value);
    }

    // Filter by partial match
    const partialUpper = partial.toUpperCase();
    const matches = entries.filter(e =>
        e.value.toUpperCase().startsWith(partialUpper)
    );

    // Sort by frequency, then alphabetically
    // EXCEPT for time_of_day: preserve DEFAULT_TIMES order (DAY before DAWN)
    if (type === 'time_of_day') {
        return matches
            .sort((a, b) => {
                // Sort by position in DEFAULT_TIMES array
                const indexA = DEFAULT_TIMES.indexOf(a.value);
                const indexB = DEFAULT_TIMES.indexOf(b.value);
                return indexA - indexB;
            })
            .slice(0, limit)
            .map(e => e.value);
    }

    return matches
        .sort((a, b) => {
            if (b.frequency !== a.frequency) {
                return b.frequency - a.frequency;
            }
            return a.value.localeCompare(b.value);
        })
        .slice(0, limit)
        .map(e => e.value);
};

/**
 * Helper to get category key from type
 */
const getCategoryKey = (type: SmartTypeEntry['type']): keyof SmartTypeData => {
    switch (type) {
        case 'character': return 'characters';
        case 'location': return 'sceneHeaders'; // Map 'location' type to 'sceneHeaders' storage
        case 'transition': return 'transitions';
        case 'time_of_day': return 'timesOfDay';
    }
};

/**
 * Clear all learned data (keep user-defined only)
 */
export const clearLearnedData = (projectId: string): void => {
    const data = getSmartTypeData(projectId);

    data.characters = data.characters.filter(e => e.userDefined);
    data.sceneHeaders = data.sceneHeaders.filter(e => e.userDefined);
    data.transitions = data.transitions.filter(e => e.userDefined);
    data.timesOfDay = data.timesOfDay.filter(e => e.userDefined);

    saveSmartTypeData(projectId, data);
};

/**
 * Export SmartType data as JSON
 */
export const exportSmartTypeData = (projectId: string): string => {
    const data = getSmartTypeData(projectId);
    return JSON.stringify(data, null, 2);
};

/**
 * Import SmartType data from JSON
 */
export const importSmartTypeData = (projectId: string, jsonData: string): void => {
    try {
        const data = JSON.parse(jsonData);
        saveSmartTypeData(projectId, data);
    } catch (e) {
        throw new Error('Invalid SmartType data format');
    }
};