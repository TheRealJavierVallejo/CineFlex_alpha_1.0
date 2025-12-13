import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://xlwtcazmcczhzmmzzdcg.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsd3RjYXptY2N6aHptbXp6ZGNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2NTQ4MzQsImV4cCI6MjA4MTIzMDgzNH0.vGBhIdGT6WyazbU17zs8K5sj5Pp2roeQ0SleKpcMJkw";

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL or Anon Key is missing.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);