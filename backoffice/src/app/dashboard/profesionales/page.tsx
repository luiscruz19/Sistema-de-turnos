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
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Plus, Pencil, Trash2, Loader2, Calendar as CalendarIcon, Users } from 'lucide-react';
import { Professional, Service } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function ProfesionalesPage() {
    const { token } = useAuth();
    const { toast } = useToast();
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Professional | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: '', email: '', phone: '', specialty: '', color: '#2d4773', active: true,
        service_ids: [] as number[],
    });

    const fetchData = useCallback(async () => {
        if (!token) return;
        setLoading(true);
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
            console.error('Error fetching professionals', err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openNew = () => {
        setEditing(null);
        setForm({ name: '', email: '', phone: '', specialty: '', color: '#2d4773', active: true, service_ids: [] });
        setShowModal(true);
    };

    const openEdit = (p: Professional) => {
        setEditing(p);
        setForm({
            name: p.name,
            email: p.email || '',
            phone: p.phone || '',
            specialty: p.specialty || '',
            color: p.color || '#2d4773',
            active: p.active,
            service_ids: p.professionalServices?.map(ps => ps.service_id) || [],
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
                ? `${config.basePath}/api/professionals/${editing.id}`
                : `${config.basePath}/api/professionals`;
            const method = editing ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { ...apiHeaders(token), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name,
                    email: form.email || null,
                    phone: form.phone || null,
                    specialty: form.specialty || null,
                    color: form.color,
                    active: form.active,
                    service_ids: form.service_ids,
                }),
            });
            const json = await res.json();
            if (json.status > 0) {
                toast({ title: 'Exito', description: editing ? 'Profesional actualizado' : 'Profesional creado' });
                setShowModal(false);
                fetchData();
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
        if (!confirm('Estas seguro de eliminar este profesional?')) return;
        try {
            const res = await fetch(`${config.basePath}/api/professionals/${id}`, {
                method: 'DELETE',
                headers: apiHeaders(token),
            });
            const json = await res.json();
            if (json.status > 0) {
                toast({ title: 'Exito', description: 'Profesional eliminado' });
                fetchData();
            } else {
                toast({ title: 'Error', description: json.message, variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' });
        }
    };

    const toggleService = (serviceId: number) => {
        setForm(f => ({
            ...f,
            service_ids: f.service_ids.includes(serviceId)
                ? f.service_ids.filter(id => id !== serviceId)
                : [...f.service_ids, serviceId],
        }));
    };

    return (
        <div className="min-h-screen bg-muted/30 p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Profesionales</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Administra tu equipo y los servicios que ofrece cada uno.</p>
                </div>
                <Button onClick={openNew} className="gap-1"><Plus className="h-4 w-4" /> Nuevo profesional</Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="space-y-2 p-4">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : professionals.length === 0 ? (
                        <EmptyState
                            icon={Users}
                            title="Aun no hay profesionales"
                            description="Agrega a los integrantes de tu equipo para asignarles turnos."
                            action={
                                <Button onClick={openNew} size="sm" className="gap-1">
                                    <Plus className="h-4 w-4" /> Nuevo profesional
                                </Button>
                            }
                        />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Color</TableHead>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Especialidad</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Telefono</TableHead>
                                    <TableHead>Servicios</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {professionals.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell>
                                            <div className="w-6 h-6 rounded-full" style={{ backgroundColor: p.color }} />
                                        </TableCell>
                                        <TableCell className="font-medium">{p.name}</TableCell>
                                        <TableCell className="text-sm text-gray-600">{p.specialty || '-'}</TableCell>
                                        <TableCell className="text-sm">{p.email || '-'}</TableCell>
                                        <TableCell className="text-sm">{p.phone || '-'}</TableCell>
                                        <TableCell className="text-sm">
                                            {p.professionalServices?.length || 0} servicios
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={p.active ? 'success' : 'secondary'}>
                                                {p.active ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p)}>
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7"
                                                    title="Conectar Google Calendar"
                                                    onClick={async () => {
                                                        const res = await fetch(`${config.basePath}/api/google/authorize?professional_id=${p.id}`, { headers: apiHeaders(token) });
                                                        const json = await res.json();
                                                        if (json.status > 0 && json.data?.url) {
                                                            window.open(json.data.url, '_blank', 'width=500,height=700');
                                                        } else {
                                                            toast({ title: 'No disponible', description: json.message || 'Google OAuth no configurado', variant: 'destructive' });
                                                        }
                                                    }}
                                                >
                                                    <CalendarIcon className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(p.id)}>
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
                        <DialogTitle>{editing ? 'Editar profesional' : 'Nuevo profesional'}</DialogTitle>
                        <DialogDescription>Completa los datos del profesional</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Nombre *</Label>
                            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Email</Label>
                                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                            </div>
                            <div>
                                <Label>Telefono</Label>
                                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Especialidad</Label>
                                <Input value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} />
                            </div>
                            <div>
                                <Label>Color</Label>
                                <div className="flex items-center gap-2">
                                    <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border-0" />
                                    <span className="text-sm text-muted-foreground">{form.color}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
                            <Label>Activo</Label>
                        </div>
                        {services.length > 0 && (
                            <div>
                                <Label>Servicios asignados</Label>
                                <div className="grid grid-cols-2 gap-2 mt-2 max-h-32 overflow-y-auto">
                                    {services.filter(s => s.active).map(s => (
                                        <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={form.service_ids.includes(s.id)}
                                                onChange={() => toggleService(s.id)}
                                                className="rounded border-gray-300"
                                            />
                                            {s.name}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                            {editing ? 'Guardar cambios' : 'Crear'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
