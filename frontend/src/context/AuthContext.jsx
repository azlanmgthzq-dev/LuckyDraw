import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadAdmin = async (session) => {
            setAdmin(session ? await authService.getAdminProfile() : null);
            setLoading(false);
        };

        supabase.auth.getSession().then(({ data: { session } }) => loadAdmin(session));

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            // Defer DB calls out of the auth callback (recommended by supabase-js)
            if (event === 'SIGNED_OUT') setAdmin(null);
            else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                setTimeout(() => loadAdmin(session), 0);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = async (email, password) => {
        const data = await authService.login(email, password);
        setAdmin(data);
        return data;
    };

    const logout = async () => {
        await authService.logout();
        setAdmin(null);
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ admin, loading, login, logout, isAuthenticated: !!admin }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};

export default AuthContext;
