import Schedule from '../../models/Schedule.js';
import ScheduleException from '../../models/ScheduleException.js';
import Professional from '../../models/Professional.js';
import { Op } from 'sequelize';
import { errorMessage, successMessage } from '../../utils/messages.js';
import messages from '../../config/messages.js';

/**
 * Listar horarios (filtrar por professional_id o negocio)
 */
export async function list(req, res) {
    try {
        const { professional_id } = req.query;

        const where = {};

        if (professional_id !== undefined) {
            where.professional_id = professional_id === 'null' ? null : Number(professional_id);
        }

        const schedules = await Schedule.findAll({
            where,
            include: [{
                model: Professional,
                as: 'professional',
                attributes: ['id', 'name'],
                required: false,
            }],
            order: [['professional_id', 'ASC'], ['day_of_week', 'ASC'], ['start_time', 'ASC']],
        });

        return res.status(200).json(successMessage({
            message: messages.entities.schedule.success.list,
            extra: { data: schedules }
        }));

    } catch (error) {
        console.error('Error listing schedules:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Crear horario
 */
export async function create(req, res) {
    try {
        const { professional_id, day_of_week, start_time, end_time } = req.body;

        const schedule = await Schedule.create({
            professional_id: professional_id || null,
            day_of_week,
            start_time,
            end_time,
        });

        return res.status(201).json(successMessage({
            message: messages.entities.schedule.success.created,
            extra: { data: schedule }
        }));

    } catch (error) {
        console.error('Error creating schedule:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Actualizar horario
 */
export async function update(req, res) {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const schedule = await Schedule.findOne({ where: { id } });
        if (!schedule) {
            return res.status(404).json(errorMessage({
                message: messages.entities.schedule.errors.notFound
            }));
        }

        await schedule.update(updateData);

        return res.status(200).json(successMessage({
            message: messages.entities.schedule.success.updated,
            extra: { data: schedule }
        }));

    } catch (error) {
        console.error('Error updating schedule:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Eliminar horario
 */
export async function remove(req, res) {
    try {
        const { id } = req.params;

        const schedule = await Schedule.findOne({ where: { id } });
        if (!schedule) {
            return res.status(404).json(errorMessage({
                message: messages.entities.schedule.errors.notFound
            }));
        }

        await schedule.destroy();

        return res.status(200).json(successMessage({
            message: messages.entities.schedule.success.deleted,
        }));

    } catch (error) {
        console.error('Error deleting schedule:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

// Excepciones

/**
 * Listar excepciones de horario
 */
export async function listExceptions(req, res) {
    try {
        const { professional_id, date_from, date_to } = req.query;

        const where = {};

        if (professional_id !== undefined) {
            where.professional_id = professional_id === 'null' ? null : Number(professional_id);
        }

        if (date_from && date_to) {
            where.date = { [Op.between]: [date_from, date_to] };
        } else if (date_from) {
            where.date = { [Op.gte]: date_from };
        } else if (date_to) {
            where.date = { [Op.lte]: date_to };
        }

        const exceptions = await ScheduleException.findAll({
            where,
            include: [{
                model: Professional,
                as: 'professional',
                attributes: ['id', 'name'],
                required: false,
            }],
            order: [['date', 'ASC'], ['start_time', 'ASC']],
        });

        return res.status(200).json(successMessage({
            message: messages.entities.schedule.success.exceptionList,
            extra: { data: exceptions }
        }));

    } catch (error) {
        console.error('Error listing schedule exceptions:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Crear excepción de horario
 */
export async function createException(req, res) {
    try {
        const { professional_id, date, start_time, end_time, is_blocked, reason } = req.body;

        const exception = await ScheduleException.create({
            professional_id: professional_id || null,
            date,
            start_time: start_time || null,
            end_time: end_time || null,
            is_blocked: is_blocked !== undefined ? is_blocked : true,
            reason: reason || null,
        });

        return res.status(201).json(successMessage({
            message: messages.entities.schedule.success.exceptionCreated,
            extra: { data: exception }
        }));

    } catch (error) {
        console.error('Error creating schedule exception:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Actualizar excepción de horario
 */
export async function updateException(req, res) {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const exception = await ScheduleException.findOne({ where: { id } });
        if (!exception) {
            return res.status(404).json(errorMessage({
                message: messages.entities.schedule.errors.exceptionNotFound
            }));
        }

        await exception.update(updateData);

        return res.status(200).json(successMessage({
            message: messages.entities.schedule.success.exceptionUpdated,
            extra: { data: exception }
        }));

    } catch (error) {
        console.error('Error updating schedule exception:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Eliminar excepción de horario
 */
export async function removeException(req, res) {
    try {
        const { id } = req.params;

        const exception = await ScheduleException.findOne({ where: { id } });
        if (!exception) {
            return res.status(404).json(errorMessage({
                message: messages.entities.schedule.errors.exceptionNotFound
            }));
        }

        await exception.destroy();

        return res.status(200).json(successMessage({
            message: messages.entities.schedule.success.exceptionDeleted,
        }));

    } catch (error) {
        console.error('Error deleting schedule exception:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}
