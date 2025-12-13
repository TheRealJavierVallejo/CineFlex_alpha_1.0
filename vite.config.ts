import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
    },
    plugins: [react()],
    optimizeDeps: {
      exclude: ['@mlc-ai/web-llm'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    worker: {
      format: 'es',
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-ai': ['@google/genai', '@mlc-ai/web-llm', '@anthropic-ai/sdk'],
            'vendor-utils': ['jspdf', 'jspdf-autotable', 'zod', '@supabase/supabase-js'],
            'vendor-ui': ['lucide-react', 'react-window', 'react-virtualized-auto-sizer']
          }
        }
      }
    }
  };
});