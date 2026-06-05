'use client'

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiHeaders } from '@/utils/api-headers';
import config from '@/config/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarCheck, CheckCircle, DollarSign, UserX, TrendingUp } from 'lucide-react';
import { AnalyticsData } from '@/types';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export default function ReportesPage() {
    const { token } = useAuth();
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [fromDate, setFromDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [toDate, setToDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

    const fetchAnalytics = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ from: fromDate, to: toDate });
            const res = await fetch(`${config.basePath}/api/analytics?${params}`, { headers: apiHeaders(token) });
            const json = await res.json();
            if (json.status === 1) setAnalytics(json.data);
        } catch (err) {
            console.error('Error fetching analytics', err);
        } finally {
            setLoading(false);
        }
    }, [token, fromDate, toDate]);

    useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

    if (loading) {
        return (
            <div className="min-h-screen bg-muted/30 p-4 md:p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-4">
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="h-9 w-64" />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-28 w-full" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );
    }

    const totalAppointments = analytics?.appointments?.total ?? 0;
    const confirmRate = totalAppointments > 0
        ? Math.round(((analytics?.appointments?.confirmed ?? 0) / totalAppointments) * 100)
        : 0;
    const noShowRate = analytics?.rates?.no_show_rate ?? 0;
    const revenue = analytics?.revenue ?? 0;

    return (
        <div className="min-h-screen bg-muted/30 p-4 md:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reportes</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Metricas de turnos, ingresos y rendimiento del periodo.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div>
                        <Label className="text-xs">Desde</Label>
                        <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-auto" />
                    </div>
                    <div>
                        <Label className="text-xs">Hasta</Label>
                        <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-auto" />
                    </div>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                            <CalendarCheck className="h-4 w-4 text-info" /> Total turnos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{totalAppointments}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-success" /> Tasa confirmacion
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-success">{confirmRate}%</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                            <UserX className="h-4 w-4 text-destructive" /> Tasa no-show
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-destructive">{Math.round(noShowRate * 100)}%</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-success" /> Ingresos estimados
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-success">${revenue.toLocaleString('es-AR')}</p>
                    </CardContent>
                </Card>
            </div>

            {/* By source + by status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Turnos por estado</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Cantidad</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(analytics?.appointments?.by_status || []).map(item => (
                                    <TableRow key={item.status}>
                                        <TableCell className="capitalize">{item.status}</TableCell>
                                        <TableCell className="text-right font-medium">{item.count}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Turnos por origen</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Origen</TableHead>
                                    <TableHead className="text-right">Cantidad</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(analytics?.appointments?.by_source || []).map(item => (
                                    <TableRow key={item.source}>
                                        <TableCell className="capitalize">{item.source}</TableCell>
                                        <TableCell className="text-right font-medium">{item.count}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Top services + professionals */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-info" /> Top servicios
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {(analytics?.top_services || []).length === 0 ? (
                            <p className="text-sm text-muted-foreground p-4">Sin datos</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Servicio</TableHead>
                                        <TableHead className="text-right">Turnos</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {analytics!.top_services.map(item => (
                                        <TableRow key={item.service_id}>
                                            <TableCell>{item.name}</TableCell>
                                            <TableCell className="text-right font-medium">{item.count}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-success" /> Top profesionales
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {(analytics?.top_professionals || []).length === 0 ? (
                            <p className="text-sm text-muted-foreground p-4">Sin datos</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Profesional</TableHead>
                                        <TableHead className="text-right">Turnos</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {analytics!.top_professionals.map(item => (
                                        <TableRow key={item.professional_id}>
                                            <TableCell>{item.name}</TableCell>
                                            <TableCell className="text-right font-medium">{item.count}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
