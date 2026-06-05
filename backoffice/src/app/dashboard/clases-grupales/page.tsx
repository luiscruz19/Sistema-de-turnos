'use client'

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiHeaders } from '@/utils/api-headers';
import config from '@/config/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Loader2, Users2, UserPlus, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GroupClassEnrollment {
    id: number;
    client_contact_id: number;
    client_name: string;
    enrolled_at: string;
}

interface GroupClass {
    id: number;
    title: string;
    description: string | null;
    date: string;
    start_time: string;
    end_time: string;
    capacity: number;
    enrolled_count: number;
    price: number;
    enrollments?: GroupClassEnrollment[];
    createdAt: string;
}

interface ClassForm {
    title: string;
    description: string;
    date: string;
    start_time: string;
    end_time: string;
    capacity: string;
    price: string;
}

const emptyForm: ClassForm = {
    title: '',
    description: '',
    date: '',
    start_time: '',
    end_time: '',
    capacity: '',
    price: '',
};

export default function ClasesGrupalesPage() {
    const { token } = useAuth();
    const { toast } = useToast();
    const [classes, setClasses] = useState<GroupClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewModal, setShowNewModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<ClassForm>(emptyForm);

    // Modal de inscriptos
    const [selectedClass, setSelectedClass] = useState<GroupClass | null>(null);
    const [showEnrollModal, setShowEnrollModal] = useState(false);
    const [loadingEnrollments, setLoadingEnrollments] = useState(false);
    const [enrollClientId, setEnrollClientId] = useState('');
    const [enrolling, setEnrolling] = useState(false);

    const fetchClasses = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch(`${config.basePath}/api/group-classes`, { headers: apiHeaders(token) });
            const json = await res.json();
            if (json.status === 1) setClasses(json.data || []);
        } catch (err) {
            console.error('Error fetching classes', err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { fetchClasses(); }, [fetchClasses]);

    const openNewModal = () => {
        setForm(emptyForm);
        setShowNewModal(true);
    };

    const handleCreate = async () => {
        if (!form.title.trim()) {
            toast({ title: 'Error', description: 'El titulo es obligatorio', variant: 'destructive' });
            return;
        }
        if (!form.date || !form.start_time || !form.end_time) {
            toast({ title: 'Error', description: 'Fecha y horario son obligatorios', variant: 'destructive' });
            return;
        }
        const capacity = parseInt(form.capacity);
        if (!capacity || capacity <= 0) {
            toast({ title: 'Error', description: 'Ingresa una capacidad valida', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(`${config.basePath}/api/group-classes`, {
                method: 'POST',
                headers: { ...apiHeaders(token), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: form.title.trim(),
                    description: form.description.trim() || null,
                    date: form.date,
                    start_time: form.start_time,
                    end_time: form.end_time,
                    capacity,
                    price: parseFloat(form.price) || 0,
                }),
            });
            const json = await res.json();
            if (json.status > 0) {
                toast({ title: 'Exito', description: 'Clase creada' });
                setShowNewModal(false);
                fetchClasses();
            } else {
                toast({ title: 'Error', description: json.message || 'No se pudo crear la clase', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Eliminar esta clase grupal?')) return;
        try {
            const res = await fetch(`${config.basePath}/api/group-classes/${id}`, {
                method: 'DELETE',
                headers: apiHeaders(token),
            });
            const json = await res.json();
            if (json.status > 0) {
                toast({ title: 'Exito', description: 'Clase eliminada' });
                fetchClasses();
            } else {
                toast({ title: 'Error', description: json.message || 'No se pudo eliminar', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' });
        }
    };

    const openEnrollModal = async (groupClass: GroupClass) => {
        setSelectedClass(groupClass);
        setEnrollClientId('');
        setShowEnrollModal(true);
        setLoadingEnrollments(true);
        try {
            const res = await fetch(`${config.basePath}/api/group-classes/${groupClass.id}`, { headers: apiHeaders(token) });
            const json = await res.json();
            if (json.status === 1) {
                setSelectedClass(json.data);
            }
        } catch (err) {
            console.error('Error fetching class detail', err);
        } finally {
            setLoadingEnrollments(false);
        }
    };

    const handleEnroll = async () => {
        if (!selectedClass) return;
        const clientId = parseInt(enrollClientId);
        if (!clientId || clientId <= 0) {
            toast({ title: 'Error', description: 'Ingresa un ID de cliente valido', variant: 'destructive' });
            return;
        }
        setEnrolling(true);
        try {
            const res = await fetch(`${config.basePath}/api/group-classes/${selectedClass.id}/enroll`, {
                method: 'POST',
                headers: { ...apiHeaders(token), 'Content-Type': 'application/json' },
                body: JSON.stringify({ client_contact_id: clientId }),
            });
            const json = await res.json();
            if (json.status > 0) {
                toast({ title: 'Exito', description: 'Cliente inscripto' });
                setEnrollClientId('');
                openEnrollModal(selectedClass);
                fetchClasses();
            } else {
                toast({ title: 'Error', description: json.message || 'No se pudo inscribir', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' });
        } finally {
            setEnrolling(false);
        }
    };

    const handleUnenroll = async (enrollmentId: number) => {
        if (!selectedClass) return;
        if (!confirm('¿Quitar esta inscripcion?')) return;
        try {
            const res = await fetch(`${config.basePath}/api/group-classes/${selectedClass.id}/enroll/${enrollmentId}`, {
                method: 'DELETE',
                headers: apiHeaders(token),
            });
            const json = await res.json();
            if (json.status > 0) {
                toast({ title: 'Exito', description: 'Inscripcion eliminada' });
                openEnrollModal(selectedClass);
                fetchClasses();
            } else {
                toast({ title: 'Error', description: json.message || 'No se pudo eliminar', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' });
        }
    };

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users2 className="h-6 w-6 text-gray-700" />
                    <h1 className="text-2xl font-semibold text-gray-900">Clases grupales</h1>
                </div>
                <Button onClick={openNewModal}>
                    <Plus className="h-4 w-4 mr-1" /> Nueva clase
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center p-12">
                            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                        </div>
                    ) : classes.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">No hay clases grupales creadas</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Titulo</TableHead>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Horario</TableHead>
                                    <TableHead>Inscriptos / Cap.</TableHead>
                                    <TableHead>Precio</TableHead>
                                    <TableHead>Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {classes.map(gc => (
                                    <TableRow key={gc.id}>
                                        <TableCell>
                                            <p className="font-medium">{gc.title}</p>
                                            {gc.description && (
                                                <p className="text-xs text-gray-500 mt-0.5">{gc.description}</p>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {new Date(gc.date).toLocaleDateString('es-AR')}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {gc.start_time?.slice(0, 5)} - {gc.end_time?.slice(0, 5)}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            <span className={gc.enrolled_count >= gc.capacity ? 'text-red-600 font-medium' : ''}>
                                                {gc.enrolled_count ?? 0} / {gc.capacity}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-sm">{formatCurrency(gc.price)}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7"
                                                    title="Ver inscriptos"
                                                    onClick={() => openEnrollModal(gc)}
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-red-500 hover:text-red-600"
                                                    onClick={() => handleDelete(gc.id)}
                                                >
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

            {/* Modal nueva clase */}
            <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Nueva clase grupal</DialogTitle>
                        <DialogDescription>Completa los datos de la clase</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Titulo <span className="text-red-500">*</span></Label>
                            <Input
                                value={form.title}
                                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                placeholder="Ej: Yoga matutino"
                            />
                        </div>
                        <div>
                            <Label>Descripcion</Label>
                            <Input
                                value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="Descripcion opcional"
                            />
                        </div>
                        <div>
                            <Label>Fecha <span className="text-red-500">*</span></Label>
                            <Input
                                type="date"
                                value={form.date}
                                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Hora inicio <span className="text-red-500">*</span></Label>
                                <Input
                                    type="time"
                                    value={form.start_time}
                                    onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                                />
                            </div>
                            <div>
                                <Label>Hora fin <span className="text-red-500">*</span></Label>
                                <Input
                                    type="time"
                                    value={form.end_time}
                                    onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Capacidad <span className="text-red-500">*</span></Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={form.capacity}
                                    onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                                    placeholder="Ej: 15"
                                />
                            </div>
                            <div>
                                <Label>Precio</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.price}
                                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                                    placeholder="Ej: 3000"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewModal(false)}>Cancelar</Button>
                        <Button onClick={handleCreate} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Crear clase
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal inscriptos */}
            <Dialog open={showEnrollModal} onOpenChange={setShowEnrollModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{selectedClass?.title}</DialogTitle>
                        <DialogDescription>
                            {selectedClass?.date ? new Date(selectedClass.date).toLocaleDateString('es-AR') : ''} &mdash; {selectedClass?.start_time?.slice(0, 5)} a {selectedClass?.end_time?.slice(0, 5)}
                        </DialogDescription>
                    </DialogHeader>

                    {loadingEnrollments ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-6 h-6 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Inscribir cliente */}
                            <div className="border rounded-md p-3 bg-gray-50 space-y-2">
                                <Label className="text-sm font-medium">Inscribir cliente</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        min="1"
                                        placeholder="ID del cliente"
                                        value={enrollClientId}
                                        onChange={e => setEnrollClientId(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button size="sm" onClick={handleEnroll} disabled={enrolling}>
                                        {enrolling
                                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            : <UserPlus className="h-3.5 w-3.5" />
                                        }
                                    </Button>
                                </div>
                            </div>

                            {/* Lista de inscriptos */}
                            <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">
                                    Inscriptos ({selectedClass?.enrollments?.length ?? 0} / {selectedClass?.capacity})
                                </p>
                                {!selectedClass?.enrollments || selectedClass.enrollments.length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center py-4">Sin inscriptos aun</p>
                                ) : (
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {selectedClass.enrollments.map(enr => (
                                            <div key={enr.id} className="flex items-center justify-between text-sm border rounded-md p-2">
                                                <div>
                                                    <p className="font-medium">{enr.client_name}</p>
                                                    <p className="text-xs text-gray-500">
                                                        Inscripto: {new Date(enr.enrolled_at).toLocaleDateString('es-AR')}
                                                    </p>
                                                </div>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-red-500 hover:text-red-600 shrink-0"
                                                    onClick={() => handleUnenroll(enr.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
