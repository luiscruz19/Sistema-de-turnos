'use client'

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiHeaders } from '@/utils/api-headers';
import config from '@/config/config';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Loader2, Clock, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type WaitlistStatus = 'waiting' | 'notified' | 'booked' | 'cancelled';

interface WaitlistEntry {
    id: number;
    client_contact_id: number | null;
    client_name: string;
    client_email: string | null;
    client_phone: string | null;
    preferred_date: string | null;
    service_id: number | null;
    professional_id: number | null;
    status: WaitlistStatus;
    notes: string | null;
    notified_at: string | null;
    createdAt: string;
}

const statusConfig: Record<WaitlistStatus, { label: string; className: string }> = {
    waiting: { label: 'Esperando', className: 'bg-yellow-100 text-yellow-700 border-0' },
    notified: { label: 'Notificado', className: 'bg-blue-100 text-blue-700 border-0' },
    booked: { label: 'Reservado', className: 'bg-green-100 text-green-700 border-0' },
    cancelled: { label: 'Cancelado', className: 'bg-gray-100 text-gray-500 border-0' },
};

const ALL_STATUSES = 'all';

export default function ListaEsperaPage() {
    const { token } = useAuth();
    const { toast } = useToast();
    const [entries, setEntries] = useState<WaitlistEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<WaitlistStatus | typeof ALL_STATUSES>(ALL_STATUSES);
    const [notifyingId, setNotifyingId] = useState<number | null>(null);

    const fetchEntries = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterStatus !== ALL_STATUSES) params.set('status', filterStatus);
            const res = await fetch(`${config.basePath}/api/waitlist?${params}`, { headers: apiHeaders(token) });
            const json = await res.json();
            if (json.status === 1) setEntries(json.data || []);
        } catch (err) {
            console.error('Error fetching waitlist', err);
        } finally {
            setLoading(false);
        }
    }, [token, filterStatus]);

    useEffect(() => { fetchEntries(); }, [fetchEntries]);

    const handleNotify = async (entry: WaitlistEntry) => {
        setNotifyingId(entry.id);
        try {
            const res = await fetch(`${config.basePath}/api/waitlist/${entry.id}/notify`, {
                method: 'PUT',
                headers: apiHeaders(token),
            });
            const json = await res.json();
            if (json.status > 0) {
                toast({ title: 'Exito', description: `${entry.client_name} fue notificado` });
                fetchEntries();
            } else {
                toast({ title: 'Error', description: json.message || 'No se pudo notificar', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' });
        } finally {
            setNotifyingId(null);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Eliminar esta entrada de la lista de espera?')) return;
        try {
            const res = await fetch(`${config.basePath}/api/waitlist/${id}`, {
                method: 'DELETE',
                headers: apiHeaders(token),
            });
            const json = await res.json();
            if (json.status > 0) {
                toast({ title: 'Exito', description: 'Entrada eliminada' });
                fetchEntries();
            } else {
                toast({ title: 'Error', description: json.message || 'No se pudo eliminar', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' });
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Clock className="h-6 w-6 text-gray-700" />
                    <h1 className="text-2xl font-semibold text-gray-900">Lista de espera</h1>
                </div>
            </div>

            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 shrink-0">Filtrar por estado:</span>
                        <Select
                            value={filterStatus}
                            onValueChange={val => setFilterStatus(val as WaitlistStatus | typeof ALL_STATUSES)}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL_STATUSES}>Todos</SelectItem>
                                {(Object.keys(statusConfig) as WaitlistStatus[]).map(s => (
                                    <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center p-12">
                            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                        </div>
                    ) : entries.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            {filterStatus === ALL_STATUSES ? 'No hay entradas en la lista de espera' : `No hay entradas con estado "${statusConfig[filterStatus as WaitlistStatus]?.label}"`}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Contacto</TableHead>
                                    <TableHead>Fecha preferida</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Fecha ingreso</TableHead>
                                    <TableHead>Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {entries.map(entry => {
                                    const sc = statusConfig[entry.status];
                                    return (
                                        <TableRow key={entry.id}>
                                            <TableCell className="font-medium">{entry.client_name}</TableCell>
                                            <TableCell className="text-sm">
                                                <div>{entry.client_email || '-'}</div>
                                                <div className="text-gray-500">{entry.client_phone || ''}</div>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {entry.preferred_date
                                                    ? new Date(entry.preferred_date).toLocaleDateString('es-AR')
                                                    : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={sc.className}>{sc.label}</Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-500">
                                                {new Date(entry.createdAt).toLocaleDateString('es-AR')}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    {entry.status === 'waiting' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 text-xs"
                                                            disabled={notifyingId === entry.id}
                                                            onClick={() => handleNotify(entry)}
                                                        >
                                                            {notifyingId === entry.id
                                                                ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                                                : <Bell className="h-3 w-3 mr-1" />
                                                            }
                                                            Notificar
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 text-red-500 hover:text-red-600"
                                                        onClick={() => handleDelete(entry.id)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
