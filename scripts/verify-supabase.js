
import { createClient } from '@supabase/supabase-js';

const url = 'https://xlwtcazmcczhzmmzzdcg.supabase.co';
const key = 'sb_publishable_E7OnkPHwONhEl1s1ycwTJw_k0ZBVJkn';

const supabase = createClient(url, key);

async function verify() {
    console.log('Verifying connection to:', url);
    const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });

    if (error) {
        // If table doesn't exist, it might still return an error, but that proves connection.
        // If unauthorized, that's a different error.
        console.error('Connection Error:', error.message);
        if (error.code === '42P01') {
            console.log('Success: Connected to database (table profiles might not exist yet or no access, but service is reachable).');
        }
    } else {
        console.log('Success: Connection verified. Profiles count accessible.');
    }

    // Try to get auth config equivalent just to ping
    const { data: authData, error: authError } = await supabase.auth.getSession();
    console.log('Auth check:', authError ? 'Error ' + authError.message : 'Session retrieved (null is expected)');
}

verify();
