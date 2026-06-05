import Professional from '../../models/Professional.js';
import ProfessionalService from '../../models/ProfessionalService.js';
import Service from '../../models/Service.js';
import { Op } from 'sequelize';
import { errorMessage, successMessage } from '../../utils/messages.js';
import messages from '../../config/messages.js';

/**
 * Listar profesionales
 */
export async function list(req, res) {
    try {
        const { page = 1, limit = 50, active, search } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        const where = {};

        if (active !== undefined) {
            where.active = active === 'true';
        }

        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } },
                { specialty: { [Op.like]: `%${search}%` } },
            ];
        }

        const { count, rows } = await Professional.findAndCountAll({
            where,
            include: [{
                model: ProfessionalService,
                as: 'professionalServices',
                include: [{
                    model: Service,
                    as: 'service',
                    attributes: ['id', 'name', 'duration_minutes', 'price'],
                }],
            }],
            order: [['sort_order', 'ASC'], ['name', 'ASC']],
            limit: Number(limit),
            offset,
        });

        return res.status(200).json(successMessage({
            message: messages.entities.professional.success.list,
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
        console.error('Error listing professionals:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Obtener profesional por ID
 */
export async function getById(req, res) {
    try {
        const { id } = req.params;

        const professional = await Professional.findOne({
            where: { id },
            include: [{
                model: ProfessionalService,
                as: 'professionalServices',
                include: [{
                    model: Service,
                    as: 'service',
                    attributes: ['id', 'name', 'duration_minutes', 'price'],
                }],
            }],
        });

        if (!professional) {
            return res.status(404).json(errorMessage({
                message: messages.entities.professional.errors.notFound
            }));
        }

        return res.status(200).json(successMessage({
            message: messages.entities.professional.success.fetch,
            extra: { data: professional }
        }));

    } catch (error) {
        console.error('Error getting professional:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Crear profesional
 */
export async function create(req, res) {
    try {
        const { name, email, phone, specialty, avatar_url, color, sort_order, service_ids } = req.body;

        const professional = await Professional.create({
            name,
            email: email || null,
            phone: phone || null,
            specialty: specialty || null,
            avatar_url: avatar_url || null,
            color: color || '#6366f1',
            sort_order: sort_order || 0,
        });

        // Asignar servicios si se proveen
        if (service_ids && Array.isArray(service_ids) && service_ids.length > 0) {
            const entries = service_ids.map(sid => ({
                professional_id: professional.id,
                service_id: sid,
            }));
            await ProfessionalService.bulkCreate(entries);
        }

        return res.status(201).json(successMessage({
            message: messages.entities.professional.success.created,
            extra: { data: professional }
        }));

    } catch (error) {
        console.error('Error creating professional:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Actualizar profesional
 */
export async function update(req, res) {
    try {
        const { id } = req.params;
        const { service_ids, ...updateData } = req.body;

        const professional = await Professional.findOne({ where: { id } });
        if (!professional) {
            return res.status(404).json(errorMessage({
                message: messages.entities.professional.errors.notFound
            }));
        }

        await professional.update(updateData);

        // Actualizar servicios si se proveen
        if (service_ids && Array.isArray(service_ids)) {
            await ProfessionalService.destroy({
                where: { professional_id: professional.id }
            });
            if (service_ids.length > 0) {
                const entries = service_ids.map(sid => ({
                    professional_id: professional.id,
                    service_id: sid,
                }));
                await ProfessionalService.bulkCreate(entries);
            }
        }

        return res.status(200).json(successMessage({
            message: messages.entities.professional.success.updated,
            extra: { data: professional }
        }));

    } catch (error) {
        console.error('Error updating professional:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Eliminar profesional
 */
export async function remove(req, res) {
    try {
        const { id } = req.params;

        const professional = await Professional.findOne({ where: { id } });
        if (!professional) {
            return res.status(404).json(errorMessage({
                message: messages.entities.professional.errors.notFound
            }));
        }

        await professional.destroy();

        return res.status(200).json(successMessage({
            message: messages.entities.professional.success.deleted,
        }));

    } catch (error) {
        console.error('Error deleting professional:', error);
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

        const professional = await Professional.findOne({ where: { id } });
        if (!professional) {
            return res.status(404).json(errorMessage({
                message: messages.entities.professional.errors.notFound
            }));
        }

        await professional.update({ active: !professional.active });

        return res.status(200).json(successMessage({
            message: messages.entities.professional.success.toggled,
            extra: { data: professional }
        }));

    } catch (error) {
        console.error('Error toggling professional:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}
