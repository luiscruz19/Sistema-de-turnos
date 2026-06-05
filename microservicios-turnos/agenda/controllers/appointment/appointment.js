import Appointment from '../../models/Appointment.js';
import Professional from '../../models/Professional.js';
import Service from '../../models/Service.js';
import ClientContact from '../../models/ClientContact.js';
import BusinessConfig from '../../models/BusinessConfig.js';
import ClientPackage from '../../models/ClientPackage.js';
import SessionPackage from '../../models/SessionPackage.js';
import WaitlistEntry from '../../models/WaitlistEntry.js';
import { Op } from 'sequelize';
import sequelize from '../../db/sequelize.js';
import { errorMessage, successMessage } from '../../utils/messages.js';
import { isValidEmail, isValidPhone, normalizeStr } from '../../utils/helpers.js';
import messages from '../../config/messages.js';
import { createEvent as createCalendarEvent, deleteEvent as deleteCalendarEvent } from '../../integrations/google-calendar.js';
import {
    sendConfirmationEmail,
    sendCancellationEmail,
    sendRescheduleEmail,
    sendWaitlistOpeningEmail,
} from '../../utils/appointment-emails.js';

/**
 * Transiciones de estado válidas. Garantiza coherencia del ciclo de vida.
 * Estados finales (cancelled/completed/no_show) no admiten cambios.
 */
const VALID_TRANSITIONS = {
    pending: ['confirmed', 'cancelled', 'completed', 'no_show'],
    confirmed: ['completed', 'cancelled', 'no_show', 'pending'],
    completed: [],
    cancelled: [],
    no_show: [],
};

function canTransition(from, to) {
    if (from === to) return true;
    return (VALID_TRANSITIONS[from] || []).includes(to);
}

function timeToMinutes(timeStr) {
    const [h, m] = String(timeStr).split(':').map(Number);
    return h * 60 + (m || 0);
}

function computeEndTime(startTime, durationMinutes) {
    const total = timeToMinutes(startTime) + durationMinutes;
    const hh = Math.floor(total / 60).toString().padStart(2, '0');
    const mm = (total % 60).toString().padStart(2, '0');
    return `${hh}:${mm}:00`;
}

/**
 * Cuenta los turnos que se solapan con el slot dado, considerando el buffer del
 * servicio (tiempo de preparación entre turnos). El buffer expande la franja
 * ocupada hacia ambos lados para evitar solapes "pegados".
 *
 * Con transacción aplica lock para evitar la condición de carrera (doble reserva).
 */
async function countSlotConflicts(professionalId, date, startTime, endTime, bufferMinutes = 0, excludeAppointmentId = null, transaction = null) {
    const startMin = timeToMinutes(startTime) - bufferMinutes;
    const endMin = timeToMinutes(endTime) + bufferMinutes;
    const startWithBuffer = `${Math.max(0, Math.floor(startMin / 60)).toString().padStart(2, '0')}:${(((startMin % 60) + 60) % 60).toString().padStart(2, '0')}:00`;
    const endWithBuffer = `${Math.floor(endMin / 60).toString().padStart(2, '0')}:${(endMin % 60).toString().padStart(2, '0')}:00`;

    const where = {
        date,
        status: { [Op.notIn]: ['cancelled', 'no_show'] },
        start_time: { [Op.lt]: endWithBuffer },
        end_time: { [Op.gt]: startWithBuffer },
    };

    if (professionalId) {
        where.professional_id = professionalId;
    }

    if (excludeAppointmentId) {
        where.id = { [Op.ne]: excludeAppointmentId };
    }

    const options = { where };
    if (transaction) {
        options.transaction = transaction;
        options.lock = transaction.LOCK.UPDATE;
    }

    return Appointment.count(options);
}

async function isSlotAvailable(professionalId, date, startTime, endTime, maxConcurrent = 1, bufferMinutes = 0, excludeAppointmentId = null) {
    const conflictCount = await countSlotConflicts(professionalId, date, startTime, endTime, bufferMinutes, excludeAppointmentId);
    return conflictCount < (maxConcurrent || 1);
}

/**
 * Valida que la fecha/hora no esté en el pasado ni exceda booking_advance_days.
 * Devuelve null si todo OK, o un mensaje de error.
 */
