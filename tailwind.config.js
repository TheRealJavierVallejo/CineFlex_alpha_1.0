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
                // VS Code inspired color palette
                app: {
                    DEFAULT: '#18181B',
                    panel: '#1E1E1E',
                    hover: '#2A2D2E',
                    active: '#37373D',
                },
                border: {
                    DEFAULT: '#333333',
                    focus: '#007ACC',
                    subtle: '#252526',
                },
                text: {
                    primary: '#CCCCCC',
                    secondary: '#969696',
                    muted: '#6E7681',
                    inverse: '#FFFFFF',
                },
                accent: {
                    DEFAULT: '#007ACC',
                    hover: '#0062A3',
                    light: '#4FC3F7',
                },
                status: {
                    error: '#F48771',
                    warning: '#CCA700',
                    success: '#89D185',
                    info: '#75BEFF',
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
                'sm': '3px',
                DEFAULT: '3px',
                'md': '4px',
                'lg': '6px',
            },
            boxShadow: {
                'window': '0 0 0 1px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.4)',
                'panel': '0 2px 8px rgba(0,0,0,0.3)',
                'focus': '0 0 0 2px #007ACC',
            },
            animation: {
                'slide-up': 'slideUp 0.2s ease-out',
                'slide-down': 'slideDown 0.2s ease-out',
                'fade-in': 'fadeIn 0.15s ease-out',
                'shimmer': 'shimmer 2s infinite',
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
            },
        },
    },
    plugins: [],
}
