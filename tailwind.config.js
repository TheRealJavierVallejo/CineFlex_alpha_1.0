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
                    panel: '#18181b',   // Zinc 900 (Sidebar/Panels)
                    hover: '#27272a',   // Zinc 800
                    active: '#3f3f46',  // Zinc 700
                },
                
                surface: {
                    DEFAULT: '#18181b', // Zinc 900 (Cards/Modals)
                    secondary: '#0f0f10', // Darker surface for headers/inputs
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
                },

                // Electric Blue Accent (Vibrant)
                primary: {
                    DEFAULT: '#3b82f6', // Blue 500
                    hover: '#2563eb',   // Blue 600
                    foreground: '#FFFFFF',
                    glow: 'rgba(59, 130, 246, 0.5)'
                },
                accent: {
                    DEFAULT: '#3b82f6',
                    hover: '#2563eb',
                    light: '#60a5fa',
                },

                status: {
                    error: '#ef4444',   // Red 500
                    warning: '#eab308', // Yellow 500
                    success: '#22c55e', // Green 500
                    info: '#0ea5e9',    // Sky 500
                },
            },
            fontSize: {
                'xs': ['11px', { lineHeight: '16px' }],
                'sm': ['12px', { lineHeight: '18px' }],
                'base': ['13px', { lineHeight: '20px' }],
                'lg': ['14px', { lineHeight: '22px' }],
                'xl': ['16px', { lineHeight: '24px' }],
                '2xl': ['18px', { lineHeight: '28px' }],
            },
            spacing: {
                '18': '4.5rem',
                '88': '22rem',
            },
            borderRadius: {
                'none': '0',
                'sm': '2px',    // Was 4px - Super sharp for tiny elements
                DEFAULT: '3px', // Was 6px - Standard button/input radius
                'md': '4px',    // Was 8px - Slightly softer for panels
                'lg': '6px',    // Was 10px - Modals/Cards
                'xl': '8px',    // Was 12px - Outer containers
                '2xl': '12px',  // Only for major floating windows
                'full': '9999px',
            },
            boxShadow: {
                'window': '0 20px 50px -12px rgba(0, 0, 0, 0.5)',
                'panel': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                'glow': '0 0 15px rgba(59, 130, 246, 0.3)',
                'focus': '0 0 0 2px rgba(59, 130, 246, 0.5)',
            },
            animation: {
                'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                'slide-down': 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                'fade-in': 'fadeIn 0.2s ease-out',
                'shimmer': 'shimmer 2s infinite',
                'pulse-glow': 'pulseGlow 2s infinite',
            },
            keyframes: {
                slideUp: {
                    '0%': { transform: 'translateY(10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideDown: {
                    '0%': { transform: 'translateY(-10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-1000px 0' },
                    '100%': { backgroundPosition: '1000px 0' },
                },
                pulseGlow: {
                    '0%, 100%': { opacity: '1', boxShadow: '0 0 15px rgba(59, 130, 246, 0.3)' },
                    '50%': { opacity: '0.8', boxShadow: '0 0 5px rgba(59, 130, 246, 0.1)' },
                }
            },
        },
    },
    plugins: [],
}