'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiHeaders } from '@/utils/api-headers';
import config from '@/config/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, CheckCircle2, XCircle, CreditCard, Brain, MessageSquare, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Provider = 'mercadopago' | 'openai' | 'whatsapp' | 'google_calendar';

interface IntegrationRow {
    id: number;
    provider: Provider;
    scope: string | null;
    enabled: boolean;
    config: Record<string, unknown>;
    credentials_masked: Record<string, string>;
    has_credentials: boolean;
    last_tested_at: string | null;
    last_test_status: string | null;
    last_test_error: string | null;
}

const PROVIDERS: {
    id: Provider;
    name: string;
    description: string;
    fields: { key: string; label: string; type?: string; placeholder?: string }[];
    configFields?: { key: string; label: string; placeholder?: string }[];
    icon: React.ComponentType<{ className?: string }>;
}[] = [
    {
        id: 'mercadopago',
        name: 'Mercado Pago',
        description: 'Cobra senas o el total del turno. Se genera un link de pago al confirmar.',
        fields: [
            { key: 'access_token', label: 'Access Token', placeholder: 'APP_USR-...' },
            { key: 'public_key', label: 'Public Key', placeholder: 'APP_USR-...' },
            { key: 'webhook_secret', label: 'Webhook Secret (opcional)' },
        ],
        icon: CreditCard,
    },
    {
        id: 'openai',
        name: 'OpenAI',
        description: 'Usado por el bot de WhatsApp para entender mensajes y responder.',
        fields: [
            { key: 'api_key', label: 'API Key', placeholder: 'sk-...' },
        ],
        configFields: [
            { key: 'model', label: 'Modelo', placeholder: 'gpt-4o-mini' },
        ],
        icon: Brain,
    },
    {
        id: 'whatsapp',
        name: 'WhatsApp',
        description: 'Conexion con la API de WhatsApp Business para el bot de reservas.',
        fields: [
            { key: 'phone_number_id', label: 'Phone Number ID' },
            { key: 'access_token', label: 'Access Token' },
            { key: 'verify_token', label: 'Verify Token del webhook' },
        ],
        icon: MessageSquare,
    },
    {
        id: 'google_calendar',
        name: 'Google Calendar',
        description: 'Sincroniza los turnos con el calendario de Google del negocio.',
        fields: [],
        icon: Calendar,
    },
];

