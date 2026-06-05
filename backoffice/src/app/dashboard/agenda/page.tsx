'use client'

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiHeaders } from '@/utils/api-headers';
import config from '@/config/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Appointment, Professional, AppointmentStatus } from '@/types';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import AppointmentDetailModal from '@/components/appointments/AppointmentDetailModal';

const statusColors: Record<AppointmentStatus, string> = {
    pending: 'border-l-yellow-400 bg-yellow-50',
    confirmed: 'border-l-blue-400 bg-blue-50',
    completed: 'border-l-green-400 bg-green-50',
    cancelled: 'border-l-red-400 bg-red-50',
    no_show: 'border-l-gray-400 bg-gray-50',
};

const statusLabels: Record<AppointmentStatus, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    completed: 'Completado',
    cancelled: 'Cancelado',
    no_show: 'Ausente',
};

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 to 20:00

export default function AgendaPage() {
    const { token } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<'day' | 'week'>('week');
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [loading, setLoading] = useState(true);

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    const fetchData = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const from = view === 'day' ? format(currentDate, 'yyyy-MM-dd') : format(weekStart, 'yyyy-MM-dd');
            const to = view === 'day' ? from : format(addDays(weekStart, 6), 'yyyy-MM-dd');

            const [aptRes, profRes] = await Promise.all([
                fetch(`${config.basePath}/api/appointments?from=${from}&to=${to}&limit=200`, { headers: apiHeaders(token) }),
                fetch(`${config.basePath}/api/professionals`, { headers: apiHeaders(token) }),
            ]);
            const aptJson = await aptRes.json();
            const profJson = await profRes.json();
            if (aptJson.status === 1) setAppointments(aptJson.data || []);
            if (profJson.status === 1) setProfessionals(profJson.data || []);
        } catch (err) {
            console.error('Agenda fetch error', err);
        } finally {
            setLoading(false);
        }
    }, [token, currentDate, view, weekStart]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const navigate = (dir: number) => {
        setCurrentDate(prev => addDays(prev, dir * (view === 'day' ? 1 : 7)));
    };

    const goToToday = () => setCurrentDate(new Date());

    const getAppointmentsForDayHour = (day: Date, hour: number) => {
        return appointments.filter(apt => {
            if (apt.status === 'cancelled') return false;
            const aptDate = new Date(apt.date + 'T12:00:00');
            const aptHour = parseInt(apt.start_time?.split(':')[0] || '0');
            return isSameDay(aptDate, day) && aptHour === hour;
        });
    };

    const handleRefresh = () => { fetchData(); };

    return (
        <div className="min-h-screen bg-muted/30 p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Agenda</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {view === 'day'
                            ? format(currentDate, "EEEE d 'de' MMMM, yyyy", { locale: es })
                            : `${format(weekStart, "d MMM", { locale: es })} - ${format(addDays(weekStart, 6), "d MMM yyyy", { locale: es })}`
                        }
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={view} onValueChange={(v) => setView(v as 'day' | 'week')}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="day">Dia</SelectItem>
                            <SelectItem value="week">Semana</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={goToToday}>Hoy</Button>
                    <Button variant="outline" size="sm" onClick={() => navigate(1)}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Calendar grid */}
            <Card>
                <CardContent className="p-0 overflow-auto">
                    {loading ? (
                        <div className="space-y-2 p-4">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : (
                        <div className="min-w-[700px]">
                            {/* Day headers */}
                            <div className="grid border-b border-border sticky top-0 bg-card z-10"
                                style={{ gridTemplateColumns: view === 'week' ? '60px repeat(7, 1fr)' : '60px 1fr' }}
                            >
                                <div className="p-2 border-r border-border" />
                                {(view === 'week' ? weekDays : [currentDate]).map((day, i) => (
                                    <div key={i} className={`p-3 text-center border-r border-border ${isSameDay(day, new Date()) ? 'bg-primary/5' : ''}`}>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                                            {format(day, 'EEE', { locale: es })}
                                        </p>
                                        <p className={`text-lg font-semibold tracking-tight ${isSameDay(day, new Date()) ? 'text-primary' : 'text-foreground'}`}>
                                            {format(day, 'd')}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* Time grid */}
                            {HOURS.map(hour => (
                                <div key={hour} className="grid border-b border-border"
                                    style={{ gridTemplateColumns: view === 'week' ? '60px repeat(7, 1fr)' : '60px 1fr' }}
                                >
                                    <div className="p-2 text-xs text-muted-foreground text-right pr-3 border-r border-border">
                                        {String(hour).padStart(2, '0')}:00
                                    </div>
                                    {(view === 'week' ? weekDays : [currentDate]).map((day, i) => {
                                        const dayApts = getAppointmentsForDayHour(day, hour);
                                        return (
                                            <div key={i} className="p-1 border-r border-border min-h-[60px] relative">
                                                {dayApts.map(apt => (
                                                    <button
                                                        key={apt.id}
                                                        onClick={() => setSelectedAppointment(apt)}
                                                        className={`w-full text-left p-1.5 mb-1 rounded-md border-l-4 text-xs cursor-pointer hover:shadow-sm transition-shadow ${statusColors[apt.status]}`}
                                                    >
                                                        <p className="font-medium truncate text-gray-900">{apt.start_time?.slice(0, 5)} {apt.client_name}</p>
                                                        <p className="text-gray-500 truncate">{apt.service?.name}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Professionals legend */}
            {professionals.length > 0 && (
                <div className="flex flex-wrap gap-3">
                    {professionals.filter(p => p.active).map(p => (
                        <div key={p.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                            {p.name}
                        </div>
                    ))}
                </div>
            )}

            {/* Detail Modal */}
            {selectedAppointment && (
                <AppointmentDetailModal
                    appointment={selectedAppointment}
                    open={!!selectedAppointment}
                    onClose={() => setSelectedAppointment(null)}
                    onRefresh={handleRefresh}
                />
            )}
        </div>
    );
}
