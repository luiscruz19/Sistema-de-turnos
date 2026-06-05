'use client'

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { apiHeaders } from '@/utils/api-headers';
import { useToast } from '@/hooks/use-toast';
import config from '@/config/config';
import { Appointment, AppointmentStatus } from '@/types';
import { CheckCircle, XCircle, UserX, Loader2, ExternalLink } from 'lucide-react';

const PAYMENT_STATUS: Record<string, { label: string; classes: string }> = {
    pending: { label: 'Pago pendiente', classes: 'bg-yellow-100 text-yellow-700' },
    paid: { label: 'Pagado', classes: 'bg-green-100 text-green-700' },
    expired: { label: 'Expirado', classes: 'bg-gray-100 text-gray-600' },
    cancelled: { label: 'Cancelado', classes: 'bg-red-100 text-red-600' },
    refunded: { label: 'Reembolsado', classes: 'bg-blue-100 text-blue-700' },
};

interface PaymentIntentSummary {
    id: number;
    status: string;
    amount: number;
    currency: string;
    mp_init_point: string | null;
}

const statusConfig: Record<AppointmentStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }> = {
    pending: { label: 'Pendiente', variant: 'warning' },
    confirmed: { label: 'Confirmado', variant: 'default' },
    completed: { label: 'Completado', variant: 'success' },
    cancelled: { label: 'Cancelado', variant: 'destructive' },
    no_show: { label: 'Ausente', variant: 'secondary' },
};

interface Props {
    appointment: Appointment;
    open: boolean;
    onClose: () => void;
    onRefresh: () => void;
}

export default function AppointmentDetailModal({ appointment, open, onClose, onRefresh }: Props) {
    const { token } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [payment, setPayment] = useState<PaymentIntentSummary | null>(null);
    const [loadingPayment, setLoadingPayment] = useState(false);

    useEffect(() => {
        if (!open || !token) return;
        // Buscar payment intent del turno
        setLoadingPayment(true);
        fetch(`${config.basePath}/api/payments?appointment_id=${appointment.id}`, {
            headers: apiHeaders(token),
        })
            .then(r => r.json())
            .then(json => {
                if (json.status > 0 && Array.isArray(json.data) && json.data.length > 0) {
                    setPayment(json.data[0] as PaymentIntentSummary);
                } else {
                    setPayment(null);
                }
            })
            .catch(() => setPayment(null))
            .finally(() => setLoadingPayment(false));
    }, [open, token, appointment.id]);

    const handleAction = async (action: 'confirm' | 'complete' | 'no-show' | 'cancel') => {
        setLoading(true);
        try {
            const url = action === 'cancel'
                ? `${config.basePath}/api/appointments/${appointment.id}`
                : `${config.basePath}/api/appointments/${appointment.id}/${action}`;
            const method = action === 'cancel' ? 'DELETE' : 'PUT';

            const res = await fetch(url, {
                method,
                headers: { ...apiHeaders(token), 'Content-Type': 'application/json' },
            });
            const json = await res.json();
            if (json.status > 0) {
                toast({ title: 'Exito', description: json.message || 'Accion realizada correctamente' });
                onRefresh();
                onClose();
            } else {
                toast({ title: 'Error', description: json.message || 'Error al realizar la accion', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const sc = statusConfig[appointment.status];

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Detalle del turno</DialogTitle>
                    <DialogDescription>Turno #{appointment.id}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Badge variant={sc.variant}>{sc.label}</Badge>
                        <span className="text-sm text-gray-500">{appointment.source}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <p className="text-gray-500">Cliente</p>
                            <p className="font-medium">{appointment.client_name}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Telefono</p>
                            <p className="font-medium">{appointment.client_phone || '-'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Servicio</p>
                            <p className="font-medium">{appointment.service?.name || '-'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Profesional</p>
                            <p className="font-medium">{appointment.professional?.name || 'Sin asignar'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Fecha</p>
                            <p className="font-medium">{appointment.date}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Horario</p>
                            <p className="font-medium">{appointment.start_time?.slice(0, 5)} - {appointment.end_time?.slice(0, 5)}</p>
                        </div>
                        {appointment.deposit_amount > 0 && (
                            <>
                                <div>
                                    <p className="text-gray-500">Deposito</p>
                                    <p className="font-medium">${appointment.deposit_amount}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Estado deposito</p>
                                    <p className="font-medium capitalize">{appointment.deposit_status}</p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Cobro / Payment Intent */}
                    {loadingPayment ? (
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Loader2 className="h-3 w-3 animate-spin" /> Cargando cobro...
                        </div>
                    ) : payment ? (
                        <div className="border rounded-md p-3 space-y-1.5">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cobro</p>
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    {(() => {
                                        const ps = PAYMENT_STATUS[payment.status] || { label: payment.status, classes: 'bg-gray-100 text-gray-600' };
                                        return (
                                            <Badge className={`${ps.classes} border-0 text-xs`}>{ps.label}</Badge>
                                        );
                                    })()}
                                    <span className="text-sm font-medium">
                                        {payment.currency} {Number(payment.amount).toLocaleString('es-AR')}
                                    </span>
                                </div>
                                {payment.status === 'pending' && payment.mp_init_point && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs gap-1"
                                        onClick={() => window.open(payment.mp_init_point!, '_blank')}
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                        Link de pago
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : null}

                    {appointment.notes && (
                        <div className="text-sm">
                            <p className="text-gray-500">Notas</p>
                            <p className="text-gray-700">{appointment.notes}</p>
                        </div>
                    )}

                    {/* Actions */}
                    {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t">
                            {appointment.status === 'pending' && (
                                <Button size="sm" onClick={() => handleAction('confirm')} disabled={loading}>
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                                    Confirmar
                                </Button>
                            )}
                            {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
                                <>
                                    <Button size="sm" variant="outline" className="text-green-700 border-green-300 hover:bg-green-50" onClick={() => handleAction('complete')} disabled={loading}>
                                        <CheckCircle className="h-4 w-4 mr-1" /> Completar
                                    </Button>
                                    <Button size="sm" variant="outline" className="text-gray-700" onClick={() => handleAction('no-show')} disabled={loading}>
                                        <UserX className="h-4 w-4 mr-1" /> Ausente
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleAction('cancel')} disabled={loading}>
                                        <XCircle className="h-4 w-4 mr-1" /> Cancelar
                                    </Button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
