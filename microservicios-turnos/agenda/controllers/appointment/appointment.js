import Appointment from '../../models/Appointment.js';
import Professional from '../../models/Professional.js';
import Service from '../../models/Service.js';
import ClientContact from '../../models/ClientContact.js';
import Schedule from '../../models/Schedule.js';
import ScheduleException from '../../models/ScheduleException.js';
import BusinessConfig from '../../models/BusinessConfig.js';
import { Op } from 'sequelize';
import sequelize from '../../db/sequelize.js';
import { errorMessage, successMessage } from '../../utils/messages.js';
import { isValidEmail, isValidPhone, normalizeStr } from '../../utils/helpers.js';
import messages from '../../config/messages.js';
import { createEvent as createCalendarEvent, deleteEvent as deleteCalendarEvent } from '../../integrations/google-calendar.js';

/**
 * Cuenta los turnos que se solapan con el slot dado.
 * Si se provee una transacción, hace el COUNT con lock para evitar
 * condiciones de carrera (doble reserva en requests simultáneos).
 */
async function countSlotConflicts(professionalId, date, startTime, endTime, excludeAppointmentId = null, transaction = null) {
    const where = {
        date,
        status: { [Op.notIn]: ['cancelled'] },
        [Op.or]: [
            {
                start_time: { [Op.lt]: endTime },
                end_time: { [Op.gt]: startTime },
            },
        ],
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

    return await Appointment.count(options);
}

/**
 * Verifica si un slot está disponible respetando max_concurrent del servicio.
 */
async function isSlotAvailable(professionalId, date, startTime, endTime, maxConcurrent = 1, excludeAppointmentId = null) {
    const conflictCount = await countSlotConflicts(professionalId, date, startTime, endTime, excludeAppointmentId);
    return conflictCount < (maxConcurrent || 1);
}

/**
 * Busca o crea un client_contact por email O phone (match exacto, normalizado a lower/trim).
 * Acepta una transacción para mantener consistencia.
 */
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
 * Listar turnos con filtros y paginación
 */
export async function list(req, res) {
    try {
        const { page = 1, limit = 20, date_from, date_to, professional_id, status, search } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        const where = {};

        if (date_from && date_to) {
            where.date = { [Op.between]: [date_from, date_to] };
        } else if (date_from) {
            where.date = { [Op.gte]: date_from };
        } else if (date_to) {
            where.date = { [Op.lte]: date_to };
        }

        if (professional_id) {
            where.professional_id = Number(professional_id);
        }

        if (status) {
            where.status = status;
        }

        if (search) {
            where[Op.or] = [
                { client_name: { [Op.like]: `%${search}%` } },
                { client_email: { [Op.like]: `%${search}%` } },
                { client_phone: { [Op.like]: `%${search}%` } },
            ];
        }

        const { count, rows } = await Appointment.findAndCountAll({
            where,
            include: [
                { model: Professional, as: 'professional', attributes: ['id', 'name', 'color'] },
                { model: Service, as: 'service', attributes: ['id', 'name', 'duration_minutes', 'price'] },
            ],
            order: [['date', 'ASC'], ['start_time', 'ASC']],
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
 * Crear turno: valida disponibilidad, crea/vincula client_contact
 */
export async function create(req, res) {
    try {
        const {
            professional_id, service_id, client_name, client_email, client_phone,
            date, start_time, notes, source = 'manual',
        } = req.body;

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

        const service = await Service.findOne({ where: { id: service_id, active: true } });
        if (!service) {
            return res.status(404).json(errorMessage({ message: messages.entities.service.errors.notFound }));
        }

        const [hours, minutes] = start_time.split(':').map(Number);
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + service.duration_minutes;
        const endHours = Math.floor(endMinutes / 60).toString().padStart(2, '0');
        const endMins = (endMinutes % 60).toString().padStart(2, '0');
        const end_time = `${endHours}:${endMins}:00`;

        const config = await BusinessConfig.findOne();
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

        // Verificación de disponibilidad + creación dentro de una transacción.
        // El COUNT se hace con lock para evitar la condición de carrera (doble reserva).
        let appointment;
        let contact;
        try {
            appointment = await sequelize.transaction(async (t) => {
                const conflictCount = await countSlotConflicts(professional_id, date, start_time, end_time, null, t);
                if (conflictCount >= (service.max_concurrent || 1)) {
                    const conflictError = new Error('SLOT_CONFLICT');
                    conflictError.code = 'SLOT_CONFLICT';
                    throw conflictError;
                }

                contact = await findOrCreateContact({ client_name, client_email, client_phone }, t);

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

        try {
            const startDateTime = `${date}T${start_time}`;
            const endDateTime = `${date}T${end_time}`;
            const attendees = client_email ? [{ email: client_email }] : [];

            const calendarEvent = await createCalendarEvent({
                professionalId: professional_id || null,
                summary: `${service.name} - ${client_name}`,
                start: startDateTime,
                end: endDateTime,
                description: notes || `Turno reservado via ${source}`,
                attendees,
            });

            if (calendarEvent?.id) {
                await appointment.update({ external_calendar_id: calendarEvent.id });
            }
        } catch (calErr) {
            console.error('Error syncing with Google Calendar:', calErr.message);
        }

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
 * Actualizar turno
 */
export async function update(req, res) {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const appointment = await Appointment.findOne({ where: { id } });
        if (!appointment) {
            return res.status(404).json(errorMessage({
                message: messages.entities.appointment.errors.notFound
            }));
        }

        if (updateData.date || updateData.start_time) {
            const date = updateData.date || appointment.date;
            const startTime = updateData.start_time || appointment.start_time;
            let endTime = appointment.end_time;

            const service = await Service.findByPk(appointment.service_id);

            if (updateData.start_time) {
                const [h, m] = startTime.split(':').map(Number);
                const totalMin = h * 60 + m + service.duration_minutes;
                endTime = `${Math.floor(totalMin / 60).toString().padStart(2, '0')}:${(totalMin % 60).toString().padStart(2, '0')}:00`;
                updateData.end_time = endTime;
            }

            const available = await isSlotAvailable(appointment.professional_id, date, startTime, endTime, service?.max_concurrent || 1, appointment.id);
            if (!available) {
                return res.status(409).json(errorMessage({
                    message: messages.entities.appointment.errors.conflictExists
                }));
            }
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
 * Cancelar turno (soft cancel)
 */
export async function cancel(req, res) {
    try {
        const { id } = req.params;
        const { cancel_reason } = req.body;

        const appointment = await Appointment.findOne({ where: { id } });
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

        await appointment.update({
            status: 'cancelled',
            cancelled_at: new Date(),
            cancel_reason: cancel_reason || null,
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
 * Marcar como no_show
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

        await appointment.update({ status: 'no_show' });

        if (appointment.client_contact_id) {
            const contact = await ClientContact.findByPk(appointment.client_contact_id);
            if (contact) {
                await contact.update({
                    no_show_count: contact.no_show_count + 1,
                });
            }
        }

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
