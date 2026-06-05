'use client'
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FullScreenLoader } from '@/components/loading/page-loading';

export default function RootPage() {
    const { is_auth } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (is_auth === true) {
            router.push('/dashboard');
        } else if (is_auth === false) {
            router.push('/auth/login');
        }
    }, [is_auth, router]);

    return <FullScreenLoader />;
}
