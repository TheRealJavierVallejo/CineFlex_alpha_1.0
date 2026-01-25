import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Graceful error handling for missing env vars
const isMissingEnv = !supabaseUrl || !supabaseAnonKey;

if (isMissingEnv) {
  console.error('═══════════════════════════════════════════════════════');
  console.error('❌ SUPABASE CONFIGURATION MISSING');
  console.error('═══════════════════════════════════════════════════════');
  console.error('Missing environment variables:');
  if (!supabaseUrl) console.error('  - VITE_SUPABASE_URL');
  if (!supabaseAnonKey) console.error('  - VITE_SUPABASE_ANON_KEY');
  console.error('');
  console.error('📝 Setup Instructions:');
  console.error('1. Copy .env.example to .env');
  console.error('2. Fill in your Supabase project URL and anon key');
  console.error('3. Restart the dev server');
  console.error('═══════════════════════════════════════════════════════');
}

// Create stub client that returns helpful errors for missing config
const createStubClient = () => {
  const stubError = new Error(
    'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );

  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: stubError }),
      signIn: async () => ({ data: null, error: stubError }),
      signOut: async () => ({ error: stubError }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } })
    },
    from: () => ({
      select: () => ({ data: null, error: stubError }),
      insert: () => ({ data: null, error: stubError }),
      update: () => ({ data: null, error: stubError }),
      delete: () => ({ data: null, error: stubError }),
      upsert: () => ({ data: null, error: stubError })
    }),
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: stubError }),
        getPublicUrl: () => ({ data: { publicUrl: '' } })
      })
    },
    channel: () => ({
      on: () => ({ subscribe: () => { } })
    }),
    removeChannel: () => { }
  };
};

// Singleton Pattern to prevent "Multiple GoTrueClient instances" warning in Dev/HMR
const createSingletonClient = () => {
  if (typeof window !== 'undefined') {
    const globalClient = (window as any).__supabaseClient;
    if (globalClient) return globalClient;

    // Return stub if env vars missing
    if (isMissingEnv) {
      const stubClient = createStubClient();
      (window as any).__supabaseClient = stubClient;
      return stubClient;
    }

    const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      }
    });

    (window as any).__supabaseClient = client;
    return client;
  }

  // Server-side: return stub if missing
  if (isMissingEnv) {
    return createStubClient();
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    }
  });
};

export const supabase = createSingletonClient();

// Export flag so UI can show setup message
export const isSupabaseConfigured = !isMissingEnv;
