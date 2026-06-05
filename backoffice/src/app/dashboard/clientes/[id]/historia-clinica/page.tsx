'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiHeaders } from '@/utils/api-headers';
import config from '@/config/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, ArrowLeft, Save, Plus, Trash2, Paperclip } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Client {
    id: number;
    name: string;
    email?: string | null;
    phone?: string | null;
}

interface Record {
    id?: number;
    summary?: string | null;
    allergies?: string | null;
    medications?: string | null;
    conditions?: string | null;
    blood_type?: string | null;
    emergency_contact?: string | null;
}

interface Note {
    id: number;
    content: string;
    is_private: boolean;
    createdAt: string;
    professional?: { id: number; name: string } | null;
    author_user_id?: number | null;
}

interface Attachment {
    id: number;
    file_url: string;
    file_name: string;
    mime_type?: string | null;
    size_bytes?: number | null;
    description?: string | null;
    createdAt: string;
}

export default function HistoriaClinicaPage() {
    const params = useParams();
    const router = useRouter();
    const clientId = Number(params.id);
    const { token } = useAuth();
    const { toast } = useToast();

    const [client, setClient] = useState<Client | null>(null);
    const [record, setRecord] = useState<Record>({});
    const [notes, setNotes] = useState<Note[]>([]);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingRecord, setSavingRecord] = useState(false);
    const [newNote, setNewNote] = useState('');
    const [newNotePrivate, setNewNotePrivate] = useState(false);
    const [addingNote, setAddingNote] = useState(false);
    const [newAttUrl, setNewAttUrl] = useState('');
    const [newAttName, setNewAttName] = useState('');
    const [addingAtt, setAddingAtt] = useState(false);

    const fetchData = useCallback(async () => {
        if (!token || !clientId) return;
        setLoading(true);
        try {
            const res = await fetch(`${config.basePath}/api/health-records/${clientId}`, { headers: apiHeaders(token) });
            const json = await res.json();
            if (json.status > 0) {
                setClient(json.data?.client || null);
                setRecord(json.data?.record || {});
                setNotes(json.data?.notes || []);
                setAttachments(json.data?.attachments || []);
            } else {
                toast({ title: 'Error', description: json.message || 'No disponible', variant: 'destructive' });
            }
        } catch (err) {
            console.error('Error fetching health record', err);
        } finally {
            setLoading(false);
        }
    }, [token, clientId, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSaveRecord = async () => {
        if (!token) return;
        setSavingRecord(true);
        try {
            const res = await fetch(`${config.basePath}/api/health-records/${clientId}`, {
                method: 'PUT',
                headers: { ...apiHeaders(token), 'Content-Type': 'application/json' },
                body: JSON.stringify(record),
            });
            const json = await res.json();
            if (json.status > 0) {
                toast({ title: 'Exito', description: 'Historia clinica actualizada' });
            } else {
                toast({ title: 'Error', description: json.message || 'Error', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' });
        } finally {
            setSavingRecord(false);
        }
    };

    const handleAddNote = async () => {
        if (!token || !newNote.trim()) return;
        setAddingNote(true);
        try {
            const res = await fetch(`${config.basePath}/api/health-records/${clientId}/notes`, {
                method: 'POST',
                headers: { ...apiHeaders(token), 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newNote.trim(), is_private: newNotePrivate }),
            });
            const json = await res.json();
            if (json.status > 0) {
                setNewNote('');
                setNewNotePrivate(false);
                fetchData();
            } else {
                toast({ title: 'Error', description: json.message || 'Error', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' });
        } finally {
            setAddingNote(false);
        }
    };

    const handleDeleteNote = async (id: number) => {
        if (!token) return;
        if (!window.confirm('Eliminar esta nota?')) return;
        try {
            await fetch(`${config.basePath}/api/health-records/notes/${id}`, {
                method: 'DELETE',
                headers: apiHeaders(token),
            });
            fetchData();
        } catch {
            toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' });
        }
    };

    const handleAddAttachment = async () => {
        if (!token || !newAttUrl || !newAttName) return;
        setAddingAtt(true);
        try {
            const res = await fetch(`${config.basePath}/api/health-records/${clientId}/attachments`, {
                method: 'POST',
                headers: { ...apiHeaders(token), 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_url: newAttUrl, file_name: newAttName }),
            });
            const json = await res.json();
            if (json.status > 0) {
                setNewAttUrl('');
                setNewAttName('');
                fetchData();
            } else {
                toast({ title: 'Error', description: json.message || 'Error', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' });
        } finally {
            setAddingAtt(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-muted/30 p-4 md:p-6 space-y-6">
                <div className="flex items-center gap-3 border-b border-border pb-4">
                    <Skeleton className="h-9 w-9 rounded-md" />
                    <div className="space-y-2">
                        <Skeleton className="h-7 w-48" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                </div>
                <Skeleton className="h-72 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/30 p-4 md:p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-border pb-4">
                <Button size="icon" variant="ghost" onClick={() => router.push(`${config.basePath}/dashboard/clientes`)}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Historia clinica</h1>
                    <p className="text-sm text-muted-foreground">{client?.name || `Cliente #${clientId}`}</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Datos clinicos</CardTitle>
                    <CardDescription className="text-xs">Resumen general del cliente</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div>
                        <Label>Resumen</Label>
                        <Textarea
                            rows={3}
                            value={record.summary || ''}
                            onChange={e => setRecord(r => ({ ...r, summary: e.target.value }))}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <Label>Alergias</Label>
                            <Textarea
                                rows={2}
                                value={record.allergies || ''}
                                onChange={e => setRecord(r => ({ ...r, allergies: e.target.value }))}
                            />
                        </div>
                        <div>
                            <Label>Medicacion</Label>
                            <Textarea
                                rows={2}
                                value={record.medications || ''}
                                onChange={e => setRecord(r => ({ ...r, medications: e.target.value }))}
                            />
                        </div>
                        <div>
                            <Label>Antecedentes</Label>
                            <Textarea
                                rows={2}
                                value={record.conditions || ''}
                                onChange={e => setRecord(r => ({ ...r, conditions: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-3">
                            <div>
                                <Label>Grupo sanguineo</Label>
                                <Input
                                    value={record.blood_type || ''}
                                    onChange={e => setRecord(r => ({ ...r, blood_type: e.target.value }))}
                                />
                            </div>
                            <div>
                                <Label>Contacto de emergencia</Label>
                                <Input
                                    value={record.emergency_contact || ''}
                                    onChange={e => setRecord(r => ({ ...r, emergency_contact: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>
                    <Button onClick={handleSaveRecord} disabled={savingRecord}>
                        {savingRecord ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                        Guardar
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Notas de evolucion</CardTitle>
                    <CardDescription className="text-xs">Registros de cada atencion</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Textarea
                        placeholder="Escribi una nueva nota..."
                        rows={3}
                        value={newNote}
                        onChange={e => setNewNote(e.target.value)}
                    />
                    <div className="flex items-center gap-2">
                        <Switch checked={newNotePrivate} onCheckedChange={setNewNotePrivate} />
                        <Label className="text-xs">Privada (solo visible para quien la escribe)</Label>
                    </div>
                    <Button size="sm" onClick={handleAddNote} disabled={addingNote || !newNote.trim()}>
                        {addingNote ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                        Agregar nota
                    </Button>

                    <div className="space-y-2">
                        {notes.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No hay notas todavia.</p>
                        ) : notes.map(n => (
                            <div key={n.id} className="border rounded-md p-3 flex gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm whitespace-pre-wrap">{n.content}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <p className="text-xs text-muted-foreground">
                                            {n.professional?.name || 'Admin'} &middot; {new Date(n.createdAt).toLocaleString('es-AR')}
                                        </p>
                                        {n.is_private && <Badge variant="warning">Privada</Badge>}
                                    </div>
                                </div>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDeleteNote(n.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Adjuntos</CardTitle>
                    <CardDescription className="text-xs">Estudios, recetas, imagenes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Input placeholder="URL del archivo" value={newAttUrl} onChange={e => setNewAttUrl(e.target.value)} />
                        <Input placeholder="Nombre del archivo" value={newAttName} onChange={e => setNewAttName(e.target.value)} />
                    </div>
                    <Button size="sm" onClick={handleAddAttachment} disabled={addingAtt || !newAttUrl || !newAttName}>
                        {addingAtt ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Paperclip className="h-3 w-3 mr-1" />}
                        Agregar adjunto
                    </Button>
                    <div className="space-y-1">
                        {attachments.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No hay adjuntos.</p>
                        ) : attachments.map(a => (
                            <a key={a.id} href={a.file_url} target="_blank" rel="noreferrer" className="block text-sm text-primary hover:underline">
                                <Paperclip className="h-3 w-3 inline mr-1" /> {a.file_name}
                            </a>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
