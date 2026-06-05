'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiHeaders } from '@/utils/api-headers';
import config from '@/config/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Calendar, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SyncStatus {
    connected: boolean;
    google_email?: string | null;
    sync_enabled?: boolean;
    last_sync_at?: string | null;
    calendar_id?: string | null;
    scope?: string | null;
}

interface Professional {
    id: number;
    name: string;
    email?: string | null;
    specialty?: string | null;
}

export default function ProfesionalGoogleCalendarPage() {
    const params = useParams();
    const router = useRouter();
    const professionalId = Number(params.id);
    const { token } = useAuth();
    const { toast } = useToast();

    const [professional, setProfessional] = useState<Professional | null>(null);
    const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);
    const [toggling, setToggling] = useState(false);

    const fetchData = useCallback(async () => {
        if (!token || !professionalId) return;
        setLoading(true);
        try {
            const [profRes, syncRes] = await Promise.all([
                fetch(`${config.basePath}/api/professionals/${professionalId}`, { headers: apiHeaders(token) }),
                fetch(
                    `${config.basePath}/api/google/sync-status?professional_id=${professionalId}`,
                    { headers: apiHeaders(token) },
                ),
            ]);
            const profJson = await profRes.json();
            const syncJson = await syncRes.json();

            if (profJson.status > 0) setProfessional(profJson.data);

            if (syncJson.status > 0) {
                setSyncStatus(syncJson.data as SyncStatus);
            } else {
                setSyncStatus({ connected: false });
            }
        } catch (err) {
            console.error('Error fetching calendar status', err);
            setSyncStatus({ connected: false });
        } finally {
            setLoading(false);
        }
    }, [token, professionalId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleConnect = async () => {
        if (!token) return;
        setConnecting(true);
        try {
            const res = await fetch(
                `${config.basePath}/api/google/authorize?professional_id=${professionalId}`,
                { headers: apiHeaders(token) },
            );
            const json = await res.json();
            if (json.status > 0 && json.data?.url) {
                const popup = window.open(json.data.url, '_blank', 'width=500,height=700');
                // Escuchar cuando el popup cierra para refrescar el estado
                const interval = setInterval(() => {
                    if (popup?.closed) {
                        clearInterval(interval);
                        setTimeout(() => fetchData(), 1000);
                    }
                }, 500);
            } else {
                toast({
                    title: 'No disponible',
                    description: json.message || 'Google OAuth no esta configurado en el servidor',
                    variant: 'destructive',
                });
            }
        } catch {
            toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' });
        } finally {
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        if (!token) return;
        if (!window.confirm('Desconectar Google Calendar de este profesional?')) return;
        setDisconnecting(true);
        try {
            const res = await fetch(`${config.basePath}/api/google/disconnect`, {
                method: 'POST',
                headers: { ...apiHeaders(token), 'Content-Type': 'application/json' },
                body: JSON.stringify({ professional_id: professionalId }),
            });
            const json = await res.json();
            if (json.status > 0) {
                toast({ title: 'Desconectado', description: 'Google Calendar desvinculado' });
                fetchData();
            } else {
                toast({ title: 'Error', description: json.message || 'Error', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' });
        } finally {
            setDisconnecting(false);
        }
    };

    const handleToggleSync = async (enabled: boolean) => {
        if (!token) return;
        setToggling(true);
        try {
            // Upsert de la integración con el scope del profesional
            const res = await fetch(`${config.basePath}/api/integrations`, {
                method: 'PUT',
                headers: { ...apiHeaders(token), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: 'google_calendar',
                    scope: `professional:${professionalId}`,
                    credentials: {},
                    config: {},
                    enabled,
                }),
            });
            const json = await res.json();
            if (json.status > 0) {
                setSyncStatus(prev => prev ? { ...prev, sync_enabled: enabled } : prev);
                toast({ title: 'Actualizado', description: enabled ? 'Sincronizacion activada' : 'Sincronizacion pausada' });
            } else {
                toast({ title: 'Error', description: json.message || 'Error', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' });
        } finally {
            setToggling(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
        );
    }

    const connected = syncStatus?.connected;

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6 space-y-4">
            <div className="flex items-center gap-3">
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => router.push(`${config.basePath}/dashboard/profesionales`)}
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Google Calendar</h1>
                    <p className="text-sm text-gray-500">
                        {professional?.name || `Profesional #${professionalId}`}
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-md bg-blue-50 text-blue-600">
                                <Calendar className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Conexion con Google Calendar</CardTitle>
                                <CardDescription className="text-xs">
                                    Los turnos confirmados se sincronizan con el calendario del profesional.
                                </CardDescription>
                            </div>
                        </div>
                        {connected ? (
                            <Badge className="bg-green-100 text-green-700 border-0">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Conectado
                            </Badge>
                        ) : (
                            <Badge className="bg-gray-100 text-gray-600 border-0">
                                <XCircle className="h-3 w-3 mr-1" />
                                Sin conectar
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {connected ? (
                        <>
                            {syncStatus?.google_email && (
                                <div>
                                    <p className="text-xs text-gray-500">Cuenta conectada</p>
                                    <p className="text-sm font-medium">{syncStatus.google_email}</p>
                                </div>
                            )}

                            {syncStatus?.last_sync_at && (
                                <div>
                                    <p className="text-xs text-gray-500">Ultima sincronizacion</p>
                                    <p className="text-sm">{new Date(syncStatus.last_sync_at).toLocaleString('es-AR')}</p>
                                </div>
                            )}

                            <div className="flex items-center gap-3 pt-1">
                                <Switch
                                    checked={syncStatus?.sync_enabled ?? true}
                                    onCheckedChange={handleToggleSync}
                                    disabled={toggling}
                                />
                                <Label className="text-sm">Sincronizacion activada</Label>
                                {toggling && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
                            </div>

                            <div className="flex gap-2 pt-2 border-t">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={fetchData}
                                >
                                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                                    Actualizar estado
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleDisconnect}
                                    disabled={disconnecting}
                                    className="text-red-600 hover:text-red-700"
                                >
                                    {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                                    Desconectar
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600">
                                Conecta la cuenta de Google de este profesional para sincronizar sus turnos
                                automaticamente. Cada turno confirmado se agrega como evento en su Google Calendar.
                            </p>
                            <Button onClick={handleConnect} disabled={connecting}>
                                {connecting ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Calendar className="h-4 w-4 mr-2" />
                                )}
                                Conectar Google Calendar
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
