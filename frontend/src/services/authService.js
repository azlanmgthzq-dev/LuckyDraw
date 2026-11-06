// authService.js — Admin auth via Supabase Auth
import { supabase, check } from './supabaseClient';

const authService = {
    // Sign in, then confirm the user is listed in the admins table
    async login(email, password) {
        const { user } = check(await supabase.auth.signInWithPassword({ email, password }));
        const admin = await authService.getAdminProfile();
        if (!admin) {
            await supabase.auth.signOut();
            const err = new Error('Akaun ini bukan admin / Not an admin account');
            err.response = { data: { message: err.message } };
            throw err;
        }
        return { ...admin, user_id: user.id };
    },

    async logout() {
        await supabase.auth.signOut();
    },

    async getSession() {
        const { data: { session } } = await supabase.auth.getSession();
        return session;
    },

    // Row from `admins` for the logged-in user (null if not an admin)
    async getAdminProfile() {
        const { data } = await supabase
            .from('admins')
            .select('id, name, email')
            .maybeSingle();
        return data;
    },
};

export default authService;
