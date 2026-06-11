'use client'

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiHeaders } from '@/utils/api-headers';
import config from '@/config/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import {
    CalendarCheck, Clock, CheckCircle, XCircle, CalendarX,
    DollarSign, ArrowRight, Plus, CalendarDays,
} from 'lucide-react';
import Link from 'next/link';
import { Appointment, AnalyticsData, AppointmentStatus } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const statusConfig: Record<AppointmentStatus, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' }> = {
    pending: { label: 'Pendiente', variant: 'warning' },
    confirmed: { label: 'Confirmado', variant: 'info' },
    completed: { label: 'Completado', variant: 'success' },
    cancelled: { label: 'Cancelado', variant: 'destructive' },
    no_show: { label: 'Ausente', variant: 'secondary' },
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
            <div className="min-h-screen bg-muted/30 p-4 md:p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-4">
                    <div className="space-y-2">
                        <Skeleton className="h-7 w-40" />
                        <Skeleton className="h-4 w-56" />
                    </div>
                    <Skeleton className="h-10 w-48" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="rounded-xl border bg-card px-[18px] pb-4 pt-[18px] shadow-sm">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="mt-3 h-7 w-16" />
                        </div>
                    ))}
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-5 w-48" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </CardContent>
                </Card>
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

    const kpis: { label: string; value: ReactNode; icon: ReactNode; delta?: string; deltaDirection?: 'up' | 'down' | 'muted' }[] = [
        { label: 'Turnos hoy', value: totalToday, icon: <CalendarCheck />, delta: 'agendados hoy' },
        { label: 'Confirmados', value: confirmed, icon: <CheckCircle />, delta: 'del dia', deltaDirection: confirmed > 0 ? 'up' : 'muted' },
        { label: 'Pendientes', value: pending, icon: <Clock />, delta: 'por confirmar' },
        { label: 'Cancelaciones', value: cancelled, icon: <XCircle />, delta: 'del dia', deltaDirection: cancelled > 0 ? 'down' : 'muted' },
        { label: 'Ingresos', value: `$${revenue.toLocaleString('es-AR')}`, icon: <DollarSign />, delta: 'estimado del dia' },
    ];

    return (
        <div className="min-h-screen bg-muted/30 p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
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
                {kpis.map((kpi) => (
                    <StatCard
                        key={kpi.label}
                        label={kpi.label}
                        value={kpi.value}
                        icon={kpi.icon}
                        delta={kpi.delta}
                        deltaDirection={kpi.deltaDirection}
                    />
                ))}
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
                        <EmptyState
                            icon={CalendarX}
                            title="No hay turnos para hoy"
                            description="Cuando se agenden turnos para hoy, apareceran aqui."
                            action={
                                <Link href="/dashboard/turnos">
                                    <Button size="sm" className="gap-1">
                                        <Plus className="h-4 w-4" /> Nuevo turno
                                    </Button>
                                </Link>
                            }
                        />
                    ) : (
                        <div className="divide-y divide-border">
                            {upcomingAppointments.map((apt) => {
                                const sc = statusConfig[apt.status];
                                return (
                                    <div key={apt.id} className="flex items-center gap-4 py-3">
                                        <div className="text-sm font-mono font-medium text-foreground w-16">
                                            {apt.start_time?.slice(0, 5)}
                                        </div>
                                        <div
                                            className="w-1 h-8 rounded-full"
                                            style={{ backgroundColor: apt.professional?.color || 'hsl(var(--primary))' }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">
                                                {apt.client_name}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {apt.service?.name} {apt.professional ? `- ${apt.professional.name}` : ''}
                                            </p>
                                        </div>
                                        <Badge variant={sc.variant}>
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
