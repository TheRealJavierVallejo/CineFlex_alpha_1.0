/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
                mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
            },
            colors: {
                // "ONYX" Palette - Obsidian & Industrial
                background: '#000000', // Pure Void Black
                
                app: {
                    DEFAULT: '#000000',
                    panel: '#09090b',   // Zinc 950 (Panels)
                    hover: '#18181b',   // Zinc 900
                    active: '#27272a',  // Zinc 800
                },
                
                surface: {
                    DEFAULT: '#09090b', // Zinc 950
                    secondary: '#050505', // Almost Black
                    hover: '#18181b',
                    border: '#27272a',
                },

                border: {
                    DEFAULT: '#27272a', // Zinc 800
                    focus: 'var(--color-primary, #3b82f6)',   // Dynamic
                    subtle: '#18181b',
                },

                text: {
                    primary: '#f4f4f5',   // Zinc 100
                    secondary: '#a1a1aa', // Zinc 400
                    muted: '#52525b',     // Zinc 600
                    inverse: '#000000',
                },

                // Electric Blue Accent (ONYX Slash) - NOW DYNAMIC
                primary: {
                    DEFAULT: 'var(--color-primary, #3b82f6)',
                    hover: 'var(--color-primary-hover, #2563eb)',
                    foreground: '#FFFFFF',
                    glow: 'var(--color-primary-glow, rgba(59, 130, 246, 0.5))'
                },
            },
            borderRadius: {
                'none': '0',
                'sm': '0px',    // RAZOR SHARP
                DEFAULT: '1px', // MICROSCOPIC SOFTNESS
                'md': '2px',    // HARDWARE FEEL
                'lg': '2px',    
                'xl': '4px',    
                '2xl': '4px',  
                'full': '9999px', // Avatars only
            },
            boxShadow: {
                'window': '0 0 0 1px #27272a',
                'panel': '0 1px 0 0 #27272a',
                'glow': '0 0 10px var(--color-primary-glow, rgba(59, 130, 246, 0.5))',
                'focus': '0 0 0 1px var(--color-primary, #3b82f6)',
            },
        },
    },
    plugins: [],
}