import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Throw a Supabase error in the same shape axios used, so pages that read
// `err.response?.data?.message` keep showing the right message.
export function check({ data, error }) {
    if (error) {
        const err = new Error(error.message);
        err.response = { data: { message: error.message } };
        throw err;
    }
    return data;
}
