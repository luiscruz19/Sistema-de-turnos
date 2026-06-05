'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    getHealthRecordService,
    updateHealthRecordService,
    addNoteService,
    deleteNoteService,
    addAttachmentService,
} from '@/services/health-records';

export interface HealthRecord {
    id?: number;
    summary?: string | null;
    allergies?: string | null;
    medications?: string | null;
    conditions?: string | null;
    blood_type?: string | null;
    emergency_contact?: string | null;
}

export interface HealthNote {
    id: number;
    content: string;
    is_private: boolean;
    createdAt: string;
    professional?: { id: number; name: string } | null;
    author_user_id?: number | null;
}

export interface HealthAttachment {
    id: number;
    file_url: string;
    file_name: string;
    mime_type?: string | null;
    size_bytes?: number | null;
    description?: string | null;
    createdAt: string;
}

export interface HealthRecordData {
    client: { id: number; name: string; email?: string | null; phone?: string | null } | null;
    record: HealthRecord;
    notes: HealthNote[];
    attachments: HealthAttachment[];
}

export function useHealthRecord(clientId: number) {
    const { token } = useAuth();
    const [data, setData] = useState<HealthRecordData>({
        client: null,
        record: {},
        notes: [],
        attachments: [],
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async () => {
        if (!token || !clientId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await getHealthRecordService({ clientId, token });
            if (res.status > 0) {
                const d = res.data as HealthRecordData;
                setData({
                    client: d?.client || null,
                    record: d?.record || {},
                    notes: d?.notes || [],
                    attachments: d?.attachments || [],
                });
            } else {
                setError(res.message || 'Error al cargar historia clinica');
            }
        } catch {
            setError('Error de conexion');
        } finally {
            setLoading(false);
        }
    }, [token, clientId]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    const updateRecord = useCallback(
        async (record: HealthRecord): Promise<{ ok: boolean; message?: string }> => {
            if (!token) return { ok: false };
            const res = await updateHealthRecordService({ clientId, data: record as Record<string, unknown>, token });
            return { ok: res.status > 0, message: res.message };
        },
        [token, clientId],
    );

    const addNote = useCallback(
        async (content: string, is_private: boolean): Promise<{ ok: boolean; message?: string }> => {
            if (!token) return { ok: false };
            const res = await addNoteService({ clientId, content, is_private, token });
            if (res.status > 0) await fetch();
            return { ok: res.status > 0, message: res.message };
        },
        [token, clientId, fetch],
    );

    const deleteNote = useCallback(
        async (noteId: number): Promise<{ ok: boolean }> => {
            if (!token) return { ok: false };
            const res = await deleteNoteService({ noteId, token });
            if (res.status > 0) await fetch();
            return { ok: res.status > 0 };
        },
        [token, fetch],
    );

    const addAttachment = useCallback(
        async (file_url: string, file_name: string): Promise<{ ok: boolean; message?: string }> => {
            if (!token) return { ok: false };
            const res = await addAttachmentService({ clientId, file_url, file_name, token });
            if (res.status > 0) await fetch();
            return { ok: res.status > 0, message: res.message };
        },
        [token, clientId, fetch],
    );

    return { data, loading, error, refetch: fetch, updateRecord, addNote, deleteNote, addAttachment };
}
