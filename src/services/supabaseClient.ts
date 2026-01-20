import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Singleton Pattern to prevent "Multiple GoTrueClient instances" warning in Dev/HMR
const createSingletonClient = () => {
  if (typeof window !== 'undefined') {
    const globalClient = (window as any).__supabaseClient;
    if (globalClient) return globalClient;

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
