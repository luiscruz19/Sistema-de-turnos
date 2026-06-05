'use client'

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiHeaders } from '@/utils/api-headers';
import config from '@/config/config';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Search, Eye, Pencil, ChevronLeft, ChevronRight, Loader2, Calendar, HeartPulse } from 'lucide-react';
import Link from 'next/link';
import { ClientContact, Pagination, AppointmentStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';

const statusConfig: Record<AppointmentStatus, { label: string; color: string; bg: string }> = {
    pending: { label: 'Pendiente', color: 'text-yellow-700', bg: 'bg-yellow-100' },
    confirmed: { label: 'Confirmado', color: 'text-blue-700', bg: 'bg-blue-100' },
    completed: { label: 'Completado', color: 'text-green-700', bg: 'bg-green-100' },
    cancelled: { label: 'Cancelado', color: 'text-red-700', bg: 'bg-red-100' },
    no_show: { label: 'Ausente', color: 'text-gray-700', bg: 'bg-gray-100' },
};

export default function ClientesPage() {
    const { token } = useAuth();
    const { toast } = useToast();
    const [clients, setClients] = useState<ClientContact[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [selectedClient, setSelectedClient] = useState<ClientContact | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', notes: '' });
    const [saving, setSaving] = useState(false);
    const [healthEnabled, setHealthEnabled] = useState(false);

    useEffect(() => {
        if (!token) return;
        fetch(`${config.basePath}/api/business-config`, { headers: apiHeaders(token) })
            .then(r => r.json())
            .then(j => {
                if (j.status === 1 && j.data) setHealthEnabled(!!j.data.enable_health_records);
            })
            .catch(() => undefined);
    }, [token]);

    const fetchClients = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: '20' });
            if (search) params.set('search', search);
            const res = await fetch(`${config.basePath}/api/clients?${params}`, { headers: apiHeaders(token) });
            const json = await res.json();
            if (json.status === 1) {
                setClients(json.data || []);
                if (json.pagination) setPagination(json.pagination);
            }
        } catch (err) {
            console.error('Error fetching clients', err);
        } finally {
            setLoading(false);
        }
    }, [token, page, search]);

    useEffect(() => { fetchClients(); }, [fetchClients]);

    const viewDetail = async (client: ClientContact) => {
        try {
            const res = await fetch(`${config.basePath}/api/clients/${client.id}`, { headers: apiHeaders(token) });
            const json = await res.json();
            if (json.status === 1) {
                setSelectedClient(json.data);
                setShowDetailModal(true);
            }
        } catch (err) {
            console.error('Error fetching client detail', err);
        }
    };

    const openEdit = (client: ClientContact) => {
        setSelectedClient(client);
        setEditForm({
            name: client.name,
            email: client.email || '',
            phone: client.phone || '',
            notes: client.notes || '',
        });
        setShowEditModal(true);
    };

    const handleSave = async () => {
        if (!selectedClient) return;
        setSaving(true);
        try {
            const res = await fetch(`${config.basePath}/api/clients/${selectedClient.id}`, {
                method: 'PUT',
                headers: { ...apiHeaders(token), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editForm.name,
                    email: editForm.email || null,
                    phone: editForm.phone || null,
                    notes: editForm.notes || null,
                }),
            });
            const json = await res.json();
            if (json.status > 0) {
                toast({ title: 'Exito', description: 'Cliente actualizado' });
                setShowEditModal(false);
                fetchClients();
            } else {
                toast({ title: 'Error', description: json.message, variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6 space-y-4">
            <h1 className="text-2xl font-semibold text-gray-900">Clientes</h1>

            <Card>
                <CardContent className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Buscar por nombre, email o telefono..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            className="pl-9"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center p-12">
                            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                        </div>
                    ) : clients.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">No se encontraron clientes</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Telefono</TableHead>
                                    <TableHead>Ultimo turno</TableHead>
                                    <TableHead>Total turnos</TableHead>
                                    <TableHead>No-shows</TableHead>
                                    <TableHead>Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {clients.map(client => (
                                    <TableRow key={client.id}>
                                        <TableCell className="font-medium">{client.name}</TableCell>
                                        <TableCell className="text-sm">{client.email || '-'}</TableCell>
                                        <TableCell className="text-sm">{client.phone || '-'}</TableCell>
                                        <TableCell className="text-sm">{client.last_appointment_at ? new Date(client.last_appointment_at).toLocaleDateString('es-AR') : '-'}</TableCell>
                                        <TableCell className="text-sm">{client.appointment_count}</TableCell>
                                        <TableCell>
                                            {client.no_show_count > 0 ? (
                                                <Badge variant="destructive" className="text-xs">{client.no_show_count}</Badge>
                                            ) : (
                                                <span className="text-sm text-gray-400">0</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => viewDetail(client)}>
                                                    <Eye className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(client)}>
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                {healthEnabled && (
                                                    <Link href={`${config.basePath}/dashboard/clientes/${client.id}/historia-clinica`}>
                                                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Historia clinica">
                                                            <HeartPulse className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </Link>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">{pagination.totalItems} clientes</p>
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

            {/* Detail Modal */}
            <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{selectedClient?.name}</DialogTitle>
                        <DialogDescription>Historial del cliente</DialogDescription>
                    </DialogHeader>
                    {selectedClient && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-gray-500">Email</p>
                                    <p className="font-medium">{selectedClient.email || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Telefono</p>
                                    <p className="font-medium">{selectedClient.phone || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Total turnos</p>
                                    <p className="font-medium">{selectedClient.appointment_count}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">No-shows</p>
                                    <p className="font-medium">{selectedClient.no_show_count}</p>
                                </div>
                            </div>
                            {selectedClient.notes && (
                                <div className="text-sm">
                                    <p className="text-gray-500">Notas</p>
                                    <p className="text-gray-700">{selectedClient.notes}</p>
                                </div>
                            )}
                            {selectedClient.appointments && selectedClient.appointments.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium text-gray-700 mb-2">Historial de turnos</p>
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {selectedClient.appointments.map(apt => {
                                            const sc = statusConfig[apt.status];
                                            return (
                                                <div key={apt.id} className="flex items-center gap-3 text-sm border rounded-md p-2">
                                                    <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="truncate">{apt.date} {apt.start_time?.slice(0, 5)}</p>
                                                        <p className="text-gray-500 text-xs truncate">{apt.service?.name}</p>
                                                    </div>
                                                    <Badge className={`${sc.bg} ${sc.color} border-0 text-xs`}>{sc.label}</Badge>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar cliente</DialogTitle>
                        <DialogDescription>Modifica los datos del cliente</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Nombre</Label>
                            <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Email</Label>
                                <Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                            </div>
                            <div>
                                <Label>Telefono</Label>
                                <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
                            </div>
                        </div>
                        <div>
                            <Label>Notas</Label>
                            <Textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Guardar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
