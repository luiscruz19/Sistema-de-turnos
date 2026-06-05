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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Loader2, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SessionPackage {
    id: number;
    name: string;
    description: string | null;
    sessions_total: number;
    valid_days: number;
    price: number;
    active: boolean;
    createdAt: string;
}

interface PackageForm {
    name: string;
    description: string;
    sessions_total: string;
    valid_days: string;
    price: string;
    active: boolean;
}

const emptyForm: PackageForm = {
    name: '',
    description: '',
    sessions_total: '',
    valid_days: '',
    price: '',
    active: true,
};

export default function PaquetesPage() {
    const { token } = useAuth();
    const { toast } = useToast();
    const [packages, setPackages] = useState<SessionPackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<PackageForm>(emptyForm);

    const fetchPackages = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch(`${config.basePath}/api/session-packages`, { headers: apiHeaders(token) });
            const json = await res.json();
            if (json.status === 1) setPackages(json.data || []);
        } catch (err) {
            console.error('Error fetching packages', err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { fetchPackages(); }, [fetchPackages]);

    const openNewModal = () => {
        setForm(emptyForm);
        setShowModal(true);
    };

    const handleCreate = async () => {
        if (!form.name.trim()) {
            toast({ title: 'Error', description: 'El nombre es obligatorio', variant: 'destructive' });
            return;
        }
        const sessions = parseInt(form.sessions_total);
        const days = parseInt(form.valid_days);
        const price = parseFloat(form.price);
        if (!sessions || sessions <= 0) {
            toast({ title: 'Error', description: 'Ingresa un numero valido de sesiones', variant: 'destructive' });
            return;
        }
        if (!days || days <= 0) {
            toast({ title: 'Error', description: 'Ingresa un numero valido de dias de validez', variant: 'destructive' });
            return;
        }
        if (isNaN(price) || price < 0) {
            toast({ title: 'Error', description: 'Ingresa un precio valido', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(`${config.basePath}/api/session-packages`, {
                method: 'POST',
                headers: { ...apiHeaders(token), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name.trim(),
                    description: form.description.trim() || null,
                    sessions_total: sessions,
                    valid_days: days,
                    price,
                    active: form.active,
                }),
            });
            const json = await res.json();
            if (json.status > 0) {
                toast({ title: 'Exito', description: 'Paquete creado' });
                setShowModal(false);
                fetchPackages();
            } else {
                toast({ title: 'Error', description: json.message || 'No se pudo crear el paquete', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Eliminar este paquete?')) return;
        try {
            const res = await fetch(`${config.basePath}/api/session-packages/${id}`, {
                method: 'DELETE',
                headers: apiHeaders(token),
            });
            const json = await res.json();
            if (json.status > 0) {
                toast({ title: 'Exito', description: 'Paquete eliminado' });
                fetchPackages();
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
                    <Package className="h-6 w-6 text-gray-700" />
                    <h1 className="text-2xl font-semibold text-gray-900">Paquetes de sesiones</h1>
                </div>
                <Button onClick={openNewModal}>
                    <Plus className="h-4 w-4 mr-1" /> Nuevo paquete
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center p-12">
                            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                        </div>
                    ) : packages.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">No hay paquetes creados</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Sesiones</TableHead>
                                    <TableHead>Validez</TableHead>
                                    <TableHead>Precio</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {packages.map(pkg => (
                                    <TableRow key={pkg.id}>
                                        <TableCell>
                                            <p className="font-medium">{pkg.name}</p>
                                            {pkg.description && (
                                                <p className="text-xs text-gray-500 mt-0.5">{pkg.description}</p>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm">{pkg.sessions_total} sesiones</TableCell>
                                        <TableCell className="text-sm">{pkg.valid_days} dias</TableCell>
                                        <TableCell className="text-sm font-medium">{formatCurrency(pkg.price)}</TableCell>
                                        <TableCell>
                                            <Badge className={pkg.active ? 'bg-green-100 text-green-700 border-0' : 'bg-gray-100 text-gray-500 border-0'}>
                                                {pkg.active ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7 text-red-500 hover:text-red-600"
                                                onClick={() => handleDelete(pkg.id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Nuevo paquete de sesiones</DialogTitle>
                        <DialogDescription>Define los detalles del paquete</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Nombre <span className="text-red-500">*</span></Label>
                            <Input
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="Ej: Pack 10 sesiones kinesiologia"
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
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Sesiones totales <span className="text-red-500">*</span></Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={form.sessions_total}
                                    onChange={e => setForm(f => ({ ...f, sessions_total: e.target.value }))}
                                    placeholder="Ej: 10"
                                />
                            </div>
                            <div>
                                <Label>Dias de validez <span className="text-red-500">*</span></Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={form.valid_days}
                                    onChange={e => setForm(f => ({ ...f, valid_days: e.target.value }))}
                                    placeholder="Ej: 90"
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Precio <span className="text-red-500">*</span></Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.price}
                                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                                placeholder="Ej: 15000"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                id="pkg-active"
                                type="checkbox"
                                checked={form.active}
                                onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label htmlFor="pkg-active" className="cursor-pointer">Activo</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
                        <Button onClick={handleCreate} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Crear paquete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
