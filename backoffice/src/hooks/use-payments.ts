'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { listPaymentsService, refundPaymentService } from '@/services/payments';

export interface PaymentIntent {
    id: number;
    status: 'pending' | 'paid' | 'expired' | 'cancelled' | 'refunded';
    amount: number;
    currency: string;
    mode: 'live' | 'simulated';
    mp_init_point: string | null;
    description: string | null;
    expires_at: string | null;
    paid_at: string | null;
    createdAt: string;
    appointment?: { id: number; date: string; start_time: string; client_name: string; status: string };
    clientContact?: { id: number; name: string; email?: string | null };
}

export function usePayments(params?: Record<string, string>) {
    const { token } = useAuth();
    const [data, setData] = useState<PaymentIntent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const res = await listPaymentsService({ token, params });
            if (res.status > 0) {
                setData((res.data as PaymentIntent[]) || []);
            } else {
                setError(res.message || 'Error al cargar cobros');
            }
        } catch {
            setError('Error de conexion');
        } finally {
            setLoading(false);
        }
    }, [token, params]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    const refund = useCallback(
        async (id: number): Promise<{ ok: boolean; message?: string }> => {
            if (!token) return { ok: false, message: 'Sin autenticacion' };
            try {
                const res = await refundPaymentService({ id, token });
                if (res.status > 0) {
                    await fetch();
                    return { ok: true };
                }
                return { ok: false, message: res.message };
            } catch {
                return { ok: false, message: 'Error de conexion' };
            }
        },
        [token, fetch],
    );

    return { data, loading, error, refetch: fetch, refund };
}
