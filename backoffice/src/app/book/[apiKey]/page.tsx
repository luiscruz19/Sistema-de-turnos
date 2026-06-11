'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { CalendarDays, Clock, User, CheckCircle, ChevronLeft, Loader2 } from 'lucide-react';

type Service = {
    id: number;
    name: string;
    description?: string;
    duration_minutes: number;
    price: number;
    deposit_amount?: number;
    requires_professional: boolean;
};

type Professional = {
    id: number;
    name: string;
    specialty?: string;
    color?: string;
    services: { service_id: number }[];
};

type BusinessConfig = {
    name: string;
    timezone?: string;
};

type Slot = { time: string; professional_id?: number };

type Step = 'service' | 'professional' | 'date' | 'slot' | 'form' | 'confirm';

const BASE = '/api/widget';

function cls(...args: (string | false | undefined | null)[]) {
    return args.filter(Boolean).join(' ');
}

export default function PublicBookingPage() {
    const { apiKey } = useParams<{ apiKey: string }>();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [config, setConfig] = useState<BusinessConfig | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);

    const [step, setStep] = useState<Step>('service');
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [slots, setSlots] = useState<Slot[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

    const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });
    const [submitting, setSubmitting] = useState(false);
    const [booked, setBooked] = useState<{ id: number; code?: string } | null>(null);

    const fetchConfig = useCallback(async () => {
        try {
            const res = await fetch(`${BASE}?api_key=${apiKey}&endpoint=config`);
            const data = await res.json();
            if (data.status > 0) {
                setConfig(data.data?.business);
                setServices(data.data?.services || []);
                setProfessionals(data.data?.professionals || []);
            } else {
                setError(data.message || 'Configuración no encontrada');
            }
        } catch {
            setError('Error al cargar la información del negocio');
        } finally {
            setLoading(false);
        }
    }, [apiKey]);

    useEffect(() => { fetchConfig(); }, [fetchConfig]);

    const fetchSlots = useCallback(async (date: string) => {
        if (!selectedService || !date) return;
        setLoadingSlots(true);
        try {
            const params = new URLSearchParams({
                api_key: apiKey,
                endpoint: 'availability',
                date,
                service_id: String(selectedService.id),
            });
            if (selectedProfessional) params.set('professional_id', String(selectedProfessional.id));
            const res = await fetch(`${BASE}?${params}`);
            const data = await res.json();
            if (data.status > 0) setSlots(data.data?.slots || []);
            else setSlots([]);
        } catch {
            setSlots([]);
        } finally {
            setLoadingSlots(false);
        }
    }, [apiKey, selectedService, selectedProfessional]);

    useEffect(() => { if (selectedDate) fetchSlots(selectedDate); }, [selectedDate, fetchSlots]);

    const availableProfessionals = selectedService
        ? professionals.filter(p => p.services.some(s => s.service_id === selectedService.id))
        : professionals;

    const submit = async () => {
        if (!selectedSlot || !selectedService || !form.name || !form.phone) return;
        setSubmitting(true);
        try {
            const res = await fetch(`${BASE}?api_key=${apiKey}&endpoint=book`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_id: selectedService.id,
                    professional_id: selectedProfessional?.id || selectedSlot.professional_id || null,
                    date: selectedDate,
                    time: selectedSlot.time,
                    client_name: form.name,
                    client_phone: form.phone,
                    client_email: form.email || null,
                    notes: form.notes || null,
                }),
            });
            const data = await res.json();
            if (data.status > 0) {
                setBooked({ id: data.data?.id, code: data.data?.confirmation_code });
                setStep('confirm');
            } else {
                alert(data.message || 'Error al reservar');
            }
        } catch {
            alert('Error de conexión');
        } finally {
            setSubmitting(false);
        }
    };

    const today = new Date().toISOString().slice(0, 10);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30">
                <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30">
                <div className="bg-white rounded-xl shadow p-8 text-center max-w-md">
                    <p className="text-red-500 font-medium">{error}</p>
                    <p className="text-sm text-gray-400 mt-2">Verificá el enlace de reserva</p>
                </div>
            </div>
        );
    }

    if (step === 'confirm' && booked) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
                <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md w-full">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-800 mb-2">¡Reserva confirmada!</h2>
                    <p className="text-gray-500 mb-4">Tu turno fue reservado exitosamente</p>
                    <div className="bg-gray-50 rounded-lg p-4 text-sm text-left space-y-2">
                        <p><span className="font-medium">Servicio:</span> {selectedService?.name}</p>
                        <p><span className="font-medium">Fecha:</span> {selectedDate}</p>
                        <p><span className="font-medium">Hora:</span> {selectedSlot?.time}</p>
                        {selectedProfessional && <p><span className="font-medium">Profesional:</span> {selectedProfessional.name}</p>}
                        {booked.code && <p><span className="font-medium">Código:</span> <span className="font-mono font-bold">{booked.code}</span></p>}
                    </div>
                    <p className="text-xs text-gray-400 mt-4">Recibirás un recordatorio por WhatsApp si ingresaste tu teléfono</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/30 p-4 flex items-start justify-center pt-8">
            <div className="w-full max-w-lg">
                {/* Header */}
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">{config?.name || 'Reservar turno'}</h1>
                    <p className="text-gray-500 text-sm mt-1">Completá los pasos para reservar tu turno</p>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-1 mb-6 justify-center">
                    {(['service', 'professional', 'date', 'slot', 'form'] as Step[]).map((s, i) => (
                        <div key={s} className={cls('h-1.5 rounded-full flex-1 transition-colors', step === s || (['service','professional','date','slot','form'].indexOf(step) > i) ? 'bg-blue-500' : 'bg-gray-200')} />
                    ))}
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                    {/* Step 1: Servicio */}
                    {step === 'service' && (
                        <div>
                            <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-blue-500" /> Elegí el servicio
                            </h2>
                            <div className="space-y-2">
                                {services.map(s => (
                                    <button key={s.id} onClick={() => { setSelectedService(s); setStep(availableProfessionals.length > 1 ? 'professional' : 'date'); }} className="w-full text-left p-4 border rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-800">{s.name}</p>
                                                {s.description && <p className="text-xs text-gray-400 mt-0.5">{s.description}</p>}
                                            </div>
                                            <div className="text-right text-sm text-gray-500 ml-4 flex-shrink-0">
                                                <p className="font-medium text-blue-600">${Number(s.price).toLocaleString()}</p>
                                                <p className="text-xs">{s.duration_minutes} min</p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                                {services.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No hay servicios disponibles</p>}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Profesional */}
                    {step === 'professional' && (
                        <div>
                            <button onClick={() => setStep('service')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4"><ChevronLeft className="h-4 w-4" /> Volver</button>
                            <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                <User className="h-4 w-4 text-blue-500" /> Elegí el profesional
                            </h2>
                            <div className="space-y-2">
                                <button onClick={() => { setSelectedProfessional(null); setStep('date'); }} className="w-full text-left p-4 border rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors">
                                    <p className="font-medium text-gray-800">Cualquier profesional disponible</p>
                                    <p className="text-xs text-gray-400">Te asignamos el primero disponible</p>
                                </button>
                                {availableProfessionals.map(p => (
                                    <button key={p.id} onClick={() => { setSelectedProfessional(p); setStep('date'); }} className="w-full text-left p-4 border rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: p.color || '#6366f1' }}>
                                            {p.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-800">{p.name}</p>
                                            {p.specialty && <p className="text-xs text-gray-400">{p.specialty}</p>}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Fecha */}
                    {step === 'date' && (
                        <div>
                            <button onClick={() => setStep(availableProfessionals.length > 1 ? 'professional' : 'service')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4"><ChevronLeft className="h-4 w-4" /> Volver</button>
                            <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-blue-500" /> Elegí la fecha
                            </h2>
                            <input
                                type="date"
                                min={today}
                                value={selectedDate}
                                onChange={e => { setSelectedDate(e.target.value); setSelectedSlot(null); }}
                                className="w-full border rounded-lg p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                            {selectedDate && (
                                <button onClick={() => setStep('slot')} className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-3 font-medium transition-colors">
                                    Ver horarios disponibles
                                </button>
                            )}
                        </div>
                    )}

                    {/* Step 4: Horario */}
                    {step === 'slot' && (
                        <div>
                            <button onClick={() => setStep('date')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4"><ChevronLeft className="h-4 w-4" /> Volver</button>
                            <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                <Clock className="h-4 w-4 text-blue-500" /> Elegí el horario — {selectedDate}
                            </h2>
                            {loadingSlots ? (
                                <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin h-6 w-6 text-blue-400" /></div>
                            ) : slots.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-6">No hay horarios disponibles para esta fecha.<br/>Probá con otro día.</p>
                            ) : (
                                <div className="grid grid-cols-3 gap-2">
                                    {slots.map(s => (
                                        <button key={s.time} onClick={() => { setSelectedSlot(s); setStep('form'); }} className="p-3 border rounded-lg text-center font-medium text-gray-700 hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm">
                                            {s.time.slice(0, 5)}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 5: Datos del cliente */}
                    {step === 'form' && (
                        <div>
                            <button onClick={() => setStep('slot')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4"><ChevronLeft className="h-4 w-4" /> Volver</button>
                            <h2 className="font-semibold text-gray-700 mb-1 flex items-center gap-2">
                                <User className="h-4 w-4 text-blue-500" /> Tus datos
                            </h2>
                            <p className="text-xs text-gray-400 mb-4">{selectedService?.name} · {selectedDate} · {selectedSlot?.time.slice(0,5)}</p>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm font-medium text-gray-600">Nombre y apellido *</label>
                                    <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Juan García" className="w-full border rounded-lg p-3 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600">Teléfono *</label>
                                    <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+54 9 11 1234-5678" className="w-full border rounded-lg p-3 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600">Email (opcional)</label>
                                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="juan@email.com" className="w-full border rounded-lg p-3 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600">Notas (opcional)</label>
                                    <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Aclaraciones o pedidos especiales..." rows={2} className="w-full border rounded-lg p-3 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm resize-none" />
                                </div>
                            </div>
                            <button
                                onClick={submit}
                                disabled={submitting || !form.name || !form.phone}
                                className="w-full mt-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg py-3 font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                {submitting ? <><Loader2 className="animate-spin h-4 w-4" /> Confirmando...</> : 'Confirmar reserva'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
