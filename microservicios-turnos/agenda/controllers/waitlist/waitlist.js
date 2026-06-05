import WaitlistEntry from '../../models/WaitlistEntry.js';
import ClientContact from '../../models/ClientContact.js';
import Service from '../../models/Service.js';
import Professional from '../../models/Professional.js';
import { errorMessage, successMessage } from '../../utils/messages.js';
import messages from '../../config/messages.js';

/**
 * Listar entradas de lista de espera con filtros opcionales
 */
export async function list(req, res) {
    try {
        const { professional_id, service_id, estado } = req.query;

        const where = {};

        if (professional_id) where.professional_id = Number(professional_id);
        if (service_id) where.service_id = Number(service_id);
        if (estado) where.estado = estado;

        const entries = await WaitlistEntry.findAll({
            where,
            include: [
                { model: ClientContact, as: 'clientContact', attributes: ['id', 'name', 'email', 'phone'] },
                { model: Service, as: 'service', attributes: ['id', 'name'] },
                { model: Professional, as: 'professional', attributes: ['id', 'name'] },
            ],
            order: [['createdAt', 'ASC']],
        });

        return res.status(200).json(successMessage({
            message: 'Lista de espera obtenida correctamente.',
            extra: { data: entries }
        }));

    } catch (error) {
        console.error('Error listing waitlist entries:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Agregar cliente a la lista de espera
 */
export async function create(req, res) {
    try {
        const { client_contact_id, professional_id, service_id, fecha_preferida, notas } = req.body;

        const entry = await WaitlistEntry.create({
            client_contact_id,
            professional_id: professional_id || null,
            service_id,
            fecha_preferida: fecha_preferida || null,
            notificado: false,
            notificado_at: null,
            estado: 'esperando',
        });

        return res.status(201).json(successMessage({
            message: 'Cliente agregado a la lista de espera.',
            extra: { data: entry }
        }));

    } catch (error) {
        console.error('Error creating waitlist entry:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Actualizar estado u observaciones de una entrada
 */
export async function update(req, res) {
    try {
        const { id } = req.params;
        const { estado, notas } = req.body;

        const entry = await WaitlistEntry.findOne({ where: { id } });
        if (!entry) {
            return res.status(404).json(errorMessage({
                message: 'Entrada de lista de espera no encontrada.'
            }));
        }

        const updateData = {};
        if (estado !== undefined) updateData.estado = estado;
        if (notas !== undefined) updateData.notas = notas;

        await entry.update(updateData);

        return res.status(200).json(successMessage({
            message: 'Lista de espera actualizada correctamente.',
            extra: { data: entry }
        }));

    } catch (error) {
        console.error('Error updating waitlist entry:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Eliminar entrada de la lista de espera (paranoid delete)
 */
export async function del(req, res) {
    try {
        const { id } = req.params;

        const entry = await WaitlistEntry.findOne({ where: { id } });
        if (!entry) {
            return res.status(404).json(errorMessage({
                message: 'Entrada de lista de espera no encontrada.'
            }));
        }

        await entry.destroy();

        return res.status(200).json(successMessage({
            message: 'Entrada eliminada correctamente.'
        }));

    } catch (error) {
        console.error('Error deleting waitlist entry:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}

/**
 * Marcar entrada como notificada (estado  notificado, notificado_at = now)
 */
export async function notify(req, res) {
    try {
        const { id } = req.params;

        const entry = await WaitlistEntry.findOne({ where: { id } });
        if (!entry) {
            return res.status(404).json(errorMessage({
                message: 'Entrada de lista de espera no encontrada.'
            }));
        }

        await entry.update({
            estado: 'notificado',
            notificado: true,
            notificado_at: new Date(),
        });

        return res.status(200).json(successMessage({
            message: 'Cliente notificado correctamente.',
            extra: { data: entry }
        }));

    } catch (error) {
        console.error('Error notifying waitlist entry:', error);
        return res.status(500).json(errorMessage({
            message: messages.system.common.errors.unexpected
        }));
    }
}