export default function IntegracionesPage() {
    const { token } = useAuth();
    const { toast } = useToast();
    const [rows, setRows] = useState<IntegrationRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [forms, setForms] = useState<Record<string, Record<string, string>>>({});
    const [configs, setConfigs] = useState<Record<string, Record<string, string>>>({});
    const [savingProvider, setSavingProvider] = useState<string | null>(null);
    const [testingProvider, setTestingProvider] = useState<string | null>(null);

    const fetchRows = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch(`${config.basePath}/api/integrations`, { headers: apiHeaders(token) });
            const json = await res.json();
            if (json.status > 0) {
                setRows(json.data || []);
                // Prefill configs
                const confMap: Record<string, Record<string, string>> = {};
                for (const r of json.data || []) {
                    confMap[r.provider] = {};
                    for (const [k, v] of Object.entries(r.config || {})) {
                        confMap[r.provider][k] = String(v ?? '');
                    }
                }
                setConfigs(confMap);
            }
        } catch (err) {
            console.error('Error fetching integrations', err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchRows();
    }, [fetchRows]);

    const rowFor = (p: Provider) => rows.find(r => r.provider === p && (!r.scope || r.scope === null));

    const handleChange = (provider: Provider, key: string, value: string) => {
        setForms(prev => ({ ...prev, [provider]: { ...(prev[provider] || {}), [key]: value } }));
    };

    const handleConfigChange = (provider: Provider, key: string, value: string) => {
        setConfigs(prev => ({ ...prev, [provider]: { ...(prev[provider] || {}), [key]: value } }));
    };

    const handleSave = async (provider: Provider) => {
        if (!token) return;
        setSavingProvider(provider);
        try {
            const credentials: Record<string, string> = {};
            const formFields = forms[provider] || {};
            for (const [k, v] of Object.entries(formFields)) {
                if (v && v.trim()) credentials[k] = v.trim();
            }
            const body: Record<string, unknown> = {
                provider,
                credentials,
                config: configs[provider] || {},
                enabled: true,
            };
            const res = await fetch(`${config.basePath}/api/integrations`, {
                method: 'PUT',
                headers: { ...apiHeaders(token), 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const json = await res.json();
            if (json.status > 0) {
                toast({ title: 'Exito', description: `${provider} guardado` });
                setForms(prev => ({ ...prev, [provider]: {} }));
                fetchRows();
            } else {
                toast({ title: 'Error', description: json.message || 'Error al guardar', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' });
        } finally {
            setSavingProvider(null);
        }
    };

    const handleTest = async (provider: Provider) => {
        if (!token) return;
        setTestingProvider(provider);
        try {
            const res = await fetch(`${config.basePath}/api/integrations/${provider}/test`, {
                method: 'POST',
                headers: apiHeaders(token),
            });
            const json = await res.json();
            const ok = json.data?.ok;
            toast({
                title: ok ? 'Conexion OK' : 'Error de conexion',
                description: ok ? 'Las credenciales funcionan' : (json.data?.error || 'Fallo'),
                variant: ok ? 'default' : 'destructive',
            });
            fetchRows();
        } catch {
            toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' });
        } finally {
            setTestingProvider(null);
        }
    };

    const handleConnectGoogle = async (providerId: Provider) => {
        if (!token) return;
        try {
            const res = await fetch(`${config.basePath}/api/google/authorize`, { headers: apiHeaders(token) });
            const json = await res.json();
            if (json.status > 0 && json.data?.url) {
                window.open(json.data.url, '_blank', 'width=500,height=700');
            } else {
                toast({
                    title: 'No configurado',
                    description: json.message || 'Setear GOOGLE_OAUTH_CLIENT_ID en el servidor',
                    variant: 'destructive',
                });
            }
        } catch {
            toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' });
        }
        void providerId;
    };

    const handleDisconnect = async (provider: Provider) => {
        if (!token) return;
        try {
            await fetch(`${config.basePath}/api/integrations/${provider}`, {
                method: 'DELETE',
                headers: apiHeaders(token),
            });
            toast({ title: 'Desconectado', description: provider });
            fetchRows();
        } catch {
            toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' });
        }
    };

    return (
        <div className="min-h-screen bg-muted/30 p-4 md:p-6 space-y-6">
            <div className="border-b border-border pb-4">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Integraciones</h1>
                <p className="mt-1 text-sm text-muted-foreground">Conecta tus cuentas de Mercado Pago, OpenAI, WhatsApp y Google Calendar.</p>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-56 w-full" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {PROVIDERS.map(p => {
                        const row = rowFor(p.id);
                        const Icon = p.icon;
                        const connected = row?.has_credentials;
                        return (
                            <Card key={p.id}>
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-md bg-primary/10 text-primary">
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-base">{p.name}</CardTitle>
                                                <CardDescription className="text-xs">{p.description}</CardDescription>
                                            </div>
                                        </div>
                                        {connected ? (
                                            <Badge variant="success">
                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                                Conectado
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary">
                                                <XCircle className="h-3 w-3 mr-1" />
                                                Sin conectar
                                            </Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {p.id === 'google_calendar' ? (
                                        <div className="space-y-2">
                                            <p className="text-xs text-muted-foreground">
                                                La conexion se hace con tu cuenta de Google (OAuth). Tambien podes conectar Google Calendar por profesional desde la seccion Profesionales.
                                            </p>
                                            <div className="flex gap-2">
                                                <Button size="sm" onClick={() => handleConnectGoogle(p.id)}>
                                                    Conectar con Google
                                                </Button>
                                                {connected && (
                                                    <Button size="sm" variant="outline" onClick={() => handleDisconnect(p.id)}>
                                                        Desconectar
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {p.fields.map(f => (
                                                <div key={f.key}>
                                                    <Label className="text-xs">{f.label}</Label>
                                                    <Input
                                                        type={f.type || 'text'}
                                                        placeholder={connected ? (row?.credentials_masked?.[f.key] || f.placeholder) : f.placeholder}
                                                        value={forms[p.id]?.[f.key] || ''}
                                                        onChange={e => handleChange(p.id, f.key, e.target.value)}
                                                    />
                                                </div>
                                            ))}
                                            {p.configFields?.map(f => (
                                                <div key={f.key}>
                                                    <Label className="text-xs">{f.label}</Label>
                                                    <Input
                                                        placeholder={f.placeholder}
                                                        value={configs[p.id]?.[f.key] || ''}
                                                        onChange={e => handleConfigChange(p.id, f.key, e.target.value)}
                                                    />
                                                </div>
                                            ))}
                                            <div className="flex gap-2 pt-2">
                                                <Button size="sm" onClick={() => handleSave(p.id)} disabled={savingProvider === p.id}>
                                                    {savingProvider === p.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                                    Guardar
                                                </Button>
                                                {connected && (
                                                    <Button size="sm" variant="outline" onClick={() => handleTest(p.id)} disabled={testingProvider === p.id}>
                                                        {testingProvider === p.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                                        Probar
                                                    </Button>
                                                )}
                                                {connected && (
                                                    <Button size="sm" variant="ghost" onClick={() => handleDisconnect(p.id)}>
                                                        Desconectar
                                                    </Button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                    {row?.last_test_status === 'error' && row?.last_test_error && (
                                        <p className="text-xs text-destructive">Ultimo error: {row.last_test_error}</p>
                                    )}
                                    {row?.last_tested_at && (
                                        <p className="text-xs text-muted-foreground">
                                            Probado: {new Date(row.last_tested_at).toLocaleString('es-AR')}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// Evita warning de Switch no usado si no aparece arriba
void Switch;
