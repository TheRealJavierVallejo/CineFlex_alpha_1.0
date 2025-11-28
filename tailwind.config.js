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
                // "Dark Room" Cinema Palette
                background: '#09090b', // Deepest Zinc (Main Canvas)
                
                app: {
                    DEFAULT: '#09090b',
                    panel: '#121212',   // Zinc 900 (Sidebar/Panels)
                    hover: '#27272a',   // Zinc 800
                    active: '#3f3f46',  // Zinc 700
                },
                
                surface: {
                    DEFAULT: '#121212', // Zinc 900 (Cards/Modals)
                    secondary: '#18181B', // Darker surface for headers/inputs
                    hover: '#27272a',
                    border: '#27272a',
                },

                border: {
                    DEFAULT: '#27272a', // Zinc 800 (Subtle)
                    focus: '#3b82f6',   // Electric Blue
                    subtle: '#18181b',
                },

                text: {
                    primary: '#e4e4e7',   // Zinc 200 (Bright but not harsh white)
                    secondary: '#a1a1aa', // Zinc 400
                    muted: '#71717a',     // Zinc 500
                    inverse: '#000000',
                    tertiary: '#52525b'
                },

                // Electric Blue Accent (Vibrant)
                primary: {
                    DEFAULT: '#3b82f6', // Blue 500
                    hover: '#2563eb',   // Blue 600
                    foreground: '#FFFFFF',
                    glow: 'rgba(59, 130, 246, 0.5)'
                },
            },
            fontSize: {
                'xs': ['11px', { lineHeight: '16px' }],
                'sm': ['12px', { lineHeight: '18px' }],
                'base': ['13px', { lineHeight: '20px' }],
                'lg': ['14px', { lineHeight: '22px' }],
            },
            // SHARP RADIUS SYSTEM
            borderRadius: {
                'none': '0',
                'sm': '2px',    // Razor sharp
                DEFAULT: '4px', // Mechanical
                'md': '6px',    // Softened
                'lg': '8px',    // Modal corners
                'full': '9999px',
            },
            boxShadow: {
                'window': '0 0 0 1px #27272a, 0 20px 50px -12px rgba(0, 0, 0, 0.5)',
                'panel': '0 0 0 1px #27272a',
                'popover': '0 0 0 1px #27272a, 0 10px 15px -3px rgba(0, 0, 0, 0.5)',
            },
            animation: {
                'fade-in': 'fadeIn 0.15s ease-out',
                'slide-in': 'slideIn 0.2s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideIn: {
                    '0%': { transform: 'translateX(10px)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                }
            },
        },
    },
    plugins: [],
}