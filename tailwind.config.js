/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            // Configuration has been moved to src/styles/index.css for v4 compatibility
            // and dynamic runtime theming support.
        },
    },
    plugins: [],
}