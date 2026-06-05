'use client'

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiHeaders } from '@/utils/api-headers';
import config from '@/config/config';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Plus, CheckCircle, XCircle, UserX, Eye, ChevronLeft, ChevronRight, CalendarX } from 'lucide-react';
import { Appointment, Professional, Service, AppointmentStatus, Pagination } from '@/types';
import AppointmentDetailModal from '@/components/appointments/AppointmentDetailModal';
import NuevoTurnoModal from '@/components/appointments/NuevoTurnoModal';
import { useToast } from '@/hooks/use-toast';

const statusConfig: Record<AppointmentStatus, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' }> = {
    pending: { label: 'Pendiente', variant: 'warning' },
    confirmed: { label: 'Confirmado', variant: 'info' },
    completed: { label: 'Completado', variant: 'success' },
    cancelled: { label: 'Cancelado', variant: 'destructive' },
    no_show: { label: 'Ausente', variant: 'secondary' },
};

const sourceLabels: Record<string, string> = {
    web: 'Web',
    whatsapp: 'WhatsApp',
    manual: 'Manual',
};

export default function TurnosPage() {
    const { token } = useAuth();
    const { toast } = useToast();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterProfessional, setFilterProfessional] = useState<string>('all');
    const [filterFrom, setFilterFrom] = useState('');
    const [filterTo, setFilterTo] = useState('');
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [showNewModal, setShowNewModal] = useState(false);

    const fetchAppointments = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: '20' });
            if (filterStatus !== 'all') params.set('status', filterStatus);
            if (filterProfessional !== 'all') params.set('professional_id', filterProfessional);
            if (filterFrom) params.set('from', filterFrom);
            if (filterTo) params.set('to', filterTo);

            const res = await fetch(`${config.basePath}/api/appointments?${params}`, { headers: apiHeaders(token) });
            const json = await res.json();
            if (json.status === 1) {
                setAppointments(json.data || []);
                if (json.pagination) setPagination(json.pagination);
            }
        } catch (err) {
            console.error('Error fetching appointments', err);
        } finally {
            setLoading(false);
        }
    }, [token, page, filterStatus, filterProfessional, filterFrom, filterTo]);

    const fetchMasterData = useCallback(async () => {
        if (!token) return;
        try {
            const [profRes, svcRes] = await Promise.all([
                fetch(`${config.basePath}/api/professionals`, { headers: apiHeaders(token) }),
                fetch(`${config.basePath}/api/services`, { headers: apiHeaders(token) }),
            ]);
            const profJson = await profRes.json();
            const svcJson = await svcRes.json();
            if (profJson.status === 1) setProfessionals(profJson.data || []);
            if (svcJson.status === 1) setServices(svcJson.data || []);
        } catch (err) {
            console.error('Error fetching master data', err);
        }
    }, [token]);

    useEffect(() => { fetchMasterData(); }, [fetchMasterData]);
    useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

    const handleAction = async (id: number, action: 'confirm' | 'complete' | 'no-show' | 'cancel') => {
        try {
            const url = action === 'cancel'
                ? `${config.basePath}/api/appointments/${id}`
                : `${config.basePath}/api/appointments/${id}/${action}`;
            const method = action === 'cancel' ? 'DELETE' : 'PUT';
            const res = await fetch(url, { method, headers: { ...apiHeaders(token), 'Content-Type': 'application/json' } });
            const json = await res.json();
            if (json.status > 0) {
                toast({ title: 'Exito', description: json.message || 'Accion realizada' });
                fetchAppointments();
            } else {
                toast({ title: 'Error', description: json.message, variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' });
        }
    };

    return (
        <div className="min-h-screen bg-muted/30 p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Turnos</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Consulta, filtra y gestiona todos los turnos.</p>
                </div>
                <Button onClick={() => setShowNewModal(true)} className="gap-1">
                    <Plus className="h-4 w-4" /> Nuevo turno
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Desde</label>
                            <Input type="date" value={filterFrom} onChange={e => { setFilterFrom(e.target.value); setPage(1); }} />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Hasta</label>
                            <Input type="date" value={filterTo} onChange={e => { setFilterTo(e.target.value); setPage(1); }} />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Estado</label>
                            <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1); }}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="pending">Pendiente</SelectItem>
                                    <SelectItem value="confirmed">Confirmado</SelectItem>
                                    <SelectItem value="completed">Completado</SelectItem>
                                    <SelectItem value="cancelled">Cancelado</SelectItem>
                                    <SelectItem value="no_show">Ausente</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Profesional</label>
                            <Select value={filterProfessional} onValueChange={v => { setFilterProfessional(v); setPage(1); }}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {professionals.map(p => (
                                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="space-y-2 p-4">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : appointments.length === 0 ? (
                        <EmptyState
                            icon={CalendarX}
                            title="No se encontraron turnos"
                            description="Proba ajustar los filtros o crea un nuevo turno."
                            action={
                                <Button onClick={() => setShowNewModal(true)} size="sm" className="gap-1">
                                    <Plus className="h-4 w-4" /> Nuevo turno
                                </Button>
                            }
                        />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Hora</TableHead>
                                    <TableHead>Profesional</TableHead>
                                    <TableHead>Servicio</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Origen</TableHead>
                                    <TableHead>Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {appointments.map(apt => {
                                    const sc = statusConfig[apt.status];
                                    return (
                                        <TableRow key={apt.id}>
                                            <TableCell className="text-sm">{apt.date}</TableCell>
                                            <TableCell className="text-sm font-mono">{apt.start_time?.slice(0, 5)}</TableCell>
                                            <TableCell className="text-sm">{apt.professional?.name || '-'}</TableCell>
                                            <TableCell className="text-sm">{apt.service?.name || '-'}</TableCell>
                                            <TableCell className="text-sm font-medium">{apt.client_name}</TableCell>
                                            <TableCell>
                                                <Badge variant={sc.variant}>{sc.label}</Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">{sourceLabels[apt.source] || apt.source}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedAppointment(apt)}>
                                                        <Eye className="h-3.5 w-3.5" />
                                                    </Button>
                                                    {apt.status === 'pending' && (
                                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-600" onClick={() => handleAction(apt.id, 'confirm')}>
                                                            <CheckCircle className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                    {(apt.status === 'pending' || apt.status === 'confirmed') && (
                                                        <>
                                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => handleAction(apt.id, 'complete')}>
                                                                <CheckCircle className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-600" onClick={() => handleAction(apt.id, 'no-show')}>
                                                                <UserX className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={() => handleAction(apt.id, 'cancel')}>
                                                                <XCircle className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </>
                                                    )}
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

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">{pagination.totalItems} resultados</p>
                    <div className="flex gap-1">
                        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="px-3 py-1 text-sm text-gray-700">{page} / {pagination.totalPages}</span>
                        <Button size="sm" variant="outline" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {selectedAppointment && (
                <AppointmentDetailModal
                    appointment={selectedAppointment}
                    open={!!selectedAppointment}
                    onClose={() => setSelectedAppointment(null)}
                    onRefresh={fetchAppointments}
                />
            )}

            {showNewModal && (
                <NuevoTurnoModal
                    open={showNewModal}
                    onClose={() => setShowNewModal(false)}
                    onCreated={() => { setShowNewModal(false); fetchAppointments(); }}
                    professionals={professionals}
                    services={services}
                />
            )}
        </div>
    );
}
