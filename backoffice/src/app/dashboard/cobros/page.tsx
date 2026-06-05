'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiHeaders } from '@/utils/api-headers';
import config from '@/config/config';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Loader2, ExternalLink, Undo2, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';

interface PaymentIntent {
    id: number;
    status: 'pending' | 'paid' | 'expired' | 'cancelled' | 'refunded';
    amount: number;
    currency: string;
    mode: 'live' | 'simulated';
    mp_init_point: string | null;
    description: string | null;
    expires_at: string | null;
    paid_at: string | null;
    createdAt: string;
    appointment?: { id: number; date: string; start_time: string; client_name: string; status: string };
    clientContact?: { id: number; name: string; email?: string | null };
}

const STATUS: Record<string, { label: string; variant: BadgeVariant }> = {
    pending: { label: 'Pendiente', variant: 'warning' },
    paid: { label: 'Pagado', variant: 'success' },
    expired: { label: 'Expirado', variant: 'secondary' },
    cancelled: { label: 'Cancelado', variant: 'destructive' },
    refunded: { label: 'Reembolsado', variant: 'info' },
};

export default function CobrosPage() {
    const { token } = useAuth();
    const { toast } = useToast();
    const [rows, setRows] = useState<PaymentIntent[]>([]);
    const [loading, setLoading] = useState(true);
    const [refunding, setRefunding] = useState<number | null>(null);

    const fetchRows = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch(`${config.basePath}/api/payments`, { headers: apiHeaders(token) });
            const json = await res.json();
            if (json.status > 0) setRows(json.data || []);
        } catch (err) {
            console.error('Error fetching payments', err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchRows();
    }, [fetchRows]);

    const handleRefund = async (id: number) => {
        if (!token) return;
        if (!window.confirm('Reembolsar este pago?')) return;
        setRefunding(id);
        try {
            const res = await fetch(`${config.basePath}/api/payments/${id}/refund`, {
                method: 'POST',
                headers: { ...apiHeaders(token), 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            const json = await res.json();
            if (json.status > 0) {
                toast({ title: 'OK', description: 'Reembolsado' });
                fetchRows();
            } else {
                toast({ title: 'Error', description: json.message || 'Error', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' });
        } finally {
            setRefunding(null);
        }
    };

    return (
        <div className="min-h-screen bg-muted/30 p-4 md:p-6 space-y-6">
            <div className="border-b border-border pb-4">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Cobros</h1>
                <p className="mt-1 text-sm text-muted-foreground">Senas y pagos de turnos procesados con Mercado Pago.</p>
            </div>

            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="space-y-2 p-4">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : rows.length === 0 ? (
                        <EmptyState
                            icon={CreditCard}
                            title="Aun no hay cobros"
                            description="Los pagos y senas de turnos apareceran aqui cuando se procesen con Mercado Pago."
                        />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Turno</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Monto</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Modo</TableHead>
                                    <TableHead>Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map(r => {
                                    const s = STATUS[r.status] || { label: r.status, variant: 'secondary' as BadgeVariant };
                                    return (
                                        <TableRow key={r.id}>
                                            <TableCell className="text-sm">{new Date(r.createdAt).toLocaleString('es-AR')}</TableCell>
                                            <TableCell className="text-sm">
                                                {r.appointment ? `${r.appointment.date} ${r.appointment.start_time?.slice(0, 5)}` : '-'}
                                            </TableCell>
                                            <TableCell className="text-sm">{r.appointment?.client_name || r.clientContact?.name || '-'}</TableCell>
                                            <TableCell className="font-medium">
                                                {r.currency} {Number(r.amount).toLocaleString('es-AR')}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={s.variant}>{s.label}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                {r.mode === 'simulated' ? (
                                                    <Badge variant="warning">Simulado</Badge>
                                                ) : (
                                                    <Badge variant="info">Real</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    {r.status === 'pending' && r.mp_init_point && (
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-7 w-7"
                                                            onClick={() => window.open(r.mp_init_point!, '_blank')}
                                                            title="Abrir link de pago"
                                                        >
                                                            <ExternalLink className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                    {r.status === 'paid' && (
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-7 w-7"
                                                            onClick={() => handleRefund(r.id)}
                                                            disabled={refunding === r.id}
                                                            title="Reembolsar"
                                                        >
                                                            {refunding === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
