'use client'

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiHeaders } from '@/utils/api-headers';
import config from '@/config/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Save, Copy, Check } from 'lucide-react';
import { BusinessConfig } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function ConfiguracionPage() {
    const { token } = useAuth();
    const { toast } = useToast();
    const [configData, setConfigData] = useState<BusinessConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);

    const [form, setForm] = useState({
        name: '',
        address: '',
        phone: '',
        timezone: 'America/Argentina/Buenos_Aires',
        currency: 'ARS',
        booking_advance_days: '30',
        cancellation_policy_hours: '2',
        slot_duration_default: '30',
        auto_confirm: false,
        deposit_required: false,
        deposit_percentage: '0',
        require_payment: false,
        payment_advance_pct: '0',
        enable_health_records: false,
    });

    const fetchConfig = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch(`${config.basePath}/api/business-config`, { headers: apiHeaders(token) });
            const json = await res.json();
            if (json.status === 1 && json.data) {
                const d = json.data;
                setConfigData(d);
                setForm({
                    name: d.name || '',
                    address: d.address || '',
                    phone: d.phone || '',
                    timezone: d.timezone || 'America/Argentina/Buenos_Aires',
                    currency: d.currency || 'ARS',
                    booking_advance_days: String(d.booking_advance_days ?? 30),
                    cancellation_policy_hours: String(d.cancellation_policy_hours ?? 2),
                    slot_duration_default: String(d.slot_duration_default ?? 30),
                    auto_confirm: d.auto_confirm ?? false,
                    deposit_required: d.deposit_required ?? false,
                    deposit_percentage: String(d.deposit_percentage ?? 0),
                    require_payment: d.require_payment ?? false,
                    payment_advance_pct: String(d.payment_advance_pct ?? 0),
                    enable_health_records: d.enable_health_records ?? false,
                });
            }
        } catch (err) {
            console.error('Error fetching config', err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { fetchConfig(); }, [fetchConfig]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${config.basePath}/api/business-config`, {
                method: 'PUT',
                headers: { ...apiHeaders(token), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name,
                    address: form.address || null,
                    phone: form.phone || null,
                    timezone: form.timezone,
                    currency: form.currency,
                    booking_advance_days: Number(form.booking_advance_days),
                    cancellation_policy_hours: Number(form.cancellation_policy_hours),
                    slot_duration_default: Number(form.slot_duration_default),
                    auto_confirm: form.auto_confirm,
                    deposit_required: form.deposit_required,
                    deposit_percentage: Number(form.deposit_percentage),
                    require_payment: form.require_payment,
                    payment_advance_pct: Number(form.payment_advance_pct),
                    enable_health_records: form.enable_health_records,
                }),
            });
            const json = await res.json();
            if (json.status > 0) {
                toast({ title: 'Exito', description: 'Configuracion guardada' });
            } else {
                toast({ title: 'Error', description: json.message, variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const copyApiKey = () => {
        if (configData?.api_key) {
            navigator.clipboard.writeText(configData.api_key);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-muted/30 p-4 md:p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-4">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-9 w-36" />
                </div>
                <Skeleton className="h-56 w-full" />
                <Skeleton className="h-72 w-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/30 p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Configuracion</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Ajusta los datos del negocio, las reglas de reserva y las integraciones.</p>
                </div>
                <Button onClick={handleSave} disabled={saving} className="gap-1">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Guardar cambios
                </Button>
            </div>

            {/* Business info */}
            <Card>
                <CardHeader>
                    <CardTitle>Datos del negocio</CardTitle>
                    <CardDescription>Informacion general de tu negocio</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label>Nombre del negocio</Label>
                        <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label>Direccion</Label>
                            <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                        </div>
                        <div>
                            <Label>Telefono</Label>
                            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label>Zona horaria</Label>
                            <Input value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))} />
                        </div>
                        <div>
                            <Label>Moneda</Label>
                            <Input value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Booking settings */}
            <Card>
                <CardHeader>
                    <CardTitle>Configuracion de reservas</CardTitle>
                    <CardDescription>Reglas para la toma de turnos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label>Dias de anticipacion maxima</Label>
                            <Input type="number" value={form.booking_advance_days} onChange={e => setForm(f => ({ ...f, booking_advance_days: e.target.value }))} />
                        </div>
                        <div>
                            <Label>Politica de cancelacion (horas)</Label>
                            <Input type="number" value={form.cancellation_policy_hours} onChange={e => setForm(f => ({ ...f, cancellation_policy_hours: e.target.value }))} />
                        </div>
                        <div>
                            <Label>Duracion slot por defecto (min)</Label>
                            <Input type="number" value={form.slot_duration_default} onChange={e => setForm(f => ({ ...f, slot_duration_default: e.target.value }))} />
                        </div>
                    </div>

                    <div className="flex items-center gap-6 pt-2">
                        <div className="flex items-center gap-2">
                            <Switch checked={form.auto_confirm} onCheckedChange={v => setForm(f => ({ ...f, auto_confirm: v }))} />
                            <Label>Confirmar turnos automaticamente</Label>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 pt-2">
                        <div className="flex items-center gap-2">
                            <Switch checked={form.deposit_required} onCheckedChange={v => setForm(f => ({ ...f, deposit_required: v }))} />
                            <Label>Requerir deposito</Label>
                        </div>
                        {form.deposit_required && (
                            <div className="flex items-center gap-2">
                                <Label>Porcentaje:</Label>
                                <Input type="number" value={form.deposit_percentage} onChange={e => setForm(f => ({ ...f, deposit_percentage: e.target.value }))} className="w-20" />
                                <span className="text-sm text-muted-foreground">%</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-4 pt-4 border-t border-border">
                        <div className="flex items-center gap-2">
                            <Switch checked={form.require_payment} onCheckedChange={v => setForm(f => ({ ...f, require_payment: v }))} />
                            <Label>Cobrar online al confirmar turno (Mercado Pago)</Label>
                        </div>
                        {form.require_payment && (
                            <div className="flex items-center gap-2">
                                <Label>Sena:</Label>
                                <Input type="number" value={form.payment_advance_pct} onChange={e => setForm(f => ({ ...f, payment_advance_pct: e.target.value }))} className="w-20" />
                                <span className="text-sm text-muted-foreground">% (0 = total)</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <Switch checked={form.enable_health_records} onCheckedChange={v => setForm(f => ({ ...f, enable_health_records: v }))} />
                        <Label>Habilitar historia clinica (vertical salud)</Label>
                    </div>
                </CardContent>
            </Card>

            {/* API Key */}
            {configData?.api_key && (
                <Card>
                    <CardHeader>
                        <CardTitle>API Key</CardTitle>
                        <CardDescription>Usa esta clave para integrar el widget de reservas en tu sitio web</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <Input value={configData.api_key} readOnly className="font-mono text-sm" />
                            <Button variant="outline" size="sm" onClick={copyApiKey} className="gap-1 shrink-0">
                                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                                {copied ? 'Copiado' : 'Copiar'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
