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
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Loader2, Clock } from 'lucide-react';
import { Service } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function ServiciosPage() {
    const { token } = useAuth();
    const { toast } = useToast();
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Service | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: '', description: '', duration_minutes: '30', buffer_time_minutes: '0', price: '0', deposit_amount: '0',
        category: '', requires_professional: true, active: true,
    });

    const fetchServices = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch(`${config.basePath}/api/services`, { headers: apiHeaders(token) });
            const json = await res.json();
            if (json.status === 1) setServices(json.data || []);
        } catch (err) {
            console.error('Error fetching services', err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { fetchServices(); }, [fetchServices]);

    const openNew = () => {
        setEditing(null);
        setForm({ name: '', description: '', duration_minutes: '30', buffer_time_minutes: '0', price: '0', deposit_amount: '0', category: '', requires_professional: true, active: true });
        setShowModal(true);
    };

    const openEdit = (s: Service) => {
        setEditing(s);
        setForm({
            name: s.name,
            description: s.description || '',
            duration_minutes: String(s.duration_minutes),
            buffer_time_minutes: String((s as any).buffer_time_minutes || 0),
            price: String(s.price),
            deposit_amount: String(s.deposit_amount),
            category: s.category || '',
            requires_professional: s.requires_professional,
            active: s.active,
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            toast({ title: 'Error', description: 'El nombre es obligatorio', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const url = editing
                ? `${config.basePath}/api/services/${editing.id}`
                : `${config.basePath}/api/services`;
            const method = editing ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { ...apiHeaders(token), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name,
                    description: form.description || null,
                    duration_minutes: Number(form.duration_minutes),
                    buffer_time_minutes: Number(form.buffer_time_minutes) || 0,
                    price: Number(form.price),
                    deposit_amount: Number(form.deposit_amount),
                    category: form.category || null,
                    requires_professional: form.requires_professional,
                    active: form.active,
                }),
            });
            const json = await res.json();
            if (json.status > 0) {
                toast({ title: 'Exito', description: editing ? 'Servicio actualizado' : 'Servicio creado' });
                setShowModal(false);
                fetchServices();
            } else {
                toast({ title: 'Error', description: json.message, variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Estas seguro de eliminar este servicio?')) return;
        try {
            const res = await fetch(`${config.basePath}/api/services/${id}`, { method: 'DELETE', headers: apiHeaders(token) });
            const json = await res.json();
            if (json.status > 0) {
                toast({ title: 'Exito', description: 'Servicio eliminado' });
                fetchServices();
            } else {
                toast({ title: 'Error', description: json.message, variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' });
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold text-gray-900">Servicios</h1>
                <Button onClick={openNew} className="gap-1"><Plus className="h-4 w-4" /> Nuevo servicio</Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center p-12">
                            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                        </div>
                    ) : services.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">No hay servicios registrados</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Duracion</TableHead>
                                    <TableHead>Precio</TableHead>
                                    <TableHead>Deposito</TableHead>
                                    <TableHead>Categoria</TableHead>
                                    <TableHead>Profesional</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {services.map(s => (
                                    <TableRow key={s.id}>
                                        <TableCell className="font-medium">{s.name}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 text-sm">
                                                <Clock className="h-3.5 w-3.5 text-gray-400" />
                                                {s.duration_minutes} min
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm">${s.price}</TableCell>
                                        <TableCell className="text-sm">{s.deposit_amount > 0 ? `$${s.deposit_amount}` : '-'}</TableCell>
                                        <TableCell className="text-sm">{s.category || '-'}</TableCell>
                                        <TableCell className="text-sm">{s.requires_professional ? 'Si' : 'No'}</TableCell>
                                        <TableCell>
                                            <Badge variant={s.active ? 'success' : 'secondary'}>
                                                {s.active ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(s)}>
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={() => handleDelete(s.id)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Modal */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Editar servicio' : 'Nuevo servicio'}</DialogTitle>
                        <DialogDescription>Completa los datos del servicio</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Nombre *</Label>
                            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div>
                            <Label>Descripcion</Label>
                            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Duracion (min)</Label>
                                <Input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} />
                            </div>
                            <div>
                                <Label>Buffer entre turnos (min)</Label>
                                <Input type="number" min="0" value={form.buffer_time_minutes} onChange={e => setForm(f => ({ ...f, buffer_time_minutes: e.target.value }))} placeholder="0" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Precio</Label>
                                <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                            </div>
                            <div>
                                <Label>Deposito</Label>
                                <Input type="number" value={form.deposit_amount} onChange={e => setForm(f => ({ ...f, deposit_amount: e.target.value }))} />
                            </div>
                        </div>
                        <div>
                            <Label>Categoria</Label>
                            <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Ej: Corte, Tratamiento..." />
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Switch checked={form.requires_professional} onCheckedChange={v => setForm(f => ({ ...f, requires_professional: v }))} />
                                <Label>Requiere profesional</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
                                <Label>Activo</Label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                            {editing ? 'Guardar' : 'Crear'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
