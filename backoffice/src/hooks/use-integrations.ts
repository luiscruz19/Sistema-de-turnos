'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    listIntegrationsService,
    upsertIntegrationService,
    deleteIntegrationService,
    testIntegrationService,
    getGoogleAuthorizeUrlService,
    disconnectGoogleService,
    getGoogleSyncStatusService,
} from '@/services/integrations';

export interface IntegrationRow {
    id: number;
    provider: string;
    scope: string | null;
    enabled: boolean;
    config: Record<string, unknown>;
    credentials_masked: Record<string, string>;
    has_credentials: boolean;
    last_tested_at: string | null;
    last_test_status: string | null;
    last_test_error: string | null;
}

export function useIntegrations() {
    const { token } = useAuth();
    const [data, setData] = useState<IntegrationRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const res = await listIntegrationsService({ token });
            if (res.status > 0) {
                setData((res.data as IntegrationRow[]) || []);
            } else {
                setError(res.message || 'Error al cargar integraciones');
            }
        } catch {
            setError('Error de conexion');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    const upsert = useCallback(
        async (args: {
            provider: string;
            credentials: Record<string, string>;
            config: Record<string, unknown>;
            enabled: boolean;
        }): Promise<{ ok: boolean; message?: string }> => {
            if (!token) return { ok: false };
            const res = await upsertIntegrationService({ ...args, token });
            if (res.status > 0) await fetch();
            return { ok: res.status > 0, message: res.message };
        },
        [token, fetch],
    );

    const remove = useCallback(
        async (provider: string): Promise<{ ok: boolean }> => {
            if (!token) return { ok: false };
            const res = await deleteIntegrationService({ provider, token });
            if (res.status > 0) await fetch();
            return { ok: res.status > 0 };
        },
        [token, fetch],
    );

    const test = useCallback(
        async (provider: string): Promise<{ ok: boolean; error?: string }> => {
            if (!token) return { ok: false };
            const res = await testIntegrationService({ provider, token });
            await fetch();
            const d = res.data as { ok?: boolean; error?: string } | undefined;
            return { ok: !!d?.ok, error: d?.error };
        },
        [token, fetch],
    );

    const getGoogleAuthorizeUrl = useCallback(
        async (professionalId?: number): Promise<string | null> => {
            if (!token) return null;
            const res = await getGoogleAuthorizeUrlService({ token, professionalId });
            const d = res.data as { url?: string } | undefined;
            return d?.url || null;
        },
        [token],
    );

    const disconnectGoogle = useCallback(async (): Promise<{ ok: boolean }> => {
        if (!token) return { ok: false };
        const res = await disconnectGoogleService({ token });
        if (res.status > 0) await fetch();
        return { ok: res.status > 0 };
    }, [token, fetch]);

    const getGoogleSyncStatus = useCallback(async () => {
        if (!token) return null;
        const res = await getGoogleSyncStatusService({ token });
        return res.data || null;
    }, [token]);

    return { data, loading, error, refetch: fetch, upsert, remove, test, getGoogleAuthorizeUrl, disconnectGoogle, getGoogleSyncStatus };
}
