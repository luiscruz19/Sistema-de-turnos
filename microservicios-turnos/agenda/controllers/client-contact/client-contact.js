import ClientContact from '../../models/ClientContact.js';
import Appointment from '../../models/Appointment.js';
import Service from '../../models/Service.js';
import Professional from '../../models/Professional.js';
import { Op } from 'sequelize';
import { errorMessage, successMessage } from '../../utils/messages.js';
import messages from '../../config/messages.js';

/**
 * Listar contactos con filtros y paginación
 */
export async function list(req, res) {
    try {
        const { page = 1, limit = 20, search } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        const where = {};

        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } },
                { phone: { [Op.like]: `%${search}%` } },
            ];
        }

        const { count, rows } = await ClientContact.findAndCountAll({
            where,
            order: [['last_appointment_at', 'DESC'], ['name', 'ASC']],
            limit: Number(limit),
            offset,
        });

        return res.status(200).json(successMessage({
            message: messages.entities.clientContact.success.list,
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
        console.error('Error listing client contacts:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Obtener contacto por ID con historial de turnos
 */
export async function getById(req, res) {
    try {
        const { id } = req.params;

        const contact = await ClientContact.findOne({
            where: { id },
            include: [{
                model: Appointment,
                as: 'appointments',
                include: [
                    { model: Service, as: 'service', attributes: ['id', 'name'] },
                    { model: Professional, as: 'professional', attributes: ['id', 'name'] },
                ],
                order: [['date', 'DESC'], ['start_time', 'DESC']],
                limit: 50,
            }],
        });

        if (!contact) {
            return res.status(404).json(errorMessage({
                message: messages.entities.clientContact.errors.notFound
            }));
        }

        return res.status(200).json(successMessage({
            message: messages.entities.clientContact.success.fetch,
            extra: { data: contact }
        }));

    } catch (error) {
        console.error('Error getting client contact:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Crear contacto
 */
export async function create(req, res) {
    try {
        const { name, email, phone, notes } = req.body;

        const contact = await ClientContact.create({
            name,
            email: email || null,
            phone: phone || null,
            notes: notes || null,
        });

        return res.status(201).json(successMessage({
            message: messages.entities.clientContact.success.created,
            extra: { data: contact }
        }));

    } catch (error) {
        console.error('Error creating client contact:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Actualizar contacto
 */
export async function update(req, res) {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const contact = await ClientContact.findOne({ where: { id } });
        if (!contact) {
            return res.status(404).json(errorMessage({
                message: messages.entities.clientContact.errors.notFound
            }));
        }

        await contact.update(updateData);

        return res.status(200).json(successMessage({
            message: messages.entities.clientContact.success.updated,
            extra: { data: contact }
        }));

    } catch (error) {
        console.error('Error updating client contact:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Eliminar contacto
 */
export async function remove(req, res) {
    try {
        const { id } = req.params;

        const contact = await ClientContact.findOne({ where: { id } });
        if (!contact) {
            return res.status(404).json(errorMessage({
                message: messages.entities.clientContact.errors.notFound
            }));
        }

        await contact.destroy();

        return res.status(200).json(successMessage({
            message: messages.entities.clientContact.success.deleted,
        }));

    } catch (error) {
        console.error('Error deleting client contact:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}