function validateBookingWindow(date, startTime, config) {
    const now = new Date();
    const target = new Date(`${date}T${startTime || '00:00'}:00`);

    if (Number.isNaN(target.getTime())) {
        return messages.entities.appointment.errors.invalidDateRange;
    }

    if (target.getTime() < now.getTime()) {
        return messages.entities.appointment.errors.pastDate;
    }

    const advanceDays = config?.booking_advance_days ?? 30;
    if (advanceDays > 0) {
        const limit = new Date(now);
        limit.setDate(limit.getDate() + advanceDays);
        limit.setHours(23, 59, 59, 999);
        if (target.getTime() > limit.getTime()) {
            return messages.entities.appointment.errors.advanceLimitExceeded;
        }
    }

    return null;
}

async function findOrCreateContact({ client_name, client_email, client_phone }, transaction = null) {
    const normEmail = normalizeStr(client_email);
    const normPhone = client_phone ? client_phone.trim() : null;

    if (!normEmail && !normPhone) return null;

    const orConditions = [];
    if (normEmail) {
        orConditions.push(sequelize.where(sequelize.fn('lower', sequelize.col('email')), normEmail));
    }
    if (normPhone) {
        orConditions.push({ phone: normPhone });
    }

    let contact = await ClientContact.findOne({
        where: { [Op.or]: orConditions },
        transaction,
    });

    if (!contact) {
        contact = await ClientContact.create({
            name: client_name,
            email: client_email ? client_email.trim() : null,
            phone: normPhone,
        }, { transaction });
    }

    return contact;
}

/**
 * Busca un paquete de sesiones activo y con saldo del cliente para el servicio.
 */
async function findUsablePackage(clientContactId, serviceId, transaction = null) {
    if (!clientContactId) return null;
    const today = new Date().toISOString().slice(0, 10);

    // Paquetes del servicio (sin join para poder lockear filas de client_packages).
    const packages = await SessionPackage.findAll({
        where: { service_id: serviceId },
        attributes: ['id'],
        transaction,
    });
    const packageIds = packages.map(p => p.id);
    if (packageIds.length === 0) return null;

    return ClientPackage.findOne({
        where: {
            client_contact_id: clientContactId,
            session_package_id: { [Op.in]: packageIds },
            estado: 'activo',
            sesiones_usadas: { [Op.lt]: sequelize.col('sesiones_total') },
            [Op.or]: [
                { fecha_vencimiento: null },
                { fecha_vencimiento: { [Op.gte]: today } },
            ],
        },
        order: [['fecha_vencimiento', 'ASC'], ['createdAt', 'ASC']],
        transaction,
        ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
    });
}

async function getBusinessName(config) {
    return config?.name || 'el negocio';
}

/**
 * Al liberarse un cupo, notifica al primero de la lista de espera del servicio.
 * No bloquea el flujo principal: errores se loguean.
 */
async function promoteWaitlist(appointment, config) {
    try {
        const where = {
            service_id: appointment.service_id,
            estado: 'esperando',
        };
        if (appointment.professional_id) {
            where[Op.or] = [
                { professional_id: appointment.professional_id },
                { professional_id: null },
            ];
        }

        const entry = await WaitlistEntry.findOne({
            where,
            include: [{ association: 'clientContact', attributes: ['id', 'name', 'email', 'phone'] }],
            order: [['createdAt', 'ASC']],
        });

        if (!entry) return;

        const contact = entry.clientContact;
        const serviceName = appointment.service?.name;

        if (contact?.email) {
            await sendWaitlistOpeningEmail({
                to: contact.email,
                clientName: contact.name,
                serviceName,
                businessName: config?.name,
                date: appointment.date,
            });
        }

        await entry.update({
            estado: 'notificado',
            notificado: true,
            notificado_at: new Date(),
        });
    } catch (err) {
        console.error('[appointment] Error promoviendo lista de espera:', err.message);
    }
}

/**
 * Listar turnos con filtros y paginación
 */
