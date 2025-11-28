/**
 * Theme Utility Functions
 * Handles color calculations and contrast logic
 */

/**
 * Calculates the best contrast color (black or white) for a given background color.
 * Favors white text for aesthetic reasons unless the background is very bright.
 * 
 * @param hexColor The background color in hex format (e.g., "#E11D48")
 * @returns "#FFFFFF" or "#000000"
 */
export function getContrastColor(hexColor: string): string {
    // Remove hash if present
    const hex = hexColor.replace('#', '');

    // Parse RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Calculate brightness (standard formula)
    // (r * 299 + g * 587 + b * 114) / 1000
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    // Threshold for switching to black text.
    // Standard accessibility is ~128.
    // User preference: "Ugly black text unless it's white".
    // We use a high threshold (200) to keep text white on most colored backgrounds
    // (like Cyan, Yellow, Lime) while switching to black for White/Very Light Grey.
    const threshold = 200;

    return brightness > threshold ? '#000000' : '#FFFFFF';
}

/**
 * Generates a glow color (rgba) from a hex color
 */
export function getGlowColor(hexColor: string, opacity: number = 0.5): string {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
