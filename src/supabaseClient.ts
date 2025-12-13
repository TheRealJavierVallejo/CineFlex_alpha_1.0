import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 1. Check existence
if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase variables missing. URL:", supabaseUrl);
    throw new Error("Supabase not configured. Check your .env file for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
}

// 2. Check format (Must be absolute URL)
if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
    console.error("Invalid Supabase URL:", supabaseUrl);
    throw new Error(`Invalid Supabase URL configured: "${supabaseUrl}". It must start with https://`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);