import Schedule from '../../models/Schedule.js';
import ScheduleException from '../../models/ScheduleException.js';
import Appointment from '../../models/Appointment.js';
import Service from '../../models/Service.js';
import Professional from '../../models/Professional.js';
import BusinessConfig from '../../models/BusinessConfig.js';
import { Op } from 'sequelize';
import { errorMessage, successMessage } from '../../utils/messages.js';
import messages from '../../config/messages.js';

/**
 * Convierte "HH:MM:SS" a minutos desde medianoche
 */
function timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

/**
 * Convierte minutos desde medianoche a "HH:MM"
 */
function minutesToTime(minutes) {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
}

/**
 * Obtener disponibilidad: dado service_id, professional_id (opcional), date
 * Cruza schedules + schedule_exceptions + appointments existentes para calcular slots libres
 */
export async function getAvailable(req, res) {
    try {
        const { service_id, professional_id, date } = req.query;

        if (!service_id || !date) {
            return res.status(400).json(errorMessage({
                message: 'Se requiere service_id y date',
            }));
        }

        // Obtener servicio
        const service = await Service.findOne({
            where: { id: service_id, active: true }
        });
        if (!service) {
            return res.status(404).json(errorMessage({
                message: messages.entities.service.errors.notFound
            }));
        }

        const duration = service.duration_minutes;
        const bufferTime = service.buffer_time_minutes || 0;

        // Obtener config del negocio
        const config = await BusinessConfig.findOne();
        const slotDuration = config?.slot_duration_default || 30;

        // Determinar qué profesionales consultar
        let professionalIds = [];
        if (professional_id) {
            professionalIds = [Number(professional_id)];
        } else if (service.requires_professional) {
            // Buscar profesionales que ofrecen este servicio y están activos
            const pros = await Professional.findAll({
                where: { active: true },
                attributes: ['id'],
            });
            professionalIds = pros.map(p => p.id);
        }

        const dateObj = new Date(date + 'T00:00:00');
        const dayOfWeek = dateObj.getDay(); // 0=Sun, 1=Mon, ...

        const allSlots = [];

        // Si el servicio no requiere profesional, calcular slots del negocio
        if (!service.requires_professional || professionalIds.length === 0) {
            const slots = await calculateSlotsForProfessional(
                null, date, dayOfWeek, duration, slotDuration, bufferTime
            );
            allSlots.push({ professional_id: null, professional_name: null, slots });
        } else {
            // Calcular slots para cada profesional
            for (const profId of professionalIds) {
                const pro = await Professional.findByPk(profId, { attributes: ['id', 'name', 'color'] });
                const slots = await calculateSlotsForProfessional(
                    profId, date, dayOfWeek, duration, slotDuration, bufferTime
                );
                if (slots.length > 0) {
                    allSlots.push({
                        professional_id: profId,
                        professional_name: pro?.name || null,
                        professional_color: pro?.color || null,
                        slots,
                    });
                }
            }
        }

        return res.status(200).json(successMessage({
            message: messages.entities.availability.success.fetch,
            extra: {
                data: {
                    date,
                    service_id: Number(service_id),
                    service_name: service.name,
                    duration_minutes: duration,
                    availability: allSlots,
                }
            }
        }));

    } catch (error) {
        console.error('Error getting availability:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Calcula slots disponibles para un profesional (o negocio si profId=null) en una fecha
 */
async function calculateSlotsForProfessional(professionalId, date, dayOfWeek, serviceDuration, slotDuration, bufferTime = 0) {
    // 1. Obtener horarios del profesional (o del negocio si no tiene propios)
    let schedules = await Schedule.findAll({
        where: {
            professional_id: professionalId,
            day_of_week: dayOfWeek,
            active: true,
        }
    });

    // Si el profesional no tiene horarios propios, usar horarios del negocio
    if (schedules.length === 0 && professionalId) {
        schedules = await Schedule.findAll({
            where: {
                professional_id: null,
                day_of_week: dayOfWeek,
                active: true,
            }
        });
    }

    if (schedules.length === 0) return [];

    // 2. Obtener excepciones para esta fecha
    const exceptions = await ScheduleException.findAll({
        where: {
            date,
            [Op.or]: [
                { professional_id: professionalId },
                { professional_id: null },
            ],
        }
    });

    // Si hay una excepción de bloqueo total, no hay disponibilidad
    const blockedAll = exceptions.find(e => e.is_blocked && !e.start_time);
    if (blockedAll) return [];

    // 3. Generar todos los slots posibles a partir de los horarios
    let possibleSlots = [];
    for (const schedule of schedules) {
        const startMin = timeToMinutes(schedule.start_time);
        const endMin = timeToMinutes(schedule.end_time);

        for (let slot = startMin; slot + serviceDuration <= endMin; slot += slotDuration) {
            possibleSlots.push({
                start: minutesToTime(slot),
                end: minutesToTime(slot + serviceDuration),
                start_minutes: slot,
                end_minutes: slot + serviceDuration,
            });
        }

    }

    // 4. Filtrar por excepciones de bloqueo parcial
    const blockedRanges = exceptions
        .filter(e => e.is_blocked && e.start_time && e.end_time)
        .map(e => ({
            start: timeToMinutes(e.start_time),
            end: timeToMinutes(e.end_time),
        }));

    if (blockedRanges.length > 0) {
        possibleSlots = possibleSlots.filter(slot => {
            return !blockedRanges.some(blocked =>
                slot.start_minutes < blocked.end && slot.end_minutes > blocked.start
            );
        });
    }

    // 5. Reemplazar con horarios especiales si hay excepciones no-bloqueadas
    const specialSchedules = exceptions.filter(e => !e.is_blocked && e.start_time && e.end_time);
    if (specialSchedules.length > 0) {
        const specialSlots = [];
        for (const special of specialSchedules) {
            const startMin = timeToMinutes(special.start_time);
            const endMin = timeToMinutes(special.end_time);
            for (let slot = startMin; slot + serviceDuration <= endMin; slot += slotDuration) {
                specialSlots.push({
                    start: minutesToTime(slot),
                    end: minutesToTime(slot + serviceDuration),
                    start_minutes: slot,
                    end_minutes: slot + serviceDuration,
                });
            }
        }
        // Combinar: usar slots especiales para las franjas que cubren
        // (simplificación: agregar los especiales a los posibles y deduplicar)
        const existing = new Set(possibleSlots.map(s => s.start));
        for (const s of specialSlots) {
            if (!existing.has(s.start)) {
                possibleSlots.push(s);
            }
        }
        possibleSlots.sort((a, b) => a.start_minutes - b.start_minutes);
    }

    // 6. Quitar slots que colisionen con turnos existentes
    const existingAppointments = await Appointment.findAll({
        where: {
            date,
            status: { [Op.notIn]: ['cancelled'] },
            ...(professionalId ? { professional_id: professionalId } : {}),
        },
        attributes: ['start_time', 'end_time'],
    });

    // Las franjas ocupadas se expanden con el buffer_time para evitar solapes
    const busyRanges = existingAppointments.map(a => ({
        start: timeToMinutes(a.start_time),
        end: timeToMinutes(a.end_time) + bufferTime,
    }));

    const availableSlots = possibleSlots.filter(slot => {
        // El slot necesita espacio para la duración + su propio buffer
        const slotEnd = slot.end_minutes + bufferTime;
        return !busyRanges.some(busy =>
            slot.start_minutes < busy.end && slotEnd > busy.start
        );
    });

    // Devolver solo start y end (sin los minutos internos)
    return availableSlots.map(s => ({ start: s.start, end: s.end }));
}
