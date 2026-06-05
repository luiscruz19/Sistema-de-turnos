'use client'

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { apiHeaders } from '@/utils/api-headers';
import { useToast } from '@/hooks/use-toast';
import config from '@/config/config';
import { Professional, Service, AvailabilitySlot, ProfessionalAvailability } from '@/types';
import { Loader2 } from 'lucide-react';

interface Props {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
    professionals: Professional[];
    services: Service[];
}

export default function NuevoTurnoModal({ open, onClose, onCreated, professionals, services }: Props) {
    const { token } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [slots, setSlots] = useState<ProfessionalAvailability[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);

    const [form, setForm] = useState({
        service_id: '',
        professional_id: '',
        date: '',
        start_time: '',
        client_name: '',
        client_email: '',
        client_phone: '',
        notes: '',
    });

    const selectedService = services.find(s => String(s.id) === form.service_id);

    useEffect(() => {
        if (form.service_id && form.date) {
            fetchAvailability();
        }
    }, [form.service_id, form.date, form.professional_id]);

    const fetchAvailability = async () => {
        setLoadingSlots(true);
        try {
            const params = new URLSearchParams({
                date: form.date,
                service_id: form.service_id,
            });
            if (form.professional_id) params.set('professional_id', form.professional_id);

            const res = await fetch(`${config.basePath}/api/availability?${params}`, { headers: apiHeaders(token) });
            const json = await res.json();
            if (json.status === 1) {
                setSlots(json.data || []);
            }
        } catch (err) {
            console.error('Error fetching availability', err);
        } finally {
            setLoadingSlots(false);
        }
    };

    const allSlots = slots.flatMap(pa => pa.slots.map(s => ({
        ...s,
        professional_id: pa.professional_id,
        professional_name: pa.professional_name,
    })));

    const handleSubmit = async () => {
        if (!form.service_id || !form.date || !form.start_time || !form.client_name) {
            toast({ title: 'Error', description: 'Completa los campos obligatorios', variant: 'destructive' });
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${config.basePath}/api/appointments`, {
                method: 'POST',
                headers: { ...apiHeaders(token), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_id: Number(form.service_id),
                    professional_id: form.professional_id ? Number(form.professional_id) : null,
                    date: form.date,
                    start_time: form.start_time,
                    client_name: form.client_name,
                    client_email: form.client_email || null,
                    client_phone: form.client_phone || null,
                    notes: form.notes || null,
                    source: 'manual',
                }),
            });
            const json = await res.json();
            if (json.status > 0) {
                toast({ title: 'Exito', description: 'Turno creado correctamente' });
                onCreated();
            } else {
                toast({ title: 'Error', description: json.message || 'Error al crear turno', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Nuevo turno</DialogTitle>
                    <DialogDescription>Selecciona servicio, profesional, fecha y horario</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Step 1: Service */}
                    <div>
                        <Label>Servicio *</Label>
                        <Select value={form.service_id} onValueChange={v => setForm(f => ({ ...f, service_id: v, start_time: '' }))}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar servicio" /></SelectTrigger>
                            <SelectContent>
                                {services.filter(s => s.active).map(s => (
                                    <SelectItem key={s.id} value={String(s.id)}>
                                        {s.name} ({s.duration_minutes} min - ${s.price})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Step 2: Professional */}
                    {selectedService?.requires_professional !== false && (
                        <div>
                            <Label>Profesional</Label>
                            <Select value={form.professional_id || 'any'} onValueChange={v => setForm(f => ({ ...f, professional_id: v === 'any' ? '' : v, start_time: '' }))}>
                                <SelectTrigger><SelectValue placeholder="Cualquiera" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="any">Cualquiera</SelectItem>
                                    {professionals.filter(p => p.active).map(p => (
                                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Step 3: Date */}
                    <div>
                        <Label>Fecha *</Label>
                        <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value, start_time: '' }))} />
                    </div>

                    {/* Step 4: Slot */}
                    {form.service_id && form.date && (
                        <div>
                            <Label>Horario disponible *</Label>
                            {loadingSlots ? (
                                <div className="flex items-center gap-2 py-2 text-sm text-gray-500">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Buscando horarios...
                                </div>
                            ) : allSlots.length === 0 ? (
                                <p className="text-sm text-gray-500 py-2">No hay horarios disponibles para esta fecha</p>
                            ) : (
                                <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto py-2">
                                    {allSlots.map((slot, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setForm(f => ({
                                                ...f,
                                                start_time: slot.start,
                                                professional_id: slot.professional_id ? String(slot.professional_id) : f.professional_id,
                                            }))}
                                            className={`px-2 py-1.5 text-sm rounded-md border transition-colors ${
                                                form.start_time === slot.start
                                                    ? 'bg-primary text-white border-primary'
                                                    : 'bg-white text-gray-700 border-gray-200 hover:border-primary hover:text-primary'
                                            }`}
                                        >
                                            {slot.start.slice(0, 5)}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Client data */}
                    <div className="border-t pt-4 space-y-3">
                        <div>
                            <Label>Nombre del cliente *</Label>
                            <Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="Nombre completo" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Email</Label>
                                <Input type="email" value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} placeholder="email@ejemplo.com" />
                            </div>
                            <div>
                                <Label>Telefono</Label>
                                <Input value={form.client_phone} onChange={e => setForm(f => ({ ...f, client_phone: e.target.value }))} placeholder="+54 11..." />
                            </div>
                        </div>
                        <div>
                            <Label>Notas</Label>
                            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas adicionales" rows={2} />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                        Crear turno
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
