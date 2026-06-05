'use client'

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiHeaders } from '@/utils/api-headers';
import config from '@/config/config';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Plus, Trash2, Loader2, Clock, Ban, CalendarOff } from 'lucide-react';
import { Professional, Schedule, ScheduleException } from '@/types';
import { useToast } from '@/hooks/use-toast';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

export default function HorariosPage() {
    const { token } = useAuth();
    const { toast } = useToast();
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
    const [selectedProfessional, setSelectedProfessional] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [showExceptionModal, setShowExceptionModal] = useState(false);
    const [saving, setSaving] = useState(false);

    const [scheduleForm, setScheduleForm] = useState({
        professional_id: '', day_of_week: '1', start_time: '09:00', end_time: '18:00',
    });

    const [exceptionForm, setExceptionForm] = useState({
        professional_id: '', date: '', start_time: '', end_time: '', is_blocked: true, reason: '',
    });

    const fetchData = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const params = selectedProfessional !== 'all' ? `?professional_id=${selectedProfessional}` : '';
            const [profRes, schedRes, excRes] = await Promise.all([
                fetch(`${config.basePath}/api/professionals`, { headers: apiHeaders(token) }),
                fetch(`${config.basePath}/api/schedules${params}`, { headers: apiHeaders(token) }),
                fetch(`${config.basePath}/api/schedule-exceptions${params}`, { headers: apiHeaders(token) }),
            ]);
            const profJson = await profRes.json();
            const schedJson = await schedRes.json();
            const excJson = await excRes.json();
            if (profJson.status === 1) setProfessionals(profJson.data || []);
            if (schedJson.status === 1) setSchedules(schedJson.data || []);
            if (excJson.status === 1) setExceptions(excJson.data || []);
        } catch (err) {
            console.error('Error', err);
        } finally {
            setLoading(false);
        }
    }, [token, selectedProfessional]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSaveSchedule = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${config.basePath}/api/schedules`, {
                method: 'POST',
                headers: { ...apiHeaders(token), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    professional_id: scheduleForm.professional_id ? Number(scheduleForm.professional_id) : null,
                    day_of_week: Number(scheduleForm.day_of_week),
                    start_time: scheduleForm.start_time,
                    end_time: scheduleForm.end_time,
                }),
            });
            const json = await res.json();
            if (json.status > 0) {
                toast({ title: 'Exito', description: 'Horario creado' });
                setShowScheduleModal(false);
                fetchData();
            } else {
                toast({ title: 'Error', description: json.message, variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteSchedule = async (id: number) => {
        try {
            const res = await fetch(`${config.basePath}/api/schedules/${id}`, { method: 'DELETE', headers: apiHeaders(token) });
            const json = await res.json();
            if (json.status > 0) {
                toast({ title: 'Exito', description: 'Horario eliminado' });
                fetchData();
            } else {
                toast({ title: 'Error', description: json.message, variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' });
        }
    };

    const handleSaveException = async () => {
        if (!exceptionForm.date) {
            toast({ title: 'Error', description: 'La fecha es obligatoria', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(`${config.basePath}/api/schedule-exceptions`, {
                method: 'POST',
                headers: { ...apiHeaders(token), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    professional_id: exceptionForm.professional_id ? Number(exceptionForm.professional_id) : null,
                    date: exceptionForm.date,
                    start_time: exceptionForm.is_blocked ? null : exceptionForm.start_time,
                    end_time: exceptionForm.is_blocked ? null : exceptionForm.end_time,
                    is_blocked: exceptionForm.is_blocked,
                    reason: exceptionForm.reason || null,
                }),
            });
            const json = await res.json();
            if (json.status > 0) {
                toast({ title: 'Exito', description: 'Excepcion creada' });
                setShowExceptionModal(false);
                fetchData();
            } else {
                toast({ title: 'Error', description: json.message, variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    // Group schedules by day
    const schedulesByDay = DAY_NAMES.map((name, i) => ({
        day: i,
        name,
        blocks: schedules.filter(s => s.day_of_week === i).sort((a, b) => a.start_time.localeCompare(b.start_time)),
    }));

    return (
        <div className="min-h-screen bg-muted/30 p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Horarios</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Define la disponibilidad semanal y las excepciones por dia.</p>
                </div>
                <div className="flex gap-2">
                    <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
                        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Profesional" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {professionals.filter(p => p.active).map(p => (
                                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Tabs defaultValue="horarios">
                <TabsList>
                    <TabsTrigger value="horarios">Horarios regulares</TabsTrigger>
                    <TabsTrigger value="excepciones">Excepciones</TabsTrigger>
                </TabsList>

                <TabsContent value="horarios" className="space-y-4">
                    <div className="flex justify-end">
                        <Button size="sm" onClick={() => { setScheduleForm({ professional_id: selectedProfessional !== 'all' ? selectedProfessional : '', day_of_week: '1', start_time: '09:00', end_time: '18:00' }); setShowScheduleModal(true); }} className="gap-1">
                            <Plus className="h-4 w-4" /> Agregar bloque
                        </Button>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {Array.from({ length: 7 }).map((_, i) => (
                                <Skeleton key={i} className="h-32 w-full" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {schedulesByDay.filter(d => d.day >= 1 && d.day <= 6).map(day => (
                                <Card key={day.day}>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium">{day.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {day.blocks.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">Sin horario</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {day.blocks.map(block => (
                                                    <div key={block.id} className="flex items-center justify-between bg-primary/10 rounded-md px-3 py-2">
                                                        <div className="flex items-center gap-2">
                                                            <Clock className="h-3.5 w-3.5 text-primary" />
                                                            <span className="text-sm font-medium">{block.start_time?.slice(0, 5)} - {block.end_time?.slice(0, 5)}</span>
                                                        </div>
                                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDeleteSchedule(block.id)}>
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                            {/* Domingo */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Domingo</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {schedulesByDay[0].blocks.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">Sin horario</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {schedulesByDay[0].blocks.map(block => (
                                                <div key={block.id} className="flex items-center justify-between bg-primary/10 rounded-md px-3 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="h-3.5 w-3.5 text-primary" />
                                                        <span className="text-sm font-medium">{block.start_time?.slice(0, 5)} - {block.end_time?.slice(0, 5)}</span>
                                                    </div>
                                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDeleteSchedule(block.id)}>
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="excepciones" className="space-y-4">
                    <div className="flex justify-end">
                        <Button size="sm" onClick={() => { setExceptionForm({ professional_id: selectedProfessional !== 'all' ? selectedProfessional : '', date: '', start_time: '', end_time: '', is_blocked: true, reason: '' }); setShowExceptionModal(true); }} className="gap-1">
                            <Plus className="h-4 w-4" /> Nueva excepcion
                        </Button>
                    </div>

                    <Card>
                        <CardContent className="p-0">
                            {exceptions.length === 0 ? (
                                <EmptyState
                                    icon={CalendarOff}
                                    title="Sin excepciones"
                                    description="Crea una excepcion para bloquear o modificar el horario de un dia especifico."
                                />
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Profesional</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>Horario</TableHead>
                                            <TableHead>Motivo</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {exceptions.map(exc => (
                                            <TableRow key={exc.id}>
                                                <TableCell className="text-sm">{exc.date}</TableCell>
                                                <TableCell className="text-sm">{exc.professional?.name || 'General'}</TableCell>
                                                <TableCell>
                                                    {exc.is_blocked ? (
                                                        <Badge variant="destructive" className="gap-1">
                                                            <Ban className="h-3.5 w-3.5" /> Bloqueado
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="info" className="gap-1">
                                                            <Clock className="h-3.5 w-3.5" /> Horario especial
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {exc.is_blocked ? 'Todo el dia' : `${exc.start_time?.slice(0, 5)} - ${exc.end_time?.slice(0, 5)}`}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">{exc.reason || '-'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Schedule Modal */}
            <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nuevo bloque horario</DialogTitle>
                        <DialogDescription>Agrega un bloque de disponibilidad</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Profesional</Label>
                            <Select value={scheduleForm.professional_id} onValueChange={v => setScheduleForm(f => ({ ...f, professional_id: v }))}>
                                <SelectTrigger><SelectValue placeholder="General (todos)" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">General</SelectItem>
                                    {professionals.filter(p => p.active).map(p => (
                                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Dia</Label>
                            <Select value={scheduleForm.day_of_week} onValueChange={v => setScheduleForm(f => ({ ...f, day_of_week: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {DAY_NAMES.map((name, i) => (
                                        <SelectItem key={i} value={String(i)}>{name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Inicio</Label>
                                <Input type="time" value={scheduleForm.start_time} onChange={e => setScheduleForm(f => ({ ...f, start_time: e.target.value }))} />
                            </div>
                            <div>
                                <Label>Fin</Label>
                                <Input type="time" value={scheduleForm.end_time} onChange={e => setScheduleForm(f => ({ ...f, end_time: e.target.value }))} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowScheduleModal(false)}>Cancelar</Button>
                        <Button onClick={handleSaveSchedule} disabled={saving}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Crear
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Exception Modal */}
            <Dialog open={showExceptionModal} onOpenChange={setShowExceptionModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nueva excepcion</DialogTitle>
                        <DialogDescription>Bloquear o modificar horario de un dia especifico</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Profesional</Label>
                            <Select value={exceptionForm.professional_id} onValueChange={v => setExceptionForm(f => ({ ...f, professional_id: v }))}>
                                <SelectTrigger><SelectValue placeholder="General (todos)" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">General</SelectItem>
                                    {professionals.filter(p => p.active).map(p => (
                                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Fecha *</Label>
                            <Input type="date" value={exceptionForm.date} onChange={e => setExceptionForm(f => ({ ...f, date: e.target.value }))} />
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch checked={exceptionForm.is_blocked} onCheckedChange={v => setExceptionForm(f => ({ ...f, is_blocked: v }))} />
                            <Label>Bloquear todo el dia</Label>
                        </div>
                        {!exceptionForm.is_blocked && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>Inicio</Label>
                                    <Input type="time" value={exceptionForm.start_time} onChange={e => setExceptionForm(f => ({ ...f, start_time: e.target.value }))} />
                                </div>
                                <div>
                                    <Label>Fin</Label>
                                    <Input type="time" value={exceptionForm.end_time} onChange={e => setExceptionForm(f => ({ ...f, end_time: e.target.value }))} />
                                </div>
                            </div>
                        )}
                        <div>
                            <Label>Motivo</Label>
                            <Input value={exceptionForm.reason} onChange={e => setExceptionForm(f => ({ ...f, reason: e.target.value }))} placeholder="Ej: Feriado, Vacaciones..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowExceptionModal(false)}>Cancelar</Button>
                        <Button onClick={handleSaveException} disabled={saving}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Crear
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
