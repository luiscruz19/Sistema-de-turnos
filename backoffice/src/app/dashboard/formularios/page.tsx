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
        <div className="min-h-screen bg-gray-50 p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ClipboardList className="h-6 w-6 text-gray-700" />
                    <h1 className="text-2xl font-semibold text-gray-900">Formularios de anamnesis</h1>
                </div>
                <Button onClick={openNewModal}>
                    <Plus className="h-4 w-4 mr-1" /> Nuevo formulario
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center p-12">
                            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                        </div>
                    ) : forms.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">No hay formularios creados</div>
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
                                        <TableCell className="text-sm text-gray-500">
                                            {form.questions?.length ?? 0} preguntas
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={form.active ? 'bg-green-100 text-green-700 border-0' : 'bg-gray-100 text-gray-500 border-0'}>
                                                {form.active ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-500">
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
                                                    className="h-7 w-7 text-red-500 hover:text-red-600"
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
                                            className="h-9 w-9 text-red-500 hover:text-red-600 shrink-0"
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
