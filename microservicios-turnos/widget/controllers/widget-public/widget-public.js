import BusinessConfig from '../../models/BusinessConfig.js';
import Service from '../../models/Service.js';
import Professional from '../../models/Professional.js';
import ProfessionalService from '../../models/ProfessionalService.js';
import Appointment from '../../models/Appointment.js';
import ClientContact from '../../models/ClientContact.js';
import Schedule from '../../models/Schedule.js';
import ScheduleException from '../../models/ScheduleException.js';
import { Op } from 'sequelize';
import sequelize from '../../db/sequelize.js';
import { errorMessage, successMessage } from '../../utils/messages.js';
import { isValidEmail, isValidPhone, normalizeStr } from '../../utils/helpers.js';
import { sendConfirmationEmail } from '../../utils/appointment-emails.js';
import messages from '../../config/messages.js';

/**
 * Resolver la configuracion del negocio por api_key
 */
async function resolveByApiKey(apiKey) {
    if (!apiKey) return null;
    return await BusinessConfig.findOne({ where: { api_key: apiKey } });
}

/**
 * Convierte "HH:MM:SS" a minutos
 */
function timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

function minutesToTime(minutes) {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
}

/**
 * GET /widget/config: devuelve business_config + services activos + professionals
 */
export async function getConfig(req, res) {
    try {
        const apiKey = req.headers['x-api-key'] || req.query.api_key;
        const config = await resolveByApiKey(apiKey);

        if (!config) {
            return res.status(404).json(errorMessage({
                message: messages.entities.businessConfig.errors.apiKeyInvalid
            }));
        }

        const [servicesData, professionalsData] = await Promise.all([
            Service.findAll({
                where: { active: true },
                attributes: ['id', 'name', 'description', 'duration_minutes', 'price', 'deposit_amount', 'category', 'requires_professional'],
                order: [['sort_order', 'ASC']],
            }),
            Professional.findAll({
                where: { active: true },
                attributes: ['id', 'name', 'specialty', 'avatar_url', 'color'],
                include: [{
                    model: ProfessionalService,
                    as: 'professionalServices',
                    attributes: ['service_id'],
                }],
                order: [['sort_order', 'ASC']],
            }),
        ]);

        return res.status(200).json(successMessage({
            message: messages.entities.widget.success.config,
            extra: {
                data: {
                    business: {
                        name: config.name,
                        address: config.address,
                        phone: config.phone,
                        timezone: config.timezone,
                        currency: config.currency,
                        booking_advance_days: config.booking_advance_days,
                        deposit_required: config.deposit_required,
                    },
                    services: servicesData,
                    professionals: professionalsData,
                }
            }
        }));

    } catch (error) {
        console.error('Error in widget getConfig:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * GET /widget/availability: slots disponibles para fecha/servicio/profesional
 */
export async function getAvailability(req, res) {
    try {
        const apiKey = req.headers['x-api-key'] || req.query.api_key;
        const config = await resolveByApiKey(apiKey);

        if (!config) {
            return res.status(404).json(errorMessage({
                message: messages.entities.businessConfig.errors.apiKeyInvalid
            }));
        }

        const { service_id, professional_id, date } = req.query;

        if (!service_id || !date) {
            return res.status(400).json(errorMessage({ message: 'Se requiere service_id y date' }));
        }

        const service = await Service.findOne({ where: { id: service_id, active: true } });
        if (!service) {
            return res.status(404).json(errorMessage({ message: messages.entities.service.errors.notFound }));
        }

        const duration = service.duration_minutes;
        const slotDuration = config.slot_duration_default || 30;
        const bufferTime = service.buffer_time_minutes || 0;
        const capacity = service.max_concurrent || 1;

        // Si la fecha es hoy, descartar slots cuyo inicio ya pasó.
        const nowAvail = new Date();
        const todayAvail = nowAvail.toISOString().slice(0, 10);
        const minStartMinutes = (date === todayAvail)
            ? nowAvail.getHours() * 60 + nowAvail.getMinutes()
            : -1;

        const dateObj = new Date(date + 'T00:00:00');
        const dayOfWeek = dateObj.getDay();

        // Determinar profesionales a consultar
        let profIds = [];
        if (professional_id) {
            profIds = [Number(professional_id)];
        } else if (service.requires_professional) {
            const ps = await ProfessionalService.findAll({
                where: { service_id },
                attributes: ['professional_id'],
            });
            profIds = ps.map(p => p.professional_id);
        }

        const result = [];

        const calculateSlots = async (profId) => {
            let schedules = await Schedule.findAll({
                where: { professional_id: profId, day_of_week: dayOfWeek, active: true }
            });

            if (schedules.length === 0 && profId) {
                schedules = await Schedule.findAll({
                    where: { professional_id: null, day_of_week: dayOfWeek, active: true }
                });
            }

            if (schedules.length === 0) return [];

            // Check blocked exceptions
            const blockedAll = await ScheduleException.findOne({
                where: {
                    date, is_blocked: true, start_time: null,
                    [Op.or]: [{ professional_id: profId }, { professional_id: null }],
                }
            });
            if (blockedAll) return [];

            // Generate slots
            const possibleSlots = [];
            for (const sch of schedules) {
                const startMin = timeToMinutes(sch.start_time);
                const endMin = timeToMinutes(sch.end_time);
                for (let s = startMin; s + duration <= endMin; s += slotDuration) {
                    possibleSlots.push({ start: minutesToTime(s), end: minutesToTime(s + duration), sMin: s, eMin: s + duration });
                }
            }

            // Remove occupied (respeta buffer y capacidad max_concurrent)
            const existing = await Appointment.findAll({
                where: {
                    date, status: { [Op.notIn]: ['cancelled', 'no_show'] },
                    ...(profId ? { professional_id: profId } : {}),
                },
                attributes: ['start_time', 'end_time'],
            });

            const busy = existing.map(a => ({
                start: timeToMinutes(a.start_time) - bufferTime,
                end: timeToMinutes(a.end_time) + bufferTime,
            }));

            return possibleSlots
                .filter(sl => {
                    const slEnd = sl.eMin + bufferTime;
                    const overlapping = busy.filter(b => sl.sMin < b.end && slEnd > b.start).length;
                    return overlapping < capacity;
                })
                .filter(sl => minStartMinutes < 0 || sl.sMin >= minStartMinutes)
                .map(s => ({ start: s.start, end: s.end }));
        };

        if (!service.requires_professional || profIds.length === 0) {
            const slots = await calculateSlots(null);
            result.push({ professional_id: null, slots });
        } else {
            for (const pid of profIds) {
                const pro = await Professional.findByPk(pid, { attributes: ['id', 'name', 'color'] });
                const slots = await calculateSlots(pid);
                if (slots.length > 0) {
                    result.push({
                        professional_id: pid,
                        professional_name: pro?.name,
                        professional_color: pro?.color,
                        slots,
                    });
                }
            }
        }

        return res.status(200).json(successMessage({
            message: messages.entities.widget.success.availability,
            extra: { data: { date, service_id: Number(service_id), availability: result } }
        }));

    } catch (error) {
        console.error('Error in widget getAvailability:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * POST /widget/book: crear turno desde el widget
 */
export async function createBooking(req, res) {
    try {
        const apiKey = req.headers['x-api-key'] || req.query.api_key;
        const config = await resolveByApiKey(apiKey);

        if (!config) {
            return res.status(404).json(errorMessage({
                message: messages.entities.businessConfig.errors.apiKeyInvalid
            }));
        }

        const { service_id, professional_id, date, start_time, client_name, client_email, client_phone, notes } = req.body;

        if (!service_id || !date || !start_time || !client_name) {
            return res.status(400).json(errorMessage({
                message: messages.system.validation.errors.fieldsRequired
            }));
        }

        // Se requiere al menos un dato de contacto
        if (!client_email && !client_phone) {
            return res.status(400).json(errorMessage({
                message: messages.entities.appointment.errors.contactRequired
            }));
        }

        // Validación de contacto: email válido y/o teléfono razonable
        if (client_email && !isValidEmail(client_email)) {
            return res.status(400).json(errorMessage({
                message: messages.entities.appointment.errors.invalidEmail
            }));
        }
        if (client_phone && !isValidPhone(client_phone)) {
            return res.status(400).json(errorMessage({
                message: messages.entities.appointment.errors.invalidPhone
            }));
        }

        // Obtener servicio
        const service = await Service.findOne({ where: { id: service_id, active: true } });
        if (!service) {
            return res.status(404).json(errorMessage({ message: messages.entities.service.errors.notFound }));
        }

        // Validar ventana de reserva (no en el pasado, dentro del límite anticipado)
        const nowDate = new Date();
        const targetDateTime = new Date(`${date}T${start_time}:00`);
        if (Number.isNaN(targetDateTime.getTime())) {
            return res.status(400).json(errorMessage({ message: messages.entities.appointment.errors.invalidDateRange }));
        }
        if (targetDateTime.getTime() < nowDate.getTime()) {
            return res.status(400).json(errorMessage({ message: messages.entities.appointment.errors.pastDate }));
        }
        const advanceDays = config.booking_advance_days ?? 30;
        if (advanceDays > 0) {
            const limit = new Date(nowDate);
            limit.setDate(limit.getDate() + advanceDays);
            limit.setHours(23, 59, 59, 999);
            if (targetDateTime.getTime() > limit.getTime()) {
                return res.status(400).json(errorMessage({ message: messages.entities.appointment.errors.advanceLimitExceeded }));
            }
        }

        // Calcular end_time
        const [h, m] = start_time.split(':').map(Number);
        const endMin = h * 60 + m + service.duration_minutes;
        const end_time = `${Math.floor(endMin / 60).toString().padStart(2, '0')}:${(endMin % 60).toString().padStart(2, '0')}:00`;

        // Franja con buffer del servicio (preparación entre turnos)
        const bufferMinutes = service.buffer_time_minutes || 0;
        const startBufMin = (h * 60 + m) - bufferMinutes;
        const endBufMin = endMin + bufferMinutes;
        const start_with_buffer = `${Math.max(0, Math.floor(startBufMin / 60)).toString().padStart(2, '0')}:${(((startBufMin % 60) + 60) % 60).toString().padStart(2, '0')}:00`;
        const end_with_buffer = `${Math.floor(endBufMin / 60).toString().padStart(2, '0')}:${(endBufMin % 60).toString().padStart(2, '0')}:00`;

        // Determinar depósito
        let depositAmount = 0;
        let depositStatus = 'none';
        if (config.deposit_required && service.price > 0) {
            depositAmount = service.deposit_amount > 0
                ? service.deposit_amount
                : (service.price * (config.deposit_percentage || 0) / 100);
            depositStatus = depositAmount > 0 ? 'pending' : 'none';
        }

        // Verificación de disponibilidad + creación dentro de una transacción.
        // El COUNT se hace con lock para evitar la condición de carrera (doble reserva)
        // y respeta max_concurrent (canchas/clases con capacidad múltiple).
        let appointment;
        try {
            appointment = await sequelize.transaction(async (t) => {
                const conflictWhere = {
                    date,
                    status: { [Op.notIn]: ['cancelled', 'no_show'] },
                    start_time: { [Op.lt]: end_with_buffer },
                    end_time: { [Op.gt]: start_with_buffer },
                };
                if (professional_id) conflictWhere.professional_id = professional_id;

                const conflictCount = await Appointment.count({
                    where: conflictWhere,
                    transaction: t,
                    lock: t.LOCK.UPDATE,
                });
                if (conflictCount >= (service.max_concurrent || 1)) {
                    const conflictError = new Error('SLOT_CONFLICT');
                    conflictError.code = 'SLOT_CONFLICT';
                    throw conflictError;
                }

                // Buscar o crear contacto por email O phone (normalizado a lower/trim)
                let contact = null;
                const normEmail = normalizeStr(client_email);
                const normPhone = client_phone ? client_phone.trim() : null;
                if (normEmail || normPhone) {
                    const orConditions = [];
                    if (normEmail) {
                        orConditions.push(sequelize.where(sequelize.fn('lower', sequelize.col('email')), normEmail));
                    }
                    if (normPhone) {
                        orConditions.push({ phone: normPhone });
                    }

                    contact = await ClientContact.findOne({
                        where: { [Op.or]: orConditions },
                        transaction: t,
                    });
                    if (!contact) {
                        contact = await ClientContact.create({
                            name: client_name,
                            email: client_email ? client_email.trim() : null,
                            phone: normPhone,
                        }, { transaction: t });
                    }
                }

                const created = await Appointment.create({
                    professional_id: professional_id || null,
                    service_id,
                    client_contact_id: contact?.id || null,
                    client_name,
                    client_email: client_email ? client_email.trim() : null,
                    client_phone: normPhone,
                    date,
                    start_time,
                    end_time,
                    status: config.auto_confirm ? 'confirmed' : 'pending',
                    source: 'web',
                    deposit_status: depositStatus,
                    deposit_amount: depositAmount,
                    notes: notes || null,
                }, { transaction: t });

                if (contact) {
                    await contact.update({
                        appointment_count: contact.appointment_count + 1,
                        last_appointment_at: new Date(),
                    }, { transaction: t });
                }

                return created;
            });
        } catch (txErr) {
            if (txErr.code === 'SLOT_CONFLICT') {
                return res.status(409).json(errorMessage({
                    message: messages.entities.appointment.errors.conflictExists
                }));
            }
            throw txErr;
        }

        // Email de confirmación (best-effort, vía core /send-email)
        appointment.service = service;
        sendConfirmationEmail({
            appointment,
            businessName: config?.name,
            serviceName: service.name,
        }).catch((e) => console.error('[widget] email confirmación:', e.message));

        return res.status(201).json(successMessage({
            message: messages.entities.widget.success.booked,
            extra: { data: appointment }
        }));

    } catch (error) {
        console.error('Error in widget createBooking:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}
