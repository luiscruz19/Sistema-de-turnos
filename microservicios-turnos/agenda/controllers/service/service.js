import Service from '../../models/Service.js';
import ProfessionalService from '../../models/ProfessionalService.js';
import Professional from '../../models/Professional.js';
import { Op } from 'sequelize';
import { errorMessage, successMessage } from '../../utils/messages.js';
import messages from '../../config/messages.js';

/**
 * Listar servicios
 */
export async function list(req, res) {
    try {
        const { page = 1, limit = 50, active, category, search } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        const where = {};

        // Por defecto se ocultan los inactivos (dados de baja). active=false o all para verlos.
        if (active === undefined) where.active = true;
        else if (active !== 'all') where.active = active === 'true';

        if (category) {
            where.category = category;
        }

        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } },
                { category: { [Op.like]: `%${search}%` } },
            ];
        }

        const { count, rows } = await Service.findAndCountAll({
            where,
            order: [['sort_order', 'ASC'], ['name', 'ASC']],
            limit: Number(limit),
            offset,
        });

        return res.status(200).json(successMessage({
            message: messages.entities.service.success.list,
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
        console.error('Error listing services:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Obtener servicio por ID
 */
export async function getById(req, res) {
    try {
        const { id } = req.params;

        const service = await Service.findOne({
            where: { id },
            include: [{
                model: ProfessionalService,
                as: 'professionalServices',
                include: [{
                    model: Professional,
                    as: 'professional',
                    attributes: ['id', 'name', 'specialty', 'color'],
                }],
            }],
        });

        if (!service) {
            return res.status(404).json(errorMessage({
                message: messages.entities.service.errors.notFound
            }));
        }

        return res.status(200).json(successMessage({
            message: messages.entities.service.success.fetch,
            extra: { data: service }
        }));

    } catch (error) {
        console.error('Error getting service:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Crear servicio
 */
export async function create(req, res) {
    try {
        const {
            name, description, duration_minutes, price, deposit_amount,
            category, requires_professional, max_concurrent, sort_order,
        } = req.body;

        const service = await Service.create({
            name,
            description: description || null,
            duration_minutes: duration_minutes || 30,
            price: price || 0,
            deposit_amount: deposit_amount || 0,
            category: category || null,
            requires_professional: requires_professional !== undefined ? requires_professional : true,
            max_concurrent: max_concurrent || 1,
            sort_order: sort_order || 0,
        });

        return res.status(201).json(successMessage({
            message: messages.entities.service.success.created,
            extra: { data: service }
        }));

    } catch (error) {
        console.error('Error creating service:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Actualizar servicio
 */
export async function update(req, res) {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const service = await Service.findOne({ where: { id } });
        if (!service) {
            return res.status(404).json(errorMessage({
                message: messages.entities.service.errors.notFound
            }));
        }

        await service.update(updateData);

        return res.status(200).json(successMessage({
            message: messages.entities.service.success.updated,
            extra: { data: service }
        }));

    } catch (error) {
        console.error('Error updating service:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Eliminar servicio
 */
export async function remove(req, res) {
    try {
        const { id } = req.params;

        const service = await Service.findOne({ where: { id } });
        if (!service) {
            return res.status(404).json(errorMessage({
                message: messages.entities.service.errors.notFound
            }));
        }

        // Soft-delete: se desactiva para preservar el historial (turnos,
        // paquetes y clases asociadas). Los listados ocultan los inactivos.
        await service.update({ active: false });

        return res.status(200).json(successMessage({
            message: messages.entities.service.success.deleted,
        }));

    } catch (error) {
        console.error('Error deleting service:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Toggle active
 */
export async function toggle(req, res) {
    try {
        const { id } = req.params;

        const service = await Service.findOne({ where: { id } });
        if (!service) {
            return res.status(404).json(errorMessage({
                message: messages.entities.service.errors.notFound
            }));
        }

        await service.update({ active: !service.active });

        return res.status(200).json(successMessage({
            message: messages.entities.service.success.toggled,
            extra: { data: service }
        }));

    } catch (error) {
        console.error('Error toggling service:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}
