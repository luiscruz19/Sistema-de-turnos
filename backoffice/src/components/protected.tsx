'use client'
import { useAuth } from '@/contexts/AuthContext';
import validateTokenService from '@/services/auth/validate-token';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { FullScreenLoader } from '@/components/loading/page-loading';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { user, setUser, isLoading, setIsLoading, token, logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!token) {
            setIsLoading(false);
            router.push('/auth/login');
            return;
        }
        setIsLoading(true);
        validateTokenService({ token })
            .then(response => {
                setIsLoading(false);
                if (response.status > 0) {
                    setUser(response.data);
                } else {
                    logout();
                    router.push('/auth/login');
                }
            })
            .catch(() => {
                setIsLoading(false);
                logout();
                router.push('/auth/login');
            });
        // Solo re-validar cuando cambia el token. Incluir router/setters dispara un loop de peticiones.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    if (isLoading) {
        return <FullScreenLoader />;
    }

    if (!user) {
        return null;
    }

    return <>{children}</>;
}
