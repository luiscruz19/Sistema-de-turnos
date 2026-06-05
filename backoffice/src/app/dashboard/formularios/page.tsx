'use client'

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiHeaders } from '@/utils/api-headers';
import config from '@/config/config';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Plus, Trash2, Loader2, ClipboardList } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type QuestionType = 'text' | 'select' | 'checkbox' | 'date';

interface Question {
    text: string;
    type: QuestionType;
}

interface IntakeForm {
    id: number;
    name: string;
    active: boolean;
    questions: Question[];
    createdAt: string;
}

const questionTypeLabels: Record<QuestionType, string> = {
    text: 'Texto libre',
    select: 'Seleccion',
    checkbox: 'Casilla',
    date: 'Fecha',
};

export default function FormulariosPage() {
    const { token } = useAuth();
    const { toast } = useToast();
    const [forms, setForms] = useState<IntakeForm[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formName, setFormName] = useState('');
    const [questions, setQuestions] = useState<Question[]>([{ text: '', type: 'text' }]);

    const fetchForms = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch(`${config.basePath}/api/intake-forms`, { headers: apiHeaders(token) });
            const json = await res.json();
            if (json.status === 1) setForms(json.data || []);
        } catch (err) {
            console.error('Error fetching forms', err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { fetchForms(); }, [fetchForms]);

    const openNewModal = () => {
        setFormName('');
        setQuestions([{ text: '', type: 'text' }]);
        setShowModal(true);
    };

    const addQuestion = () => {
        setQuestions(prev => [...prev, { text: '', type: 'text' }]);
    };

    const removeQuestion = (index: number) => {
        setQuestions(prev => prev.filter((_, i) => i !== index));
    };

    const updateQuestion = (index: number, field: keyof Question, value: string) => {
        setQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
    };

    const handleCreate = async () => {
        if (!formName.trim()) {
            toast({ title: 'Error', description: 'El nombre del formulario es obligatorio', variant: 'destructive' });
            return;
        }
        const validQuestions = questions.filter(q => q.text.trim());
        if (validQuestions.length === 0) {
            toast({ title: 'Error', description: 'Debes agregar al menos una pregunta', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(`${config.basePath}/api/intake-forms`, {
                method: 'POST',
                headers: { ...apiHeaders(token), 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: formName.trim(), questions: validQuestions, active: true }),
            });
            const json = await res.json();
            if (json.status > 0) {
                toast({ title: 'Exito', description: 'Formulario creado' });
                setShowModal(false);
                fetchForms();
            } else {
                toast({ title: 'Error', description: json.message || 'No se pudo crear el formulario', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (form: IntakeForm) => {
        try {
            const res = await fetch(`${config.basePath}/api/intake-forms/${form.id}`, {
                method: 'PUT',
                headers: { ...apiHeaders(token), 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: !form.active }),
            });
            const json = await res.json();
            if (json.status > 0) {
                fetchForms();
            } else {
                toast({ title: 'Error', description: json.message || 'No se pudo actualizar', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' });
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Eliminar este formulario?')) return;
        try {
            const res = await fetch(`${config.basePath}/api/intake-forms/${id}`, {
                method: 'DELETE',
                headers: apiHeaders(token),
            });
            const json = await res.json();
            if (json.status > 0) {
                toast({ title: 'Exito', description: 'Formulario eliminado' });
                fetchForms();
            } else {
                toast({ title: 'Error', description: json.message || 'No se pudo eliminar', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' });
        }
    };

    return (
        <div className="min-h-screen bg-muted/30 p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Formularios de anamnesis</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Crea cuestionarios para recolectar datos de tus clientes.</p>
                </div>
                <Button onClick={openNewModal} className="gap-1">
                    <Plus className="h-4 w-4" /> Nuevo formulario
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="space-y-2 p-4">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : forms.length === 0 ? (
                        <EmptyState
                            icon={ClipboardList}
                            title="Aun no hay formularios"
                            description="Crea tu primer formulario de anamnesis para recolectar informacion de tus clientes."
                            action={
                                <Button onClick={openNewModal} size="sm" className="gap-1">
                                    <Plus className="h-4 w-4" /> Nuevo formulario
                                </Button>
                            }
                        />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Preguntas</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {forms.map(form => (
                                    <TableRow key={form.id}>
                                        <TableCell className="font-medium">{form.name}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {form.questions?.length ?? 0} preguntas
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={form.active ? 'success' : 'secondary'}>
                                                {form.active ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(form.createdAt).toLocaleDateString('es-AR')}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-xs"
                                                    onClick={() => toggleActive(form)}
                                                >
                                                    {form.active ? 'Desactivar' : 'Activar'}
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                                    onClick={() => handleDelete(form.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Nuevo formulario de anamnesis</DialogTitle>
                        <DialogDescription>Define el nombre y las preguntas del formulario</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Nombre del formulario</Label>
                            <Input
                                value={formName}
                                onChange={e => setFormName(e.target.value)}
                                placeholder="Ej: Anamnesis inicial kinesiologia"
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label>Preguntas</Label>
                                <Button type="button" size="sm" variant="outline" onClick={addQuestion}>
                                    <Plus className="h-3.5 w-3.5 mr-1" /> Agregar pregunta
                                </Button>
                            </div>
                            {questions.map((q, i) => (
                                <div key={i} className="flex gap-2 items-start">
                                    <div className="flex-1">
                                        <Input
                                            placeholder={`Pregunta ${i + 1}`}
                                            value={q.text}
                                            onChange={e => updateQuestion(i, 'text', e.target.value)}
                                        />
                                    </div>
                                    <div className="w-36">
                                        <Select
                                            value={q.type}
                                            onValueChange={val => updateQuestion(i, 'type', val)}
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(Object.keys(questionTypeLabels) as QuestionType[]).map(t => (
                                                    <SelectItem key={t} value={t}>{questionTypeLabels[t]}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {questions.length > 1 && (
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            className="h-9 w-9 text-destructive hover:text-destructive shrink-0"
                                            onClick={() => removeQuestion(i)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
                        <Button onClick={handleCreate} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Crear formulario
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
