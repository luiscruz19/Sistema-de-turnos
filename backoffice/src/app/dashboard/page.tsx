'use client'

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiHeaders } from '@/utils/api-headers';
import config from '@/config/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    CalendarCheck, Clock, CheckCircle, XCircle, AlertTriangle,
    DollarSign, ArrowRight, Plus, CalendarDays,
} from 'lucide-react';
import Link from 'next/link';
import { Appointment, AnalyticsData, AppointmentStatus } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const statusConfig: Record<AppointmentStatus, { label: string; color: string; bg: string }> = {
    pending: { label: 'Pendiente', color: 'text-yellow-700', bg: 'bg-yellow-100' },
    confirmed: { label: 'Confirmado', color: 'text-blue-700', bg: 'bg-blue-100' },
    completed: { label: 'Completado', color: 'text-green-700', bg: 'bg-green-100' },
    cancelled: { label: 'Cancelado', color: 'text-red-700', bg: 'bg-red-100' },
    no_show: { label: 'Ausente', color: 'text-gray-700', bg: 'bg-gray-100' },
};

export default function DashboardPage() {
    const { token } = useAuth();
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);

    const today = format(new Date(), 'yyyy-MM-dd');

    const fetchData = useCallback(async () => {
        if (!token) return;
        try {
            const [analyticsRes, appointmentsRes] = await Promise.all([
                fetch(`${config.basePath}/api/analytics?from=${today}&to=${today}`, { headers: apiHeaders(token) }),
                fetch(`${config.basePath}/api/appointments?date=${today}&limit=20`, { headers: apiHeaders(token) }),
            ]);
            const analyticsJson = await analyticsRes.json();
            const appointmentsJson = await appointmentsRes.json();
            if (analyticsJson.status === 1) setAnalytics(analyticsJson.data);
            if (appointmentsJson.status === 1) setTodayAppointments(appointmentsJson.data || []);
        } catch (err) {
            console.error('Dashboard fetch error', err);
        } finally {
            setLoading(false);
        }
    }, [token, today]);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    const confirmed = analytics?.appointments?.confirmed ?? 0;
    const pending = todayAppointments.filter(a => a.status === 'pending').length;
    const cancelled = analytics?.appointments?.cancelled ?? 0;
    const totalToday = analytics?.appointments?.total ?? todayAppointments.length;
    const revenue = analytics?.revenue ?? 0;

    const upcomingAppointments = todayAppointments
        .filter(a => a.status !== 'cancelled')
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
        .slice(0, 8);

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link href="/dashboard/turnos">
                        <Button size="sm" className="gap-1">
                            <Plus className="h-4 w-4" /> Nuevo turno
                        </Button>
                    </Link>
                    <Link href="/dashboard/agenda">
                        <Button size="sm" variant="outline" className="gap-1">
                            <CalendarDays className="h-4 w-4" /> Ver agenda
                        </Button>
                    </Link>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                            <CalendarCheck className="h-4 w-4 text-blue-500" /> Turnos hoy
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{totalToday}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" /> Confirmados
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-green-600">{confirmed}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                            <Clock className="h-4 w-4 text-yellow-500" /> Pendientes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-yellow-600">{pending}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-500" /> Cancelaciones
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-red-600">{cancelled}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-emerald-500" /> Ingresos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-emerald-600">${revenue.toLocaleString('es-AR')}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Proximos turnos */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Proximos turnos de hoy</CardTitle>
                    <Link href="/dashboard/agenda">
                        <Button variant="ghost" size="sm" className="gap-1">
                            Ver agenda <ArrowRight className="h-4 w-4" />
                        </Button>
                    </Link>
                </CardHeader>
                <CardContent>
                    {upcomingAppointments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                            <AlertTriangle className="h-8 w-8 mb-2 opacity-40" />
                            <p className="text-sm">No hay turnos programados para hoy</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {upcomingAppointments.map((apt) => {
                                const sc = statusConfig[apt.status];
                                return (
                                    <div key={apt.id} className="flex items-center gap-4 py-3">
                                        <div className="text-sm font-mono font-medium text-gray-700 w-16">
                                            {apt.start_time?.slice(0, 5)}
                                        </div>
                                        <div
                                            className="w-1 h-8 rounded-full"
                                            style={{ backgroundColor: apt.professional?.color || '#3b82f6' }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {apt.client_name}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">
                                                {apt.service?.name} {apt.professional ? `- ${apt.professional.name}` : ''}
                                            </p>
                                        </div>
                                        <Badge className={`${sc.bg} ${sc.color} border-0`}>
                                            {sc.label}
                                        </Badge>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