export async function list(req, res) {
    try {
        const { page = 1, limit = 20, date_from, date_to, professional_id, service_id, status, source, search, order = 'asc' } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        const where = {};

        if (date_from && date_to) {
            where.date = { [Op.between]: [date_from, date_to] };
        } else if (date_from) {
            where.date = { [Op.gte]: date_from };
        } else if (date_to) {
            where.date = { [Op.lte]: date_to };
        }

        if (professional_id) where.professional_id = Number(professional_id);
        if (service_id) where.service_id = Number(service_id);
        if (status) where.status = status;
        if (source) where.source = source;

        if (search) {
            where[Op.or] = [
                { client_name: { [Op.like]: `%${search}%` } },
                { client_email: { [Op.like]: `%${search}%` } },
                { client_phone: { [Op.like]: `%${search}%` } },
            ];
        }

        const dir = String(order).toLowerCase() === 'desc' ? 'DESC' : 'ASC';

        const { count, rows } = await Appointment.findAndCountAll({
            where,
            include: [
                { model: Professional, as: 'professional', attributes: ['id', 'name', 'color'] },
                { model: Service, as: 'service', attributes: ['id', 'name', 'duration_minutes', 'price'] },
            ],
            order: [['date', dir], ['start_time', dir]],
            limit: Number(limit),
            offset,
        });

        return res.status(200).json(successMessage({
            message: messages.entities.appointment.success.list,
            extra: {
                data: rows,
                pagination: {
                    totalItems: count,
                    totalPages: Math.ceil(count / Number(limit)),
                    currentPage: Number(page),
                    perPage: Number(limit),
                }
            }
        }));

    } catch (error) {
        console.error('Error listing appointments:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Obtener turno por ID
 */
export async function getById(req, res) {
    try {
        const { id } = req.params;

        const appointment = await Appointment.findOne({
            where: { id },
            include: [
                { model: Professional, as: 'professional' },
                { model: Service, as: 'service' },
                { model: ClientContact, as: 'clientContact' },
                { model: ClientPackage, as: 'clientPackage', required: false },
            ],
        });

        if (!appointment) {
            return res.status(404).json(errorMessage({
                message: messages.entities.appointment.errors.notFound
            }));
        }

        return res.status(200).json(successMessage({
            message: messages.entities.appointment.success.fetch,
            extra: { data: appointment }
        }));

    } catch (error) {
        console.error('Error getting appointment:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Crear turno: valida ventana, disponibilidad (con buffer y max_concurrent),
 * crea/vincula client_contact y descuenta paquete si corresponde.
 */
export async function create(req, res) {
    try {
        const {
            professional_id, service_id, client_name, client_email, client_phone,
            date, start_time, notes, source = 'manual', use_package,
        } = req.body;

        if (!service_id || !client_name || !date || !start_time) {
            return res.status(400).json(errorMessage({
                message: messages.system.validation.errors.fieldsRequired
            }));
        }

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

        const service = await Service.findOne({ where: { id: service_id, active: true } });
        if (!service) {
            return res.status(404).json(errorMessage({ message: messages.entities.service.errors.notFound }));
        }

        const config = await BusinessConfig.findOne();

        const windowError = validateBookingWindow(date, start_time, config);
        if (windowError) {
            return res.status(400).json(errorMessage({ message: windowError }));
        }

        const end_time = computeEndTime(start_time, service.duration_minutes);
        const bufferMinutes = service.buffer_time_minutes || 0;

        const initialStatus = config?.auto_confirm ? 'confirmed' : 'pending';

        let depositAmount = 0;
        let depositStatus = 'none';
        if (config?.deposit_required && service.price > 0) {
            if (service.deposit_amount > 0) {
                depositAmount = service.deposit_amount;
            } else if (config.deposit_percentage > 0) {
                depositAmount = (service.price * config.deposit_percentage / 100).toFixed(2);
            }
            depositStatus = depositAmount > 0 ? 'pending' : 'none';
        }

        let appointment;
        let contact;
        try {
            appointment = await sequelize.transaction(async (t) => {
                const conflictCount = await countSlotConflicts(professional_id, date, start_time, end_time, bufferMinutes, null, t);
                if (conflictCount >= (service.max_concurrent || 1)) {
                    const conflictError = new Error('SLOT_CONFLICT');
                    conflictError.code = 'SLOT_CONFLICT';
                    throw conflictError;
                }

                contact = await findOrCreateContact({ client_name, client_email, client_phone }, t);

                // Descuento de paquete de sesiones (opt-in via use_package)
                let clientPackageId = null;
                if (use_package && contact) {
                    const pkg = await findUsablePackage(contact.id, service_id, t);
                    if (pkg) {
                        const usadas = pkg.sesiones_usadas + 1;
                        await pkg.update({
                            sesiones_usadas: usadas,
                            estado: usadas >= pkg.sesiones_total ? 'completado' : 'activo',
                        }, { transaction: t });
                        clientPackageId = pkg.id;
                    }
                }

                const created = await Appointment.create({
                    professional_id: professional_id || null,
                    service_id,
                    client_contact_id: contact?.id || null,
                    client_name,
                    client_email: client_email ? client_email.trim() : null,
                    client_phone: client_phone ? client_phone.trim() : null,
                    date,
                    start_time,
                    end_time,
                    status: initialStatus,
                    source,
                    deposit_status: depositStatus,
                    deposit_amount: depositAmount,
                    client_package_id: clientPackageId,
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

        // Sincronización con Google Calendar (best-effort)
        try {
            const attendees = client_email ? [{ email: client_email }] : [];
            const calendarEvent = await createCalendarEvent({
                professionalId: professional_id || null,
                summary: `${service.name} - ${client_name}`,
                start: `${date}T${start_time}`,
                end: `${date}T${end_time}`,
                description: notes || `Turno reservado via ${source}`,
                attendees,
            });
            if (calendarEvent?.id) {
                await appointment.update({ external_calendar_id: calendarEvent.id });
            }
        } catch (calErr) {
            console.error('Error syncing with Google Calendar:', calErr.message);
        }

        // Email de confirmación (best-effort, vía core /send-email)
        appointment.service = service;
        sendConfirmationEmail({
            appointment,
            businessName: await getBusinessName(config),
            serviceName: service.name,
        }).catch((e) => console.error('[appointment] email confirmación:', e.message));

        return res.status(201).json(successMessage({
            message: messages.entities.appointment.success.created,
            extra: { data: appointment }
        }));

    } catch (error) {
        console.error('Error creating appointment:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Actualizar datos no temporales del turno (notas, contacto, status manual válido).
 * Para mover fecha/hora usar reschedule.
 */
export async function update(req, res) {
    try {
        const { id } = req.params;
        const body = req.body || {};

        const appointment = await Appointment.findOne({ where: { id } });
        if (!appointment) {
            return res.status(404).json(errorMessage({
                message: messages.entities.appointment.errors.notFound
            }));
        }

        // Si intenta mover fecha/hora, redirigir a la lógica de reprogramación.
        if (body.date || body.start_time) {
            return reschedule(req, res);
        }

        // Solo campos editables seguros. status se valida por transición.
        const allowed = ['client_name', 'client_email', 'client_phone', 'notes', 'professional_id'];
        const updateData = {};
        for (const key of allowed) {
            if (body[key] !== undefined) updateData[key] = body[key];
        }

        if (body.client_email && !isValidEmail(body.client_email)) {
            return res.status(400).json(errorMessage({ message: messages.entities.appointment.errors.invalidEmail }));
        }
        if (body.client_phone && !isValidPhone(body.client_phone)) {
            return res.status(400).json(errorMessage({ message: messages.entities.appointment.errors.invalidPhone }));
        }

        if (body.status !== undefined && body.status !== appointment.status) {
            if (!canTransition(appointment.status, body.status)) {
                return res.status(409).json(errorMessage({
                    message: messages.entities.appointment.errors.invalidTransition
                }));
            }
            updateData.status = body.status;
        }

        await appointment.update(updateData);

        return res.status(200).json(successMessage({
            message: messages.entities.appointment.success.updated,
            extra: { data: appointment }
        }));

    } catch (error) {
        console.error('Error updating appointment:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Reprogramar turno: mueve fecha y/u hora validando ventana, disponibilidad,
 * buffer y max_concurrent. No permite reprogramar turnos en estado final.
 */
export async function reschedule(req, res) {
    try {
        const { id } = req.params;
        const { date: newDate, start_time: newStart, professional_id } = req.body || {};

        const appointment = await Appointment.findOne({ where: { id } });
        if (!appointment) {
            return res.status(404).json(errorMessage({
                message: messages.entities.appointment.errors.notFound
            }));
        }

        if (['cancelled', 'completed', 'no_show'].includes(appointment.status)) {
            return res.status(409).json(errorMessage({
                message: messages.entities.appointment.errors.terminalState
            }));
        }

        const service = await Service.findByPk(appointment.service_id);
        if (!service) {
            return res.status(404).json(errorMessage({ message: messages.entities.service.errors.notFound }));
        }

        const config = await BusinessConfig.findOne();

        const date = newDate || appointment.date;
        const startTime = newStart || appointment.start_time;
        const professionalId = professional_id !== undefined ? (professional_id || null) : appointment.professional_id;
        const endTime = computeEndTime(startTime, service.duration_minutes);
        const bufferMinutes = service.buffer_time_minutes || 0;

        const windowError = validateBookingWindow(date, startTime, config);
        if (windowError) {
            return res.status(400).json(errorMessage({ message: windowError }));
        }

        const previous = { date: appointment.date, start_time: appointment.start_time };

        try {
            await sequelize.transaction(async (t) => {
                const conflictCount = await countSlotConflicts(professionalId, date, startTime, endTime, bufferMinutes, appointment.id, t);
                if (conflictCount >= (service.max_concurrent || 1)) {
                    const e = new Error('SLOT_CONFLICT');
                    e.code = 'SLOT_CONFLICT';
                    throw e;
                }
                await appointment.update({
                    date,
                    start_time: startTime,
                    end_time: endTime,
                    professional_id: professionalId,
                }, { transaction: t });
            });
        } catch (txErr) {
            if (txErr.code === 'SLOT_CONFLICT') {
                return res.status(409).json(errorMessage({
                    message: messages.entities.appointment.errors.conflictExists
                }));
            }
            throw txErr;
        }

        appointment.service = service;
        sendRescheduleEmail({
            appointment,
            businessName: await getBusinessName(config),
            serviceName: service.name,
            previous,
        }).catch((e) => console.error('[appointment] email reprogramación:', e.message));

        return res.status(200).json(successMessage({
            message: messages.entities.appointment.success.rescheduled,
            extra: { data: appointment }
        }));

    } catch (error) {
        console.error('Error rescheduling appointment:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Cancelar turno (soft cancel): valida política de cancelación, restituye
 * sesión de paquete si se había descontado, libera Google Calendar y promueve
 * la lista de espera.
 */
export async function cancel(req, res) {
    try {
        const { id } = req.params;
        const { cancel_reason, force } = req.body || {};

        const appointment = await Appointment.findOne({
            where: { id },
            include: [{ model: Service, as: 'service', attributes: ['id', 'name'] }],
        });
        if (!appointment) {
            return res.status(404).json(errorMessage({
                message: messages.entities.appointment.errors.notFound
            }));
        }

        if (appointment.status === 'cancelled') {
            return res.status(400).json(errorMessage({
                message: messages.entities.appointment.errors.alreadyCancelled
            }));
        }

        if (['completed', 'no_show'].includes(appointment.status)) {
            return res.status(409).json(errorMessage({
                message: messages.entities.appointment.errors.terminalState
            }));
        }

        const config = await BusinessConfig.findOne();

        // Política de cancelación: horas mínimas de antelación (se puede saltar con force=true desde el panel).
        const policyHours = config?.cancellation_policy_hours ?? 0;
        if (policyHours > 0 && !force) {
            const apptDateTime = new Date(`${appointment.date}T${appointment.start_time}`);
            const minMs = policyHours * 60 * 60 * 1000;
            if (apptDateTime.getTime() - Date.now() < minMs) {
                return res.status(409).json(errorMessage({
                    message: messages.entities.appointment.errors.cancelTooLate
                }));
            }
        }

        await sequelize.transaction(async (t) => {
            await appointment.update({
                status: 'cancelled',
                cancelled_at: new Date(),
                cancel_reason: cancel_reason || null,
            }, { transaction: t });

            // Restituir sesión del paquete si correspondía
            if (appointment.client_package_id) {
                const pkg = await ClientPackage.findByPk(appointment.client_package_id, { transaction: t, lock: t.LOCK.UPDATE });
                if (pkg && pkg.sesiones_usadas > 0) {
                    await pkg.update({
                        sesiones_usadas: pkg.sesiones_usadas - 1,
                        estado: pkg.estado === 'completado' ? 'activo' : pkg.estado,
                    }, { transaction: t });
                }
            }
        });

        if (appointment.external_calendar_id) {
            try {
                await deleteCalendarEvent({
                    professionalId: appointment.professional_id || null,
                    eventId: appointment.external_calendar_id,
                });
            } catch (calErr) {
                console.error('Error deleting Google Calendar event:', calErr.message);
            }
        }

        sendCancellationEmail({
            appointment,
            businessName: await getBusinessName(config),
            serviceName: appointment.service?.name,
            reason: cancel_reason,
        }).catch((e) => console.error('[appointment] email cancelación:', e.message));

        // Al liberarse el cupo, notificar al primero de la lista de espera.
        await promoteWaitlist(appointment, config);

        return res.status(200).json(successMessage({
            message: messages.entities.appointment.success.cancelled,
            extra: { data: appointment }
        }));

    } catch (error) {
        console.error('Error cancelling appointment:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Confirmar turno
 */
export async function confirm(req, res) {
    try {
        const { id } = req.params;

        const appointment = await Appointment.findOne({
            where: { id },
            include: [{ model: Service, as: 'service' }],
        });
        if (!appointment) {
            return res.status(404).json(errorMessage({
                message: messages.entities.appointment.errors.notFound
            }));
        }

        if (!canTransition(appointment.status, 'confirmed')) {
            return res.status(409).json(errorMessage({
                message: messages.entities.appointment.errors.invalidTransition
            }));
        }

        await appointment.update({ status: 'confirmed' });

        return res.status(200).json(successMessage({
            message: messages.entities.appointment.success.confirmed,
            extra: { data: appointment }
        }));

    } catch (error) {
        console.error('Error confirming appointment:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Completar turno
 */
export async function complete(req, res) {
    try {
        const { id } = req.params;

        const appointment = await Appointment.findOne({ where: { id } });
        if (!appointment) {
            return res.status(404).json(errorMessage({
                message: messages.entities.appointment.errors.notFound
            }));
        }

        if (appointment.status === 'completed') {
            return res.status(400).json(errorMessage({
                message: messages.entities.appointment.errors.alreadyCompleted
            }));
        }

        if (!canTransition(appointment.status, 'completed')) {
            return res.status(409).json(errorMessage({
                message: messages.entities.appointment.errors.invalidTransition
            }));
        }

        await appointment.update({ status: 'completed' });

        return res.status(200).json(successMessage({
            message: messages.entities.appointment.success.completed,
            extra: { data: appointment }
        }));

    } catch (error) {
        console.error('Error completing appointment:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Marcar como no_show. Restituye la sesión del paquete (no se consumió) y
 * acumula no_show_count del contacto.
 */
export async function noShow(req, res) {
    try {
        const { id } = req.params;

        const appointment = await Appointment.findOne({ where: { id } });
        if (!appointment) {
            return res.status(404).json(errorMessage({
                message: messages.entities.appointment.errors.notFound
            }));
        }

        if (!canTransition(appointment.status, 'no_show')) {
            return res.status(409).json(errorMessage({
                message: messages.entities.appointment.errors.invalidTransition
            }));
        }

        await sequelize.transaction(async (t) => {
            await appointment.update({ status: 'no_show' }, { transaction: t });

            if (appointment.client_contact_id) {
                const contact = await ClientContact.findByPk(appointment.client_contact_id, { transaction: t, lock: t.LOCK.UPDATE });
                if (contact) {
                    await contact.update({ no_show_count: contact.no_show_count + 1 }, { transaction: t });
                }
            }

            // El no_show no consume la sesión del paquete: restituir.
            if (appointment.client_package_id) {
                const pkg = await ClientPackage.findByPk(appointment.client_package_id, { transaction: t, lock: t.LOCK.UPDATE });
                if (pkg && pkg.sesiones_usadas > 0) {
                    await pkg.update({
                        sesiones_usadas: pkg.sesiones_usadas - 1,
                        estado: pkg.estado === 'completado' ? 'activo' : pkg.estado,
                    }, { transaction: t });
                }
            }
        });

        return res.status(200).json(successMessage({
            message: messages.entities.appointment.success.noShow,
            extra: { data: appointment }
        }));

    } catch (error) {
        console.error('Error marking no show:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}
