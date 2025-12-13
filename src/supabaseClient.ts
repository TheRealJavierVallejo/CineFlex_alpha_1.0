import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fallback to prevent app crash if environment variables are missing
// The UI will handle authentication errors gracefully
const url = supabaseUrl && supabaseUrl.startsWith('http') 
    ? supabaseUrl 
    : 'https://placeholder.supabase.co';

const key = supabaseAnonKey || 'placeholder-key';

export const supabase = createClient(url, key);