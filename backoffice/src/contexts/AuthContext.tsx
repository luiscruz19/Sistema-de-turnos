'use client'
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface AuthContextType {
    is_auth: boolean | null;
    user: Record<string, string> | null;
    setUser: (user: Record<string, string> | null) => void;
    token: string;
    login: ({ token }: { token: string }) => void;
    logout: () => void;
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<Record<string, string> | null>(null);
    const [is_auth, setIsAuth] = useState<boolean | null>(null);
    const [token, setToken] = useState<string>('');

    const tokenName = 'turnos_token';

    useEffect(() => {
        const storedToken = localStorage.getItem(tokenName);
        if (!storedToken) {
            setIsAuth(false);
            setToken('');
            setIsLoading(false);
            return;
        }
        setToken(storedToken);
        setIsAuth(true);
        setIsLoading(false);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem(tokenName);
        setIsAuth(false);
        setToken('');
        setUser(null);
    }, []);

    const login = useCallback(({ token }: { token: string }): void => {
        localStorage.setItem(tokenName, token);
        setIsAuth(true);
        setToken(token);
    }, []);

    return (
        <AuthContext.Provider value={{
            user, setUser, is_auth, token,
            logout, login, isLoading, setIsLoading,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
